import { OFFICIAL_TIMELINE_BASE_YEAR, OFFICIAL_RANK_ORDER, officialData } from './constants.js';
import { state } from './state.js';
import {
    ensureCapitalOfficialsInitialized, listOfficialsByMainRank, getPositionOrderMap,
    isCollapsiblePostTitle, getTimelineText, getHonoraryGroup, rankScore,
    isHonoraryCandidateDisallowed, hasConflictingHonorary, canHoldHonoraryTitle,
    isGrandSecretariatTitle, isCabinetEligibleOfficial, revokeConcurrentTitleFromAll,
    formatChildName, deriveOriginPathFromExam, normalizeExamPath, regenerateCareerHistory,
    addConcurrentPost, revokeConcurrentPostFromOfficial
} from './officials-core.js';

const POWER_POST_TEMPLATES = [
    { title: '管理吏部' },
    { title: '管理户部' },
    { title: '管理礼部' },
    { title: '军机大臣' },
    { title: '领班军机大臣' }
];

function addPowerPost(offId, title) {
    const official = state.officials.byId[offId];
    if (!official) return;
    const rank = official.mainPost?.rank || '从一品';
    addConcurrentPost(offId, title, rank, 'power', OFFICIAL_TIMELINE_BASE_YEAR);
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}

function renderResumeCard(offId) {
    const off = state.officials.byId[offId];
    if (!off) return '';
    const profile = off.profile || {};
    const exam = profile.examination || {};
    const family = profile.family || {};
    const entry = profile.entry || {};
    const personality = (profile.personality || []).join('、') || '未知';
    const mainPost = off.mainPost?.title || '未授实职';
    const conc = (off.concurrentPosts || []).map(p => p.title).join('、') || '无';
    const lastCareer = (profile.careerHistory || []).slice(-3).map(x => `${x.year}：${x.detail || x.event}`).join('；') || '暂无';
    const originPath = profile.originPath || deriveOriginPathFromExam(normalizeExamPath(exam.path || '')) || '未知';
    const childrenList = (family.children || []).slice(0, 3)
        .map(c => formatChildName(c, family.surname))
        .join('、') || '无';

    return `
        <details class="official-resume-card">
            <summary class="official-resume-summary">${off.name}</summary>
            <div class="official-resume-body">
                <div><span class="resume-k">本官</span><span class="resume-v">${mainPost}</span></div>
                <div><span class="resume-k">兼衔</span><span class="resume-v">${conc}</span></div>
                <div><span class="resume-k">出身</span><span class="resume-v">${profile.birthYear || '未知'}年生，${profile.birthPlace || '未知'}，${profile.birthStatus || '未知'}</span></div>
                <div><span class="resume-k">科举</span><span class="resume-v">${exam.path || '未知'}（${exam.year || '未知'}）</span></div>
                <div><span class="resume-k">出身路径</span><span class="resume-v">${originPath}</span></div>
                <div><span class="resume-k">家族</span><span class="resume-v">父${family.father || '未知'}，母${family.mother || '未知'}，配偶${family.spouse || '未知'}，子女${childrenList}</span></div>
                <div><span class="resume-k">性格</span><span class="resume-v">${personality}</span></div>
                <div><span class="resume-k">入仕</span><span class="resume-v">${entry.year || '未知'}年</span></div>
                <div><span class="resume-k">历任</span><span class="resume-v">${lastCareer}</span></div>
            </div>
        </details>
    `;
}

function promptGrantHonoraryTitle(title, rank) {
    const candidates = Object.values(state.officials.byId)
        .filter(o => o.status === 'in_service')
        .filter(o => !(o.concurrentPosts || []).some(p => p.title === title))
        .filter(o => !isHonoraryCandidateDisallowed(o, title))
        .filter(o => !hasConflictingHonorary(o, title))
        .filter(o => canHoldHonoraryTitle(title, o.mainPost?.rank || ''))
        .sort((a, b) => rankScore(b.mainPost?.rank || '未入流') - rankScore(a.mainPost?.rank || '未入流'));

    if (candidates.length === 0) {
        alert(`无可授予对象：${title}`);
        return;
    }

    const options = candidates.slice(0, 12);
    const lines = options.map((o, i) => `${i + 1}. ${o.name}（${o.mainPost?.title || '未授实职'} / ${o.mainPost?.rank || '未入流'}）`).join('\n');
    const answer = window.prompt(`授予 ${title}：请输入序号\n${lines}`);
    if (!answer) return;
    const index = Number.parseInt(answer, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
        alert('序号无效');
        return;
    }

    const picked = options[index];
    addConcurrentPost(picked.id, title, rank, 'honorary', OFFICIAL_TIMELINE_BASE_YEAR);
    if (!state.selectedOfficialId) state.selectedOfficialId = picked.id;
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}

function promptGrantCabinetTitle(title, rank) {
    const isAcademician = title.includes('内阁学士') && !title.includes('大学士');
    const isAssistant = title === '协办大学士';
    
    const candidates = Object.values(state.officials.byId)
        .filter(o => o.status === 'in_service')
        .filter(o => !(o.concurrentPosts || []).some(p => p.title === title))
        .filter(o => {
            if (isAcademician) {
                const mt = o.mainPost?.title || '';
                return mt.includes('侍郎') || mt.includes('詹事') || mt.includes('翰林院') || mt.includes('内阁侍读') || mt.includes('国子监');
            } else {
                const mainTitle = o.mainPost?.title || '';
                if (isAssistant && !mainTitle.includes('尚书')) return false;
                if (isAssistant && mainTitle.includes('大学士')) return false;
                if (!isAssistant && mainTitle.includes('尚书')) return false;
                return !o.concurrentPosts.some(p => isGrandSecretariatTitle(p.title)) && isCabinetEligibleOfficial(o);
            }
        })
        .sort((a, b) => rankScore(b.mainPost?.rank || '未入流') - rankScore(a.mainPost?.rank || '未入流'));

    if (candidates.length === 0) {
        alert(`无可授予对象：${title}`);
        return;
    }

    const options = candidates.slice(0, 15);
    const lines = options
        .map((o, i) => `${i + 1}. ${o.name}（${o.mainPost?.title || '未授实职'} / ${o.mainPost?.rank || '未入流'}）`)
        .join('\n');
    const tip = isAcademician ? `授予 ${title}（限侍郎/詹事/词臣）` : `授予 ${title}（限尚书/都御史）`;
    const answer = window.prompt(`${tip}：请输入序号\n${lines}`);
    if (!answer) return;

    const index = Number.parseInt(answer, 10) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= options.length) {
        alert('序号无效');
        return;
    }

    const picked = options[index];
    addConcurrentPost(picked.id, title, rank, 'concurrent', OFFICIAL_TIMELINE_BASE_YEAR);
    if (!state.selectedOfficialId) state.selectedOfficialId = picked.id;
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}

function renderSelectedOfficialDetail() {
    const detailContainer = document.getElementById('capital-official-detail');
    if (!detailContainer) return;
    const official = state.officials.byId[state.selectedOfficialId];
    if (!official) {
        detailContainer.innerHTML = '<div class="gov-empty">请选择左侧京官姓名查看详情</div>';
        return;
    }

    const profile = official.profile || {};
    const exam = profile.examination || {};
    const family = profile.family || {};
    const children = (family.children || [])
        .map(c => typeof c === 'string' ? c : formatChildName(c, family.surname))
        .join('、') || '无';
    const rewards = (profile.rewardsAndPunishments || [])
        .sort((a, b) => (a.year || 0) - (b.year || 0))
        .map(x => `${x.year} ${x.kind}${x.detail}`)
        .join('；') || '暂无';

    const posts = official.concurrentPosts || [];
    const renderPostBadges = (items) => (
        items.length > 0
            ? items.map(p => `<span class="concurrent-post-badge" data-offid="${official.id}" data-title="${p.title}">${p.title}<button class="concurrent-remove-btn" title="撤销此衔">✕</button></span>`).join('')
            : '无'
    );
    const concurrentHtml = renderPostBadges(posts.filter(p => (p.type || 'concurrent') === 'concurrent'));
    const honoraryHtml = renderPostBadges(posts.filter(p => p.type === 'honorary'));
    const powerHtml = renderPostBadges(posts.filter(p => p.type === 'power'));
    const powerQuickHtml = POWER_POST_TEMPLATES
        .map(t => `<button class="quick-post-btn" data-id="${official.id}" data-type="power" data-title="${t.title}">${t.title}</button>`)
        .join('');

    detailContainer.innerHTML = `
        <div class="capital-detail-card">
            <div class="capital-detail-name">${official.name}</div>
            <div class="capital-detail-grid">
                <div><span class="resume-k">本官</span><span class="resume-v">${official.mainPost?.title || '未授实职'}</span></div>
                <div><span class="resume-k" style="display:flex;align-items:center;gap:4px;">兼衔<button class="add-concurrent-btn" data-id="${official.id}" data-type="concurrent" style="font-size:0.8em;padding:0 2px;cursor:pointer;background:transparent;border:1px solid #7f8c8d;border-radius:3px;color:#f39c12;line-height:1;" title="加衔">(+)</button></span><span class="resume-v concurrent-posts-container">${concurrentHtml}</span></div>
                <div><span class="resume-k" style="display:flex;align-items:center;gap:4px;">虚衔<button class="add-concurrent-btn" data-id="${official.id}" data-type="honorary" style="font-size:0.8em;padding:0 2px;cursor:pointer;background:transparent;border:1px solid #7f8c8d;border-radius:3px;color:#f39c12;line-height:1;" title="加衔">(+)</button></span><span class="resume-v concurrent-posts-container">${honoraryHtml}</span></div>
                <div><span class="resume-k" style="display:flex;align-items:center;gap:4px;">实权<button class="add-concurrent-btn" data-id="${official.id}" data-type="power" style="font-size:0.8em;padding:0 2px;cursor:pointer;background:transparent;border:1px solid #7f8c8d;border-radius:3px;color:#f39c12;line-height:1;" title="加衔">(+)</button></span><span class="resume-v concurrent-posts-container">${powerHtml}<div class="power-quick-buttons">${powerQuickHtml}</div></span></div>
                <div><span class="resume-k">出生</span><span class="resume-v">${profile.birthYear || official.birthYear || '未知'}年，${profile.birthPlace || '未知'}，${profile.birthStatus || '未知'}</span></div>
                <div><span class="resume-k">科举</span><span class="resume-v">${exam.path || '未知'}（${exam.year || '未知'}）</span></div>
                <div><span class="resume-k">家族</span><span class="resume-v">父${family.father || '未知'}，母${family.mother || '未知'}，配偶${family.spouse || '未知'}，子女${children}</span></div>
                <div><span class="resume-k">性格</span><span class="resume-v">${(profile.personality || []).join('、') || '未知'}</span></div>
                <div><span class="resume-k">入仕</span><span class="resume-v">${profile.entry?.year || official.serviceStartYear || '未知'}年</span></div>
                <div><span class="resume-k" style="display:flex;align-items:center;gap:4px;">历任<button class="regen-career-btn" data-id="${official.id}" title="重生成履历">重生成</button></span><span class="resume-v">${getTimelineText(official)}</span></div>
                <div><span class="resume-k">奖惩</span><span class="resume-v">${rewards}</span></div>
            </div>
        </div>
    `;

    detailContainer.querySelectorAll('.add-concurrent-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            promptAddPostForOfficial(btn.dataset.id, btn.dataset.type || 'concurrent');
        });
    });

    detailContainer.querySelectorAll('.quick-post-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const offId = btn.dataset.id;
            const title = btn.dataset.title;
            addPowerPost(offId, title);
        });
    });

    detailContainer.querySelectorAll('.concurrent-remove-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const postBadge = btn.parentElement;
            const offId = postBadge.dataset.offid;
            const title = postBadge.dataset.title;
            revokeConcurrentPostFromOfficial(offId, title);
        });
    });

    detailContainer.querySelectorAll('.regen-career-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const offId = btn.dataset.id;
            const official = state.officials.byId[offId];
            if (!official) return;
            regenerateCareerHistory(official, true);
            renderSelectedOfficialDetail();
        });
    });
}

function renderCapitalLeftOfficialList() {
    const leftPane = document.getElementById('capital-left-pane');
    const jumpsContainer = document.getElementById('capital-left-rank-jumps');
    const listContainer = document.getElementById('capital-left-official-list');
    if (!leftPane || !listContainer || !jumpsContainer) return;

    const openedFoldKeys = new Set(
        Array.from(listContainer.querySelectorAll('.capital-left-post-fold'))
            .filter(node => node.open)
            .map(node => node.dataset.foldKey)
            .filter(Boolean)
    );

    const sectionState = state.capitalSectionOpen || {};
    Array.from(listContainer.querySelectorAll('.capital-honorary-fold'))
        .forEach(node => {
            if (node.dataset.foldKey) {
                sectionState[node.dataset.foldKey] = node.open;
            }
        });
    state.capitalSectionOpen = sectionState;

    const positionOrderMap = getPositionOrderMap();

    const honoraryTitles = {};
    const honoraryPrestige = {};
    const centralTitles = {};
    Object.entries(officialData).forEach(([rank, positions]) => {
        positions.forEach(pos => {
            if (pos.type === 'honorary') {
                if (getHonoraryGroup(pos.title)) {
                    honoraryPrestige[pos.title] = { rank, holders: [] };
                } else {
                    honoraryTitles[pos.title] = { rank, holders: [] };
                }
            }
            if (pos.title.includes('大学士')) {
                centralTitles[pos.title] = { rank, type: pos.type || 'standing', holders: [] };
            }
        });
    });

    Object.values(state.officials.byId).forEach(off => {
        const mainTitle = off.mainPost?.title || '';
        if (centralTitles[mainTitle]) {
            centralTitles[mainTitle].holders.push({
                name: off.name,
                rank: off.mainPost?.rank || '未入流',
                mainPost: mainTitle,
                acquiredYear: off.mainPost?.acquiredYear || '未知'
            });
        }
        off.concurrentPosts?.forEach(post => {
            if (honoraryTitles[post.title]) {
                honoraryTitles[post.title].holders.push({
                    name: off.name,
                    rank: off.mainPost?.rank || '未入流',
                    acquiredYear: post.acquiredYear
                });
            }
            if (honoraryPrestige[post.title]) {
                honoraryPrestige[post.title].holders.push({
                    name: off.name,
                    rank: off.mainPost?.rank || '未入流',
                    acquiredYear: post.acquiredYear
                });
            }
            if (centralTitles[post.title]) {
                centralTitles[post.title].holders.push({
                    name: off.name,
                    rank: off.mainPost?.rank || '未入流',
                    mainPost: off.mainPost?.title || '未授实职',
                    acquiredYear: post.acquiredYear
                });
            }
        });
    });

    const centralSection = Object.keys(centralTitles).length > 0 ? `
        <details class="capital-honorary-fold" data-fold-key="central">
            <summary>中枢</summary>
            <div class="capital-honorary-body">
                ${Object.entries(centralTitles).map(([title, info]) => {
                    const holders = info.holders.length > 0
                        ? info.holders.map(h => `<span class="honorary-holder">${h.name}（${h.mainPost || title}，${h.acquiredYear}）</span>`).join('')
                        : '<span class="honorary-empty">暂缺</span>';
                    const grantBtn = info.type === 'concurrent'
                        ? `<button class="cabinet-grant-btn" data-title="${title}" data-rank="${info.rank}">授予</button>`
                        : '';
                    return `<div class="honorary-title-item"><strong>${title}</strong>${grantBtn}<br/>${holders}</div>`;
                }).join('')}
            </div>
        </details>
    ` : '';

    const honorarySection = Object.keys(honoraryTitles).length > 0 ? `
        <details class="capital-honorary-fold" data-fold-key="honorary">
            <summary>虚衔</summary>
            <div class="capital-honorary-body">
                ${Object.entries(honoraryTitles).map(([title, info]) => {
                    const holders = info.holders.length > 0 
                        ? info.holders.map(h => `<span class="honorary-holder">${h.name}（${h.rank}，${h.acquiredYear}）</span>`).join('')
                        : '<span class="honorary-empty">虚位以待</span>';
                    return `<div class="honorary-title-item"><strong>${title}</strong><button class="honorary-grant-btn" data-title="${title}" data-rank="${info.rank}">授予</button><br/>${holders}</div>`;
                }).join('')}
            </div>
        </details>
    ` : '';

    const honoraryPrestigeSection = Object.keys(honoraryPrestige).length > 0 ? `
        <details class="capital-honorary-fold" data-fold-key="prestige">
            <summary>荣誉职位</summary>
            <div class="capital-honorary-body">
                ${Object.entries(honoraryPrestige).map(([title, info]) => {
                    const holders = info.holders.length > 0 
                        ? info.holders.map(h => `<span class="honorary-holder">${h.name}（${h.rank}，${h.acquiredYear}）</span>`).join('')
                        : '<span class="honorary-empty">虚位以待</span>';
                    return `<div class="honorary-title-item"><strong>${title}</strong><button class="honorary-grant-btn" data-title="${title}" data-rank="${info.rank}">授予</button><br/>${holders}</div>`;
                }).join('')}
            </div>
        </details>
    ` : '';

    const grouped = {};
    listOfficialsByMainRank().forEach(off => {
        const rank = off.mainPost?.rank || '未入流';
        if (!grouped[rank]) grouped[rank] = [];
        grouped[rank].push(off);
    });

    const assistantOfficials = Object.values(state.officials.byId)
        .filter(off => (off.concurrentPosts || []).some(p => p.title === '协办大学士'));

    const visibleRanks = OFFICIAL_RANK_ORDER
        .filter(rank => Array.isArray(grouped[rank]) && grouped[rank].length > 0);
    const rankBlocks = visibleRanks.map((rank, rankIdx) => {
        const rankOfficials = [...grouped[rank]].sort((a, b) => {
            const ao = positionOrderMap.get(a.mainPost?.title || '') ?? 9999;
            const bo = positionOrderMap.get(b.mainPost?.title || '') ?? 9999;
            if (ao !== bo) return ao - bo;
            const ay = a.mainPost?.acquiredYear || 0;
            const by = b.mainPost?.acquiredYear || 0;
            return ay - by;
        });

        const posGrouped = {};
        rankOfficials.forEach(off => {
            const pos = off.mainPost?.title || '候补';
            if (!posGrouped[pos]) posGrouped[pos] = [];
            posGrouped[pos].push(off);
        });

        if (rank === '正一品' && assistantOfficials.length > 0) {
            posGrouped['协办大学士'] = assistantOfficials;
        }

        const posSections = Object.keys(posGrouped)
            .sort((a, b) => (positionOrderMap.get(a) ?? 9999) - (positionOrderMap.get(b) ?? 9999))
            .map(pos => {
                const offs = posGrouped[pos];
                const rows = offs.map(off => {
                    const selected = off.id === state.selectedOfficialId ? 'is-active' : '';
                    const subtitle = `${off.age}岁｜${off.mainPost?.acquiredYear || '未知'}授`;
                    return `<button class="capital-left-official ${selected}" data-offid="${off.id}"><span>${off.name}</span><small>${subtitle}</small></button>`;
                }).join('');

                if (isCollapsiblePostTitle(pos) || offs.length >= 6) {
                    const foldKey = `${rank}::${pos}`;
                    return `
                        <details class="capital-left-post-fold" data-fold-key="${foldKey}">
                            <summary><span>${pos}（${offs.length}员）</span><small>点击展开</small></summary>
                            <div class="capital-left-post-body">${rows}</div>
                        </details>
                    `;
                }

                return `
                    <div class="capital-left-post-group">
                        <div class="capital-left-post-title">${pos}（${offs.length}员）</div>
                        <div class="capital-left-post-body">${rows}</div>
                    </div>
                `;
            }).join('');

        return `<div id="capital-rank-${rankIdx}" class="capital-left-rank"><div class="capital-left-rank-title">${rank}</div>${posSections}</div>`;
    }).join('');

    listContainer.innerHTML = (centralSection + honorarySection + honoraryPrestigeSection + rankBlocks) || '<div class="gov-empty">暂无京官</div>';
    jumpsContainer.innerHTML = visibleRanks
        .map((rank, idx) => `<button class="capital-rank-jump" data-target="capital-rank-${idx}">${rank}</button>`)
        .join('');

    listContainer.querySelectorAll('.capital-left-official').forEach(btn => {
        btn.addEventListener('click', () => {
            selectCapitalOfficial(btn.dataset.offid);
        });
    });

    jumpsContainer.querySelectorAll('.capital-rank-jump').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = document.getElementById(btn.dataset.target);
            if (!target) return;
            listContainer.scrollTo({ top: target.offsetTop - 6, behavior: 'smooth' });
        });
    });

    listContainer.querySelectorAll('.honorary-grant-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            promptGrantHonoraryTitle(btn.dataset.title || '', btn.dataset.rank || '未入流');
        });
    });

    listContainer.querySelectorAll('.cabinet-grant-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.preventDefault();
            promptGrantCabinetTitle(btn.dataset.title || '', btn.dataset.rank || '未入流');
        });
    });

    listContainer.querySelectorAll('.capital-left-post-fold').forEach(node => {
        if (openedFoldKeys.has(node.dataset.foldKey)) {
            node.open = true;
        }
    });

    listContainer.querySelectorAll('.capital-honorary-fold').forEach(node => {
        const key = node.dataset.foldKey;
        if (key && Object.prototype.hasOwnProperty.call(state.capitalSectionOpen, key)) {
            node.open = !!state.capitalSectionOpen[key];
            return;
        }
        node.open = true;
    });

    listContainer.querySelectorAll('.capital-honorary-fold').forEach(node => {
        const key = node.dataset.foldKey;
        if (!key) return;
        node.addEventListener('toggle', () => {
            state.capitalSectionOpen[key] = node.open;
        });
    });
}

function promptAddPostForOfficial(offId, defaultType = 'concurrent') {
    const titleRaw = window.prompt("请输入要加的兼衔/虚衔/实权名称（如：太子太保，内阁学士，管理户部等）：");
    if (!titleRaw) return;
    const title = titleRaw.trim();
    if (!title) return;
    
    let rank = '从一品';
    let type = defaultType;
    let found = false;
    for (const [r, list] of Object.entries(officialData)) {
        const item = list.find(p => p.title === title);
        if (item) {
            rank = r;
            if (item.type === 'honorary') type = 'honorary';
            else if (item.type === 'concurrent') type = 'concurrent';
            found = true;
            break;
        }
    }
    
    if (!found) {
        if (!window.confirm(`未在官制库中找到名[${title}]，确定要强行授予吗？`)) {
            return;
        }
    }
    
    addConcurrentPost(offId, title, rank, type, OFFICIAL_TIMELINE_BASE_YEAR);
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}

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

export function selectCapitalOfficial(offId) {
    if (!state.officials.byId[offId]) return;
    state.selectedOfficialId = offId;
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
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

export function renderCapitalOfficials() {
    ensureCapitalOfficialsInitialized();

    if (!state.selectedOfficialId || !state.officials.byId[state.selectedOfficialId]) {
        const first = listOfficialsByMainRank()[0];
        state.selectedOfficialId = first ? first.id : null;
    }

    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
    syncCapitalModeUI();
}
