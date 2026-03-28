import { MAP_WIDTH, MAP_HEIGHT } from './constants.js';
import { state } from './state.js';
import { computeNeighbors, renderMap } from './map.js';
import { renderCapitalOfficials, renderCapitalGovernorAssignments, establishCapitalGovernorRegion } from './officials.js';
import { initWorldData, establish, toggleMerge } from './territory.js';
import { switchTab } from './ui.js';
import { SaveManager } from './save.js';

function loadChinaMap() {
    d3.json("./maps/qing_1820_counties.json").then(geoData => {
        state.geoFeatures = geoData.features.filter(f => f.geometry);
        console.log("成功读取地图区块数量：", state.geoFeatures.length);

        const projection = d3.geoMercator().fitSize([MAP_WIDTH, MAP_HEIGHT], geoData);
        state.pathGenerator = d3.geoPath().projection(projection);

        computeNeighbors(state.geoFeatures);

        state.capitalId = null;
        state.geoFeatures.forEach((f, i) => {
            if (d3.geoContains(f, [116.406, 39.906])) {
                state.capitalId = i;
                console.log("找到京师区块:", f.properties.NAME_CH);
            }
        });

        initWorldData();
        renderMap();
    }).catch(err => {
        console.error("地图加载失败，请检查文件路径或格式:", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('.map-toggles button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            import('./map.js').then(({ setMapView }) => setMapView(e.target.dataset.view));
        });
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

    document.getElementById('inp-county-name')?.addEventListener('change', (e) => {
        if (state.selectedCellId !== null) {
            state.countyData[state.countyData[state.selectedCellId].masterId].name = e.target.value;
        }
    });
    document.getElementById('inp-county-gov')?.addEventListener('change', (e) => {
        if (state.selectedCellId !== null) {
            state.countyData[state.countyData[state.selectedCellId].masterId].official = e.target.value;
        }
    });

    renderCapitalOfficials();
    renderCapitalGovernorAssignments();
    loadChinaMap();
});
