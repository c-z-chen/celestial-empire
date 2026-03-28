import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { state, isCapitalTabActive } from './state.js';
import {
    getCapitalSelectionIndex, getGovernorRegionByProvinceId,
    isProvinceOccupiedByGovernorRegion
} from './officials.js';
// ui.js is imported inside functions to avoid circular-dependency issues at evaluation time.

// ── Neighbor computation ───────────────────────────────────────────────────────

export function computeNeighbors(features) {
    state.neighborsMap = {};
    features.forEach((_, i) => state.neighborsMap[i] = []);
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
                    if (!state.neighborsMap[a].includes(b)) state.neighborsMap[a].push(b);
                    if (!state.neighborsMap[b].includes(a)) state.neighborsMap[b].push(a);
                }
            }
        }
    });
}

// ── Territory colour / opacity ─────────────────────────────────────────────────

export function getTerritoryColor(i) {
    let c = state.countyData[i];
    if (isCapitalTabActive()) {
        if (c.provId === null || !state.provincesData[c.provId]) return "#4b5563";
        const provName = state.provincesData[c.provId].name || '';
        if (provName.includes("直隶")) return "#F1C40F";
        const region = getGovernorRegionByProvinceId(c.provId);
        if (region) return region.color || "#9b59b6";
        return getCapitalSelectionIndex(c.provId) >= 0 ? "#2f9e44" : "#7f8c8d";
    }
    if (state.mapViewMode === 'province') return c.provId !== null ? state.provincesData[c.provId].color : (c.prefId !== null ? state.prefecturesData[c.prefId].color : "#34495e");
    if (state.mapViewMode === 'prefecture') return c.prefId !== null ? state.prefecturesData[c.prefId].color : "#34495e";
    return state.countyData[c.masterId].color;
}

export function getTerritoryOpacity(i) {
    let c = state.countyData[i];
    if (isCapitalTabActive()) {
        if (c.provId === null || !state.provincesData[c.provId]) return 0.2;
        const provName = state.provincesData[c.provId].name || '';
        if (provName.includes("直隶")) return 1.0;
        if (isProvinceOccupiedByGovernorRegion(c.provId)) return 1.0;
        return getCapitalSelectionIndex(c.provId) >= 0 ? 1.0 : 0.6;
    }
    if (state.mapViewMode === 'province') return c.provId !== null ? 1.0 : (c.prefId !== null ? 0.35 : 0.05);
    if (state.mapViewMode === 'prefecture') return c.prefId !== null ? 1.0 : 0.15;
    return 1.0;
}

// ── Paint & highlight helpers ──────────────────────────────────────────────────

export function refreshTerritoryPaint() {
    d3.selectAll(".county")
        .attr("fill", (d, i) => getTerritoryColor(i))
        .attr("fill-opacity", (d, i) => getTerritoryOpacity(i));
}

export function highlightSelection(i) {
    d3.selectAll(".county").classed("selected-group", false);

    if (isCapitalTabActive()) {
        Object.values(state.countyData).forEach(c => {
            if (getCapitalSelectionIndex(c.provId) >= 0) {
                d3.select("#cell-" + c.id).classed("selected-group", true);
            }
        });
        return;
    }

    if (i === null || i === undefined) return;
    let target = state.countyData[i];
    Object.values(state.countyData).forEach(c => {
        if (
            (state.mapViewMode === 'county'      && c.masterId === target.masterId) ||
            (state.mapViewMode === 'prefecture'  && target.prefId !== null && c.prefId === target.prefId) ||
            (state.mapViewMode === 'province'    && target.provId !== null && c.provId === target.provId)
        ) {
            d3.select("#cell-" + c.id).classed("selected-group", true);
        }
    });
}

// ── Map view / draw ────────────────────────────────────────────────────────────

export function drawCapitals() {
    d3.selectAll(".yamen-icon").remove();
    const mapGroup = d3.select("#map-group");

    if (state.mapViewMode === 'prefecture' || state.mapViewMode === 'province') {
        Object.values(state.prefecturesData).forEach(p => {
            let cp = state.countyData[p.capitalCountyId].center;
            mapGroup.append("circle").attr("cx", cp[0]).attr("cy", cp[1]).attr("r", 3).attr("fill", "#ecf0f1").attr("class", "yamen-icon");
        });
    }
    if (state.mapViewMode === 'province') {
        Object.values(state.provincesData).forEach(p => {
            let cp = state.countyData[p.capitalCountyId].center;
            mapGroup.append("rect").attr("x", cp[0]-4).attr("y", cp[1]-4).attr("width", 8).attr("height", 8).attr("fill", "#e74c3c").attr("class", "yamen-icon");
        });
    }

    if (state.capitalId !== null && state.countyData[state.capitalId]) {
        let cp = state.countyData[state.capitalId].center;
        mapGroup.append("polygon")
            .datum({ x: cp[0], y: cp[1] })
            .attr("points", "0,-8 2,-2 8,-2 3,2 5,8 0,5 -5,8 -3,2 -8,-2 -2,-2")
            .attr("transform", `translate(${cp[0]}, ${cp[1]})`)
            .attr("fill", "gold")
            .attr("stroke", "#c0392b")
            .attr("stroke-width", 1)
            .attr("class", "yamen-icon capital-star");
    }
}

export function setMapView(mode, syncTab = true) {
    state.mapViewMode = mode;
    document.querySelectorAll('.map-toggles button').forEach(btn => btn.classList.remove('active'));
    let activeBtn = document.querySelector(`.map-toggles button[data-view="${mode}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    refreshTerritoryPaint();
    drawCapitals();
    if (state.selectedCellId !== null) highlightSelection(state.selectedCellId);

    if (syncTab) {
        // Import switchTab lazily to avoid circular-dependency at evaluation time.
        import('./ui.js').then(({ switchTab }) => {
            const tabMap = { 'county': 'county', 'prefecture': 'pref', 'province': 'prov' };
            if (state.activeTab !== tabMap[mode]) {
                switchTab(tabMap[mode]);
            }
        });
    }
}

// ── Full map render ────────────────────────────────────────────────────────────

export function renderMap() {
    d3.select("#map-container").selectAll("*").remove();

    const svg = d3.select("#map-container").append("svg")
        .attr("viewBox", `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`)
        .attr("preserveAspectRatio", "xMidYMid slice")
        .style("background-color", "#e0f3f8")
        .attr("width", "100%")
        .attr("height", "100%");

    svg.append("rect")
        .attr("x", -MAP_WIDTH * 2)
        .attr("y", -MAP_HEIGHT * 2)
        .attr("width", MAP_WIDTH * 5)
        .attr("height", MAP_HEIGHT * 5)
        .attr("fill", "#e0f3f8");

    const mapGroup = svg.append("g").attr("id", "map-group");

    mapGroup.selectAll(".county")
        .data(state.geoFeatures)
        .enter()
        .append("path")
        .attr("d", state.pathGenerator)
        .attr("class", "county")
        .attr("id", (d, i) => "cell-" + i)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 0.3)
        .on("click", function(event, d) {
            let i = state.geoFeatures.indexOf(d);
            import('./ui.js').then(({ handleRegionClick }) => handleRegionClick(i));
        });

    state.currentTransform = d3.zoomIdentity;
    state.zoomBehavior = d3.zoom()
        .scaleExtent([1, 15])
        .on("zoom", (event) => {
            state.currentTransform = event.transform;
            mapGroup.attr("transform", state.currentTransform);

            mapGroup.selectAll(".capital-star")
                .attr("transform", function(d) {
                    return `translate(${d.x}, ${d.y}) scale(${1 / state.currentTransform.k})`;
                })
                .attr("stroke-width", 1 / state.currentTransform.k);

            mapGroup.selectAll(".yamen-icon:not(.capital-star)")
                .attr("r", 3 / state.currentTransform.k)
                .attr("stroke-width", 1 / state.currentTransform.k);
        });

    svg.call(state.zoomBehavior);

    setMapView(state.mapViewMode, false);
    import('./ui.js').then(({ updateUI }) => updateUI());
}
