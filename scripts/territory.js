import {
    EconomyLvls, CapitalVicinityIndustries, BureauMap,
    LocalOfficialTemplates, SpecialOfficialTemplates,
    ecoLvlMap, normalizeEconomy
} from './constants.js';
import { NameGen } from './nameGen.js';
import { state } from './state.js';
import { generateRoster } from './officials.js';
import { setMapView, refreshTerritoryPaint, highlightSelection } from './map.js';

function getDistinctColor() {
    return d3.hsl(Math.random() * 360, 0.7, 0.5).hex();
}

function clamp01(value) {
    return Math.max(0, Math.min(1, value));
}

const YANGTZE_PROVINCES = new Set(["江苏", "安徽", "湖北", "湖南", "江西", "浙江", "四川"]);
const NORTH_DRY_PROVINCES = new Set(["直隶", "山东", "山西", "河南", "陕西", "甘肃"]);
const FRONTIER_PROVINCES = new Set(["新疆", "内蒙古", "乌里雅苏台", "盛京", "云南", "贵州", "广西"]);
const COASTAL_EDGE_MODE = {
    "直隶": "east",
    "山东": "east",
    "江苏": "east",
    "浙江": "east",
    "福建": "east",
    "广东": "southEast",
    "盛京": "east",
    "台湾": "all"
};

function getCountySimRegionName(props) {
    const provName = props.LEV1_CH || "未知省份";
    const prefName = props.LEV2_CH || "";
    const countyName = (props.SYS_NAME || props.NAME_CH || "");
    const presLoc = props.PRES_LOC || "";

    const isTaiwanInFujian = provName === "福建" && (
        prefName.includes("台湾") ||
        presLoc.includes("台湾") ||
        countyName.includes("台湾") ||
        countyName.includes("淡水") ||
        countyName.includes("噶玛兰") ||
        countyName.includes("凤山") ||
        countyName.includes("彰化") ||
        countyName.includes("嘉义")
    );

    return isTaiwanInFujian ? "台湾" : provName;
}

function buildProvinceGeoBounds(features) {
    const boundsMap = {};
    features.forEach(f => {
        const props = f.properties || {};
        const provName = getCountySimRegionName(props);
        const [[minLon, minLat], [maxLon, maxLat]] = d3.geoBounds(f);
        if (!boundsMap[provName]) {
            boundsMap[provName] = { minLon, minLat, maxLon, maxLat };
            return;
        }
        const b = boundsMap[provName];
        b.minLon = Math.min(b.minLon, minLon);
        b.minLat = Math.min(b.minLat, minLat);
        b.maxLon = Math.max(b.maxLon, maxLon);
        b.maxLat = Math.max(b.maxLat, maxLat);
    });
    return boundsMap;
}

function isCountyCoastal(provName, centroid, provinceBounds) {
    const mode = COASTAL_EDGE_MODE[provName];
    if (!mode) return false;
    if (mode === "all") return true;

    const bounds = provinceBounds[provName];
    if (!bounds) return false;

    const [lon, lat] = centroid;
    const lonSpan = Math.max(0.1, bounds.maxLon - bounds.minLon);
    const latSpan = Math.max(0.1, bounds.maxLat - bounds.minLat);
    const eastBand = lon >= bounds.maxLon - lonSpan * 0.28;
    const southBand = lat <= bounds.minLat + latSpan * 0.25;

    if (mode === "east") return eastBand;
    if (mode === "southEast") return eastBand || southBand;
    return false;
}

function getCountyZoneFlags(provName) {
    return {
        isYangtze: YANGTZE_PROVINCES.has(provName),
        isNorthDry: NORTH_DRY_PROVINCES.has(provName),
        isFrontier: FRONTIER_PROVINCES.has(provName)
    };
}

function calibratePrefectureIndustries() {
    const pickFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    Object.values(state.prefecturesData).forEach(pref => {
        const prefCounties = Object.values(state.countyData).filter(c => c.prefId === pref.id);
        if (!prefCounties.length) return;

        const uniqueMasters = new Set();
        const masters = [];
        prefCounties.forEach(c => {
            if (uniqueMasters.has(c.masterId)) return;
            uniqueMasters.add(c.masterId);
            masters.push(state.countyData[c.masterId]);
        });

        if (!masters.length) return;

        let coastalCnt = 0;
        let yangtzeCnt = 0;
        let northDryCnt = 0;
        let frontierCnt = 0;
        let taiwanCnt = 0;
        const indCount = {};

        masters.forEach(m => {
            if (m.isCoastal) coastalCnt++;
            if (m.zoneFlags?.isYangtze) yangtzeCnt++;
            if (m.zoneFlags?.isNorthDry) northDryCnt++;
            if (m.zoneFlags?.isFrontier) frontierCnt++;
            if (m.simProvName === "台湾") taiwanCnt++;
            indCount[m.industry] = (indCount[m.industry] || 0) + 1;
        });

        const total = masters.length;
        const dominantIndustry = Object.keys(indCount).sort((a, b) => indCount[b] - indCount[a])[0];

        let prefPool = ["农业", "商业", "林业", "药材"];
        if (taiwanCnt / total >= 0.5) {
            prefPool = ["海贸", "盐业", "农业", "商业", "茶业"];
        } else if (frontierCnt / total >= 0.45) {
            prefPool = ["畜牧", "军屯", "矿业", "药材"];
        } else if (coastalCnt / total >= 0.45) {
            prefPool = ["海贸", "盐业", "丝织", "瓷器", "商业", "造船", "渔业", "采珠"];
        } else if (yangtzeCnt / total >= 0.45) {
            prefPool = ["农业", "茶业", "丝织", "商业", "粮食", "渔业"];
        } else if (northDryCnt / total >= 0.45) {
            prefPool = ["农业", "矿业", "畜牧", "商业", "药材", "林业"];
        }

        const needNudge = dominantIndustry && !prefPool.includes(dominantIndustry);
        if (needNudge) {
            const target = masters.find(m => !m.isCapital && !m.isCapitalVicinity && !m.isOfficialRun);
            if (target) target.industry = pickFrom(prefPool);
        }

        masters.forEach(m => {
            if (m.isCapital || m.isCapitalVicinity || m.isOfficialRun) return;
            if (prefPool.includes(m.industry)) return;
            if (Math.random() < 0.28) {
                m.industry = pickFrom(prefPool);
            }
        });
    });
}

function assignPrefectureOfficialBureaus() {    const getPrefEconomyStats = (masters) => {
        const economicMasters = masters.filter(m => !m.isCapital && !m.isCapitalVicinity);
        if (!economicMasters.length) return { avgEco: 0, maxEco: 0, richCount: 0 };
        const ecoScores = economicMasters.map(m => ecoLvlMap[normalizeEconomy(m.economy)] || 0);
        const avgEco = ecoScores.reduce((sum, s) => sum + s, 0) / ecoScores.length;
        const maxEco = Math.max(...ecoScores);
        const richCount = ecoScores.filter(s => s >= 4).length;
        return { avgEco, maxEco, richCount };
    };

    Object.values(state.prefecturesData).forEach(pref => {
        const prefCounties = Object.values(state.countyData).filter(c => c.prefId === pref.id);
        if (!prefCounties.length) return;

        const uniqueMasters = new Set();
        const masters = [];
        prefCounties.forEach(c => {
            if (uniqueMasters.has(c.masterId)) return;
            uniqueMasters.add(c.masterId);
            masters.push(state.countyData[c.masterId]);
        });

        masters.forEach(m => { m.isOfficialRun = false; });

        const { avgEco, maxEco, richCount } = getPrefEconomyStats(masters);
        if (avgEco < 3.35 || maxEco < 4 || richCount < 2) return;

        const indCount = {};
        const indCounties = {};
        masters.forEach(m => {
            if (m.isCapital || m.isCapitalVicinity) return;
            indCount[m.industry] = (indCount[m.industry] || 0) + 1;
            if (!indCounties[m.industry]) indCounties[m.industry] = [];
            indCounties[m.industry].push(m);
        });

        if (!Object.keys(indCount).length) return;

        const dominantIndustry = Object.keys(indCount).sort((a, b) => indCount[b] - indCount[a])[0];
        if (!dominantIndustry || !BureauMap[dominantIndustry]) return;

        const candidates = indCounties[dominantIndustry] || [];
        if (!candidates.length) return;

        candidates.sort((a, b) => {
            const aEco = ecoLvlMap[normalizeEconomy(a.economy)] || 0;
            const bEco = ecoLvlMap[normalizeEconomy(b.economy)] || 0;
            if (aEco !== bEco) return bEco - aEco;
            return b.population - a.population;
        });

        const officialCounty = candidates[0];
        if (officialCounty && (ecoLvlMap[normalizeEconomy(officialCounty.economy)] || 0) >= 4) {
            officialCounty.isOfficialRun = true;
            let eco = officialCounty.economy;
            if (!eco.includes("官营")) {
                officialCounty.economy = eco + "（官营）";
            }
        }
    });
}

function getProvinceBaseProfile(provName) {
    const profileMap = {
        "直隶":        { fertility: 0.74, riverAccess: 0.64, oceanAccess: 0.20, tradeAccess: 0.84, resourceScore: 0.36, frontierPenalty: 0.10, densityBase: 70 },
        "江苏":        { fertility: 0.92, riverAccess: 0.90, oceanAccess: 0.42, tradeAccess: 0.92, resourceScore: 0.38, frontierPenalty: 0.00, densityBase: 350 },
        "浙江":        { fertility: 0.82, riverAccess: 0.78, oceanAccess: 0.48, tradeAccess: 0.88, resourceScore: 0.36, frontierPenalty: 0.00, densityBase: 190 },
        "安徽":        { fertility: 0.84, riverAccess: 0.82, oceanAccess: 0.02, tradeAccess: 0.64, resourceScore: 0.34, frontierPenalty: 0.00, densityBase: 140 },
        "山东":        { fertility: 0.76, riverAccess: 0.56, oceanAccess: 0.40, tradeAccess: 0.70, resourceScore: 0.40, frontierPenalty: 0.00, densityBase: 125 },
        "江西":        { fertility: 0.80, riverAccess: 0.76, oceanAccess: 0.00, tradeAccess: 0.58, resourceScore: 0.36, frontierPenalty: 0.00, densityBase: 115 },
        "福建":        { fertility: 0.66, riverAccess: 0.52, oceanAccess: 0.58, tradeAccess: 0.80, resourceScore: 0.34, frontierPenalty: 0.00, densityBase: 95 },
        "广东":        { fertility: 0.74, riverAccess: 0.70, oceanAccess: 0.62, tradeAccess: 0.86, resourceScore: 0.36, frontierPenalty: 0.02, densityBase: 110 },
        "河南":        { fertility: 0.78, riverAccess: 0.50, oceanAccess: 0.00, tradeAccess: 0.56, resourceScore: 0.38, frontierPenalty: 0.00, densityBase: 110 },
        "湖北":        { fertility: 0.84, riverAccess: 0.88, oceanAccess: 0.00, tradeAccess: 0.66, resourceScore: 0.36, frontierPenalty: 0.00, densityBase: 150 },
        "湖南":        { fertility: 0.79, riverAccess: 0.72, oceanAccess: 0.00, tradeAccess: 0.60, resourceScore: 0.36, frontierPenalty: 0.00, densityBase: 100 },
        "四川":        { fertility: 0.88, riverAccess: 0.70, oceanAccess: 0.00, tradeAccess: 0.54, resourceScore: 0.38, frontierPenalty: 0.10, densityBase: 70 },
        "山西":        { fertility: 0.40, riverAccess: 0.30, oceanAccess: 0.00, tradeAccess: 0.50, resourceScore: 0.52, frontierPenalty: 0.06, densityBase: 58 },
        "陕西":        { fertility: 0.48, riverAccess: 0.36, oceanAccess: 0.00, tradeAccess: 0.46, resourceScore: 0.52, frontierPenalty: 0.10, densityBase: 60 },
        "广西":        { fertility: 0.60, riverAccess: 0.64, oceanAccess: 0.00, tradeAccess: 0.48, resourceScore: 0.44, frontierPenalty: 0.10, densityBase: 48 },
        "云南":        { fertility: 0.46, riverAccess: 0.48, oceanAccess: 0.00, tradeAccess: 0.34, resourceScore: 0.54, frontierPenalty: 0.16, densityBase: 16 },
        "贵州":        { fertility: 0.42, riverAccess: 0.44, oceanAccess: 0.00, tradeAccess: 0.32, resourceScore: 0.52, frontierPenalty: 0.14, densityBase: 26 },
        "甘肃":        { fertility: 0.22, riverAccess: 0.18, oceanAccess: 0.00, tradeAccess: 0.36, resourceScore: 0.56, frontierPenalty: 0.34, densityBase: 20 },
        "盛京":        { fertility: 0.52, riverAccess: 0.40, oceanAccess: 0.28, tradeAccess: 0.44, resourceScore: 0.44, frontierPenalty: 0.22, densityBase: 18 },
        "内蒙古":      { fertility: 0.08, riverAccess: 0.10, oceanAccess: 0.00, tradeAccess: 0.24, resourceScore: 0.50, frontierPenalty: 0.50, densityBase: 4 },
        "新疆":        { fertility: 0.06, riverAccess: 0.08, oceanAccess: 0.00, tradeAccess: 0.24, resourceScore: 0.54, frontierPenalty: 0.58, densityBase: 2 },
        "乌里雅苏台":  { fertility: 0.03, riverAccess: 0.04, oceanAccess: 0.00, tradeAccess: 0.12, resourceScore: 0.48, frontierPenalty: 0.70, densityBase: 1 },
        "台湾":        { fertility: 0.56, riverAccess: 0.58, oceanAccess: 0.80, tradeAccess: 0.74, resourceScore: 0.36, frontierPenalty: 0.18, densityBase: 11 },
    };
    return profileMap[provName] || {
        fertility: 0.50,
        riverAccess: 0.50,
        oceanAccess: 0.05,
        tradeAccess: 0.50,
        resourceScore: 0.35,
        frontierPenalty: 0.10,
        densityBase: 30
    };
}

function computeCountyGeoProfile({ provName, isCapital, isCapitalVicinity, isCoastal, zoneFlags }) {
    const base = getProvinceBaseProfile(provName);

    let fertility = base.fertility;
    let riverAccess = base.riverAccess;
    let oceanAccess = base.oceanAccess;
    let tradeAccess = base.tradeAccess;
    let resourceScore = base.resourceScore;
    let frontierPenalty = base.frontierPenalty;
    let adminDifficulty = 0.35;

    if (zoneFlags.isYangtze) {
        fertility += 0.04;
        riverAccess += 0.10;
        tradeAccess += 0.06;
    }
    if (zoneFlags.isNorthDry) {
        fertility -= 0.05;
        resourceScore += 0.08;
    }
    if (zoneFlags.isFrontier) {
        resourceScore += 0.10;
        tradeAccess -= 0.05;
        frontierPenalty += 0.10;
    }

    if (isCoastal) {
        oceanAccess += 0.22;
        tradeAccess += 0.12;
        resourceScore += 0.03;
    }
    if (isCapital) {
        tradeAccess += 0.20;
        adminDifficulty = 0.05;
    } else if (isCapitalVicinity) {
        tradeAccess += 0.12;
        adminDifficulty = 0.15;
    }

    fertility = clamp01(fertility);
    riverAccess = clamp01(riverAccess);
    oceanAccess = clamp01(oceanAccess);
    tradeAccess = clamp01(tradeAccess);
    resourceScore = clamp01(resourceScore);
    frontierPenalty = clamp01(frontierPenalty);
    adminDifficulty = clamp01(adminDifficulty);

    const waterAccess = clamp01(riverAccess * 0.70 + oceanAccess * 0.30);

    const geoScore =
        fertility * 0.34 +
        waterAccess * 0.22 +
        tradeAccess * 0.20 +
        resourceScore * 0.12 +
        (1 - frontierPenalty) * 0.12;

    return {
        fertility,
        riverAccess,
        oceanAccess,
        waterAccess,
        tradeAccess,
        resourceScore,
        frontierPenalty,
        adminDifficulty,
        geoScore,
        densityBase: base.densityBase
    };
}

function pickIndustry({ geoProfile, provName, isCapital, isCapitalVicinity, isCoastal, zoneFlags }) {
    if (isCapital) return "中枢六部";
    if (isCapitalVicinity) return CapitalVicinityIndustries[Math.floor(Math.random() * CapitalVicinityIndustries.length)];

    const pool = [];

    const pushWeighted = (industry, weight) => {
        for (let i = 0; i < weight; i++) pool.push(industry);
    };

    if (isCoastal || geoProfile.oceanAccess > 0.55) {
        pushWeighted("海贸", 5);
        pushWeighted("盐业", 4);
        pushWeighted("造船", 3);
        pushWeighted("渔业", 3);
        pushWeighted("丝织", 2);
        pushWeighted("采珠", 2);
    }

    if (zoneFlags.isYangtze) {
        pushWeighted("农业", 5);
        pushWeighted("茶业", 4);
        pushWeighted("丝织", 4);
        pushWeighted("商业", 4);
        pushWeighted("渔业", 3);
        pushWeighted("瓷器", 2);
    }

    if (zoneFlags.isNorthDry) {
        pushWeighted("农业", 4);
        pushWeighted("矿业", 3);
        pushWeighted("瓷器", 3);
        pushWeighted("商业", 2);
        pushWeighted("林业", 2);
    }

    if (zoneFlags.isFrontier || geoProfile.frontierPenalty > 0.42) {
        pushWeighted("畜牧", 5);
        pushWeighted("军屯", 4);
        pushWeighted("矿业", 4);
        pushWeighted("药材", 3);
        pushWeighted("林业", 2);
    }

    const provinceSpecialties = {
        "安徽": [["农业", 5], ["茶业", 5], ["丝织", 1]],
        "江苏": [["丝织", 6], ["商业", 5], ["农业", 2]],
        "山东": [["农业", 5], ["盐业", 5], ["商业", 1]],
        "浙江": [["丝织", 4], ["茶业", 3], ["商业", 3]],
        "福建": [["茶业", 4], ["海贸", 3], ["林业", 2]],
        "广东": [["海贸", 4], ["盐业", 3], ["商业", 3]],
        "台湾": [["海贸", 3], ["盐业", 2], ["农业", 2]]
    };
    (provinceSpecialties[provName] || []).forEach(([industry, weight]) => pushWeighted(industry, weight));

    if (geoProfile.fertility > 0.70) {
        pushWeighted("农业", 3);
        pushWeighted("茶业", 2);
    }
    if (geoProfile.tradeAccess > 0.70) {
        pushWeighted("商业", 3);
        pushWeighted("丝织", 2);
    }
    if (geoProfile.resourceScore > 0.55) {
        pushWeighted("矿业", 2);
        pushWeighted("药材", 2);
        pushWeighted("林业", 2);
    }

    if (pool.length === 0) {
        pool.push("农业", "林业", "药材", "畜牧", "矿业", "商业");
    }

    return pool[Math.floor(Math.random() * pool.length)];
}

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

    const provinceBounds = buildProvinceGeoBounds(state.geoFeatures);

    let provNameToId = {};
    let prefNameToId = {};

    state.geoFeatures.forEach((f, i) => {
        const props = f.properties;
        const provName = props.LEV1_CH || "未知省份";
        const prefName = props.LEV2_CH || "未知府州";
        const realName = (props.SYS_NAME || props.NAME_CH || "未知");
        const simProvName = getCountySimRegionName(props);

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

        let economyStr = "平平";
        let industryStr = "农业";
        let isOfficialRun = false;

        const centroid = d3.geoCentroid(f);
        const isCapital = (i === state.capitalId);
        const isCapitalVicinity = !isCapital && (state.neighborsMap[state.capitalId] || []).includes(i);
        const zoneFlags = getCountyZoneFlags(simProvName);
        const isCoastal = isCountyCoastal(simProvName, centroid, provinceBounds);

        const geoProfile = computeCountyGeoProfile({
            provName: simProvName,
            isCapital,
            isCapitalVicinity,
            isCoastal,
            zoneFlags
        });

        const noise = 0.9 + Math.random() * 0.2; // 0.9 ~ 1.1
        const adminFactor = isCapital ? 3.5 : (isCapitalVicinity ? 1.6 : 1.0);
        const density = geoProfile.densityBase * geoProfile.geoScore * adminFactor * noise;
        let pop = Math.max(1000, Math.round(sqKm * density));

        if (isCapital) {
            pop = Math.max(pop, 800000);
            economyStr = "天子脚下";
            industryStr = "中枢六部";
        } else if (isCapitalVicinity) {
            pop = Math.max(pop, Math.floor(pop * 1.4));
            economyStr = "京畿重地";
            industryStr = CapitalVicinityIndustries[Math.floor(Math.random() * CapitalVicinityIndustries.length)];
        } else {
            const econScore = geoProfile.geoScore * 0.7 + Math.min(1, pop / 1000000) * 0.3;
            const ecoIdx = econScore > 0.82 ? 4 : (econScore > 0.65 ? 3 : (econScore > 0.48 ? 2 : (econScore > 0.32 ? 1 : 0)));
            economyStr = EconomyLvls[ecoIdx];

            industryStr = pickIndustry({
                geoProfile,
                provName: simProvName,
                isCapital,
                isCapitalVicinity,
                isCoastal,
                zoneFlags
            });

            isOfficialRun = false;
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
            center: state.pathGenerator.projection()(centroid),
            area: landArea,
            population: pop,
            economy: economyStr,
            industry: industryStr,
            isOfficialRun: isOfficialRun,
            isCapitalVicinity,
            isCoastal: isCoastal,
            simProvName,
            zoneFlags,
            ecoIdx: (economyStr === "天子脚下" ? 5 : (economyStr === "京畿重地" ? 4 : (economyStr.startsWith("官营") ? economyStr.split("·")[1] : economyStr))),
            geoProfile: geoProfile,
            roster: generateRoster(LocalOfficialTemplates.county)
        };
    });

    calibratePrefectureIndustries();

    assignPrefectureOfficialBureaus();

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
            if (c.isOfficialRun && c.industry && c.industry.includes("盐")) hasSalt = true;
            if (c.isOfficialRun && c.industry === "丝织") hasWeaving = true;
            if (c.isOfficialRun && c.industry === "矿业") hasMine = true;
        });

        if (hasSalt) pref.roster.push(...generateRoster(SpecialOfficialTemplates["盐务"]));
        if (hasWeaving) pref.roster.push(...generateRoster(SpecialOfficialTemplates["织造"]));
        if (hasMine) pref.roster.push(...generateRoster(SpecialOfficialTemplates["矿局"]));
    });
}

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
