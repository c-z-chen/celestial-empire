export const state = {
    countyData: {},
    prefecturesData: {},
    provincesData: {},
    nextPrefId: 1,
    nextProvId: 1,
    capitalId: null,
    mapViewMode: 'county',
    activeTab: 'county',
    capitalMode: 'governor',
    selectedOfficialId: null,
    selectedCellId: null,
    mergeMode: null,
    capitalGovernorSelectedProvinces: [],
    capitalGovernorRegions: [],
    capitalGovernorNextId: 1,
    capitalGovernorRegionByProvId: {},
    capitalGovernorRegionIndexDirty: true,
    capitalSectionOpen: {},
    geoFeatures: [],
    pathGenerator: null,
    neighborsMap: {},
    countyGroupsByPref: {},
    countyGroupsByProv: {},
    countyGroupsDirty: true,
    currentTransform: null,
    zoomBehavior: null,
    
    // 官员数据
    officials: {
        byId: {},           // { "off_1": {id, name, age, ...} }
        byPosition: {},     // { "吏部尚书": [{offId, name}, ...] }
        nextId: 1
    }
};

export function isCapitalTabActive() {
    return state.activeTab === 'capital';
}

export function invalidateCountyGroupIndex() {
    state.countyGroupsDirty = true;
}

export function invalidateGovernorRegionIndex() {
    state.capitalGovernorRegionIndexDirty = true;
}

export function rebuildCountyGroupIndex() {
    const byPref = {};
    const byProv = {};
    Object.values(state.countyData).forEach(c => {
        if (c.prefId != null) {
            if (!byPref[c.prefId]) byPref[c.prefId] = [];
            byPref[c.prefId].push(c);
        }
        if (c.provId != null) {
            if (!byProv[c.provId]) byProv[c.provId] = [];
            byProv[c.provId].push(c);
        }
    });
    state.countyGroupsByPref = byPref;
    state.countyGroupsByProv = byProv;
    state.countyGroupsDirty = false;
}

function ensureCountyGroupIndex() {
    if (state.countyGroupsDirty) {
        rebuildCountyGroupIndex();
    }
}

export function getCountiesByPrefId(prefId) {
    ensureCountyGroupIndex();
    return state.countyGroupsByPref[prefId] || [];
}

export function getCountiesByProvId(provId) {
    ensureCountyGroupIndex();
    return state.countyGroupsByProv[provId] || [];
}

export function rebuildGovernorRegionIndex() {
    const byProv = {};
    (state.capitalGovernorRegions || []).forEach(region => {
        (region?.provIds || []).forEach(provId => {
            if (provId == null) return;
            byProv[provId] = region;
        });
    });
    state.capitalGovernorRegionByProvId = byProv;
    state.capitalGovernorRegionIndexDirty = false;
}

function ensureGovernorRegionIndex() {
    if (state.capitalGovernorRegionIndexDirty) {
        rebuildGovernorRegionIndex();
    }
}

export function getGovernorRegionByProvId(provId) {
    ensureGovernorRegionIndex();
    return state.capitalGovernorRegionByProvId[provId] || null;
}
