import {
    officialData,
    CAPITAL_MAX_GOVERNORS,
    CAPITAL_REGION_COLORS,
    CAPITAL_GOVERNOR_PAIR_ABBR,
    CAPITAL_PROV_SHORT,
    OFFICIAL_ASSIGNMENT_RULES,
    OFFICIAL_PROFILE_POOLS,
    OFFICIAL_RANK_ORDER,
    OFFICIAL_TIMELINE_BASE_YEAR,
    EXAMINATION_HIERARCHY,
    RANK_TO_PREFERRED_EXAM
} from './constants.js';
import { NameGen } from './nameGen.js';
import { state } from './state.js';
import { refreshTerritoryPaint, highlightSelection } from './map.js';

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
    if (provNames.length === 2 || provNames.length === 3) {
        const key = provNames.slice().sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).join('|');
        if (CAPITAL_GOVERNOR_PAIR_ABBR[key]) return CAPITAL_GOVERNOR_PAIR_ABBR[key];
    }
    return provNames.map(getProvinceShortName).join('');
}

export function generateRoster(template) {
    return template.map(tmpl => {
        let names = [];
        for (let i = 0; i < tmpl.quota; i++) {
            names.push(NameGen.person());
        }
        return { title: tmpl.title, rank: tmpl.rank, quota: tmpl.quota, names };
    });
}

function ensureOfficialsStateShape() {
    if (!state.officials || typeof state.officials !== 'object') {
        state.officials = { byId: {}, byPosition: {}, nextId: 1 };
        return;
    }
    if (!state.officials.byId || typeof state.officials.byId !== 'object') {
        state.officials.byId = {};
    }
    if (!state.officials.byPosition || typeof state.officials.byPosition !== 'object') {
        state.officials.byPosition = {};
    }
    if (!Number.isInteger(state.officials.nextId) || state.officials.nextId < 1) {
        state.officials.nextId = 1;
    }

    Object.values(state.officials.byId).forEach(off => {
        if (!off.profile || typeof off.profile !== 'object') {
            const profile = buildOfficialProfile(off.name, Number.isInteger(off.age) ? off.age : undefined);
            off.age = Number.isInteger(off.age) ? off.age : profile.age;
            off.birthYear = off.birthYear || profile.birthYear;
            off.profile = profile;
            off.serviceStartYear = off.serviceStartYear || profile.entry.year;
        }
        if (!Array.isArray(off.profile.postTimeline)) {
            off.profile.postTimeline = [];
        }
        if (!Array.isArray(off.concurrentPosts)) {
            off.concurrentPosts = [];
        }
        if (off.mainPost?.rank) {
            const year = off.mainPost.acquiredYear || OFFICIAL_TIMELINE_BASE_YEAR;
            ensureExamPathForMainPost(off, off.mainPost.rank, off.mainPost.title, year);
        }
    });
}

function getJobSlots(job) {
    return Number.isInteger(job?.quota) && job.quota > 0 ? job.quota : 1;
}

function surnameOf(name = '') {
    return name.slice(0, 1) || '';
}

function randomSurname() {
    return NameGen.weightedPick(NameGen.surnamesWeighted);
}

function genGivenName() {
    const a = NameGen.get(NameGen.givenChars);
    const b = Math.random() > 0.45 ? NameGen.get(NameGen.givenChars) : '';
    return `${a}${b}`;
}

function makeMaleNameBySurname(surname) {
    return `${surname}${genGivenName()}`;
}

function makeShiName() {
    return `${randomSurname()}氏`;
}

function formatChildName(child, familySurname) {
    if (!child || !familySurname) return '未知';
    if (child.gender === '女') {
        return `${familySurname}氏`;
    }
    return child.name || '未知';
}

function getRankTargetAge(rank) {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return 36;
    const raw = Math.round(58 - idx * 1.8);
    return Math.max(24, Math.min(60, raw));
}

function estimateMainPostYear(official, rank) {
    const targetAge = getRankTargetAge(rank) + (Math.floor(Math.random() * 5) - 2);
    const byAge = (official.birthYear || (OFFICIAL_TIMELINE_BASE_YEAR - official.age)) + targetAge;
    const minYear = Math.max((official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 10) + 2, (official.profile?.examination?.year || 0) + 1);
    return Math.max(minYear, Math.min(OFFICIAL_TIMELINE_BASE_YEAR, byAge));
}

function estimateConcurrentYear(official, rank, type) {
    const base = official.mainPost?.acquiredYear || official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 8;
    const rankAdj = Math.max(0, 4 - Math.floor(rankScore(rank) / 4));
    const honorAdj = type === 'honorary' ? 4 : 2;
    const guess = base + honorAdj + rankAdj + Math.floor(Math.random() * 4);
    return Math.max(base, Math.min(OFFICIAL_TIMELINE_BASE_YEAR, guess));
}

function randomPick(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickDistinctTraits() {
    const pool = [...OFFICIAL_PROFILE_POOLS.personalities];
    const count = 2 + Math.floor(Math.random() * 2);
    const traits = [];
    while (traits.length < count && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        traits.push(pool.splice(idx, 1)[0]);
    }
    return traits;
}

function pickExamPathByRank(rank, positionTitle = '') {
    const preferred = getExamTargetsForPost(rank, positionTitle);
    const weighted = preferred.map((path, idx) => ({
        path,
        weight: 10 - idx * 2
    }));
    const total = weighted.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * total;
    for (const item of weighted) {
        roll -= item.weight;
        if (roll <= 0) return item.path;
    }
    return preferred[0];
}

function normalizeExamPath(path = '') {
    if (path === '进士') return '进士·三甲';
    return path;
}

function isAtLeastThirdRank(rank = '') {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return false;
    return idx <= OFFICIAL_RANK_ORDER.indexOf('从三品');
}

function isAtLeastSecondRank(rank = '') {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return false;
    return idx <= OFFICIAL_RANK_ORDER.indexOf('从二品');
}

function getHonoraryRequiredRank(title = '') {
    const strictTitles = [
        '少师', '少傅', '少保',
        '太子太师', '太子太傅', '太子太保',
        '太子少师', '太子少傅', '太子少保'
    ];
    return strictTitles.includes(title) ? '从二品' : null;
}


function getHonoraryGroup(title) {
    if (['太师', '太傅', '太保'].includes(title)) return '三公';
    if (['少师', '少傅', '少保'].includes(title)) return '三孤';
    if (['太子太师', '太子太傅', '太子太保'].includes(title)) return '太子三师';
    if (['太子少师', '太子少傅', '太子少保'].includes(title)) return '太子三孤';
    return null;
}

function hasConflictingHonorary(official, newTitle) {
    const newGroup = getHonoraryGroup(newTitle);
    if (!newGroup) return false;
    return (official.concurrentPosts || []).some(p => getHonoraryGroup(p.title) !== null);
}

function canHoldHonoraryTitle(title = '', mainRank = '') {
    const requiredRank = getHonoraryRequiredRank(title);
    if (!requiredRank) return true;
    const curIdx = OFFICIAL_RANK_ORDER.indexOf(mainRank);
    const reqIdx = OFFICIAL_RANK_ORDER.indexOf(requiredRank);
    if (curIdx < 0 || reqIdx < 0) return false;
    return curIdx <= reqIdx;
}

function getHanlinExamTargets(rank = '', positionTitle = '') {
    const strictHanlinTitles = [
        '翰林院掌院学士',
        '翰林院侍读学士',
        '翰林院侍讲学士',
        '内阁侍读学士',
        '翰林院侍读',
        '翰林院侍讲',
        '翰林院修撰',
        '翰林院编修',
        '翰林院检讨'
    ];
    if (strictHanlinTitles.some(t => positionTitle.includes(t))) {
        return ['进士·二甲', '进士·一甲'];
    }
    return null;
}

function getExamTargetsForPost(rank = '', positionTitle = '') {
    const hanlinTargets = getHanlinExamTargets(rank, positionTitle);
    if (hanlinTargets) return hanlinTargets;

    const jinshiHeavyKeywords = [
        '博士',
        '郎中',
        '主事',
        '员外郎',
        '给事中',
        '中书',
        '洗马',
        '庶子',
        '中允',
        '赞善'
    ];
    if (jinshiHeavyKeywords.some(k => positionTitle.includes(k))) {
        return ['进士·三甲', '进士·二甲', '进士·一甲', '举人'];
    }

    return RANK_TO_PREFERRED_EXAM[rank] || RANK_TO_PREFERRED_EXAM.default;
}

function hasHanlinCredential(official) {
    const examPath = normalizeExamPath(official?.profile?.examination?.path || '');
    if (examPath === '进士·一甲' || examPath === '进士·二甲' || examPath === '进士·三甲') return true;

    const mainTitle = official?.mainPost?.title || '';
    return mainTitle.includes('翰林院') || mainTitle.includes('内阁侍读学士') || mainTitle.includes('内阁学士');
}

function ensureExamPathForMainPost(official, rank, positionTitle, appointedYear) {
    if (!official?.profile) return;
    const exam = official.profile.examination || {};
    const preferred = getExamTargetsForPost(rank, positionTitle);
    const currentPath = normalizeExamPath(exam.path || '');
    const isTopRank = OFFICIAL_RANK_ORDER.indexOf(rank) <= OFFICIAL_RANK_ORDER.indexOf('从二品');

    let nextPath = currentPath;
    const needUpgrade = !preferred.includes(currentPath)
        || (isTopRank && !currentPath.startsWith('进士'));

    if (needUpgrade) {
        nextPath = preferred[0] || pickExamPathByRank(rank, positionTitle);
        if (preferred.length > 1) {
            const roll = Math.random();
            if (roll > 0.72) nextPath = preferred[Math.min(1, preferred.length - 1)];
            if (roll > 0.92) nextPath = preferred[Math.min(2, preferred.length - 1)];
        }
    }

    official.profile.examination = {
        ...exam,
        path: nextPath || pickExamPathByRank(rank, positionTitle),
        year: Math.max(official.birthYear + 16, Math.min(appointedYear - 1, exam.year || appointedYear - 2)),
        attempts: Number.isInteger(exam.attempts) ? exam.attempts : (1 + Math.floor(Math.random() * 3))
    };
}

function shouldAutoGrantHonorary(title = '') {
    const keepVacant = ['太师', '太傅', '太保', '保和殿大学士'];
    return !keepVacant.includes(title);
}

function isGrandSecretariatTitle(title = '') {
    return title.includes('大学士');
}

function isCabinetEligibleOfficial(official) {
    const mainTitle = official?.mainPost?.title || '';
    const mainRank = official?.mainPost?.rank || '未入流';
    const isSecretary = mainTitle.includes('尚书') || mainTitle.includes('都御史');
    if (!isSecretary) return false;
    if (mainRank !== '从一品') return false;
    return hasHanlinCredential(official);
}

function revokeConcurrentTitleFromAll(positionTitle, endYear = OFFICIAL_TIMELINE_BASE_YEAR) {
    Object.values(state.officials.byId).forEach(official => {
        if (!official?.concurrentPosts) return;
        const hadTitle = official.concurrentPosts.some(p => p.title === positionTitle);
        if (!hadTitle) return;

        official.concurrentPosts = official.concurrentPosts.filter(p => p.title !== positionTitle);

        if (Array.isArray(official.profile?.postTimeline)) {
            official.profile.postTimeline.forEach(item => {
                if (item.title === positionTitle && !Number.isInteger(item.endYear)) {
                    item.endYear = endYear;
                }
            });
        }
    });

    if (Array.isArray(state.officials.byPosition[positionTitle])) {
        state.officials.byPosition[positionTitle] = state.officials.byPosition[positionTitle]
            .filter(x => x.isMain);
    }
}

function rankScore(rank) {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    return idx >= 0 ? OFFICIAL_RANK_ORDER.length - idx : 1;
}

function getRuleForPost(title, type) {
    const base = {
        ...OFFICIAL_ASSIGNMENT_RULES.default,
        ...(OFFICIAL_ASSIGNMENT_RULES[type] || {})
    };
    const special = OFFICIAL_ASSIGNMENT_RULES.byTitle[title] || {};
    return {
        ...base,
        ...special,
        preferredMainPosts: [...(base.preferredMainPosts || []), ...(special.preferredMainPosts || [])],
        preferredMainPostKeywords: [...(base.preferredMainPostKeywords || []), ...(special.preferredMainPostKeywords || [])]
    };
}

function weightedPickByRule(title, rank, type) {
    const rule = getRuleForPost(title, type);
    const pool = Object.values(state.officials.byId).filter(o => {
        if (o.status !== 'in_service') return false;
        if (o.concurrentPosts.some(p => p.title === title)) return false;
        if ((o.concurrentPosts.length || 0) >= (rule.maxConcurrent || 3)) return false;
        if (o.age < (rule.minAge || 24)) return false;
        if (type === 'honorary' && !canHoldHonoraryTitle(title, o.mainPost?.rank || '')) return false;
        if (type === 'honorary' && hasConflictingHonorary(o, title)) return false;
        if (isGrandSecretariatTitle(title) && !isCabinetEligibleOfficial(o)) return false;
        if (isGrandSecretariatTitle(title) && o.concurrentPosts.some(p => isGrandSecretariatTitle(p.title))) return false;
        return true;
    });
    if (pool.length === 0) return null;

    const scored = pool.map(o => {
        let weight = 1;
        const mainTitle = o.mainPost?.title || '';
        if (rule.preferredMainPosts.includes(mainTitle)) weight += 8;
        if ((rule.preferredMainPostKeywords || []).some(k => mainTitle.includes(k))) weight += 4;
        if (type === 'honorary' && o.age >= (rule.oldMinisterBonusAge || 55)) weight += 6;
        weight += Math.max(0, rankScore(o.mainPost?.rank || '') - 3);
        weight += Math.max(0, Math.floor((OFFICIAL_TIMELINE_BASE_YEAR - (o.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR)) / 8));

        if (title.includes('大学士')) {
            if (mainTitle.includes('尚书') || mainTitle.includes('都御史')) {
                weight += 28;
            } else {
                weight = Math.max(1, weight * 0.35);
            }
        }
        
        const examPath = normalizeExamPath(o.profile?.examination?.path || 'unknown');
        const examHierarchy = EXAMINATION_HIERARCHY[examPath] || 0;
        const preferredExams = RANK_TO_PREFERRED_EXAM[rank] || RANK_TO_PREFERRED_EXAM.default;
        if (preferredExams.includes(examPath)) {
            const preferIdx = preferredExams.indexOf(examPath);
            weight += (preferredExams.length - preferIdx) * 2;
        } else {
            weight *= 0.6;
        }
        weight += examHierarchy / 20;
        
        return { id: o.id, weight: Math.max(weight, 1) };
    });

    const total = scored.reduce((s, x) => s + x.weight, 0);
    let roll = Math.random() * total;
    for (const item of scored) {
        roll -= item.weight;
        if (roll <= 0) return item.id;
    }
    return scored[scored.length - 1]?.id || null;
}

function buildOfficialProfile(fullName, ageInput) {
    const familySurname = surnameOf(fullName) || randomSurname();
    const age = Number.isInteger(ageInput) ? ageInput : 26 + Math.floor(Math.random() * 35);
    const birthYear = OFFICIAL_TIMELINE_BASE_YEAR - age;
    const serviceStartYear = birthYear + 18 + Math.floor(Math.random() * 8);
    
    let examPath = randomPick(OFFICIAL_PROFILE_POOLS.examPaths);
    if (examPath === '进士') {
        const roll = Math.random();
        if (roll < 0.05) examPath = '进士·一甲';
        else if (roll < 0.25) examPath = '进士·二甲';
        else examPath = '进士·三甲';
    }
    const examYear = serviceStartYear - Math.floor(Math.random() * 3);
    
    const childrenCount = Math.floor(Math.random() * 4) + 1;
    const children = Array.from({ length: childrenCount }, () => {
        const gender = Math.random() > 0.5 ? '男' : '女';
        const baseName = makeMaleNameBySurname(familySurname);
        return { name: baseName, gender };
    });

    return {
        age,
        birthYear,
        birthPlace: randomPick(OFFICIAL_PROFILE_POOLS.birthPlaces),
        birthStatus: randomPick(OFFICIAL_PROFILE_POOLS.birthStatus),
        examination: {
            path: examPath,
            year: examYear,
            attempts: 1 + Math.floor(Math.random() * 4)
        },
        family: {
            surname: familySurname,
            father: makeMaleNameBySurname(familySurname),
            mother: makeShiName(),
            spouse: makeShiName(),
            children
        },
        personality: pickDistinctTraits(),
        entry: {
            year: serviceStartYear,
            route: randomPick(OFFICIAL_PROFILE_POOLS.entryRoutes)
        },
        postTimeline: [],
        careerHistory: [
            { year: serviceStartYear, event: '入仕', detail: '初授候补' }
        ],
        rewardsAndPunishments: [
            { year: serviceStartYear + 2, kind: '奖', detail: randomPick(OFFICIAL_PROFILE_POOLS.meritEvents) },
            { year: serviceStartYear + 4, kind: '惩', detail: randomPick(OFFICIAL_PROFILE_POOLS.demeritEvents) }
        ]
    };
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
                <div><span class="resume-k">科举</span><span class="resume-v">${exam.path || '未知'}（${exam.year || '未知'}），应试${exam.attempts || '未知'}次</span></div>
                <div><span class="resume-k">家族</span><span class="resume-v">父${family.father || '未知'}，母${family.mother || '未知'}，配偶${family.spouse || '未知'}，子女${childrenList}</span></div>
                <div><span class="resume-k">性格</span><span class="resume-v">${personality}</span></div>
                <div><span class="resume-k">入仕</span><span class="resume-v">${entry.year || '未知'}年，${entry.route || '未知'}</span></div>
                <div><span class="resume-k">历任</span><span class="resume-v">${lastCareer}</span></div>
            </div>
        </details>
    `;
}

function ensureCapitalOfficialsInitialized() {
    ensureOfficialsStateShape();
    if (Object.keys(state.officials.byId).length > 0) return;

    for (const [rank, jobs] of Object.entries(officialData)) {
        const standingJobs = jobs.filter(job => (job.type || 'standing') === 'standing');
        standingJobs.forEach(job => {
            const slots = getJobSlots(job);
            for (let i = 0; i < slots; i++) {
                const offId = createOfficial(NameGen.person());
                const official = state.officials.byId[offId];
                const appointYear = estimateMainPostYear(official, rank);
                assignMainPost(offId, job.title, rank, 'standing', appointYear);
            }
        });
    }

    for (const [rank, jobs] of Object.entries(officialData)) {
        const grantJobs = jobs.filter(job => {
            const type = job.type || 'standing';
            return type === 'concurrent' || type === 'honorary';
        });
        grantJobs.forEach(job => {
            if (!shouldAutoGrantHonorary(job.title)) return;
            const slots = getJobSlots(job);
            for (let i = 0; i < slots; i++) {
                const offId = weightedPickByRule(job.title, rank, job.type || 'concurrent');
                if (!offId) break;
                const official = state.officials.byId[offId];
                const grantYear = estimateConcurrentYear(official, rank, job.type || 'concurrent');
                addConcurrentPost(offId, job.title, rank, job.type || 'concurrent', grantYear);
            }
        });
    }
}

function listOfficialsByMainRank() {
    const ranks = OFFICIAL_RANK_ORDER;
    const all = Object.values(state.officials.byId);
    all.sort((a, b) => {
        const ar = a.mainPost?.rank || '未入流';
        const br = b.mainPost?.rank || '未入流';
        const ai = ranks.indexOf(ar);
        const bi = ranks.indexOf(br);
        if (ai !== bi) return ai - bi;
        return (a.mainPost?.acquiredYear || 0) - (b.mainPost?.acquiredYear || 0);
    });
    return all;
}

const COLLAPSIBLE_POST_KEYWORDS = [
    '笔帖式',
    '郎中',
    '主事',
    '翰林院编修',
    '内阁中书',
    '办事中书'
];

function isCollapsiblePostTitle(title = '') {
    return COLLAPSIBLE_POST_KEYWORDS.some(k => title.includes(k));
}

function getPositionOrderMap() {
    const order = new Map();
    let idx = 0;
    OFFICIAL_RANK_ORDER.forEach(rank => {
        const jobs = officialData[rank] || [];
        jobs.forEach(job => {
            if (!order.has(job.title)) {
                order.set(job.title, idx++);
            }
        });
    });
    return order;
}

function getTimelineText(official) {
    const timeline = [...(official.profile?.postTimeline || [])]
        .sort((a, b) => (a.startYear || 0) - (b.startYear || 0));
    if (timeline.length === 0) return '暂无任官记录';
    return timeline.map(item => {
        const end = Number.isInteger(item.endYear) ? item.endYear : '今';
        const tag = item.type === 'standing' ? '本官' : '兼衔';
        return `${item.startYear}-${end} ${item.title}（${tag}）`;
    }).join('；');
}

function promptGrantHonoraryTitle(title, rank) {
    const candidates = Object.values(state.officials.byId)
        .filter(o => o.status === 'in_service')
        .filter(o => !(o.concurrentPosts || []).some(p => p.title === title))
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
    
    const candidates = Object.values(state.officials.byId)
        .filter(o => o.status === 'in_service')
        .filter(o => !(o.concurrentPosts || []).some(p => p.title === title))
        .filter(o => {
            if (isAcademician) {
                const mt = o.mainPost?.title || '';
                return mt.includes('侍郎') || mt.includes('詹事') || mt.includes('翰林院') || mt.includes('内阁侍读') || mt.includes('国子监');
            } else {
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

    const concurrentHtml = (official.concurrentPosts && official.concurrentPosts.length > 0)
        ? official.concurrentPosts.map(p => `<span class="concurrent-post-badge" data-offid="${official.id}" data-title="${p.title}">${p.title}<button class="concurrent-remove-btn" title="撤销此衔">✕</button></span>`).join('')
        : '无';

    detailContainer.innerHTML = `
        <div class="capital-detail-card">
            <div class="capital-detail-name">${official.name}</div>
            <div class="capital-detail-grid">
                <div><span class="resume-k">本官</span><span class="resume-v">${official.mainPost?.title || '未授实职'}</span></div>
                <div><span class="resume-k" style="display:flex;align-items:center;gap:4px;">兼衔<button class="add-concurrent-btn" data-id="${official.id}" style="font-size:0.8em;padding:0 2px;cursor:pointer;background:transparent;border:1px solid #7f8c8d;border-radius:3px;color:#f39c12;line-height:1;" title="加衔">(+)</button></span><span class="resume-v concurrent-posts-container">${concurrentHtml}</span></div>
                <div><span class="resume-k">出生</span><span class="resume-v">${profile.birthYear || official.birthYear || '未知'}年，${profile.birthPlace || '未知'}，${profile.birthStatus || '未知'}</span></div>
                <div><span class="resume-k">科举</span><span class="resume-v">${exam.path || '未知'}（${exam.year || '未知'}），应试${exam.attempts || '未知'}次</span></div>
                <div><span class="resume-k">家族</span><span class="resume-v">父${family.father || '未知'}，母${family.mother || '未知'}，配偶${family.spouse || '未知'}，子女${children}</span></div>
                <div><span class="resume-k">性格</span><span class="resume-v">${(profile.personality || []).join('、') || '未知'}</span></div>
                <div><span class="resume-k">入仕</span><span class="resume-v">${profile.entry?.year || official.serviceStartYear || '未知'}年，${profile.entry?.route || '未知'}</span></div>
                <div><span class="resume-k">历任</span><span class="resume-v">${getTimelineText(official)}</span></div>
                <div><span class="resume-k">奖惩</span><span class="resume-v">${rewards}</span></div>
            </div>
        </div>
    `;

    detailContainer.querySelectorAll('.add-concurrent-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            promptAddConcurrentForOfficial(btn.dataset.id);
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

    const positionOrderMap = getPositionOrderMap();

    const honoraryTitles = {};
    const cabinetConcurrent = {};
    Object.entries(officialData).forEach(([rank, positions]) => {
        positions.forEach(pos => {
            if (pos.type === 'honorary') {
                honoraryTitles[pos.title] = { rank, holders: [] };
            }
            if (pos.type === 'concurrent' && (pos.title.includes('大学士') || pos.title.includes('内阁学士'))) {
                cabinetConcurrent[pos.title] = { rank, holders: [] };
            }
        });
    });

    Object.values(state.officials.byId).forEach(off => {
        off.concurrentPosts?.forEach(post => {
            if (honoraryTitles[post.title]) {
                honoraryTitles[post.title].holders.push({
                    name: off.name,
                    rank: off.mainPost?.rank || '未入流',
                    acquiredYear: post.acquiredYear
                });
            }
            if (cabinetConcurrent[post.title]) {
                cabinetConcurrent[post.title].holders.push({
                    name: off.name,
                    rank: off.mainPost?.rank || '未入流',
                    mainPost: off.mainPost?.title || '未授实职',
                    acquiredYear: post.acquiredYear
                });
            }
        });
    });

    const cabinetSection = Object.keys(cabinetConcurrent).length > 0 ? `
        <details class="capital-honorary-fold" open>
            <summary>中枢加衔（大学士）</summary>
            <div class="capital-honorary-body">
                ${Object.entries(cabinetConcurrent).map(([title, info]) => {
                    const holders = info.holders.length > 0
                        ? info.holders.map(h => `<span class="honorary-holder">${h.name}（${h.mainPost}，${h.acquiredYear}）</span>`).join('')
                        : '<span class="honorary-empty">暂缺</span>';
                    return `<div class="honorary-title-item"><strong>${title}</strong><button class="cabinet-grant-btn" data-title="${title}" data-rank="${info.rank}">授予</button><br/>${holders}</div>`;
                }).join('')}
            </div>
        </details>
    ` : '';

    const honorarySection = Object.keys(honoraryTitles).length > 0 ? `
        <details class="capital-honorary-fold" open>
            <summary>虚衔荣誉职位</summary>
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

    const grouped = {};
    listOfficialsByMainRank().forEach(off => {
        const rank = off.mainPost?.rank || '未入流';
        if (!grouped[rank]) grouped[rank] = [];
        grouped[rank].push(off);
    });

    const visibleRanks = OFFICIAL_RANK_ORDER
        .filter(rank => Array.isArray(grouped[rank]) && grouped[rank].length > 0)
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

    listContainer.innerHTML = (cabinetSection + honorarySection + rankBlocks) || '<div class="gov-empty">暂无京官</div>';
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

export function isCapitalGovernorMode() {
    return state.capitalMode === 'governor';
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

// ===== 官员管理系统 =====

/**
 * 创建一个新官员
 * @param {string} name 官员名字
 * @param {number} age 年龄（可选）
 * @returns {string} 官员ID
 */
export function createOfficial(name, age = undefined) {
    ensureOfficialsStateShape();
    const offId = `off_${state.officials.nextId++}`;
    const profile = buildOfficialProfile(name, age);
    state.officials.byId[offId] = {
        id: offId,
        name,
        age: profile.age,
        birthYear: profile.birthYear,
        status: 'in_service',
        profile,
        serviceStartYear: profile.entry.year,
        mainPost: null,
        concurrentPosts: []
    };
    return offId;
}

/**
 * 分配主官职位给官员
 * @param {string} offId 官员ID
 * @param {string} positionTitle 职称
 * @param {string} rank 品级
 * @param {string} type 职位类型 (standing/concurrent/honorary)
 * @param {number} year 获得年份
 */
export function assignMainPost(offId, positionTitle, rank, type = 'standing', year = 1800) {
    if (!state.officials.byId[offId]) return;

    const official = state.officials.byId[offId];
    const minYear = Math.max(
        official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 10,
        (official.profile?.examination?.year || 0) + 1
    );
    const normalizedYear = Math.max(minYear, Math.min(OFFICIAL_TIMELINE_BASE_YEAR, year));

    if (official.mainPost?.title && state.officials.byPosition[official.mainPost.title]) {
        state.officials.byPosition[official.mainPost.title] = state.officials.byPosition[official.mainPost.title]
            .filter(x => !(x.offId === offId && x.isMain));
        const activeMain = official.profile?.postTimeline?.find(x => x.type === 'standing' && !Number.isInteger(x.endYear));
        if (activeMain) activeMain.endYear = normalizedYear - 1;
    }
    
    official.mainPost = {
        title: positionTitle,
        rank,
        type,
        acquiredYear: normalizedYear
    };

    ensureExamPathForMainPost(official, rank, positionTitle, normalizedYear);

    if (official.profile?.postTimeline) {
        official.profile.postTimeline.push({
            title: positionTitle,
            rank,
            type: 'standing',
            startYear: normalizedYear,
            endYear: null
        });
    }
    if (official.profile?.careerHistory) {
        official.profile.careerHistory.push({
            year: normalizedYear,
            event: '实授',
            detail: `授${positionTitle}`
        });
    }
    
    if (!state.officials.byPosition[positionTitle]) {
        state.officials.byPosition[positionTitle] = [];
    }
    state.officials.byPosition[positionTitle].push({
        offId,
        name: state.officials.byId[offId].name,
        isMain: true
    });
}

/**
 * 添加兼职给官员
 * @param {string} offId 官员ID
 * @param {string} positionTitle 职称
 * @param {string} rank 品级
 * @param {string} type 职位类型
 * @param {number} year 获得年份
 */
export function addConcurrentPost(offId, positionTitle, rank, type = 'concurrent', year = 1800) {
    if (!state.officials.byId[offId]) return;

    const official = state.officials.byId[offId];
    const existed = official.concurrentPosts.some(p => p.title === positionTitle);
    if (existed) return;
    const minYear = official.mainPost?.acquiredYear || official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 8;
    const normalizedYear = Math.max(minYear, Math.min(OFFICIAL_TIMELINE_BASE_YEAR, year));
    
    official.concurrentPosts.push({
        title: positionTitle,
        rank,
        type,
        acquiredYear: normalizedYear
    });
    if (official.profile?.postTimeline) {
        official.profile.postTimeline.push({
            title: positionTitle,
            rank,
            type,
            startYear: normalizedYear,
            endYear: null
        });
    }
    if (official.profile?.careerHistory) {
        official.profile.careerHistory.push({
            year: normalizedYear,
            event: '加衔',
            detail: `加${positionTitle}`
        });
    }
    
    if (!state.officials.byPosition[positionTitle]) {
        state.officials.byPosition[positionTitle] = [];
    }
    state.officials.byPosition[positionTitle].push({
        offId,
        name: official.name,
        isMain: false
    });
}

/**
 * 获取职位上的官员列表（包括主官和兼职）
 * @param {string} positionTitle 职称
 * @returns {Array} 官员信息数组
 */
export function getOfficialsAtPosition(positionTitle) {
    return state.officials.byPosition[positionTitle] || [];
}

/**
 * 获取官员的完整职位信息（用于显示）
 * @param {string} offId 官员ID
 * @returns {string} 格式化的职位字符串，如 "吏部尚书 兼 文渊阁大学士、兼 内阁学士"
 */
export function getOfficialPostsDisplay(offId) {
    const official = state.officials.byId[offId];
    if (!official) return '';
    
    let display = '';
    if (official.mainPost) {
        display = official.mainPost.title;
    }
    
    if (official.concurrentPosts.length > 0) {
        const concurrentTitles = official.concurrentPosts.map(p => p.title).join('、');
        display += ` 兼 ${concurrentTitles}`;
    }
    
    return display;
}

/**
 * 获取官员详细信息
 * @param {string} offId 官员ID
 * @returns {Object} 官员对象
 */
export function getOfficialById(offId) {
    return state.officials.byId[offId] || null;
}

/**
 * 撤销官员的兼衔
 * @param {string} offId 官员ID
 * @param {string} positionTitle 要撤销的衔职名称
 */
export function revokeConcurrentPostFromOfficial(offId, positionTitle) {
    const official = state.officials.byId[offId];
    if (!official) return;

    official.concurrentPosts = (official.concurrentPosts || []).filter(p => p.title !== positionTitle);

    if (Array.isArray(official.profile?.postTimeline)) {
        official.profile.postTimeline.forEach(item => {
            if (item.title === positionTitle && !Number.isInteger(item.endYear)) {
                item.endYear = OFFICIAL_TIMELINE_BASE_YEAR;
            }
        });
    }

    if (Array.isArray(state.officials.byPosition[positionTitle])) {
        state.officials.byPosition[positionTitle] = state.officials.byPosition[positionTitle]
            .filter(x => !(x.offId === offId && !x.isMain));
    }

    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}

function promptAddConcurrentForOfficial(offId) {
    const titleRaw = window.prompt("请输入要加的兼衔/虚衔名称（如：太子太保，内阁学士等）：");
    if (!titleRaw) return;
    const title = titleRaw.trim();
    if (!title) return;
    
    // Find the rank for this title from officialData
    let rank = '从一品'; // Default 
    let type = 'concurrent';
    let found = false;
    for (const [r, list] of Object.entries(officialData)) {
        const item = list.find(p => p.title === title);
        if (item) {
            rank = r;
            type = item.type === 'honorary' ? 'honorary' : 'concurrent';
            found = true;
            break;
        }
    }
    
    if (!found) {
        if (!window.confirm(`未在官制库中找到名[\${title}]，确定要强行授予吗？`)) {
            return;
        }
    }
    
    addConcurrentPost(offId, title, rank, type, OFFICIAL_TIMELINE_BASE_YEAR);
    renderCapitalLeftOfficialList();
    renderSelectedOfficialDetail();
}
