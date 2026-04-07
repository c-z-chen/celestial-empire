import {
    officialData,
    CAPITAL_MAX_GOVERNORS,
    CAPITAL_REGION_COLORS,
    CAPITAL_GOVERNOR_PAIR_ABBR,
    CAPITAL_PROV_SHORT,
    OFFICIAL_ASSIGNMENT_RULES,
    OFFICIAL_PROFILE_POOLS,
    OFFICIAL_RANK_ORDER,
    OFFICIAL_POSITION_RANK_MAP,
    OFFICIAL_TIMELINE_BASE_YEAR,
    EXAMINATION_HIERARCHY,
    RANK_TO_PREFERRED_EXAM
} from './constants.js';
import { NameGen } from './nameGen.js';
import { state, getGovernorRegionByProvId, invalidateGovernorRegionIndex } from './state.js';

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
    return getGovernorRegionByProvId(provId);
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

export function isCapitalGovernorMode() {
    return state.capitalMode === 'governor';
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

export function formatChildName(child, familySurname) {
    if (!child || !familySurname) return '未知';
    if (child.gender === '女') {
        return `${familySurname}氏`;
    }
    return child.name || '未知';
}

function getRankTargetAge(rank) {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return 36;
    let raw = Math.round(58 - idx * 1.8);
    if (rank === '正一品' && Math.random() < 0.5) {
        raw += 10 + Math.floor(Math.random() * 9);
    } else if (rank === '从一品' && Math.random() < 0.35) {
        raw += 8 + Math.floor(Math.random() * 8);
    }
    const minAge = getMinAgeForRank(rank);
    let maxAge = 60;
    if (rank === '正一品' && Math.random() < 0.3) {
        maxAge = 76;
    } else if (rank === '从一品' && Math.random() < 0.18) {
        maxAge = 72;
    }
    return Math.max(minAge, Math.min(maxAge, raw));
}

function ensureMinAgeForRank(official, rank) {
    if (!official) return;
    const minAge = getMinAgeForRank(rank);
    if (official.age >= minAge) return;
    official.age = minAge;
    official.birthYear = OFFICIAL_TIMELINE_BASE_YEAR - minAge;
    if (official.profile) {
        official.profile.birthYear = official.birthYear;
    }
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

const ORIGIN_PATH_WEIGHTS = [
    { path: '进士', weight: 30 },
    { path: '举人', weight: 22 },
    { path: '贡生', weight: 18 },
    { path: '荫生', weight: 16 },
    { path: '捐纳', weight: 8 }
];

function weightedPickPath(items) {
    const total = items.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of items) {
        roll -= item.weight;
        if (roll <= 0) return item.path;
    }
    return items[items.length - 1]?.path || '';
}

function pickOriginPath() {
    return weightedPickPath(ORIGIN_PATH_WEIGHTS);
}

function resolveExamPathByOrigin(originPath) {
    if (originPath === '进士') {
        const roll = Math.random();
        if (roll < 0.05) return '进士·一甲';
        if (roll < 0.25) return '进士·二甲';
        return '进士·三甲';
    }
    return originPath;
}

export function deriveOriginPathFromExam(examPath = '') {
    if (examPath.startsWith('进士')) return '进士';
    return examPath || '举人';
}

function getRankIndex(rank = '') {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    return idx >= 0 ? idx : OFFICIAL_RANK_ORDER.length;
}

function isLowRank(rank = '') {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return false;
    return idx >= getRankIndex('正八品');
}

function isMinorRank(rank = '') {
    const idx = OFFICIAL_RANK_ORDER.indexOf(rank);
    if (idx < 0) return false;
    return idx >= getRankIndex('正七品');
}

function getDetailRankIndex(detail = '') {
    for (const item of OFFICIAL_POSITION_RANK_MAP) {
        if (item.pattern.test(detail)) return getRankIndex(item.rank);
    }
    return null;
}

function pickRankedDetail(options, targetRankIdx, lastRankIdx, prevDetail = '') {
    const filteredPrev = prevDetail ? options.filter(item => item !== prevDetail) : options.slice();
    const withRank = filteredPrev.map(item => ({ detail: item, idx: getDetailRankIndex(item) }));
    const constrained = withRank.filter(item => {
        if (item.idx === null) return false;
        if (Number.isInteger(targetRankIdx) && item.idx < targetRankIdx) return false;
        if (Number.isInteger(lastRankIdx) && item.idx > lastRankIdx) return false;
        return true;
    });
    const pool = constrained.length ? constrained : withRank;
    const picked = randomPick(pool.map(item => item.detail));
    return { detail: picked, idx: getDetailRankIndex(picked) };
}

function pickNeutralDetail(options, lastRankIdx, prevDetail = '') {
    const filtered = prevDetail ? options.filter(item => item !== prevDetail) : options.slice();
    const picked = randomPick(filtered.length ? filtered : options);
    return { detail: picked, idx: lastRankIdx };
}

function getExternalPostOptions(originPath = '', rank = '', targetTitle = '') {
    if (targetTitle.includes('翰林院')) return ['知州', '同知', '知县'];
    if (!rank) return ['知县', '知州', '知府', '道员'];
    const idx = getRankIndex(rank);
    if (idx >= getRankIndex('正八品')) return ['县丞', '教谕', '训导'];
    if (idx >= getRankIndex('从七品')) return ['县丞', '教谕', '训导'];
    if (idx >= getRankIndex('正七品')) {
        if (['举人', '贡生', '荫生', '捐纳'].includes(originPath)) {
            return ['县丞', '教谕', '训导', '州同'];
        }
        return ['知县', '州同'];
    }
    if (idx >= getRankIndex('正六品')) return ['知县', '州同', '知州'];
    if (idx >= getRankIndex('正五品')) return ['知州', '同知'];
    return ['知府', '道员'];
}

function getMinistryPostOptions(rank = '', targetTitle = '') {
    if (targetTitle.includes('翰林院')) return ['留馆供职'];
    if (!rank) return ['入部院主事'];
    if (getRankIndex(rank) >= getRankIndex('正七品')) return ['入部院行走'];
    if (getRankIndex(rank) >= getRankIndex('正六品')) return ['入部院主事'];
    if (getRankIndex(rank) >= getRankIndex('从五品')) return ['升授员外郎'];
    return ['升授郎中'];
}

function getLocalPromotionOptions(rank = '') {
    if (!rank) return ['历练有成'];
    if (getRankIndex(rank) >= getRankIndex('正七品')) return ['历练有成', '署理地方事务', '考绩称职'];
    if (getRankIndex(rank) >= getRankIndex('正六品')) return ['历练有成', '署理地方事务', '考绩称职'];
    if (getRankIndex(rank) >= getRankIndex('正五品')) return ['历练有成', '署理地方事务', '考绩称职'];
    return ['历练有成', '署理地方事务', '考绩称职'];
}

function getServiceStartYearForOrigin(originPath, birthYear) {
    if (originPath === '进士') {
        return birthYear + 23 + Math.floor(Math.random() * 6);
    }
    return birthYear + 18 + Math.floor(Math.random() * 8);
}

export function normalizeExamPath(path = '') {
    if (path === '进士') return '进士·三甲';
    return path;
}

export function regenerateCareerHistory(official, force = false) {
    if (!official?.profile) return;
    if (!force && official.profile.careerHistory && !official.profile.careerHistoryAuto) return;

    const examPath = normalizeExamPath(official.profile?.examination?.path || '');
    const originPath = official.profile.originPath || deriveOriginPathFromExam(examPath);
    let entryYear = official.profile.entry?.year || official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 10;
    if (originPath === '进士') {
        const minEntryYear = (official.birthYear || OFFICIAL_TIMELINE_BASE_YEAR - 30) + 23;
        entryYear = Math.max(entryYear, minEntryYear);
    }

    if (examPath.startsWith('进士')) {
        const minExamYear = (official.birthYear || OFFICIAL_TIMELINE_BASE_YEAR - 30) + 23;
        official.profile.examination = {
            ...(official.profile.examination || {}),
            year: Math.max(minExamYear, entryYear)
        };
    }

    official.profile.originPath = originPath;
    official.profile.entry = { ...(official.profile.entry || {}), year: entryYear };
    official.serviceStartYear = entryYear;
    const targetRank = official.mainPost?.rank || '';
    const targetTitle = official.mainPost?.title || '';
    official.profile.careerHistory = buildInitialCareerHistory(originPath, examPath, entryYear, targetRank, targetTitle);
    appendMainPostCareerEntry(official);
    official.profile.careerHistoryAuto = true;
}

function needsCareerHistoryRegeneration(official) {
    if (!official?.profile?.careerHistoryAuto) return false;
    const rank = official.mainPost?.rank || '';
    if (!isLowRank(rank) && !isMinorRank(rank)) return false;
    const historyText = (official.profile?.careerHistory || [])
        .map(item => `${item.event}${item.detail}`)
        .join('');
    if (isLowRank(rank)) {
        return /(知县|知州|知府|道员|郎中|员外郎|主事|侍郎|尚书|布政使|按察使)/.test(historyText);
    }
    return /(知府|道员|郎中|员外郎|主事|侍郎|尚书|布政使|按察使)/.test(historyText);
}

function appendMainPostCareerEntry(official) {
    if (!official?.profile?.careerHistory || !official.mainPost?.title) return;
    const title = official.mainPost.title;
    const historyText = official.profile.careerHistory
        .map(item => `${item.detail || ''}`)
        .join('');
    if (historyText.includes(`授${title}`)) return;
    official.profile.careerHistory.push({
        year: official.mainPost.acquiredYear || OFFICIAL_TIMELINE_BASE_YEAR,
        event: '实授',
        detail: `授${title}`
    });
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

function getHonoraryRequiredRank(title = '') {
    const strictTitles = [
        '少师', '少傅', '少保',
        '太子太师', '太子太傅', '太子太保',
        '太子少师', '太子少傅', '太子少保'
    ];
    return strictTitles.includes(title) ? '正二品' : null;
}

export function getHonoraryGroup(title) {
    if (['太师', '太傅', '太保'].includes(title)) return '三公';
    if (['少师', '少傅', '少保'].includes(title)) return '三孤';
    if (['太子太师', '太子太傅', '太子太保'].includes(title)) return '太子三师';
    if (['太子少师', '太子少傅', '太子少保'].includes(title)) return '太子三孤';
    return null;
}

export function hasConflictingHonorary(official, newTitle) {
    const newGroup = getHonoraryGroup(newTitle);
    if (!newGroup) return false;
    return (official.concurrentPosts || []).some(p => getHonoraryGroup(p.title) !== null);
}

export function canHoldHonoraryTitle(title = '', mainRank = '') {
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

function getMinAgeForRank(rank = '') {
    const minAgeByRank = {
        '正一品': 54,
        '从一品': 52,
        '正二品': 48,
        '从二品': 45,
        '正三品': 42,
        '从三品': 38
    };
    return minAgeByRank[rank] || 30;
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

    const normalizedNextPath = normalizeExamPath(nextPath || pickExamPathByRank(rank, positionTitle));
    const entryYear = official.profile?.entry?.year || official.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR - 10;
    let examYear = Math.max(official.birthYear + 16, Math.min(appointedYear - 1, exam.year || appointedYear - 2));
    if (normalizedNextPath.startsWith('进士')) {
        examYear = Math.max(official.birthYear + 23, Math.min(entryYear, appointedYear - 1));
    }
    official.profile.examination = {
        ...exam,
        path: normalizedNextPath,
        year: examYear,
    };

    const derivedOrigin = deriveOriginPathFromExam(normalizedNextPath);
    if (official.profile.originPath !== derivedOrigin) {
        official.profile.originPath = derivedOrigin;
        if (official.profile.careerHistoryAuto) {
            regenerateCareerHistory(official, true);
        }
    }
}

function shouldAutoGrantHonorary(title = '') {
    const keepVacant = ['太师', '太傅', '太保', '少师', '少傅', '少保', '太子太师', '太子太傅', '太子太保', '保和殿大学士', '都察院右都御史', '礼部侍郎（虚衔）'];
    const normalizedTitle = title.replace(/\s+/g, '');
    const normalizedVacant = keepVacant.map(t => t.replace(/\s+/g, ''));
    return !normalizedVacant.includes(normalizedTitle);
}

const STRICT_HONORARY_TITLES = new Set([
    '少师', '少傅', '少保',
    '太子太师', '太子太傅', '太子太保',
    '太子少师', '太子少傅', '太子少保'
]);

const HONORARY_EXCLUDED_MAIN_TITLES = new Set([
    '内务府总管',
    '銮仪卫使',
    '理藩院尚书',
    '理藩院侍郎'
]);

export function isHonoraryCandidateDisallowed(official, title = '') {
    if (!STRICT_HONORARY_TITLES.has(title)) return false;
    const mainTitle = official?.mainPost?.title || '';
    return HONORARY_EXCLUDED_MAIN_TITLES.has(mainTitle);
}

function removeVirtualLibuShilang(official, endYear = OFFICIAL_TIMELINE_BASE_YEAR) {
    if (!official) return;
    const virtualTitle = '礼部侍郎（虚衔）';
    official.concurrentPosts = (official.concurrentPosts || []).filter(p => p.title !== virtualTitle);
    if (Array.isArray(official.profile?.postTimeline)) {
        official.profile.postTimeline.forEach(item => {
            if (item.title === virtualTitle && !Number.isInteger(item.endYear)) {
                item.endYear = endYear;
            }
        });
    }
    if (Array.isArray(state.officials.byPosition[virtualTitle])) {
        state.officials.byPosition[virtualTitle] = state.officials.byPosition[virtualTitle]
            .filter(x => !(x.offId === official.id && !x.isMain));
    }
}

export function isGrandSecretariatTitle(title = '') {
    return title.includes('大学士');
}

export function isCabinetEligibleOfficial(official) {
    const mainRank = official?.mainPost?.rank || '未入流';
    const rankIdx = OFFICIAL_RANK_ORDER.indexOf(mainRank);
    if (rankIdx < 0 || rankIdx > OFFICIAL_RANK_ORDER.indexOf('从二品')) return false;
    return hasHanlinCredential(official);
}

export function revokeConcurrentTitleFromAll(positionTitle, endYear = OFFICIAL_TIMELINE_BASE_YEAR) {
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

export function rankScore(rank) {
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
    const isGrandTitle = isGrandSecretariatTitle(title);
    const isAssistant = title === '协办大学士';
    const minAgeGate = Math.max(rule.minAge || 0, getMinAgeForRank(rank));
    const pool = Object.values(state.officials.byId).filter(o => {
        if (o.status !== 'in_service') return false;
        if (o.concurrentPosts.some(p => p.title === title)) return false;
        if ((o.concurrentPosts.length || 0) >= (rule.maxConcurrent || 3)) return false;
        if (o.age < minAgeGate) return false;
        if (type === 'honorary' && !canHoldHonoraryTitle(title, o.mainPost?.rank || '')) return false;
        if (type === 'honorary' && isHonoraryCandidateDisallowed(o, title)) return false;
        if (type === 'honorary' && hasConflictingHonorary(o, title)) return false;
        if (isGrandTitle && !isCabinetEligibleOfficial(o)) return false;
        if (isGrandTitle && o.concurrentPosts.some(p => isGrandSecretariatTitle(p.title))) return false;
        const mainTitle = o.mainPost?.title || '';
        if (isGrandTitle && !isAssistant && mainTitle.includes('尚书')) return false;
        if (isAssistant && !mainTitle.includes('尚书')) return false;
        if (isAssistant && mainTitle.includes('大学士')) return false;
        return true;
    });
    if (pool.length === 0) return null;

    const scored = pool.map(o => {
        let weight = 1;
        const mainTitle = o.mainPost?.title || '';
        const allowMainPostPref = !isGrandTitle || isAssistant;
        if (allowMainPostPref && rule.preferredMainPosts.includes(mainTitle)) weight += 8;
        if (allowMainPostPref && (rule.preferredMainPostKeywords || []).some(k => mainTitle.includes(k))) weight += 4;
        if (allowMainPostPref && type === 'honorary' && o.age >= (rule.oldMinisterBonusAge || 55)) weight += 6;
        if (allowMainPostPref) {
            weight += Math.max(0, rankScore(o.mainPost?.rank || '') - 3);
            weight += Math.max(0, Math.floor((OFFICIAL_TIMELINE_BASE_YEAR - (o.serviceStartYear || OFFICIAL_TIMELINE_BASE_YEAR)) / 8));
        }

        if (title.includes('大学士') && isAssistant) {
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
    const originPath = pickOriginPath();
    const serviceStartYear = getServiceStartYearForOrigin(originPath, birthYear);
    const examPath = resolveExamPathByOrigin(originPath) || randomPick(OFFICIAL_PROFILE_POOLS.examPaths);
    let examYear = serviceStartYear - Math.floor(Math.random() * 2);
    if (originPath === '进士' || examPath.startsWith('进士')) examYear = serviceStartYear;
    if (examPath === '捐纳') examYear = serviceStartYear;
    
    const childrenCount = Math.floor(Math.random() * 4) + 1;
    const children = Array.from({ length: childrenCount }, () => {
        const gender = Math.random() > 0.5 ? '男' : '女';
        const baseName = makeMaleNameBySurname(familySurname);
        return { name: baseName, gender };
    });

    const careerHistory = buildInitialCareerHistory(originPath, examPath, serviceStartYear);

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
        originPath,
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
        },
        postTimeline: [],
        careerHistory,
        careerHistoryAuto: true,
        rewardsAndPunishments: [
            { year: serviceStartYear + 2, kind: '奖', detail: randomPick(OFFICIAL_PROFILE_POOLS.meritEvents) },
            { year: serviceStartYear + 4, kind: '惩', detail: randomPick(OFFICIAL_PROFILE_POOLS.demeritEvents) }
        ]
    };
}

export function buildInitialCareerHistory(originPath = '', examPath = '', serviceStartYear, targetRank = '', targetTitle = '') {
    const history = [];
    let currentYear = serviceStartYear;
    
    const CURRENT_WORLD_YEAR = typeof OFFICIAL_TIMELINE_BASE_YEAR !== 'undefined' ? OFFICIAL_TIMELINE_BASE_YEAR : currentYear + 40;

    const hanlinTrack = [
        { rank: '未入流', titles: ['庶吉士'] },
        { rank: '从七品', titles: ['翰林院检讨', '内阁中书'] },
        { rank: '正七品', titles: ['翰林院编修', '通政使司知事'] },
        { rank: '从六品', titles: ['左右春坊左右赞善', '国子监司业'] },
        { rank: '正六品', titles: ['内阁侍读', '左右春坊左右中允'] },
        { rank: '从五品', titles: ['翰林院侍读', '翰林院侍讲', '司经局洗马'] },
        { rank: '正五品', titles: ['左右春坊左右庶子', '六科给事中'] },
        { rank: '从四品', titles: ['翰林院侍读学士', '内阁侍读学士'] },
        { rank: '正四品', titles: ['大理寺少卿', '太常寺少卿', '都察院佥都御史'] },
        { rank: '从三品', titles: ['光禄寺卿', '太仆寺卿'] },
        { rank: '正三品', titles: ['大理寺卿', '通政使司通政使', '都察院副都御史'] },
        { rank: '从二品', titles: ['内阁学士', '礼部侍郎', '吏部侍郎', '刑部侍郎', '兵部侍郎', '工部侍郎', '户部侍郎', '翰林院掌院学士'] },
        { rank: '从一品', titles: ['礼部尚书', '吏部尚书', '都察院左都御史'] },
        { rank: '正一品', titles: ['体仁阁大学士', '保和殿大学士', '武英殿大学士'] }
    ];

    const ministryTrack = [
        { rank: '正九品', titles: ['九品笔帖式', '太常寺赞礼郎'] },
        { rank: '正八品', titles: ['八品笔帖式', '六部司务'] },
        { rank: '正七品', titles: ['中书', '通政使司经历'] },
        { rank: '从六品', titles: ['光禄寺署正'] },
        { rank: '正六品', titles: ['户部主事', '刑部主事', '工部主事', '兵部主事'] },
        { rank: '从五品', titles: ['户部员外郎', '刑部员外郎', '监察御史'] },
        { rank: '正五品', titles: ['户部郎中', '刑部郎中', '六科给事中'] },
        { rank: '从四品', titles: ['知府（挂衔）'] },
        { rank: '正四品', titles: ['通政使司副使', '六科掌印给事中'] },
        { rank: '从三品', titles: ['太常寺少卿'] },
        { rank: '正三品', titles: ['太常寺卿', '宗人府府丞'] },
        { rank: '从二品', titles: ['工部侍郎', '刑部侍郎', '兵部侍郎'] },
        { rank: '从一品', titles: ['工部尚书', '刑部尚书', '兵部尚书'] },
        { rank: '正一品', titles: ['协办大学士'] }
    ];

    const localTrack = [
        { rank: '正九品', titles: ['各县主簿', '各府知事'] },
        { rank: '从八品', titles: ['各府训导', '各县训导'] },
        { rank: '正八品', titles: ['各县县丞', '各县教谕', '各府经历', '各省按察司知事'] },
        { rank: '从七品', titles: ['京府经历', '盐运司经历', '各省布政司都事'] },
        { rank: '正七品', titles: ['各县知县', '巡农御史', '巡盐御史', '各省按察司经历'] },
        { rank: '从六品', titles: ['各省布政司经历', '各省布政司理问'] },
        { rank: '正六品', titles: ['各府通判'] },
        { rank: '从五品', titles: ['各州知州', '盐运司副使'] },
        // { rank: '正五品', titles: ['各府同知'] },                         
        { rank: '从四品', titles: ['各府知府'] },
        { rank: '正四品', titles: ['守巡道'] },
        // { rank: '从三品', titles: ['都转盐运使司盐运使'] },
        { rank: '正三品', titles: ['各省按察使', '各省提督学政'] },
        { rank: '从二品', titles: ['各省布政使', '各省巡抚'] },
        { rank: '正二品', titles: ['各省巡抚', '河道总督', '漕运总督'] },
        { rank: '从一品', titles: ['各省总督'] },
        { rank: '正一品', titles: ['各省总督（加兵部尚书、都察院右都御史衔）'] }
    ];

    let isHanlin = examPath.startsWith('进士') || targetTitle.includes('翰林院') || targetTitle.includes('大学士');
    
    const getTrackIndex = (rank) => {
        let idx = hanlinTrack.findIndex(t => t.rank === rank);
        if (idx !== -1) return idx;
        const rankMap = { '正一':14, '从一':13, '正二':12, '从二':11, '正三':10, '从三':9, '正四':8, '从四':7, '正五':6, '从五':5, '正六':4, '从六':3, '正七':2, '从七':1, '正八':0, '从八':0, '正九':0, '从九':0 };
        let prefix = rank.substring(0, 2);
        return rankMap[prefix] || 0;
    };

    let targetIdx = targetRank ? getTrackIndex(targetRank) : 0;
    
    let startIdx = 0;
    let floorIdx = 0; 
    let scatterTitle = ''; 

    if (examPath === '进士·一甲') {
        startIdx = hanlinTrack.findIndex(t => t.rank === '从六品');
        floorIdx = startIdx; 
        history.push({ year: currentYear, event: '一甲赐进士及第', detail: `授翰林院修撰（从六品）` });
    } else if (examPath === '进士·二甲') {
        startIdx = 0; 
        floorIdx = hanlinTrack.findIndex(t => t.rank === '正七品'); 
        scatterTitle = '翰林院编修';
        history.push({ year: currentYear, event: '赐进士出身', detail: `改翰林院庶吉士` });
    } else if (examPath === '进士·三甲') {
        if (isHanlin) {
            startIdx = 0;
            floorIdx = hanlinTrack.findIndex(t => t.rank === '从七品'); 
            scatterTitle = '翰林院检讨';
            history.push({ year: currentYear, event: '赐同进士出身', detail: `改翰林院庶吉士` });
        } else {
            startIdx = hanlinTrack.findIndex(t => t.rank === '正七品');
            floorIdx = startIdx;
            history.push({ year: currentYear, event: '赐同进士出身', detail: `分发各部院行走` });
        }
    } else if (originPath === '举人') {
        startIdx = hanlinTrack.findIndex(t => t.rank === '正七品');
        floorIdx = 0;
        history.push({ year: currentYear, event: '大挑一等', detail: `授内阁中书（正七品）` });
    } else {
        startIdx = 1;
        floorIdx = 0;
        history.push({ year: currentYear, event: `以${originPath}入仕`, detail: `签分各部院笔帖式` });
    }

    if (!targetRank || !targetTitle) return history;

    let eventChain = [];
    let curr = startIdx;
    let currentlyLocal = false;
    const highRankIdx = getTrackIndex('从二品');
    
    if (curr === 0 && targetIdx >= floorIdx) {
        curr = floorIdx;
        eventChain.push({ type: 'scatter', idx: curr, isLocal: false });
    }

    let loopSafe = 0;
    while (curr !== targetIdx && loopSafe < 25) {
        loopSafe++;
        
        let rand = Math.random();

        if (targetIdx >= highRankIdx && (targetIdx - curr) <= 2 && currentlyLocal) {
            currentlyLocal = false;
            eventChain.push({ type: 'inward', idx: curr, isLocal: currentlyLocal });
            continue;
        }

        if (curr >= 2 && curr <= 13) {
            if (!currentlyLocal && rand < 0.15) {
                currentlyLocal = true;
                eventChain.push({ type: 'outward', idx: curr, isLocal: currentlyLocal });
                continue;
            } else if (currentlyLocal && rand < 0.20) {
                currentlyLocal = false;
                eventChain.push({ type: 'inward', idx: curr, isLocal: currentlyLocal });
                continue;
            }
        }

        if (curr < targetIdx) { 
            if (rand < 0.02 && curr > floorIdx + 1 && (targetIdx - curr) > 2) {
                curr -= 1; 
                eventChain.push({ type: 'demote', idx: curr, isLocal: currentlyLocal });
            } else if (rand < 0.12) {
                eventChain.push({ type: 'mourning', idx: curr, isLocal: currentlyLocal }); 
            } else if (rand < 0.22) {
                eventChain.push({ type: 'transfer', idx: curr, isLocal: currentlyLocal }); 
            } else if (rand < 0.35) {
                eventChain.push({ type: 'stay', idx: curr, isLocal: currentlyLocal }); 
            } else {
                let step = (Math.random() < 0.25 && curr + 2 <= targetIdx) ? 2 : 1;
                curr += step; 
                eventChain.push({ type: 'promote', idx: curr, isLocal: currentlyLocal });
            }
        } else if (curr > targetIdx) {
            if (rand < 0.3) {
                eventChain.push({ type: 'stay', idx: curr, isLocal: currentlyLocal });
            } else {
                curr -= 1; 
                curr = Math.max(floorIdx, curr); 
                eventChain.push({ type: 'demote', idx: curr, isLocal: currentlyLocal });
            }
        }
    }

    let availableYears = Math.max(1, CURRENT_WORLD_YEAR - serviceStartYear);
    
    let mourningCount = eventChain.filter(e => e.type === 'mourning').length;
    while (mourningCount * 3 + eventChain.length > availableYears && mourningCount > 0) {
        let removeIdx = eventChain.findIndex(e => e.type === 'mourning');
        if (removeIdx > -1) eventChain.splice(removeIdx, 1);
        mourningCount--;
    }

    let lastTitle = (examPath === '进士·一甲') ? '翰林院修撰' : ''; 
    let lastRankIdx = null;

    const pickLocalByRankIdx = (rankIdx) => {
        const items = localTrack.map(item => ({
            rank: item.rank,
            titles: item.titles,
            idx: getRankIndex(item.rank)
        }));
        items.sort((a, b) => Math.abs(a.idx - rankIdx) - Math.abs(b.idx - rankIdx));
        const pick = items[0] || items[items.length - 1];
        const title = randomPick(pick?.titles || []) || (pick?.titles?.[0] || '各府知事');
        return { rank: pick.rank, title };
    };

    const getTenureYears = (rankStr, eventType) => {
        const idx = getRankIndex(rankStr);
        let base = 1;
        if (idx <= getRankIndex('正三品')) base = 3;
        else if (idx <= getRankIndex('正五品')) base = 2;
        if (eventType === 'stay' || eventType === 'transfer') base += 1;
        return base + Math.floor(Math.random() * 2);
    };

    for (let i = 0; i < eventChain.length; i++) {
        let ev = eventChain[i];
        let currentTrack = ev.isLocal ? localTrack : (isHanlin ? hanlinTrack : ministryTrack);
        let rankStr = currentTrack[ev.idx].rank;
        let titleOptions = currentTrack[ev.idx].titles;

        if (ev.isLocal && Number.isInteger(lastRankIdx)) {
            const proposedIdx = getRankIndex(rankStr);
            const maxDrop = lastRankIdx <= getRankIndex('从二品') ? 0 : 1;
            if (proposedIdx > lastRankIdx + maxDrop) {
                const adjusted = pickLocalByRankIdx(lastRankIdx + maxDrop);
                rankStr = adjusted.rank;
                titleOptions = [adjusted.title];
            }
        }

        let stepYears = 0;
        if (ev.type === 'mourning') {
            stepYears = 3;
        } else {
            const remainingEvents = eventChain.length - i;
            const expectedYears = Math.max(1, Math.floor(availableYears / remainingEvents));
            const tenure = getTenureYears(rankStr, ev.type);
            stepYears = Math.min(expectedYears + (Math.random() < 0.25 ? 1 : 0), tenure);
        }

        if (availableYears <= 0) {
            stepYears = 0;
        } else {
            stepYears = Math.max(1, Math.min(stepYears, availableYears));
        }
        currentYear += stepYears;
        availableYears -= stepYears;
        
        let availableTitles = titleOptions.filter(t => t !== lastTitle);

        if (examPath === '进士·一甲' && rankStr === '从六品' && !ev.isLocal) {
            availableTitles = ['翰林院修撰'];
        }

        let titleStr = availableTitles.length > 0 
            ? availableTitles[Math.floor(Math.random() * availableTitles.length)] 
            : titleOptions[0]; 

        if (ev.type === 'scatter' && scatterTitle) {
            titleStr = scatterTitle;
        }

        if (i === eventChain.length - 1 && ev.idx === targetIdx) {
            titleStr = targetTitle;
            rankStr = targetRank || rankStr;
        }

        switch (ev.type) {
            case 'scatter':
                history.push({ year: currentYear, event: '散馆', detail: `授${titleStr}（${rankStr}）` });
                break;
            case 'outward':
                history.push({ year: currentYear, event: '外放', detail: `出为${titleStr}（${rankStr}）` });
                break;
            case 'inward':
                history.push({ year: currentYear, event: '内调', detail: `回京授${titleStr}（${rankStr}）` });
                break;
            case 'stay':
                history.push({ year: currentYear, event: '京察/大计', detail: `留任${titleStr}（${rankStr}）` });
                break;
            case 'promote':
                history.push({ year: currentYear, event: '擢', detail: `升授${titleStr}（${rankStr}）` });
                break;
            case 'demote':
                history.push({ year: currentYear, event: '缘事降职', detail: `降为${titleStr}（${rankStr}）` });
                break;
            case 'transfer':
                if (titleStr === lastTitle) {
                    history.push({ year: currentYear, event: '考满', detail: `续任${titleStr}（${rankStr}）` });
                } else {
                    history.push({ year: currentYear, event: '调', detail: `改任${titleStr}（${rankStr}）` });
                }
                break;
            case 'mourning':
                history.push({ year: currentYear - 3, event: '丁忧', detail: `回籍守制` });
                history.push({ year: currentYear, event: '服阕', detail: `起复${titleStr}（${rankStr}）` });
                break;
        }

        lastTitle = titleStr; 
        lastRankIdx = getRankIndex(rankStr);
    }

    return collapseHistoryByYear(history);
}

function collapseHistoryByYear(history) {
    if (!Array.isArray(history) || history.length === 0) return history;
    const grouped = new Map();
    history.forEach(item => {
        const year = item.year;
        const detail = item.detail || item.event || '';
        if (!grouped.has(year)) {
            grouped.set(year, { year, event: '任命', detail: detail ? detail : '任命' });
        } else if (detail) {
            const existing = grouped.get(year);
            existing.detail = `${existing.detail}，${detail}`;
        }
    });
    return Array.from(grouped.values()).sort((a, b) => (a.year || 0) - (b.year || 0));
}

export function ensureOfficialsStateShape() {
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
    if (!state.capitalSectionOpen || typeof state.capitalSectionOpen !== 'object') {
        state.capitalSectionOpen = {};
    }

    Object.values(state.officials.byId).forEach(off => {
        if (!off.profile || typeof off.profile !== 'object') {
            const profile = buildOfficialProfile(off.name, Number.isInteger(off.age) ? off.age : undefined);
            off.age = Number.isInteger(off.age) ? off.age : profile.age;
            off.birthYear = off.birthYear || profile.birthYear;
            off.profile = profile;
            off.serviceStartYear = off.serviceStartYear || profile.entry.year;
        }
        if (!off.profile.originPath) {
            const examPath = off.profile?.examination?.path || '';
            off.profile.originPath = deriveOriginPathFromExam(normalizeExamPath(examPath));
        }
        if (!Array.isArray(off.profile.careerHistory)) {
            regenerateCareerHistory(off, true);
        }
        if (needsCareerHistoryRegeneration(off)) {
            regenerateCareerHistory(off, true);
        }
        if (!Array.isArray(off.profile.postTimeline)) {
            off.profile.postTimeline = [];
        }
        if (!Array.isArray(off.concurrentPosts)) {
            off.concurrentPosts = [];
        }
        if (off.mainPost?.rank) {
            ensureMinAgeForRank(off, off.mainPost.rank);
            const year = off.mainPost.acquiredYear || OFFICIAL_TIMELINE_BASE_YEAR;
            ensureExamPathForMainPost(off, off.mainPost.rank, off.mainPost.title, year);
        }
    });
}

export function ensureCapitalOfficialsInitialized() {
    ensureOfficialsStateShape();
    if (Object.keys(state.officials.byId).length > 0) return;

    const vacantStandingTitles = new Set(['保和殿大学士']);

    for (const [rank, jobs] of Object.entries(officialData)) {
        const standingJobs = jobs.filter(job => (job.type || 'standing') === 'standing');
        standingJobs.forEach(job => {
            if (vacantStandingTitles.has(job.title)) return;
            const slots = getJobSlots(job);
            const minAge = getMinAgeForRank(rank);
            for (let i = 0; i < slots; i++) {
                const age = minAge + Math.floor(Math.random() * 8);
                const offId = createOfficial(NameGen.person(), age);
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

export function listOfficialsByMainRank() {
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

export function isCollapsiblePostTitle(title = '') {
    return COLLAPSIBLE_POST_KEYWORDS.some(k => title.includes(k));
}

export function getPositionOrderMap() {
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

export function getTimelineText(official) {
    const history = [...(official.profile?.careerHistory || [])]
        .sort((a, b) => (a.year || 0) - (b.year || 0));
    if (history.length > 0) {
        return history.map(item => `${item.year} ${item.detail || item.event}`).join('；');
    }

    const timeline = [...(official.profile?.postTimeline || [])]
        .sort((a, b) => (a.startYear || 0) - (b.startYear || 0));
    if (timeline.length === 0) return '暂无任官记录';
    const tagMap = {
        standing: '本官',
        honorary: '虚衔',
        power: '实权',
        concurrent: '兼衔'
    };
    return timeline.map(item => {
        const end = Number.isInteger(item.endYear) ? item.endYear : '今';
        const tag = tagMap[item.type] || '兼衔';
        return `${item.startYear}-${end} ${item.title}（${tag}）`;
    }).join('；');
}

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
    ensureMinAgeForRank(official, rank);
    const prevMainTitle = official.mainPost?.title || '';
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

    if (prevMainTitle === '内阁学士' && positionTitle !== '内阁学士') {
        removeVirtualLibuShilang(official, normalizedYear - 1);
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
        const hasSame = official.profile.careerHistory
            .some(item => (item.detail || '').includes(`授${positionTitle}`));
        if (!hasSame) {
            official.profile.careerHistory.push({
                year: normalizedYear,
                event: '实授',
                detail: `授${positionTitle}`
            });
        }
    }
    
    if (!state.officials.byPosition[positionTitle]) {
        state.officials.byPosition[positionTitle] = [];
    }
    state.officials.byPosition[positionTitle].push({
        offId,
        name: state.officials.byId[offId].name,
        isMain: true
    });

    if (positionTitle === '内阁学士' && official.mainPost?.title !== '礼部侍郎') {
        addConcurrentPost(offId, '礼部侍郎（虚衔）', '从二品', 'honorary', normalizedYear, true);
    }
}

/**
 * 添加兼职给官员
 * @param {string} offId 官员ID
 * @param {string} positionTitle 职称
 * @param {string} rank 品级
 * @param {string} type 职位类型
 * @param {number} year 获得年份
 */
export function addConcurrentPost(offId, positionTitle, rank, type = 'concurrent', year = 1800, skipExtras = false) {
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

    if (positionTitle === '内阁学士') {
        if (official.mainPost?.title !== '礼部侍郎') {
            removeVirtualLibuShilang(official, OFFICIAL_TIMELINE_BASE_YEAR);
        }
    }
}
