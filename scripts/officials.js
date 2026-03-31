export {
    getProvinceNameById, getProvinceShortName, getCapitalSelectionIndex,
    getGovernorRegionByProvinceId, isProvinceOccupiedByGovernorRegion,
    buildGovernorAbbrByProvIds, generateRoster, isCapitalGovernorMode,
    createOfficial, assignMainPost, addConcurrentPost,
    getOfficialsAtPosition, getOfficialPostsDisplay, getOfficialById,
    revokeConcurrentPostFromOfficial
} from './officials-core.js';

export {
    selectCapitalOfficial, renderRosterList, renderCapitalOfficials
} from './officials-capital-ui.js';

export {
    setCapitalMode, renderCapitalGovernorAssignments,
    establishCapitalGovernorRegion, toggleCapitalGovernorProvince
} from './officials-governor-ui.js';