// ==========================================
// 1. 全局状态 (State)
// ==========================================
const width = 800, height = 600, numCounties = 400;
let points = [], voronoi, delaunay;
let countyData = {}, prefecturesData = {}, provincesData = {};
let nextPrefId = 1, nextProvId = 1, capitalId = null;
let mapViewMode = 'county', activeTab = 'county', selectedCellId = null, mergeMode = null;       

function generateIslandPolygon() {
    let poly = [];
    const cx = width / 2, cy = height / 2;
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
        let r = 220 + Math.random() * 30 + Math.sin(a * 6) * 15; 
        let rx = r * 1.4; 
        let ry = r * 0.9;
        let x = cx + Math.cos(a) * rx;
        let y = cy + Math.sin(a) * ry;
        x = Math.max(10, Math.min(width - 10, x));
        y = Math.max(10, Math.min(height - 10, y));
        poly.push([x, y]);
    }
    return poly;
}

let islandPoly = generateIslandPolygon();

function getClippedPolygonArea(voronoiCell, islandPolygon) {
    if (!voronoiCell || voronoiCell.length < 3) return 0;
    
    let cp = voronoiCell.slice();

    if (d3.polygonArea(cp) > 0) cp.reverse(); 

    let outputList = islandPolygon;

    for (let i = 0; i < cp.length; i++) {
        let nextList = [];
        let p1 = cp[i];
        let p2 = cp[(i + 1) % cp.length];

        let isInside = function(p) {
            return (p2[0] - p1[0]) * (p[1] - p1[1]) - (p2[1] - p1[1]) * (p[0] - p1[0]) >= 0;
        };

        let computeIntersection = function(s, e) {
            let A1 = p2[1] - p1[1], B1 = p1[0] - p2[0], C1 = A1 * p1[0] + B1 * p1[1];
            let A2 = e[1] - s[1], B2 = s[0] - e[0], C2 = A2 * s[0] + B2 * s[1];
            let det = A1 * B2 - A2 * B1;
            if (det === 0) return s; // 平行防报错
            return [(B2 * C1 - B1 * C2) / det, (A1 * C2 - A2 * C1) / det];
        };

        for (let j = 0; j < outputList.length; j++) {
            let s = outputList[j];
            let e = outputList[(j + 1) % outputList.length];
            let sIn = isInside(s);
            let eIn = isInside(e);

            if (sIn && eIn) {
                nextList.push(e);
            } else if (sIn && !eIn) {
                nextList.push(computeIntersection(s, e));
            } else if (!sIn && eIn) {
                nextList.push(computeIntersection(s, e));
                nextList.push(e);
            }
        }
        outputList = nextList;
        if (outputList.length === 0) break;
    }

    return outputList.length > 2 ? Math.abs(d3.polygonArea(outputList)) : 0;
}

// ==========================================
// 2. 核心数据与生成逻辑 (Core Logic)
// ==========================================
function generateNewWorld() {
    points = [];
    islandPoly = generateIslandPolygon(); 

    while(points.length < numCounties) {
        let x = Math.random() * width;
        let y = Math.random() * height;
        if (d3.polygonContains(islandPoly, [x, y])) points.push([x, y]);
    }
    
    for (let iter = 0; iter < 10; iter++) {
        delaunay = d3.Delaunay.from(points);
        voronoi = delaunay.voronoi([0, 0, width, height]);
        points = points.map((p, i) => {
            let centroid = d3.polygonCentroid(voronoi.cellPolygon(i));
            return d3.polygonContains(islandPoly, centroid) ? centroid : p;
        });
    }

    delaunay = d3.Delaunay.from(points);
    let hullIndices = new Set(delaunay.hull); 

    capitalId = Math.floor(Math.random() * numCounties);
    while(hullIndices.has(capitalId)) { capitalId = Math.floor(Math.random() * numCounties); }

    // 【新增】获取首都的接壤邻居，作为“京畿”
    let capitalNeighbors = Array.from(delaunay.neighbors(capitalId));

    countyData = {}; prefecturesData = {}; provincesData = {};
    nextPrefId = 1; nextProvId = 1; 
    if (typeof NameGen !== 'undefined' && NameGen.generatedNames) NameGen.generatedNames.clear();

    points.forEach((point, i) => {
        let poly = voronoi.cellPolygon(i);
        if (!poly) return;
        
        let rawPixelArea = getClippedPolygonArea(poly, islandPoly); 
        let landArea = Math.max(1, Math.round(rawPixelArea * 3.5));
        
        let isBorder = hullIndices.has(i); 
        let isCapital = (i === capitalId);
        let isCapitalVicinity = !isCapital && capitalNeighbors.includes(i);
        
        let countyName = isCapital ? "京师" : (typeof NameGen !== 'undefined' ? NameGen.genCountyName() : "未命名");
        let isMilitary = countyName.endsWith("关") || countyName.endsWith("镇");
        
        // 官营机构 (非首都、非军镇、非京畿，大约 4% 概率)
        let hasOfficialBureau = !isCapital && !isCapitalVicinity && !isMilitary && (Math.random() < 0.04);

        let ecoIdx = isBorder ? Math.floor(Math.random() * 3) : Math.floor(Math.random() * 3) + 2; 
        let density = isBorder ? 2 + (Math.random() * 8) : 10 + (ecoIdx * 12) + (Math.random() * 10); 
        let pop = Math.floor(landArea * density);
        
        let popUnit = "人";
        let economyStr = "";
        let industryStr = "";

        if (isCapital) {
            pop = Math.floor(pop * 5 + 200000); 
            economyStr = "天子脚下 (极度繁华)";
            industryStr = "首都"; 
        } 
        else if (isMilitary) {
            pop = Math.floor(pop * 0.6 + 3000); 
            popUnit = "军户";
            economyStr = MilitaryEconomyLvls[Math.floor(Math.random() * MilitaryEconomyLvls.length)];
            industryStr = "军镇"; 
        } 
        else if (isCapitalVicinity) {
            pop = Math.floor(pop * 2.5 + 50000);
            economyStr = "京畿重地 (富庶)";
            industryStr = CapitalVicinityIndustries[Math.floor(Math.random() * CapitalVicinityIndustries.length)];
        }
        else {
            // 普通县城正常分配产业
            economyStr = typeof EconomyLvls !== 'undefined' ? EconomyLvls[ecoIdx] : "未知";
            if (isBorder) {
                if (Math.random() < 0.3) {
                    industryStr = CoastalSpecialties[Math.floor(Math.random() * CoastalSpecialties.length)];
                } else {
                    industryStr = BaseIndustries[Math.floor(Math.random() * BaseIndustries.length)];
                }
            } else {
                industryStr = BaseIndustries[Math.floor(Math.random() * BaseIndustries.length)];
            }
        }

        countyData[i] = {
            id: i, masterId: i, prefId: null, provId: null,
            isCapital: isCapital,
            name: countyName,
            official: isCapital ? "京兆尹" : (typeof NameGen !== 'undefined' ? NameGen.person() : "无名氏"),
            color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
            center: point,
            area: landArea, 
            population: pop,
            popUnit: popUnit, 
            economy: economyStr,
            industry: industryStr
        };
    });
    renderMap();
}

function getDistinctColor(targetCellId, level) {
    return d3.hsl(Math.random() * 360, 0.7, 0.5).hex();
}

// ==========================================
// 3. 地图渲染与更新 (Map Rendering)
// ==========================================
function renderMap() {
    d3.select("#map-container").selectAll("*").remove();
    delaunay = d3.Delaunay.from(points);
    voronoi = delaunay.voronoi([-100, -100, width + 100, height + 100]);

    const svg = d3.select("#map-container").append("svg").attr("viewBox", `0 0 ${width} ${height}`).attr("width", "100%").attr("height", "100%");
    const mapGroup = svg.append("g").attr("id", "map-group");

    const polyString = islandPoly.map(p => `${p[0]},${p[1]}`).join(" ");
    svg.append("defs").append("clipPath").attr("id", "island-clip")
       .append("polygon").attr("points", polyString);
    
    mapGroup.attr("clip-path", "url(#island-clip)")
            .append("polygon").attr("points", polyString).attr("fill", "#2c3e50"); 

    points.forEach((point, i) => {
        mapGroup.append("path").attr("d", voronoi.renderCell(i)).attr("class", "county").attr("id", "cell-" + i)
            .on("click", function() { handleRegionClick(i); });
    });
    setMapView(mapViewMode); updateUI(); 
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
    if (mapViewMode === 'province') return c.provId !== null ? provincesData[c.provId].color : (c.prefId !== null ? prefecturesData[c.prefId].color : "#34495e");
    if (mapViewMode === 'prefecture') return c.prefId !== null ? prefecturesData[c.prefId].color : "#34495e";
    return countyData[c.masterId].color;
}

function getTerritoryOpacity(i) {
    let c = countyData[i];
    if (mapViewMode === 'province') return c.provId !== null ? 1.0 : (c.prefId !== null ? 0.35 : 0.05);
    if (mapViewMode === 'prefecture') return c.prefId !== null ? 1.0 : 0.15;
    return 1.0;
}

function setMapView(mode) {
    mapViewMode = mode;
    document.querySelectorAll('.map-toggles button').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.querySelector(`.map-toggles button[data-view="${mode}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    d3.selectAll(".county").attr("fill", (d, i) => getTerritoryColor(i)).attr("fill-opacity", (d, i) => getTerritoryOpacity(i));
    drawCapitals(); 
    if (selectedCellId !== null) highlightSelection(selectedCellId);
}

function highlightSelection(i) {
    d3.selectAll(".county").classed("selected-group", false);
    let target = countyData[i];
    Object.values(countyData).forEach(c => {
        if ((mapViewMode==='county' && c.masterId===target.masterId) ||
            (mapViewMode==='prefecture' && target.prefId!==null && c.prefId===target.prefId) ||
            (mapViewMode==='province' && target.provId!==null && c.provId===target.provId)) {
            d3.select("#cell-" + c.id).classed("selected-group", true);
        }
    });
}

// ==========================================
// 4. 业务逻辑与 UI 交互 (UI & Actions)
// ==========================================
function switchTab(tabId) {
    activeTab = tabId;
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`.admin-tabs .tab-btn[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    
    if (mergeMode) toggleMerge(mergeMode);
}

function handleRegionClick(i) {
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
    }
}

function establish(level) {
    let cell = countyData[selectedCellId];
    let assignedColor = getDistinctColor(selectedCellId, level);

    if (level === 'pref') {
        prefecturesData[nextPrefId] = { name: (typeof NameGen !== 'undefined' ? NameGen.genPrefName(cell.isCapital) : "新府"), official: (typeof NameGen !== 'undefined' ? NameGen.person() : "新知府"), color: assignedColor, capitalCountyId: cell.masterId };
        Object.values(countyData).forEach(c => { if (c.masterId === cell.masterId) c.prefId = nextPrefId; });
        nextPrefId++; setMapView('prefecture'); switchTab('pref');
    } else if (level === 'prov') {
        provincesData[nextProvId] = { name: (typeof NameGen !== 'undefined' ? NameGen.genProvName(cell.isCapital) : "新省"), official: (typeof NameGen !== 'undefined' ? NameGen.person() : "新巡抚"), color: assignedColor, capitalCountyId: cell.masterId };
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
        btn.innerText = level === 'province' ? "划入新府 (Absorb Prefecture)" : level === 'prefecture' ? "纳入新地 (Expand Prefecture)" : "吞并邻县 (Expand Border)"; 
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
    for (let id of srcCells) { for (let n of delaunay.neighbors(id)) { if (tgtCells.includes(n)) { isAdj = true; break; } } if (isAdj) break; }
    if (!isAdj) { alert("只能吞并直接接壤的区域！"); toggleMerge(level); return; }

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

// ==========================================
// 5. 存档管理 (Save Manager)
// ==========================================
const SaveManager = {
    collectData() { return { points, countyData, prefecturesData, provincesData, nextPrefId, nextProvId, capitalId, islandPoly }; },
    applyData(d) {
        points=d.points; countyData=d.countyData; prefecturesData=d.prefecturesData; provincesData=d.provincesData; nextPrefId=d.nextPrefId; nextProvId=d.nextProvId; capitalId=d.capitalId;
        if(d.islandPoly) islandPoly = d.islandPoly; 
        selectedCellId=null; mergeMode=null; 
        if(typeof NameGen !== 'undefined') NameGen.generatedNames.clear();
        renderMap();
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

// ==========================================
// 6. 事件绑定核心大一统 (Init & DOM Bindings)
// ==========================================
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

    document.getElementById('btn-save-local')?.addEventListener('click', () => SaveManager.saveToLocal());
    document.getElementById('btn-load-local')?.addEventListener('click', () => SaveManager.loadFromLocal());
    document.getElementById('btn-export-file')?.addEventListener('click', () => SaveManager.exportToFile());
    
    document.getElementById('btn-import-trigger')?.addEventListener('click', () => {
        document.getElementById('file-upload').click();
    });
    document.getElementById('file-upload')?.addEventListener('change', (e) => SaveManager.importFromFile(e));

    document.getElementById('inp-county-name')?.addEventListener('change', (e) => { if(selectedCellId!==null) countyData[countyData[selectedCellId].masterId].name = e.target.value; });
    document.getElementById('inp-county-gov')?.addEventListener('change', (e) => { if(selectedCellId!==null) countyData[countyData[selectedCellId].masterId].official = e.target.value; });

    generateNewWorld();
});