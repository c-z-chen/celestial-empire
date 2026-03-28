import { officialData, LocalOfficialTemplates, SpecialOfficialTemplates, NameGen, EconomyLvls, CoastalSpecialties, BureauMap, CapitalVicinityIndustries } from './data.js';

const width = 1000, height = 700;
let currentTransform = d3.zoomIdentity; 
let zoomBehavior;
let countyData = {}, prefecturesData = {}, provincesData = {};
let nextPrefId = 1, nextProvId = 1, capitalId = null;
let mapViewMode = 'county', activeTab = 'county', selectedCellId = null, mergeMode = null;
let capitalGovernorSelectedProvinces = [];
let capitalGovernorRegions = [];
let capitalGovernorNextId = 1;

let geoFeatures = [];
let pathGenerator;
let neighborsMap = {};

const CAPITAL_MAX_GOVERNORS = 3;
const CAPITAL_REGION_COLORS = ["#9b59b6", "#16a085", "#d35400", "#2980b9", "#8e44ad", "#27ae60"];
const CAPITAL_GOVERNOR_PAIR_ABBR = {
    "云南|贵州": "云贵",
    "广东|广西": "两广",
    "江苏|江西": "两江",
    "陕西|甘肃": "陕甘",
    "湖南|湖北": "湖广",
    "安徽|江苏": "江淮"
};
const CAPITAL_PROV_SHORT = {
    "江苏": "江",
    "江西": "赣",
    "浙江": "浙",
    "福建": "闽",
    "广东": "粤",
    "广西": "桂",
    "云南": "云",
    "贵州": "贵",
    "陕西": "陕",
    "甘肃": "甘",
    "湖南": "湘",
    "湖北": "鄂",
    "河南": "豫",
    "山东": "鲁",
    "山西": "晋",
    "安徽": "皖",
    "四川": "川",
    "盛京": "奉",
    "直隶": "直",
    "内蒙古": "蒙",
    "新疆": "新",
    "台湾": "台"
};

function renderCapitalOfficials() {
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
            for(let i=0; i<job.quota; i++) names.push(typeof NameGen !== 'undefined' ? NameGen.person() : "待补缺");
            
            let nameDisplay = job.quota > 1 ? `<span style="color:#f39c12;font-size:0.8em;">[编${job.quota}人]</span> ${names[0]}等` : names[0];

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

function isCapitalTabActive() {
    return activeTab === 'capital';
}

function getProvinceNameById(provId) {
    if (provId === null || !provincesData[provId]) return "";
    return provincesData[provId].name || "";
}

function getProvinceShortName(provName) {
    return CAPITAL_PROV_SHORT[provName] || provName.replace(/省$/g, '').slice(0, 1);
}

function getCapitalSelectionIndex(provId) {
    return capitalGovernorSelectedProvinces.indexOf(provId);
}

function getGovernorRegionByProvinceId(provId) {
    if (provId === null || provId === undefined) return null;
    return capitalGovernorRegions.find(r => (r.provIds || []).includes(provId)) || null;
}

function isProvinceOccupiedByGovernorRegion(provId) {
    return getGovernorRegionByProvinceId(provId) !== null;
}

function buildGovernorAbbrByProvIds(provIds) {
    const provNames = provIds
        .map(id => getProvinceNameById(id))
        .filter(Boolean);

    if (provNames.length === 0) return '';

    if (provNames.length === 1) {
        return provNames[0].replace(/省$/g, '');
    }

    if (provNames.length === 2) {
        const key = provNames.slice().sort((a, b) => a.localeCompare(b, 'zh-Hans-CN')).join('|');
        if (CAPITAL_GOVERNOR_PAIR_ABBR[key]) return CAPITAL_GOVERNOR_PAIR_ABBR[key];
    }

    return provNames.map(getProvinceShortName).join('');
}

function refreshTerritoryPaint() {
    d3.selectAll(".county")
        .attr("fill", (d, i) => getTerritoryColor(i))
        .attr("fill-opacity", (d, i) => getTerritoryOpacity(i));
}

function renderCapitalGovernorAssignments() {
    const draftContainer = document.getElementById('capital-governor-titles');
    const recordsContainer = document.getElementById('capital-governor-records');
    const establishBtn = document.getElementById('btn-establish-governor-region');
    if (!draftContainer || !recordsContainer) return;

    const selectedProvNames = capitalGovernorSelectedProvinces.map(id => getProvinceNameById(id)).filter(Boolean);
    if (capitalGovernorSelectedProvinces.length === 0) {
        draftContainer.innerHTML = `<div class="gov-empty">点击左侧省份圈定辖区（1-3省可成总督辖区）</div>`;
    } else {
        const draftTitle = `${buildGovernorAbbrByProvIds(capitalGovernorSelectedProvinces)}总督`;
        draftContainer.innerHTML = `
            <div class="gov-item gov-item-draft">
                <span class="gov-badge">拟</span>
                <div class="gov-main">
                    <div class="gov-title">${draftTitle}</div>
                    <div class="gov-sub">拟辖：${selectedProvNames.join('、')} ｜ 共${capitalGovernorSelectedProvinces.length}省</div>
                </div>
            </div>
        `;
    }

    if (establishBtn) {
        establishBtn.disabled = !(capitalGovernorSelectedProvinces.length >= 1 && capitalGovernorSelectedProvinces.length <= CAPITAL_MAX_GOVERNORS);
    }

    if (capitalGovernorRegions.length === 0) {
        recordsContainer.innerHTML = `<div class="gov-empty">尚未设立总督辖区</div>`;
        return;
    }

    recordsContainer.innerHTML = capitalGovernorRegions.map((region, idx) => {
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

function establishCapitalGovernorRegion() {
    if (capitalGovernorSelectedProvinces.length < 1 || capitalGovernorSelectedProvinces.length > CAPITAL_MAX_GOVERNORS) {
        alert(`请选择1到${CAPITAL_MAX_GOVERNORS}省后再设立。`);
        return;
    }

    const occupiedProvId = capitalGovernorSelectedProvinces.find(provId => isProvinceOccupiedByGovernorRegion(provId));
    if (occupiedProvId !== undefined) {
        alert(`${getProvinceNameById(occupiedProvId)}已归属其他总督辖区，不能重复使用。`);
        return;
    }

    const color = CAPITAL_REGION_COLORS[(capitalGovernorNextId - 1) % CAPITAL_REGION_COLORS.length];
    const title = `${buildGovernorAbbrByProvIds(capitalGovernorSelectedProvinces)}总督`;
    capitalGovernorRegions.push({
        id: capitalGovernorNextId++,
        provIds: [...capitalGovernorSelectedProvinces],
        title,
        name: typeof NameGen !== 'undefined' ? NameGen.person() : '待补缺',
        color
    });

    capitalGovernorSelectedProvinces = [];
    renderCapitalGovernorAssignments();
    refreshTerritoryPaint();
    highlightSelection(selectedCellId);
}

function toggleCapitalGovernorProvince(provId) {
    const provName = getProvinceNameById(provId);
    if (!provName || provName.includes("直隶")) return;

    const existedIdx = getCapitalSelectionIndex(provId);
    if (existedIdx >= 0) {
        capitalGovernorSelectedProvinces.splice(existedIdx, 1);
    } else {
        if (isProvinceOccupiedByGovernorRegion(provId)) {
            alert(`${provName}已归属既有总督辖区，一省不能两用。`);
            return;
        }
        if (capitalGovernorSelectedProvinces.length >= CAPITAL_MAX_GOVERNORS) {
            alert(`总督辖区最多圈定${CAPITAL_MAX_GOVERNORS}省。`);
            return;
        }
        capitalGovernorSelectedProvinces.push(provId);
    }

    renderCapitalGovernorAssignments();
    refreshTerritoryPaint();
    highlightSelection(selectedCellId);
}

function loadChinaMap() {
    d3.json("./maps/qing_1820_counties.json").then(geoData => {
        geoFeatures = geoData.features.filter(f => f.geometry);

        console.log("成功读取地图区块数量：", geoFeatures.length);

        const projection = d3.geoMercator().fitSize([width, height], geoData);
        pathGenerator = d3.geoPath().projection(projection);

        computeNeighbors(geoFeatures);

        capitalId = null;
        geoFeatures.forEach((f, i) => {
            if (d3.geoContains(f, [116.406, 39.906])) {
                capitalId = i; 
                console.log("找到京师区块:", f.properties.NAME_CH);
            }
        });

        initWorldData();
        renderMap();
    }).catch(err => {
        console.error("地图加载失败，请检查文件路径或格式:", err);
    });
}

function initWorldData() {
    countyData = {}; prefecturesData = {}; provincesData = {};
    nextPrefId = 1; nextProvId = 1; 
    capitalGovernorSelectedProvinces = [];
    capitalGovernorRegions = [];
    capitalGovernorNextId = 1;
    if (typeof NameGen !== 'undefined' && NameGen.generatedNames) NameGen.generatedNames.clear();

    const coastalProvinces = ["江苏", "浙江", "福建", "广东", "山东", "直隶", "盛京", "台湾"];
    
    // 1820年人口密度基数 (人/平方公里)
    const popDensityMap = {
        "直隶": 80, "江苏": 340, "浙江": 250, "安徽": 230, "山东": 200, "江西": 150, "福建": 100, "广东": 100, "河南": 130, "湖北": 170, "湖南": 100, "四川": 60, "山西": 70, "陕西": 70, "广西": 60, "云南": 15, "贵州": 40, "甘肃": 25, "盛京": 20, "内蒙古": 4, "新疆": 1, "乌里雅苏台": 1,
    };

    let provNameToId = {};
    let prefNameToId = {};

    geoFeatures.forEach((f, i) => {
        const props = f.properties;
        const provName = props.LEV1_CH || "未知省份";
        const prefName = props.LEV2_CH || "未知府州";
        const realName = (props.SYS_NAME || props.NAME_CH || "未知");

        if (!provNameToId[provName]) {
            provNameToId[provName] = nextProvId++;
            let title = (provName.includes("直隶")) ? "总督" : "巡抚";
            provincesData[provNameToId[provName]] = {
                id: provNameToId[provName], name: provName,
                official: typeof NameGen !== 'undefined' ? `${NameGen.person()} (${title})` : title,
                color: d3.hsl(Math.random() * 360, 0.65, 0.6).hex(),
                capitalCountyId: i,
                roster: generateRoster(LocalOfficialTemplates.prov)
            };
        }
        const currentProvId = provNameToId[provName];

        const prefKey = provName + "-" + prefName;
        if (!prefNameToId[prefKey]) {
            prefNameToId[prefKey] = nextPrefId++;
            prefecturesData[prefNameToId[prefKey]] = {
                id: prefNameToId[prefKey], provId: currentProvId, name: prefName,
                official: typeof NameGen !== 'undefined' ? `${NameGen.person()} (知府)` : "知府",
                color: d3.hsl(Math.random() * 360, 0.65, 0.6).hex(),
                capitalCountyId: i,
                roster: generateRoster(LocalOfficialTemplates.pref)
            };
        }
        const currentPrefId = prefNameToId[prefKey];

        // (1 平方公里 = 15 顷)
        const sqKm = d3.geoArea(f) * 6371 * 6371;
        const landArea = Math.max(1, Math.round(sqKm * 15));
        const density = (popDensityMap[provName] || 30) * (0.8 + Math.random() * 0.4);
        let pop = Math.max(1000, Math.round(sqKm * density));

        let economyStr = "平平";
        let industryStr = "农业";
        let isOfficialRun = false; 

        const isCapital = (i === capitalId);
        const isCapitalVicinity = !isCapital && (neighborsMap[capitalId] || []).includes(i);
        
        // 判定沿海（沿海省份）
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
                industryStr = (ecoIdx >= 3) ? 
                    ["丝织", "茶业", "瓷器", "商业"][Math.floor(Math.random()*4)] : 
                    ["农业", "林木", "药材", "畜牧", "矿业"][Math.floor(Math.random()*5)];
            }
            
            let baseChance = (ecoIdx === 4) ? 0.30 : 0.1;
            if (ecoIdx >= 3 && BureauMap[industryStr] && Math.random() < baseChance) {
                isOfficialRun = true;
                economyStr = "官营·" + economyStr;
            }
        }

        let countyColor = (isCapital) ? "#F1C40F" : d3.hsl(Math.random() * 360, 0.4, 0.8).hex();
        if (isCapital) {
            provincesData[currentProvId].color = "#F1C40F";
            prefecturesData[currentPrefId].color = "#F1C40F";
        }

        let countyOfficial = isCapital ? "顺天府尹" : (typeof NameGen !== 'undefined' ? `${NameGen.person()} (知县)` : "知县");

        countyData[i] = {
            id: i, masterId: i, prefId: currentPrefId, provId: currentProvId,
            isCapital, name: isCapital ? `京师 (${realName})` : realName,
            official: countyOfficial,
            color: countyColor,
            center: pathGenerator.projection()(d3.geoCentroid(f)),
            area: landArea,
            population: pop,
            economy: economyStr,
            industry: industryStr,
            isOfficialRun: isOfficialRun,
            roster: generateRoster(LocalOfficialTemplates.county)
        };
    });
    Object.values(prefecturesData).forEach(pref => {
        let prefCounties = Object.values(countyData).filter(c => c.prefId === pref.id);

        if (prefCounties.some(c => c.isCapital)) {
            pref.roster = pref.roster.filter(o => o.title !== "通判" && o.title !== "同知");
            pref.roster.unshift(...generateRoster(SpecialOfficialTemplates["顺天府"]));
        }

        else if (pref.name.includes("奉天")) {
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

function computeNeighbors(features) {
    neighborsMap = {};
    features.forEach((_, i) => neighborsMap[i] = []);
    let vertexMap = {}; 
    
    features.forEach((f, i) => {
        let coords = f.geometry.coordinates;
        let polys = f.geometry.type === "Polygon" ? [coords] : coords; 
        polys.forEach(poly => {
            poly.forEach(ring => {
                ring.forEach((pt, index) => {
                    if (index % 3 !== 0) return; 
                    let key = pt[0].toFixed(1) + "," + pt[1].toFixed(1);
                    if (!vertexMap[key]) vertexMap[key] = new Set();
                    vertexMap[key].add(i);
                });
            });
        });
    });

    Object.values(vertexMap).forEach(indicesSet => {
        let indices = Array.from(indicesSet);
        if (indices.length > 1) {
            for (let i = 0; i < indices.length; i++) {
                for (let j = i + 1; j < indices.length; j++) {
                    let a = indices[i], b = indices[j];
                    if (!neighborsMap[a].includes(b)) neighborsMap[a].push(b);
                    if (!neighborsMap[b].includes(a)) neighborsMap[b].push(a);
                }
            }
        }
    });
}

function getDistinctColor(targetCellId, level) {
    return d3.hsl(Math.random() * 360, 0.7, 0.5).hex();
}

function renderMap() {
    d3.select("#map-container").selectAll("*").remove();

    const svg = d3.select("#map-container").append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid slice") 
        .style("background-color", "#e0f3f8")
        .attr("width", "100%")
        .attr("height", "100%");
    
    svg.append("rect")
        .attr("x", -width * 2)
        .attr("y", -height * 2)
        .attr("width", width * 5)
        .attr("height", height * 5)
        .attr("fill", "#e0f3f8");

    const mapGroup = svg.append("g").attr("id", "map-group");

    mapGroup.selectAll(".county")
        .data(geoFeatures)
        .enter()
        .append("path")
        .attr("d", pathGenerator)  
        .attr("class", "county")
        .attr("id", (d, i) => "cell-" + i)
        .attr("stroke", "#ffffff") 
        .attr("stroke-width", 0.3)
        .on("click", function(event, d) { 
            let i = geoFeatures.indexOf(d); 
            handleRegionClick(i); 
        });

    zoomBehavior = d3.zoom()
        .scaleExtent([1, 15])
        .on("zoom", (event) => {
            currentTransform = event.transform;
            mapGroup.attr("transform", currentTransform);
            
            mapGroup.selectAll(".capital-star")
                .attr("transform", function(d) {
                    return `translate(${d.x}, ${d.y}) scale(${1 / currentTransform.k})`;
                })
                .attr("stroke-width", 1 / currentTransform.k);

            mapGroup.selectAll(".yamen-icon:not(.capital-star)")
                .attr("r", 3 / currentTransform.k)
                .attr("stroke-width", 1 / currentTransform.k);
        });

    svg.call(zoomBehavior);

    setMapView(mapViewMode); 
    updateUI(); 
}

function drawCapitals() {
    d3.selectAll(".yamen-icon").remove();
    const mapGroup = d3.select("#map-group");
    
    if (mapViewMode === 'prefecture' || mapViewMode === 'province') {
        Object.values(prefecturesData).forEach(p => {
            let cp = countyData[p.capitalCountyId].center;
            mapGroup.append("circle").attr("cx", cp[0]).attr("cy", cp[1]).attr("r", 3).attr("fill", "#ecf0f1").attr("class", "yamen-icon");
        });
    }
    if (mapViewMode === 'province') {
        Object.values(provincesData).forEach(p => {
            let cp = countyData[p.capitalCountyId].center;
            mapGroup.append("rect").attr("x", cp[0]-4).attr("y", cp[1]-4).attr("width", 8).attr("height", 8).attr("fill", "#e74c3c").attr("class", "yamen-icon");
        });
    }

    if (capitalId !== null && countyData[capitalId]) {
        let cp = countyData[capitalId].center;
        mapGroup.append("polygon")
            .datum({x: cp[0], y: cp[1]})
            .attr("points", "0,-8 2,-2 8,-2 3,2 5,8 0,5 -5,8 -3,2 -8,-2 -2,-2")
            .attr("transform", `translate(${cp[0]}, ${cp[1]})`)
            .attr("fill", "gold")
            .attr("stroke", "#c0392b")
            .attr("stroke-width", 1)
            .attr("class", "yamen-icon capital-star");
    }
}

function getTerritoryColor(i) {
    let c = countyData[i];
    if (isCapitalTabActive()) {
        if (c.provId === null || !provincesData[c.provId]) return "#4b5563";

        const provName = provincesData[c.provId].name || '';
        if (provName.includes("直隶")) return "#F1C40F";

        const region = getGovernorRegionByProvinceId(c.provId);
        if (region) return region.color || "#9b59b6";

        return getCapitalSelectionIndex(c.provId) >= 0 ? "#2f9e44" : "#7f8c8d";
    }

    if (mapViewMode === 'province') return c.provId !== null ? provincesData[c.provId].color : (c.prefId !== null ? prefecturesData[c.prefId].color : "#34495e");
    if (mapViewMode === 'prefecture') return c.prefId !== null ? prefecturesData[c.prefId].color : "#34495e";
    return countyData[c.masterId].color;
}

function getTerritoryOpacity(i) {
    let c = countyData[i];
    if (isCapitalTabActive()) {
        if (c.provId === null || !provincesData[c.provId]) return 0.2;
        const provName = provincesData[c.provId].name || '';
        if (provName.includes("直隶")) return 1.0;
        if (isProvinceOccupiedByGovernorRegion(c.provId)) return 1.0;
        return getCapitalSelectionIndex(c.provId) >= 0 ? 1.0 : 0.6;
    }

    if (mapViewMode === 'province') return c.provId !== null ? 1.0 : (c.prefId !== null ? 0.35 : 0.05);
    if (mapViewMode === 'prefecture') return c.prefId !== null ? 1.0 : 0.15;
    return 1.0;
}

function setMapView(mode, syncTab = true) {
    mapViewMode = mode;
    document.querySelectorAll('.map-toggles button').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.querySelector(`.map-toggles button[data-view="${mode}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    refreshTerritoryPaint();
    drawCapitals(); 
    if (selectedCellId !== null) highlightSelection(selectedCellId);

    if (syncTab) {
        const tabMap = { 'county': 'county', 'prefecture': 'pref', 'province': 'prov' };
        if (activeTab !== tabMap[mode]) {
            switchTab(tabMap[mode]);
        }
    }
}

function highlightSelection(i) {
    d3.selectAll(".county").classed("selected-group", false);

    if (isCapitalTabActive()) {
        Object.values(countyData).forEach(c => {
            if (getCapitalSelectionIndex(c.provId) >= 0) {
                d3.select("#cell-" + c.id).classed("selected-group", true);
            }
        });
        return;
    }

    let target = countyData[i];
    Object.values(countyData).forEach(c => {
        if ((mapViewMode==='county' && c.masterId===target.masterId) ||
            (mapViewMode==='prefecture' && target.prefId!==null && c.prefId===target.prefId) ||
            (mapViewMode==='province' && target.provId!==null && c.provId===target.provId)) {
            d3.select("#cell-" + c.id).classed("selected-group", true);
        }
    });
}

function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.admin-tabs .tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    
    if (mergeMode) toggleMerge(mergeMode);

    if (tabId === 'capital') {
        if (mapViewMode !== 'province') {
            setMapView('province', false);
        } else {
            refreshTerritoryPaint();
            drawCapitals();
            if (selectedCellId !== null) highlightSelection(selectedCellId);
        }
        renderCapitalGovernorAssignments();
        return;
    }

    const viewMap = { 'county': 'county', 'pref': 'prefecture', 'prov': 'province' };
    if (viewMap[tabId] && mapViewMode !== viewMap[tabId]) {
        setMapView(viewMap[tabId]);
    } else {
        refreshTerritoryPaint();
        drawCapitals();
        if (selectedCellId !== null) highlightSelection(selectedCellId);
    }
}

function handleRegionClick(i) {
    if (isCapitalTabActive()) {
        selectedCellId = i;
        const cell = countyData[i];
        if (cell && cell.provId !== null) toggleCapitalGovernorProvince(cell.provId);
        return;
    }

    if (mergeMode !== null) attemptMerge(selectedCellId, i, mergeMode);
    else { selectedCellId = i; updateUI(); highlightSelection(selectedCellId); }
}

function updateUI() {
    if (selectedCellId === null) return;
    let cell = countyData[selectedCellId];
    let master = countyData[cell.masterId];

    document.getElementById('inp-county-name').value = master.name;
    document.getElementById('inp-county-gov').value = master.official;
    document.getElementById('inp-county-name').disabled = false;
    document.getElementById('inp-county-gov').disabled = false;
    document.getElementById('btn-expand-county').disabled = false;
    
    document.getElementById('stat-pop').innerText = master.population.toLocaleString() + " " + (master.popUnit || "人");
    document.getElementById('stat-area').innerText = master.area.toLocaleString() + " 顷";
    document.getElementById('stat-econ').innerText = master.economy;
    document.getElementById('stat-ind').innerText = master.industry;

    function aggregateRegionData(regionCounties) {
        let totalPop = 0;
        let totalArea = 0;
        let militaryCount = 0;
        let indCounts = {};

        let uniqueMasters = new Set();
        
        regionCounties.forEach(c => {
            if (uniqueMasters.has(c.masterId)) return;
            uniqueMasters.add(c.masterId);
            
            let m = countyData[c.masterId];
            totalPop += m.population;
            totalArea += m.area;
            if (m.popUnit === "军户") militaryCount++;
            
            if (m.industry !== "首都" && m.industry !== "军镇") {
                indCounts[m.industry] = (indCounts[m.industry] || 0) + 1;
            }
        });

        let sortedInds = Object.keys(indCounts).sort((a, b) => indCounts[b] - indCounts[a]);
        let topInd = sortedInds[0];
        let secondInd = sortedInds[1];

        return { totalPop, totalArea, militaryCount, topInd, secondInd };
    }

    if (cell.prefId === null) {
        document.getElementById('pref-data-view').style.display = 'none'; 
        document.getElementById('pref-empty-view').style.display = 'block';
    } else {
        let p = prefecturesData[cell.prefId];
        document.getElementById('pref-empty-view').style.display = 'none'; 
        document.getElementById('pref-data-view').style.display = 'block';
        
        document.getElementById('inp-pref-name').value = p.name; 
        document.getElementById('inp-pref-gov').value = p.official;
        document.getElementById('inp-pref-cap').value = countyData[p.capitalCountyId].name;

        let prefCounties = Object.values(countyData).filter(c => c.prefId === cell.prefId);
        let prefStats = aggregateRegionData(prefCounties);
        
        let prefBureau = "普通州府";
        if (prefStats.topInd && typeof BureauMap !== 'undefined' && BureauMap[prefStats.topInd]) {
            prefBureau = `设${BureauMap[prefStats.topInd]} (主产${prefStats.topInd})`;
        } else if (prefStats.topInd) {
            prefBureau = `主产${prefStats.topInd}`;
        }

        let milStr = prefStats.militaryCount > 0 ? ` (含${prefStats.militaryCount}处军镇)` : "";

        if(document.getElementById('stat-pref-pop')) document.getElementById('stat-pref-pop').innerText = prefStats.totalPop.toLocaleString() + " 人" + milStr;
        if(document.getElementById('stat-pref-area')) document.getElementById('stat-pref-area').innerText = prefStats.totalArea.toLocaleString() + " 顷";
        if(document.getElementById('stat-pref-ind')) document.getElementById('stat-pref-ind').innerText = prefBureau;
    }

    if (cell.provId === null) {
        document.getElementById('prov-data-view').style.display = 'none'; 
        document.getElementById('prov-empty-view').style.display = 'block';
    } else {
        let p = provincesData[cell.provId];
        document.getElementById('prov-empty-view').style.display = 'none'; 
        document.getElementById('prov-data-view').style.display = 'block';
        
        document.getElementById('inp-prov-name').value = p.name; 
        document.getElementById('inp-prov-gov').value = p.official;
        document.getElementById('inp-prov-cap').value = countyData[p.capitalCountyId].name;

        let provCounties = Object.values(countyData).filter(c => c.provId === cell.provId);
        let provStats = aggregateRegionData(provCounties);

        let provIndStr = "百业待兴";
        if (provStats.topInd) {
            provIndStr = provStats.secondInd ? `以${provStats.topInd}、${provStats.secondInd}为主` : `以${provStats.topInd}为主`;
        }

        let milStr = provStats.militaryCount > 0 ? ` (辖${provStats.militaryCount}处军镇)` : "";

        if(document.getElementById('stat-prov-pop')) document.getElementById('stat-prov-pop').innerText = provStats.totalPop.toLocaleString() + " 人" + milStr;
        if(document.getElementById('stat-prov-area')) document.getElementById('stat-prov-area').innerText = provStats.totalArea.toLocaleString() + " 顷";
        if(document.getElementById('stat-prov-ind')) document.getElementById('stat-prov-ind').innerText = provIndStr;

        if (master.roster) renderRosterList('county-officials-list', master.roster);
    
        if (cell.prefId !== null && prefecturesData[cell.prefId].roster) {
            renderRosterList('pref-officials-list', prefecturesData[cell.prefId].roster);
        }
        
        if (cell.provId !== null && provincesData[cell.provId].roster) {
            renderRosterList('prov-officials-list', provincesData[cell.provId].roster);
        }
    }
}

function generateRoster(template) {
    return template.map(tmpl => {
        let names = [];
        for (let i = 0; i < tmpl.quota; i++) {
            names.push(typeof NameGen !== 'undefined' ? NameGen.person() : "待补缺");
        }
        return {
            title: tmpl.title,
            rank: tmpl.rank,
            quota: tmpl.quota,
            names: names
        };
    });
}

function renderRosterList(containerId, rosterData) {
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

function establish(level) {
    let cell = countyData[selectedCellId];
    let assignedColor = getDistinctColor(selectedCellId, level);

    if (level === 'pref') {
        prefecturesData[nextPrefId] = { name: (typeof NameGen !== 'undefined' ? NameGen.genPrefName(cell.isCapital) : "新府"), official: (typeof NameGen !== 'undefined' ? NameGen.person() : "新知府"), color: assignedColor, capitalCountyId: cell.masterId, roster: generateRoster(LocalOfficialTemplates.pref) };
        Object.values(countyData).forEach(c => { if (c.masterId === cell.masterId) c.prefId = nextPrefId; });
        nextPrefId++; setMapView('prefecture'); switchTab('pref');
    } else if (level === 'prov') {
        provincesData[nextProvId] = { name: (typeof NameGen !== 'undefined' ? NameGen.genProvName(cell.isCapital) : "新省"), official: (typeof NameGen !== 'undefined' ? NameGen.person() : "新巡抚"), color: assignedColor, capitalCountyId: cell.masterId, roster: generateRoster(LocalOfficialTemplates.prov) };
        if (cell.prefId !== null) Object.values(countyData).forEach(c => { if (c.prefId === cell.prefId) c.provId = nextProvId; });
        else Object.values(countyData).forEach(c => { if (c.masterId === cell.masterId) c.provId = nextProvId; });
        nextProvId++; setMapView('province'); switchTab('prov');
    }
    updateUI();
}

function toggleMerge(level) {
    let btnId = 'btn-expand-' + (level === 'county' ? 'county' : level.substring(0,4));
    let btn = document.getElementById(btnId);
    
    if (mergeMode === level) {
        mergeMode = null; 
        btn.innerText = level === 'province' ? "划入新府 (Absorb Prefecture)" : level === 'prefecture' ? "纳入新地 (Expand Prefecture)" : "扩展"; 
        btn.classList.remove("merging-active");
    } else {
        mergeMode = level; 
        btn.innerText = "点击接壤的地图区域..."; 
        btn.classList.add("merging-active"); 
        setMapView(level); 
    }
}

function attemptMerge(absId, tgtId, level) {
    let abs = countyData[absId], tgt = countyData[tgtId];
    if ((level==='county' && abs.masterId===tgt.masterId) || (level==='prefecture' && tgt.prefId!==null && abs.prefId===tgt.prefId) || (level==='province' && tgt.provId!==null && abs.provId===tgt.provId)) return toggleMerge(level);

    let srcCells = Object.values(countyData).filter(c => level==='county'?c.masterId===abs.masterId:level==='prefecture'?c.prefId===abs.prefId:c.provId===abs.provId).map(c=>c.id);
    let tgtCells = Object.values(countyData).filter(c => (level==='province'&&tgt.prefId!==null)?c.prefId===tgt.prefId:c.masterId===tgt.masterId).map(c=>c.id);

    let isAdj = false;
    for (let id of srcCells) { 
        let nList = neighborsMap[id] || [];
        for (let n of nList) { 
            if (tgtCells.includes(n)) { isAdj = true; break; } 
        } 
        if (isAdj) break; 
    }

    if (level === 'county') {
        let masterAbs = countyData[abs.masterId], masterTgt = countyData[tgt.masterId];
        masterAbs.population += masterTgt.population;
        masterAbs.area += masterTgt.area;
    }

    Object.values(countyData).forEach(c => {
        if (level === 'county' && c.masterId === tgt.masterId) { c.masterId = abs.masterId; c.prefId = abs.prefId; c.provId = abs.provId; }
        else if (level === 'prefecture' && c.masterId === tgt.masterId) { c.prefId = abs.prefId; if(abs.provId!==null) c.provId = abs.provId; }
        else if (level === 'province') { if (tgt.prefId !== null) { if (c.prefId === tgt.prefId) c.provId = abs.provId; } else { if (c.masterId === tgt.masterId) c.provId = abs.provId; } }
    });

    toggleMerge(level); setMapView(level); highlightSelection(absId); updateUI();
}

const SaveManager = {
    collectData() {
        return {
            countyData,
            prefecturesData,
            provincesData,
            nextPrefId,
            nextProvId,
            capitalId,
            capitalGovernorSelectedProvinces,
            capitalGovernorRegions,
            capitalGovernorNextId
        };
    },
    applyData(d) {
        countyData = d.countyData;
        prefecturesData = d.prefecturesData;
        provincesData = d.provincesData;
        nextPrefId = d.nextPrefId;
        nextProvId = d.nextProvId;
        capitalId = d.capitalId;
        capitalGovernorSelectedProvinces = Array.isArray(d.capitalGovernorSelectedProvinces) ? d.capitalGovernorSelectedProvinces : [];
        capitalGovernorRegions = Array.isArray(d.capitalGovernorRegions) ? d.capitalGovernorRegions : [];
        capitalGovernorNextId = d.capitalGovernorNextId || (capitalGovernorRegions.length + 1);
        selectedCellId=null; mergeMode=null; 
        if(typeof NameGen !== 'undefined') NameGen.generatedNames.clear();
        renderMap();
        renderCapitalGovernorAssignments();
    },
    saveToLocal() { localStorage.setItem("adminManagerSave", JSON.stringify(this.collectData())); alert("已存入浏览器缓存！"); },
    loadFromLocal() { let s = localStorage.getItem("adminManagerSave"); if(s){ this.applyData(JSON.parse(s)); alert("读取缓存成功！"); } else { alert("没有找到缓存记录。"); } },
    exportToFile() { let a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(this.collectData())); a.download="world_save.json"; a.click(); },
    importFromFile(e) { 
        let f = e.target.files[0]; if(!f) return; 
        let r = new FileReader(); 
        r.onload = (ev) => { this.applyData(JSON.parse(ev.target.result)); alert("文件导入成功！"); }; 
        r.readAsText(f); 
        e.target.value = ''; 
    }
};

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.map-toggles button').forEach(btn => {
        btn.addEventListener('click', (e) => setMapView(e.target.dataset.view));
    });
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });

    document.getElementById('btn-create-pref')?.addEventListener('click', () => establish('pref'));
    document.getElementById('btn-create-prov')?.addEventListener('click', () => establish('prov'));
    document.getElementById('btn-expand-county')?.addEventListener('click', () => toggleMerge('county'));
    document.getElementById('btn-expand-pref')?.addEventListener('click', () => toggleMerge('prefecture'));
    document.getElementById('btn-expand-prov')?.addEventListener('click', () => toggleMerge('province'));
    document.getElementById('btn-establish-governor-region')?.addEventListener('click', () => establishCapitalGovernorRegion());

    document.getElementById('btn-save-local')?.addEventListener('click', () => SaveManager.saveToLocal());
    document.getElementById('btn-load-local')?.addEventListener('click', () => SaveManager.loadFromLocal());
    document.getElementById('btn-export-file')?.addEventListener('click', () => SaveManager.exportToFile());
    
    document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });
    document.getElementById('file-upload')?.addEventListener('change', (e) => SaveManager.importFromFile(e));

    document.getElementById('inp-county-name')?.addEventListener('change', (e) => { if(selectedCellId!==null) countyData[countyData[selectedCellId].masterId].name = e.target.value; });
    document.getElementById('inp-county-gov')?.addEventListener('change', (e) => { if(selectedCellId!==null) countyData[countyData[selectedCellId].masterId].official = e.target.value; });
    
    renderCapitalOfficials();
    renderCapitalGovernorAssignments();
    loadChinaMap();
});