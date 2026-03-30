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
    geoFeatures: [],
    pathGenerator: null,
    neighborsMap: {},
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
