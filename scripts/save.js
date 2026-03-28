import { NameGen } from './nameGen.js';
import { state } from './state.js';
import { renderMap } from './map.js';
import { renderCapitalGovernorAssignments } from './officials.js';

export const SaveManager = {
    collectData() {
        return {
            countyData:                       state.countyData,
            prefecturesData:                  state.prefecturesData,
            provincesData:                    state.provincesData,
            nextPrefId:                       state.nextPrefId,
            nextProvId:                       state.nextProvId,
            capitalId:                        state.capitalId,
            capitalGovernorSelectedProvinces: state.capitalGovernorSelectedProvinces,
            capitalGovernorRegions:           state.capitalGovernorRegions,
            capitalGovernorNextId:            state.capitalGovernorNextId
        };
    },

    applyData(d) {
        state.countyData       = d.countyData;
        state.prefecturesData  = d.prefecturesData;
        state.provincesData    = d.provincesData;
        state.nextPrefId       = d.nextPrefId;
        state.nextProvId       = d.nextProvId;
        state.capitalId        = d.capitalId;
        state.capitalGovernorSelectedProvinces = Array.isArray(d.capitalGovernorSelectedProvinces) ? d.capitalGovernorSelectedProvinces : [];
        state.capitalGovernorRegions           = Array.isArray(d.capitalGovernorRegions)           ? d.capitalGovernorRegions           : [];
        state.capitalGovernorNextId            = d.capitalGovernorNextId || (state.capitalGovernorRegions.length + 1);
        state.selectedCellId = null;
        state.mergeMode      = null;
        NameGen.generatedNames.clear();
        renderMap();
        renderCapitalGovernorAssignments();
    },

    saveToLocal() {
        localStorage.setItem("adminManagerSave", JSON.stringify(this.collectData()));
        alert("已存入浏览器缓存！");
    },

    loadFromLocal() {
        let s = localStorage.getItem("adminManagerSave");
        if (s) { this.applyData(JSON.parse(s)); alert("读取缓存成功！"); }
        else   { alert("没有找到缓存记录。"); }
    },

    exportToFile() {
        let a = document.createElement('a');
        a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.collectData()));
        a.download = "world_save.json";
        a.click();
    },

    importFromFile(e) {
        let f = e.target.files[0];
        if (!f) return;
        let r = new FileReader();
        r.onload = (ev) => { this.applyData(JSON.parse(ev.target.result)); alert("文件导入成功！"); };
        r.readAsText(f);
        e.target.value = '';
    }
};
