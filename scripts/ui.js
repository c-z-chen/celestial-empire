import { BureauMap } from './constants.js';
import { state, isCapitalTabActive } from './state.js';
import { renderRosterList, renderCapitalGovernorAssignments, toggleCapitalGovernorProvince } from './officials.js';
import { setMapView, refreshTerritoryPaint, drawCapitals, highlightSelection } from './map.js';
import { toggleMerge, attemptMerge } from './territory.js';

function aggregateRegionData(regionCounties) {
    let totalPop = 0, totalArea = 0, militaryCount = 0, indCounts = {};
    let officialIndCounts = {};
    const ecoLvlMap = { "繁华": 5, "富庶": 4, "平平": 3, "贫困": 2, "凋敝": 1, "天子脚下": 5, "京畿重地": 4 };
    const normalizeEconomy = (economy = "") => economy.replace("官营·", "").replace("（官营）", "");

    let ecoScores = [];
    let geoTotal = 0, geoCount = 0;
    let coastalCount = 0, frontierCount = 0;
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
        if (!m.isCapital && !m.isCapitalVicinity) {
            ecoScores.push(ecoLvlMap[normalizeEconomy(m.economy)] || 0);
        }
        
        if (m.geoProfile) {
            geoTotal += m.geoProfile.geoScore;
            geoCount++;
            if (m.isCoastal) coastalCount++;
            if (m.geoProfile.frontierPenalty > 0.3) frontierCount++;
        }
    });

    let sortedInds = Object.keys(indCounts).sort((a, b) => indCounts[b] - indCounts[a]);
    let sortedOfficialInds = Object.keys(officialIndCounts).sort((a, b) => officialIndCounts[b] - officialIndCounts[a]);
    const avgEco = ecoScores.length ? (ecoScores.reduce((sum, s) => sum + s, 0) / ecoScores.length) : 0;
    const maxEco = ecoScores.length ? Math.max(...ecoScores) : 0;
    const richCount = ecoScores.filter(s => s >= 4).length;
    const hasValidOfficialBureau = Boolean(sortedOfficialInds[0]) && avgEco >= 3.35 && maxEco >= 4 && richCount >= 2;
    const avgGeoScore = geoCount ? (geoTotal / geoCount).toFixed(3) : 0;
    
    return { 
        totalPop, totalArea, militaryCount, topInd: sortedInds[0], secondInd: sortedInds[1],
        officialTopInd: sortedOfficialInds[0],
        hasValidOfficialBureau,
        avgGeoScore, coastalCount, frontierCount
    };
}

function auditPrefectureBureaus() {
    const ecoLvlMap = { "繁华": 5, "富庶": 4, "平平": 3, "贫困": 2, "凋敝": 1, "天子脚下": 5, "京畿重地": 4 };
    const normalizeEconomy = (economy = "") => economy.replace("官营·", "").replace("（官营）", "");

    const anomalies = [];
    Object.values(state.prefecturesData).forEach(pref => {
        const prefCounties = Object.values(state.countyData).filter(c => c.prefId === pref.id);
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
        console.info('[auditPrefectureBureaus] 未发现“全贫困但仍设官营机构”的府。');
        return [];
    }

    console.warn('[auditPrefectureBureaus] 发现异常府：', anomalies);
    return anomalies;
}

export function updateUI() {
    if (state.selectedCellId === null) return;
    let cell   = state.countyData[state.selectedCellId];
    let master = state.countyData[cell.masterId];

    document.getElementById('inp-county-name').value    = master.name;
    document.getElementById('inp-county-gov').value     = master.official;
    document.getElementById('inp-county-name').disabled = false;
    document.getElementById('inp-county-gov').disabled  = false;
    document.getElementById('btn-expand-county').disabled = false;

    document.getElementById('stat-pop').innerText  = master.population.toLocaleString() + " " + (master.popUnit || "人");
    document.getElementById('stat-area').innerText = master.area.toLocaleString() + " 顷";
    document.getElementById('stat-econ').innerText = master.economy;
    document.getElementById('stat-ind').innerText  = master.industry;

    if (cell.prefId === null) {
        document.getElementById('pref-data-view').style.display = 'none';
        document.getElementById('pref-empty-view').style.display = 'block';
    } else {
        let p = state.prefecturesData[cell.prefId];
        document.getElementById('pref-empty-view').style.display = 'none';
        document.getElementById('pref-data-view').style.display  = 'block';

        document.getElementById('inp-pref-name').value = p.name;
        document.getElementById('inp-pref-gov').value  = p.official;
        document.getElementById('inp-pref-cap').value  = state.countyData[p.capitalCountyId].name;

        let prefCounties = Object.values(state.countyData).filter(c => c.prefId === cell.prefId);
        let prefStats    = aggregateRegionData(prefCounties);

        let prefBureau = "普通州府";
        if (prefStats.hasValidOfficialBureau && prefStats.officialTopInd && BureauMap[prefStats.officialTopInd]) {
            prefBureau = `设${BureauMap[prefStats.officialTopInd]} (主产${prefStats.officialTopInd})`;
        } else if (prefStats.topInd) {
            prefBureau = `主产${prefStats.topInd}`;
        }
        let milStr = prefStats.militaryCount > 0 ? ` (含${prefStats.militaryCount}处军镇)` : "";

        if (document.getElementById('stat-pref-pop'))  document.getElementById('stat-pref-pop').innerText  = prefStats.totalPop.toLocaleString()  + " 人" + milStr;
        if (document.getElementById('stat-pref-area')) document.getElementById('stat-pref-area').innerText = prefStats.totalArea.toLocaleString() + " 顷";
        if (document.getElementById('stat-pref-ind'))  document.getElementById('stat-pref-ind').innerText  = prefBureau;
    }

    if (cell.provId === null) {
        document.getElementById('prov-data-view').style.display = 'none';
        document.getElementById('prov-empty-view').style.display = 'block';
    } else {
        let p = state.provincesData[cell.provId];
        document.getElementById('prov-empty-view').style.display = 'none';
        document.getElementById('prov-data-view').style.display  = 'block';

        document.getElementById('inp-prov-name').value = p.name;
        document.getElementById('inp-prov-gov').value  = p.official;
        document.getElementById('inp-prov-cap').value  = state.countyData[p.capitalCountyId].name;

        let provCounties = Object.values(state.countyData).filter(c => c.provId === cell.provId);
        let provStats    = aggregateRegionData(provCounties);

        let provIndStr = "百业待兴";
        if (provStats.topInd) {
            provIndStr = provStats.secondInd
                ? `以${provStats.topInd}、${provStats.secondInd}为主`
                : `以${provStats.topInd}为主`;
        }
        let milStr = provStats.militaryCount > 0 ? ` (辖${provStats.militaryCount}处军镇)` : "";

        if (document.getElementById('stat-prov-pop'))  document.getElementById('stat-prov-pop').innerText  = provStats.totalPop.toLocaleString()  + " 人" + milStr;
        if (document.getElementById('stat-prov-area')) document.getElementById('stat-prov-area').innerText = provStats.totalArea.toLocaleString() + " 顷";
        if (document.getElementById('stat-prov-ind'))  document.getElementById('stat-prov-ind').innerText  = provIndStr;
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
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.querySelector(`.admin-tabs .tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');

    if (state.mergeMode) toggleMerge(state.mergeMode);

    if (tabId === 'capital') {
        if (state.mapViewMode !== 'province') {
            setMapView('province', false);
        } else {
            refreshTerritoryPaint();
            drawCapitals();
            if (state.selectedCellId !== null) highlightSelection(state.selectedCellId);
        }
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
