import { officialData, CAPITAL_MAX_GOVERNORS, CAPITAL_REGION_COLORS, CAPITAL_GOVERNOR_PAIR_ABBR, CAPITAL_PROV_SHORT } from './constants.js';
import { NameGen } from './nameGen.js';
import { state } from './state.js';
import { refreshTerritoryPaint, highlightSelection } from './map.js';

// ── Province / governor helper queries ────────────────────────────────────────

export function getProvinceNameById(provId) {
    if (provId === null || !state.provincesData[provId]) return "";
    return state.provincesData[provId].name || "";
}

export function getProvinceShortName(provName) {
    return CAPITAL_PROV_SHORT[provName] || provName.replace(/省$/g, '').slice(0, 1);
}

export function getCapitalSelectionIndex(provId) {
    return state.capitalGovernorSelectedProvinces.indexOf(provId);
}

export function getGovernorRegionByProvinceId(provId) {
    if (provId === null || provId === undefined) return null;
    return state.capitalGovernorRegions.find(r => (r.provIds || []).includes(provId)) || null;
}

export function isProvinceOccupiedByGovernorRegion(provId) {
    return getGovernorRegionByProvinceId(provId) !== null;
}

export function buildGovernorAbbrByProvIds(provIds) {
    const provNames = provIds.map(id => getProvinceNameById(id)).filter(Boolean);
    if (provNames.length === 0) return '';
    if (provNames.length === 1) return provNames[0].replace(/省$/g, '');
    if (provNames.length === 2) {
        const key = provNames.slice().sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).join('|');
        if (CAPITAL_GOVERNOR_PAIR_ABBR[key]) return CAPITAL_GOVERNOR_PAIR_ABBR[key];
    }
    return provNames.map(getProvinceShortName).join('');
}

// ── Roster helpers ─────────────────────────────────────────────────────────────

export function generateRoster(template) {
    return template.map(tmpl => {
        let names = [];
        for (let i = 0; i < tmpl.quota; i++) {
            names.push(NameGen.person());
        }
        return { title: tmpl.title, rank: tmpl.rank, quota: tmpl.quota, names };
    });
}

export function renderRosterList(containerId, rosterData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = rosterData.map(o => {
        let nameDisplay = "";
        if (o.quota > 2) {
            nameDisplay = `<span class="quota-tag">编制${o.quota}人</span> ${o.names[0]}, ${o.names[1]} 等`;
        } else {
            nameDisplay = o.names.join('、');
        }
        return `
            <div class="roster-item">
                <span class="roster-title">${o.title} <small>${o.rank ? `(${o.rank})` : ''}</small></span>
                <span class="roster-names">${nameDisplay}</span>
            </div>
        `;
    }).join('');
}

// ── Capital officials panel ────────────────────────────────────────────────────

export function renderCapitalOfficials() {
    const container = document.getElementById('capital-officials-list');
    if (!container) return;
    container.innerHTML = '';

    for (const [rank, jobs] of Object.entries(officialData)) {
        const rankGroup = document.createElement('div');
        rankGroup.className = 'rank-group';

        const rankTitle = document.createElement('div');
        rankTitle.className = 'rank-title';
        rankTitle.innerText = rank;
        rankGroup.appendChild(rankTitle);

        const rankList = document.createElement('div');
        rankList.className = 'rank-list';

        jobs.forEach(job => {
            const officialItem = document.createElement('div');
            officialItem.className = 'official-item';
            let names = [];
            for (let i = 0; i < job.quota; i++) names.push(NameGen.person());
            let nameDisplay = job.quota > 1
                ? `<span style="color:#f39c12;font-size:0.8em;">[编${job.quota}人]</span> ${names[0]}等`
                : names[0];
            officialItem.innerHTML = `
                <span class="official-title">${job.title}</span>
                <span class="official-name">${nameDisplay}</span>
            `;
            rankList.appendChild(officialItem);
        });

        rankGroup.appendChild(rankList);
        container.appendChild(rankGroup);
    }
}

// ── Governor region panel ──────────────────────────────────────────────────────

export function renderCapitalGovernorAssignments() {
    const draftContainer = document.getElementById('capital-governor-titles');
    const recordsContainer = document.getElementById('capital-governor-records');
    const establishBtn = document.getElementById('btn-establish-governor-region');
    if (!draftContainer || !recordsContainer) return;

    const selectedProvNames = state.capitalGovernorSelectedProvinces
        .map(id => getProvinceNameById(id)).filter(Boolean);

    if (state.capitalGovernorSelectedProvinces.length === 0) {
        draftContainer.innerHTML = `<div class="gov-empty">点击左侧省份圈定辖区（1-3省可成总督辖区）</div>`;
    } else {
        const draftTitle = `${buildGovernorAbbrByProvIds(state.capitalGovernorSelectedProvinces)}总督`;
        draftContainer.innerHTML = `
            <div class="gov-item gov-item-draft">
                <span class="gov-badge">拟</span>
                <div class="gov-main">
                    <div class="gov-title">${draftTitle}</div>
                    <div class="gov-sub">拟辖：${selectedProvNames.join('、')} ｜ 共${state.capitalGovernorSelectedProvinces.length}省</div>
                </div>
            </div>
        `;
    }

    if (establishBtn) {
        establishBtn.disabled = !(
            state.capitalGovernorSelectedProvinces.length >= 1 &&
            state.capitalGovernorSelectedProvinces.length <= CAPITAL_MAX_GOVERNORS
        );
    }

    if (state.capitalGovernorRegions.length === 0) {
        recordsContainer.innerHTML = `<div class="gov-empty">尚未设立总督辖区</div>`;
        return;
    }

    recordsContainer.innerHTML = state.capitalGovernorRegions.map((region, idx) => {
        const provNames = (region.provIds || []).map(id => getProvinceNameById(id)).filter(Boolean);
        return `
            <div class="gov-item">
                <span class="gov-badge" style="background:${region.color || '#f39c12'};">${idx + 1}</span>
                <div class="gov-main">
                    <div class="gov-title">${region.title}</div>
                    <div class="gov-sub">辖：${provNames.join('、')} ｜ ${region.name || '待补缺'}</div>
                </div>
            </div>
        `;
    }).join('');
}

export function establishCapitalGovernorRegion() {
    if (
        state.capitalGovernorSelectedProvinces.length < 1 ||
        state.capitalGovernorSelectedProvinces.length > CAPITAL_MAX_GOVERNORS
    ) {
        alert(`请选择1到${CAPITAL_MAX_GOVERNORS}省后再设立。`);
        return;
    }

    const occupiedProvId = state.capitalGovernorSelectedProvinces.find(
        provId => isProvinceOccupiedByGovernorRegion(provId)
    );
    if (occupiedProvId !== undefined) {
        alert(`${getProvinceNameById(occupiedProvId)}已归属其他总督辖区，不能重复使用。`);
        return;
    }

    const color = CAPITAL_REGION_COLORS[(state.capitalGovernorNextId - 1) % CAPITAL_REGION_COLORS.length];
    const title = `${buildGovernorAbbrByProvIds(state.capitalGovernorSelectedProvinces)}总督`;
    state.capitalGovernorRegions.push({
        id: state.capitalGovernorNextId++,
        provIds: [...state.capitalGovernorSelectedProvinces],
        title,
        name: NameGen.person(),
        color
    });

    state.capitalGovernorSelectedProvinces = [];
    renderCapitalGovernorAssignments();
    refreshTerritoryPaint();
    highlightSelection(state.selectedCellId);
}

export function toggleCapitalGovernorProvince(provId) {
    const provName = getProvinceNameById(provId);
    if (!provName || provName.includes("直隶")) return;

    const existedIdx = getCapitalSelectionIndex(provId);
    if (existedIdx >= 0) {
        state.capitalGovernorSelectedProvinces.splice(existedIdx, 1);
    } else {
        if (isProvinceOccupiedByGovernorRegion(provId)) {
            alert(`${provName}已归属既有总督辖区，一省不能两用。`);
            return;
        }
        if (state.capitalGovernorSelectedProvinces.length >= CAPITAL_MAX_GOVERNORS) {
            alert(`总督辖区最多圈定${CAPITAL_MAX_GOVERNORS}省。`);
            return;
        }
        state.capitalGovernorSelectedProvinces.push(provId);
    }

    renderCapitalGovernorAssignments();
    refreshTerritoryPaint();
    highlightSelection(state.selectedCellId);
}
