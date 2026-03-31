import { CAPITAL_REGION_COLORS, CAPITAL_MAX_GOVERNORS } from './constants.js';
import { state, invalidateGovernorRegionIndex } from './state.js';
import { setMapView, refreshTerritoryPaint, highlightSelection } from './map.js';
import {
    getProvinceNameById, buildGovernorAbbrByProvIds,
    isProvinceOccupiedByGovernorRegion, getCapitalSelectionIndex
} from './officials-core.js';
import { renderCapitalOfficials } from './officials-capital-ui.js';
import { NameGen } from './nameGen.js';

function syncCapitalModeUI() {
    const leftPane = document.getElementById('capital-left-pane');
    const governorPanel = document.getElementById('capital-governor-workbench');
    const detailPanel = document.getElementById('capital-official-detail');
    const btnOfficials = document.getElementById('btn-capital-mode-officials');
    const btnGovernor = document.getElementById('btn-capital-mode-governor');

    const inGovernor = state.capitalMode === 'governor';
    if (leftPane) leftPane.style.display = inGovernor ? 'none' : 'flex';
    if (governorPanel) governorPanel.style.display = inGovernor ? 'block' : 'none';
    if (detailPanel) detailPanel.style.display = inGovernor ? 'none' : 'block';
    if (btnOfficials) btnOfficials.classList.toggle('active', !inGovernor);
    if (btnGovernor) btnGovernor.classList.toggle('active', inGovernor);
}

export function setCapitalMode(mode) {
    state.capitalMode = mode === 'governor' ? 'governor' : 'officials';
    syncCapitalModeUI();
    if (state.activeTab === 'capital') {
        if (state.capitalMode === 'governor') {
            import('./map.js').then(({ setMapView }) => setMapView('province', false));
            renderCapitalGovernorAssignments();
        } else {
            renderCapitalOfficials();
            refreshTerritoryPaint();
            if (state.selectedCellId !== null) highlightSelection(state.selectedCellId);
        }
    }
}

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
        const draftTitle = `${buildGovernorAbbrByProvIds(state.capitalGovernorSelectedProvinces)}总督（领兵部右侍郎兼都察院右都御史）`;
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
    const title = `${buildGovernorAbbrByProvIds(state.capitalGovernorSelectedProvinces)}总督（领兵部右侍郎兼都察院右都御史）`;
    state.capitalGovernorRegions.push({
        id: state.capitalGovernorNextId++,
        provIds: [...state.capitalGovernorSelectedProvinces],
        title,
        name: NameGen.person(),
        color
    });
    invalidateGovernorRegionIndex();

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
