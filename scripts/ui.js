import { BureauMap, ecoLvlMap, normalizeEconomy } from './constants.js';
import { state, isCapitalTabActive, getCountiesByPrefId, getCountiesByProvId } from './state.js';
import {
    renderRosterList,
    renderCapitalGovernorAssignments,
    toggleCapitalGovernorProvince,
    renderCapitalOfficials,
    isCapitalGovernorMode,
    setCapitalMode
} from './officials.js';
import { setMapView, refreshTerritoryPaint, drawCapitals, highlightSelection } from './map.js';
import { toggleMerge, attemptMerge } from './territory.js';

const DEBUG = false;
function debugInfo(...args) {
    if (DEBUG) console.info(...args);
}
function debugWarn(...args) {
    if (DEBUG) console.warn(...args);
}

function aggregateRegionData(regionCounties) {
    let totalPop = 0, totalArea = 0, militaryCount = 0, indCounts = {};
    let officialIndCounts = {};

    let ecoScores = [];
    let regionEcoScores = [];
    let weightedEcoPopSum = 0;
    let weightedEcoPopBase = 0;
    let uniqueMasters = new Set();

    regionCounties.forEach(c => {
        if (uniqueMasters.has(c.masterId)) return;
        uniqueMasters.add(c.masterId);
        let m = state.countyData[c.masterId];
        totalPop  += m.population;
        totalArea += m.area;
        if (m.popUnit === "军户") militaryCount++;
        if (m.industry !== "首都" && m.industry !== "军镇") {
            indCounts[m.industry] = (indCounts[m.industry] || 0) + 1;
        }
        if (m.isOfficialRun && m.industry) {
            officialIndCounts[m.industry] = (officialIndCounts[m.industry] || 0) + 1;
        }
        const normalizedEco = normalizeEconomy(m.economy || "");
        const ecoScore = ecoLvlMap[normalizedEco];
        if (ecoScore) {
            regionEcoScores.push(ecoScore);
            weightedEcoPopSum += ecoScore * Math.max(1, m.population || 0);
            weightedEcoPopBase += Math.max(1, m.population || 0);
        }
        if (!m.isCapital && !m.isCapitalVicinity) {
            ecoScores.push(ecoScore || 0);
        }
    });

    let sortedInds = Object.keys(indCounts).sort((a, b) => indCounts[b] - indCounts[a]);
    let sortedOfficialInds = Object.keys(officialIndCounts).sort((a, b) => officialIndCounts[b] - officialIndCounts[a]);
    const avgEco = ecoScores.length ? (ecoScores.reduce((sum, s) => sum + s, 0) / ecoScores.length) : 0;
    const maxEco = ecoScores.length ? Math.max(...ecoScores) : 0;
    const richCount = ecoScores.filter(s => s >= 4).length;
    const regionAvgEco = regionEcoScores.length ? (regionEcoScores.reduce((sum, s) => sum + s, 0) / regionEcoScores.length) : 0;
    const weightedEco = weightedEcoPopBase ? (weightedEcoPopSum / weightedEcoPopBase) : regionAvgEco;
    const hasValidOfficialBureau = Boolean(sortedOfficialInds[0]) && avgEco >= 3.35 && maxEco >= 4 && richCount >= 2;

    let volumeBoost = 0;
    if (totalPop >= 500000) volumeBoost += 0.2;
    if (totalPop >= 1000000) volumeBoost += 0.2;
    if (totalPop >= 2000000) volumeBoost += 0.15;
    if (totalArea >= 20000) volumeBoost += 0.1;
    if (totalArea >= 40000) volumeBoost += 0.1;

    let smallScalePenalty = 0;
    if (uniqueMasters.size <= 2 && totalPop < 350000) {
        smallScalePenalty += 0.75;
    } else if (uniqueMasters.size <= 3 && totalPop < 500000) {
        smallScalePenalty += 0.4;
    }
    if (totalArea < 12000) smallScalePenalty += 0.15;

    const regionCompositeEco = Math.max(1, Math.min(5,
        (weightedEco * 0.58) +
        (regionAvgEco * 0.42) +
        volumeBoost -
        smallScalePenalty
    ));

    const ecoLabel = regionCompositeEco >= 4.85 ? "极盛" :
        regionCompositeEco >= 4.00 ? "富庶" :
        regionCompositeEco >= 2.35 ? "平稳" :
        regionCompositeEco >= 1.55 ? "拮据" : "凋敝";
    const volumeTag = totalPop >= 2000000 ? "体量：巨" :
        totalPop >= 1000000 ? "体量：大" :
        totalPop >= 500000 ? "体量：中" : "体量：小";
    const economyStr = regionEcoScores.length ? `${ecoLabel}（${volumeTag}）` : "百业待兴";
    
    return { 
        totalPop, totalArea, militaryCount, topInd: sortedInds[0], secondInd: sortedInds[1],
        officialTopInd: sortedOfficialInds[0],
        hasValidOfficialBureau,
        economyStr
    };
}

const uiRefs = {
    countyName: null,
    countyGov: null,
    btnExpandCounty: null,
    statPop: null,
    statArea: null,
    statEcon: null,
    statInd: null,
    prefDataView: null,
    prefEmptyView: null,
    prefName: null,
    prefGov: null,
    prefCap: null,
    statPrefPop: null,
    statPrefArea: null,
    statPrefEcon: null,
    statPrefInd: null,
    provDataView: null,
    provEmptyView: null,
    provName: null,
    provGov: null,
    provCap: null,
    statProvPop: null,
    statProvArea: null,
    statProvEcon: null,
    statProvInd: null
};

function ensureUIRefs() {
    if (uiRefs.countyName) return;
    uiRefs.countyName = document.getElementById('inp-county-name');
    uiRefs.countyGov = document.getElementById('inp-county-gov');
    uiRefs.btnExpandCounty = document.getElementById('btn-expand-county');
    uiRefs.statPop = document.getElementById('stat-pop');
    uiRefs.statArea = document.getElementById('stat-area');
    uiRefs.statEcon = document.getElementById('stat-econ');
    uiRefs.statInd = document.getElementById('stat-ind');
    uiRefs.prefDataView = document.getElementById('pref-data-view');
    uiRefs.prefEmptyView = document.getElementById('pref-empty-view');
    uiRefs.prefName = document.getElementById('inp-pref-name');
    uiRefs.prefGov = document.getElementById('inp-pref-gov');
    uiRefs.prefCap = document.getElementById('inp-pref-cap');
    uiRefs.statPrefPop = document.getElementById('stat-pref-pop');
    uiRefs.statPrefArea = document.getElementById('stat-pref-area');
    uiRefs.statPrefEcon = document.getElementById('stat-pref-econ');
    uiRefs.statPrefInd = document.getElementById('stat-pref-ind');
    uiRefs.provDataView = document.getElementById('prov-data-view');
    uiRefs.provEmptyView = document.getElementById('prov-empty-view');
    uiRefs.provName = document.getElementById('inp-prov-name');
    uiRefs.provGov = document.getElementById('inp-prov-gov');
    uiRefs.provCap = document.getElementById('inp-prov-cap');
    uiRefs.statProvPop = document.getElementById('stat-prov-pop');
    uiRefs.statProvArea = document.getElementById('stat-prov-area');
    uiRefs.statProvEcon = document.getElementById('stat-prov-econ');
    uiRefs.statProvInd = document.getElementById('stat-prov-ind');
}

function auditPrefectureBureaus() {
    const anomalies = [];
    Object.values(state.prefecturesData).forEach(pref => {
        const prefCounties = getCountiesByPrefId(pref.id);
        const uniqueMasters = new Set();
        const masters = [];
        prefCounties.forEach(c => {
            if (uniqueMasters.has(c.masterId)) return;
            uniqueMasters.add(c.masterId);
            masters.push(state.countyData[c.masterId]);
        });

        const nonCapital = masters.filter(m => !m.isCapital && !m.isCapitalVicinity);
        if (!nonCapital.length) return;

        const hasOfficial = nonCapital.some(m => m.isOfficialRun);
        const allPoor = nonCapital.every(m => (ecoLvlMap[normalizeEconomy(m.economy)] || 0) <= 2);
        if (hasOfficial && allPoor) {
            anomalies.push({
                prefecture: pref.name,
                counties: nonCapital.map(m => ({
                    name: m.name,
                    economy: m.economy,
                    industry: m.industry,
                    isOfficialRun: m.isOfficialRun
                }))
            });
        }
    });

    if (!anomalies.length) {
        debugInfo('[auditPrefectureBureaus] 未发现“全贫困但仍设官营机构”的府。');
        return [];
    }

    debugWarn('[auditPrefectureBureaus] 发现异常府：', anomalies);
    return anomalies;
}

export function updateUI() {
    ensureUIRefs();
    if (state.selectedCellId === null) return;
    let cell   = state.countyData[state.selectedCellId];
    let master = state.countyData[cell.masterId];

    uiRefs.countyName.value = master.name;
    uiRefs.countyGov.value = master.official;
    uiRefs.countyName.disabled = false;
    uiRefs.countyGov.disabled = false;
    uiRefs.btnExpandCounty.disabled = false;

    uiRefs.statPop.innerText = master.population.toLocaleString() + " " + (master.popUnit || "人");
    uiRefs.statArea.innerText = master.area.toLocaleString() + " 顷";
    uiRefs.statEcon.innerText = master.economy;
    uiRefs.statInd.innerText = master.industry;

    if (cell.prefId === null) {
        uiRefs.prefDataView.style.display = 'none';
        uiRefs.prefEmptyView.style.display = 'block';
    } else {
        let p = state.prefecturesData[cell.prefId];
        uiRefs.prefEmptyView.style.display = 'none';
        uiRefs.prefDataView.style.display  = 'block';

        uiRefs.prefName.value = p.name;
        uiRefs.prefGov.value = p.official;
        uiRefs.prefCap.value = state.countyData[p.capitalCountyId].name;

        let prefCounties = getCountiesByPrefId(cell.prefId);
        let prefStats    = aggregateRegionData(prefCounties);

        let prefBureau = "普通州府";
        if (prefStats.hasValidOfficialBureau && prefStats.officialTopInd && BureauMap[prefStats.officialTopInd]) {
            prefBureau = `设${BureauMap[prefStats.officialTopInd]} (主产${prefStats.officialTopInd})`;
        } else if (prefStats.topInd) {
            prefBureau = `主产${prefStats.topInd}`;
        }
        let milStr = prefStats.militaryCount > 0 ? ` (含${prefStats.militaryCount}处军镇)` : "";

        if (uiRefs.statPrefPop)  uiRefs.statPrefPop.innerText  = prefStats.totalPop.toLocaleString()  + " 人" + milStr;
        if (uiRefs.statPrefArea) uiRefs.statPrefArea.innerText = prefStats.totalArea.toLocaleString() + " 顷";
        if (uiRefs.statPrefEcon) uiRefs.statPrefEcon.innerText = prefStats.economyStr;
        if (uiRefs.statPrefInd)  uiRefs.statPrefInd.innerText  = prefBureau;
    }

    if (cell.provId === null) {
        uiRefs.provDataView.style.display = 'none';
        uiRefs.provEmptyView.style.display = 'block';
    } else {
        let p = state.provincesData[cell.provId];
        uiRefs.provEmptyView.style.display = 'none';
        uiRefs.provDataView.style.display  = 'block';

        uiRefs.provName.value = p.name;
        uiRefs.provGov.value = p.official;
        uiRefs.provCap.value = state.countyData[p.capitalCountyId].name;

        let provCounties = getCountiesByProvId(cell.provId);
        let provStats    = aggregateRegionData(provCounties);

        let provIndStr = "百业待兴";
        if (provStats.topInd) {
            provIndStr = provStats.secondInd
                ? `以${provStats.topInd}、${provStats.secondInd}为主`
                : `以${provStats.topInd}为主`;
        }
        let milStr = provStats.militaryCount > 0 ? ` (辖${provStats.militaryCount}处军镇)` : "";

        if (uiRefs.statProvPop)  uiRefs.statProvPop.innerText  = provStats.totalPop.toLocaleString()  + " 人" + milStr;
        if (uiRefs.statProvArea) uiRefs.statProvArea.innerText = provStats.totalArea.toLocaleString() + " 顷";
        if (uiRefs.statProvEcon) uiRefs.statProvEcon.innerText = provStats.economyStr;
        if (uiRefs.statProvInd)  uiRefs.statProvInd.innerText  = provIndStr;
    }

    if (master.roster) renderRosterList('county-officials-list', master.roster);

    if (cell.prefId !== null && state.prefecturesData[cell.prefId]?.roster) {
        renderRosterList('pref-officials-list', state.prefecturesData[cell.prefId].roster);
    }
    if (cell.provId !== null && state.provincesData[cell.provId]?.roster) {
        renderRosterList('prov-officials-list', state.provincesData[cell.provId].roster);
    }
}

export function switchTab(tabId) {
    state.activeTab = tabId;
    const leftPane = document.getElementById('capital-left-pane');
    if (leftPane && tabId !== 'capital') {
        leftPane.style.display = 'none';
    }
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`.admin-tabs .tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');

    if (state.mergeMode) toggleMerge(state.mergeMode);

    if (tabId === 'capital') {
        // 进入京官页默认展示名录模式，避免保留在上次的总督圈省模式造成困惑。
        setCapitalMode('officials');
        renderCapitalOfficials();
        renderCapitalGovernorAssignments();
        return;
    }

    const viewMap = { 'county': 'county', 'pref': 'prefecture', 'prov': 'province' };
    if (viewMap[tabId] && state.mapViewMode !== viewMap[tabId]) {
        setMapView(viewMap[tabId]);
    } else {
        refreshTerritoryPaint();
        drawCapitals();
        if (state.selectedCellId !== null) highlightSelection(state.selectedCellId);
    }
}

export function handleRegionClick(i) {
    if (isCapitalTabActive()) {
        if (!isCapitalGovernorMode()) {
            return;
        }
        state.selectedCellId = i;
        const cell = state.countyData[i];
        if (cell && cell.provId !== null) toggleCapitalGovernorProvince(cell.provId);
        return;
    }

    if (state.mergeMode !== null) {
        attemptMerge(state.selectedCellId, i, state.mergeMode);
    } else {
        state.selectedCellId = i;
        updateUI();
        highlightSelection(state.selectedCellId);
    }
}

if (typeof window !== 'undefined') {
    window.auditPrefectureBureaus = auditPrefectureBureaus;
}
