// Shared mutable application state.
// All modules import this object and mutate its properties directly.
export const state = {
    countyData: {},
    prefecturesData: {},
    provincesData: {},
    nextPrefId: 1,
    nextProvId: 1,
    capitalId: null,
    mapViewMode: 'county',
    activeTab: 'county',
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
};

export function isCapitalTabActive() {
    return state.activeTab === 'capital';
}
