import {
    EconomyLvls, CoastalSpecialties, CapitalVicinityIndustries, BureauMap,
    LocalOfficialTemplates, SpecialOfficialTemplates
} from './constants.js';
import { NameGen } from './nameGen.js';
import { state } from './state.js';
import { generateRoster } from './officials.js';
import { setMapView, refreshTerritoryPaint, highlightSelection } from './map.js';

// ── Internal helpers ───────────────────────────────────────────────────────────

function getDistinctColor() {
    return d3.hsl(Math.random() * 360, 0.7, 0.5).hex();
}

// ── World initialisation ───────────────────────────────────────────────────────

export function initWorldData() {
    state.countyData = {};
    state.prefecturesData = {};
    state.provincesData = {};
    state.nextPrefId = 1;
    state.nextProvId = 1;
    state.capitalGovernorSelectedProvinces = [];
    state.capitalGovernorRegions = [];
    state.capitalGovernorNextId = 1;
    NameGen.generatedNames.clear();

    const coastalProvinces = ["江苏", "浙江", "福建", "广东", "山东", "直隶", "盛京", "台湾"];

    // 1820年人口密度基数 (人/平方公里)
    const popDensityMap = {
        "直隶": 80, "江苏": 340, "浙江": 250, "安徽": 230, "山东": 200, "江西": 150, "福建": 100, "广东": 100, "河南": 130, "湖北": 170, "湖南": 100, "四川": 60, "山西": 70, "陕西": 70, "广西": 60, "云南": 15, "贵州": 40, "甘肃": 25, "盛京": 20, "内蒙古": 4, "新疆": 1, "乌里雅苏台": 1,
    };

    let provNameToId = {};
    let prefNameToId = {};

    state.geoFeatures.forEach((f, i) => {
        const props = f.properties;
        const provName = props.LEV1_CH || "未知省份";
        const prefName = props.LEV2_CH || "未知府州";
        const realName = (props.SYS_NAME || props.NAME_CH || "未知");

        if (!provNameToId[provName]) {
            provNameToId[provName] = state.nextProvId++;
            let title = provName.includes("直隶") ? "总督" : "巡抚";
            state.provincesData[provNameToId[provName]] = {
                id: provNameToId[provName], name: provName,
                official: `${NameGen.person()} (${title})`,
                color: d3.hsl(Math.random() * 360, 0.65, 0.6).hex(),
                capitalCountyId: i,
                roster: generateRoster(LocalOfficialTemplates.prov)
            };
        }
        const currentProvId = provNameToId[provName];

        const prefKey = provName + "-" + prefName;
        if (!prefNameToId[prefKey]) {
            prefNameToId[prefKey] = state.nextPrefId++;
            state.prefecturesData[prefNameToId[prefKey]] = {
                id: prefNameToId[prefKey], provId: currentProvId, name: prefName,
                official: `${NameGen.person()} (知府)`,
                color: d3.hsl(Math.random() * 360, 0.65, 0.6).hex(),
                capitalCountyId: i,
                roster: generateRoster(LocalOfficialTemplates.pref)
            };
        }
        const currentPrefId = prefNameToId[prefKey];

        // 1 平方公里 = 15 顷
        const sqKm = d3.geoArea(f) * 6371 * 6371;
        const landArea = Math.max(1, Math.round(sqKm * 15));
        const density = (popDensityMap[provName] || 30) * (0.8 + Math.random() * 0.4);
        let pop = Math.max(1000, Math.round(sqKm * density));

        let economyStr = "平平";
        let industryStr = "农业";
        let isOfficialRun = false;

        const isCapital = (i === state.capitalId);
        const isCapitalVicinity = !isCapital && (state.neighborsMap[state.capitalId] || []).includes(i);
        const isCoastal = coastalProvinces.includes(provName) && (Math.random() > 0.7);

        if (isCapital) {
            pop = Math.floor(pop + 1500000);
            economyStr = "天子脚下";
            industryStr = "中枢六部";
        } else if (isCapitalVicinity) {
            economyStr = "京畿重地";
            industryStr = CapitalVicinityIndustries[Math.floor(Math.random() * CapitalVicinityIndustries.length)];
        } else {
            const ecoIdx = density > 250 ? 4 : (density > 150 ? 3 : (density > 70 ? 2 : (density > 30 ? 1 : 0)));
            economyStr = EconomyLvls[ecoIdx];

            if (isCoastal) {
                industryStr = CoastalSpecialties[Math.floor(Math.random() * CoastalSpecialties.length)];
            } else {
                industryStr = (ecoIdx >= 3)
                    ? ["丝织", "茶业", "瓷器", "商业"][Math.floor(Math.random() * 4)]
                    : ["农业", "林木", "药材", "畜牧", "矿业"][Math.floor(Math.random() * 5)];
            }

            let baseChance = (ecoIdx === 4) ? 0.30 : 0.1;
            if (ecoIdx >= 3 && BureauMap[industryStr] && Math.random() < baseChance) {
                isOfficialRun = true;
                economyStr = "官营·" + economyStr;
            }
        }

        let countyColor = isCapital ? "#F1C40F" : d3.hsl(Math.random() * 360, 0.4, 0.8).hex();
        if (isCapital) {
            state.provincesData[currentProvId].color = "#F1C40F";
            state.prefecturesData[currentPrefId].color = "#F1C40F";
        }

        let countyOfficial = isCapital ? "顺天府尹" : `${NameGen.person()} (知县)`;

        state.countyData[i] = {
            id: i, masterId: i, prefId: currentPrefId, provId: currentProvId,
            isCapital, name: isCapital ? `京师 (${realName})` : realName,
            official: countyOfficial,
            color: countyColor,
            center: state.pathGenerator.projection()(d3.geoCentroid(f)),
            area: landArea,
            population: pop,
            economy: economyStr,
            industry: industryStr,
            isOfficialRun: isOfficialRun,
            roster: generateRoster(LocalOfficialTemplates.county)
        };
    });

    Object.values(state.prefecturesData).forEach(pref => {
        let prefCounties = Object.values(state.countyData).filter(c => c.prefId === pref.id);

        if (prefCounties.some(c => c.isCapital)) {
            pref.roster = pref.roster.filter(o => o.title !== "通判" && o.title !== "同知");
            pref.roster.unshift(...generateRoster(SpecialOfficialTemplates["顺天府"]));
        } else if (pref.name.includes("奉天")) {
            pref.roster = pref.roster.filter(o => o.title !== "通判" && o.title !== "同知");
            pref.roster.unshift(...generateRoster(SpecialOfficialTemplates["奉天府"]));
        }

        let hasSalt = false, hasWeaving = false, hasMine = false;
        prefCounties.forEach(c => {
            if (c.industry && c.industry.includes("盐")) hasSalt = true;
            if (c.isOfficialRun && c.industry === "丝织") hasWeaving = true;
            if (c.isOfficialRun && c.industry === "矿业") hasMine = true;
        });

        if (hasSalt) pref.roster.push(...generateRoster(SpecialOfficialTemplates["盐务"]));
        if (hasWeaving) pref.roster.push(...generateRoster(SpecialOfficialTemplates["织造"]));
        if (hasMine) pref.roster.push(...generateRoster(SpecialOfficialTemplates["矿局"]));
    });
}

// ── Establish new administrative level ────────────────────────────────────────

export function establish(level) {
    let cell = state.countyData[state.selectedCellId];
    let assignedColor = getDistinctColor();

    if (level === 'pref') {
        state.prefecturesData[state.nextPrefId] = {
            name: NameGen.genPrefName(cell.isCapital),
            official: NameGen.person(),
            color: assignedColor,
            capitalCountyId: cell.masterId,
            roster: generateRoster(LocalOfficialTemplates.pref)
        };
        Object.values(state.countyData).forEach(c => { if (c.masterId === cell.masterId) c.prefId = state.nextPrefId; });
        state.nextPrefId++;
        setMapView('prefecture');
        import('./ui.js').then(({ switchTab }) => switchTab('pref'));
    } else if (level === 'prov') {
        state.provincesData[state.nextProvId] = {
            name: NameGen.genProvName(cell.isCapital),
            official: NameGen.person(),
            color: assignedColor,
            capitalCountyId: cell.masterId,
            roster: generateRoster(LocalOfficialTemplates.prov)
        };
        if (cell.prefId !== null) {
            Object.values(state.countyData).forEach(c => { if (c.prefId === cell.prefId) c.provId = state.nextProvId; });
        } else {
            Object.values(state.countyData).forEach(c => { if (c.masterId === cell.masterId) c.provId = state.nextProvId; });
        }
        state.nextProvId++;
        setMapView('province');
        import('./ui.js').then(({ switchTab }) => switchTab('prov'));
    }
    import('./ui.js').then(({ updateUI }) => updateUI());
}

// ── Merge / expand operations ──────────────────────────────────────────────────

export function toggleMerge(level) {
    let btnId = 'btn-expand-' + (level === 'county' ? 'county' : level.substring(0, 4));
    let btn = document.getElementById(btnId);

    if (state.mergeMode === level) {
        state.mergeMode = null;
        btn.innerText = level === 'province' ? "划入新府 (Absorb Prefecture)" : level === 'prefecture' ? "纳入新地 (Expand Prefecture)" : "扩展";
        btn.classList.remove("merging-active");
    } else {
        state.mergeMode = level;
        btn.innerText = "点击接壤的地图区域...";
        btn.classList.add("merging-active");
        setMapView(level);
    }
}

export function attemptMerge(absId, tgtId, level) {
    let abs = state.countyData[absId], tgt = state.countyData[tgtId];
    if (
        (level === 'county'     && abs.masterId === tgt.masterId) ||
        (level === 'prefecture' && tgt.prefId !== null && abs.prefId === tgt.prefId) ||
        (level === 'province'   && tgt.provId !== null && abs.provId === tgt.provId)
    ) {
        toggleMerge(level);
        return;
    }

    let srcCells = Object.values(state.countyData).filter(c =>
        level === 'county'     ? c.masterId === abs.masterId :
        level === 'prefecture' ? c.prefId   === abs.prefId   :
                                 c.provId   === abs.provId
    ).map(c => c.id);

    let tgtCells = Object.values(state.countyData).filter(c =>
        (level === 'province' && tgt.prefId !== null) ? c.prefId === tgt.prefId : c.masterId === tgt.masterId
    ).map(c => c.id);

    let isAdj = false;
    for (let id of srcCells) {
        let nList = state.neighborsMap[id] || [];
        for (let n of nList) { if (tgtCells.includes(n)) { isAdj = true; break; } }
        if (isAdj) break;
    }

    if (level === 'county') {
        let masterAbs = state.countyData[abs.masterId], masterTgt = state.countyData[tgt.masterId];
        masterAbs.population += masterTgt.population;
        masterAbs.area += masterTgt.area;
    }

    Object.values(state.countyData).forEach(c => {
        if      (level === 'county'     && c.masterId === tgt.masterId) { c.masterId = abs.masterId; c.prefId = abs.prefId; c.provId = abs.provId; }
        else if (level === 'prefecture' && c.masterId === tgt.masterId) { c.prefId = abs.prefId; if (abs.provId !== null) c.provId = abs.provId; }
        else if (level === 'province') {
            if (tgt.prefId !== null) { if (c.prefId === tgt.prefId) c.provId = abs.provId; }
            else                     { if (c.masterId === tgt.masterId) c.provId = abs.provId; }
        }
    });

    toggleMerge(level);
    setMapView(level);
    highlightSelection(absId);
    import('./ui.js').then(({ updateUI }) => updateUI());
}
