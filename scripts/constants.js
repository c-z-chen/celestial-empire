export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 700;

export const SIM_CONFIG = {
    capitalPopulationBase: 1000000, 
    capitalVicinity_multiplier: 2.2,
    capitalAdminFactor: 8.5,
    capitalVicinityAdminFactor: 1.6,
    
    populationNoiseMin: 0.9,
    populationNoiseMax: 1.1,
    minCountyPopulation: 1000,
    
    geoWeights: {
        fertility: 0.35,
        waterAccess: 0.25,
        tradeAccess: 0.20,
        resourceScore: 0.10,
        frontierBonus: 0.10
    },
    
    econScoreThresholds: {
        繁华: 0.82,
        富庶: 0.65,
        平平: 0.48,
        贫困: 0.32
        // 凋敝: < 0.32
    },
    
    officialRunBaseChance: 0.1,
    officialRunHighEconomyChance: 0.30
};

export const EconomyLvls = ["凋敝", "贫困", "平平", "富庶", "繁华"];
export const ecoLvlMap = { "繁华": 5, "富庶": 4, "平平": 3, "贫困": 2, "凋敝": 1, "天子脚下": 5, "京畿重地": 4 };
export const normalizeEconomy = (economy = "") => economy.replace("官营·", "").replace("（官营）", "");
export const CapitalVicinityIndustries = ["御窑织造", "百业行会", "皇庄贡品", "京通仓储"];

export const BureauMap = {
    "丝织": "织造局",
    "茶业": "茶马司",
    "矿业": "铸钱局",
    "盐业": "盐运司",
    "海贸": "市舶司",
    "造船": "市舶司",
    "农业": "督粮道",
    "瓷器": "御窑厂"
};

export const CAPITAL_MAX_GOVERNORS = 3;
export const CAPITAL_REGION_COLORS = ["#9b59b6", "#16a085", "#d35400", "#2980b9", "#8e44ad", "#27ae60"];
export const CAPITAL_GOVERNOR_PAIR_ABBR = {
    "贵州|云南": "云贵",
    "广东|广西": "两广",
    "江苏|江西": "两江",
    "安徽|江苏|江西": "两江",
    "陕西|甘肃": "陕甘",
    "湖北|湖南": "湖广",
    "福建|浙江": "闽浙",
    "安徽|江苏": "江淮"
};
export const CAPITAL_PROV_SHORT = {
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

export const officialData = {
    "正一品": [
        { title: "太师", type: "honorary" },
        { title: "太傅", type: "honorary" },
        { title: "太保", type: "honorary" },
        { title: "保和殿大学士", type: "concurrent", quota: 1 },
        { title: "文华殿大学士", type: "concurrent", quota: 1 },
        { title: "武英殿大学士", type: "concurrent", quota: 1 },
        { title: "体仁阁大学士", type: "concurrent", quota: 1 },
        { title: "文渊阁大学士", type: "concurrent", quota: 1 },
        { title: "东阁大学士", type: "concurrent", quota: 1 },
        { title: "协办大学士", type: "concurrent", quota: 2 }
    ],
    "从一品": [
        { title: "少师", type: "honorary" },
        { title: "少傅", type: "honorary" },
        { title: "少保", type: "honorary" },
        { title: "太子太师", type: "honorary" },
        { title: "太子太傅", type: "honorary" },
        { title: "太子太保", type: "honorary" },
        { title: "吏部尚书", type: "standing", quota: 1 },
        { title: "户部尚书", type: "standing", quota: 1 },
        { title: "礼部尚书", type: "standing", quota: 1 },
        { title: "兵部尚书", type: "standing", quota: 1 },
        { title: "刑部尚书", type: "standing", quota: 1 },
        { title: "工部尚书", type: "standing", quota: 1 },
        { title: "理藩院尚书", type: "standing", quota: 1 },
        { title: "都察院左都御史", type: "standing", quota: 1 },
        { title: "都察院右都御史", type: "standing", quota: 1 }
    ],
    "正二品": [
        { title: "太子少师", type: "honorary" },
        { title: "太子少傅", type: "honorary" },
        { title: "太子少保", type: "honorary" },
        { title: "内务府总管", type: "standing", quota: 3 },
        { title: "銮仪卫使", type: "standing", quota: 1 }
    ],
    "从二品": [
        { title: "吏部侍郎", type: "standing", quota: 2 },
        { title: "户部侍郎", type: "standing", quota: 2 },
        { title: "礼部侍郎", type: "standing", quota: 2 },
        { title: "兵部侍郎", type: "standing", quota: 2 },
        { title: "刑部侍郎", type: "standing", quota: 2 },
        { title: "工部侍郎", type: "standing", quota: 2 },
        { title: "理藩院侍郎", type: "standing", quota: 2 },
        { title: "内阁学士", type: "concurrent", quota: 6 },
        { title: "翰林院掌院学士", type: "standing", quota: 2 }
    ],
    "正三品": [
        { title: "都察院副都御史", type: "standing", quota: 4 },
        { title: "宗人府府丞", type: "standing", quota: 1 },
        { title: "通政使司通政使", type: "standing", quota: 1 },
        { title: "大理寺卿", type: "standing", quota: 1 },
        { title: "詹事府詹事", type: "standing", quota: 1 },
        { title: "太常寺卿", type: "standing", quota: 1 },
        { title: "上驷院卿", type: "standing", quota: 2 },
    ],
    "从三品": [
        { title: "光禄寺卿", type: "standing", quota: 1 },
        { title: "太仆寺卿", type: "standing", quota: 1 }
    ],
    "正四品": [
        { title: "通政使司副使", type: "standing", quota: 2 },
        { title: "大理寺少卿", type: "standing", quota: 2 },
        { title: "詹事府少詹事", type: "standing", quota: 2 },
        { title: "太常寺少卿", type: "standing", quota: 2 },
        { title: "鸿胪寺卿", type: "standing", quota: 1 },
        { title: "太仆寺少卿", type: "standing", quota: 2 },
        { title: "都察院六科掌印给事中", type: "standing", quota: 6 },
        { title: "都察院佥都御史", type: "standing", quota: 4 }
    ],
    "从四品": [
        { title: "内阁侍读学士", type: "standing", quota: 4 },
        { title: "翰林院侍读学士", type: "standing", quota: 4 },
        { title: "翰林院侍讲学士", type: "standing", quota: 4 },
        { title: "国子监祭酒", type: "standing", quota: 2 },
        { title: "光禄寺少卿", type: "standing", quota: 2 }
    ],
    "正五品": [
        { title: "左右春坊左右庶子", type: "standing", quota: 4 },
        { title: "通政使司参议", type: "standing", quota: 2 },
        { title: "六科给事中", type: "standing", quota: 12 },
        { title: "宗人府理事官", type: "standing", quota: 4 },
        { title: "吏部郎中", type: "standing", quota: 6 },
        { title: "户部郎中", type: "standing", quota: 14 },
        { title: "礼部郎中", type: "standing", quota: 6 },
        { title: "兵部郎中", type: "standing", quota: 8 },
        { title: "刑部郎中", type: "standing", quota: 12 },
        { title: "工部郎中", type: "standing", quota: 6 },
        { title: "理藩院郎中", type: "standing", quota: 6 },
        { title: "内务府郎中", type: "standing", quota: 10 },
        { title: "钦天监监正", type: "standing", quota: 1 },
        { title: "太医院院使", type: "standing", quota: 1 },
    ],
    "从五品": [
        { title: "翰林院侍读", type: "standing", quota: 8 },
        { title: "翰林院侍讲", type: "standing", quota: 8 },
        { title: "鸿胪寺少卿", type: "standing", quota: 2 },
        { title: "司经局洗马", type: "standing", quota: 2 },
        { title: "宗人府副理事官", type: "standing", quota: 4 },
        { title: "十五道掌印监察御史", type: "standing", quota: 15 },
        { title: "吏部员外郎", type: "standing", quota: 8 },
        { title: "户部员外郎", type: "standing", quota: 20 },
        { title: "礼部员外郎", type: "standing", quota: 8 },
        { title: "兵部员外郎", type: "standing", quota: 10 },
        { title: "刑部员外郎", type: "standing", quota: 16 },
        { title: "工部员外郎", type: "standing", quota: 8 },
        { title: "理藩院员外郎", type: "standing", quota: 8 }
    ],
    "正六品": [
        { title: "内阁侍读", type: "standing", quota: 6 },
        { title: "左右春坊左右中允", type: "standing", quota: 4 },
        { title: "国子监司业", type: "standing", quota: 3 },
        { title: "吏部主事", type: "standing", quota: 10 },
        { title: "户部主事", type: "standing", quota: 24 },
        { title: "礼部主事", type: "standing", quota: 10 },
        { title: "兵部主事", type: "standing", quota: 12 },
        { title: "刑部主事", type: "standing", quota: 20 },
        { title: "工部主事", type: "standing", quota: 10 },
        { title: "理藩院主事", type: "standing", quota: 10 },
        { title: "宗人府主事", type: "standing", quota: 6 },
        { title: "内务府主事", type: "standing", quota: 15 },
        { title: "都察院都事", type: "standing", quota: 4 },
        { title: "都察院经历", type: "standing", quota: 2 },
        { title: "大理寺左右寺丞", type: "standing", quota: 4 },
        { title: "宗人府经历", type: "standing", quota: 2 },
        { title: "太常寺寺丞", type: "standing", quota: 2 },
        { title: "钦天监监副", type: "standing", quota: 2 },
        { title: "太医院院判", type: "standing", quota: 2 },
        { title: "神乐署署正", type: "standing", quota: 1 },
        { title: "僧录司左右善事", type: "standing", quota: 2 },
        { title: "道录司左右正一", type: "standing", quota: 2 },
        { title: "起居注主事", type: "standing", quota: 6 }
    ],
    "从六品": [
        { title: "左右春坊左右赞善", type: "standing", quota: 4 },
        { title: "翰林院修撰", type: "standing", quota: 6 },
        { title: "光禄寺署正", type: "standing", quota: 2 },
        { title: "汉军秋官正", type: "standing", quota: 1 },
        { title: "和声署正", type: "standing", quota: 1 },
        { title: "僧录司左右阐教", type: "standing", quota: 2 },
        { title: "道录司左右演法", type: "standing", quota: 2 }
    ],
    "正七品": [
        { title: "翰林院编修", type: "standing", quota: 20 },
        { title: "通政使司知事", type: "standing", quota: 2 },
        { title: "通政使司经历", type: "standing", quota: 2 },
        { title: "大理寺左右评事", type: "standing", quota: 4 },
        { title: "太常寺博士", type: "standing", quota: 4 },
        { title: "赞礼郎", type: "standing", quota: 8 },
        { title: "国子监监丞", type: "standing", quota: 2 },
        { title: "内阁典籍", type: "standing", quota: 4 },
        { title: "太常寺典簿", type: "standing", quota: 2 },
        { title: "太仆寺主簿", type: "standing", quota: 2 },
        { title: "内务府司库", type: "standing", quota: 10 },
        { title: "兵马司副指挥", type: "standing", quota: 10 },
        { title: "各部院七品笔帖式", type: "standing", quota: 80 },
        { title: "中书", type: "standing", quota: 30 },
        { title: "皇史宬尉", type: "standing", quota: 2 }
    ],
    "从七品": [
        { title: "翰林院检讨", type: "standing", quota: 25 },
        { title: "銮仪卫经历", type: "standing", quota: 2 },
        { title: "中书科掌印中书", type: "standing", quota: 1 },
        { title: "内阁中书", type: "standing", quota: 60 },
        { title: "办事中书", type: "standing", quota: 20 },
        { title: "詹事府主簿", type: "standing", quota: 2 },
        { title: "光禄寺典簿", type: "standing", quota: 2 },
        { title: "国子监博士", type: "standing", quota: 6 },
        { title: "国子监助教", type: "standing", quota: 15 },
        { title: "钦天监五官灵台郎", type: "standing", quota: 4 },
        { title: "祠祭署奉祀", type: "standing", quota: 2 },
        { title: "和声署署丞", type: "standing", quota: 2 }
    ],
    "正八品": [
        { title: "国子监学正", type: "standing", quota: 6 },
        { title: "国子监学录", type: "standing", quota: 6 },
        { title: "钦天监主簿", type: "standing", quota: 2 },
        { title: "太医院御医", type: "standing", quota: 10 },
        { title: "五经博士", type: "standing", quota: 20 },
        { title: "太常寺协律郎", type: "standing", quota: 4 },
        { title: "各部院八品笔帖式", type: "standing", quota: 120 },
        { title: "僧录司左右讲经", type: "standing", quota: 2 },
        { title: "道录司左右至灵", type: "standing", quota: 2 },
        { title: "六部司务", type: "standing", quota: 12 }
    ],
    "从八品": [
        { title: "翰林院典簿", type: "standing", quota: 2 },
        { title: "国子监典簿", type: "standing", quota: 2 },
        { title: "鸿胪寺主簿", type: "standing", quota: 2 },
        { title: "钦天监五官司挈壶正", type: "standing", quota: 2 },
        { title: "太医院吏目", type: "standing", quota: 8 },
        { title: "祠祭署祀丞", type: "standing", quota: 2 },
        { title: "神乐署署丞", type: "standing", quota: 2 },
        { title: "僧录司左右觉义", type: "standing", quota: 2 },
        { title: "道录司左右至义", type: "standing", quota: 2 }
    ],
    "正九品": [
        { title: "钦天监五官监侯", type: "standing", quota: 4 },
        { title: "五官司书", type: "standing", quota: 4 },
        { title: "太常寺赞礼郎", type: "standing", quota: 12 },
        { title: "礼部四译会同馆大使", type: "standing", quota: 2 },
        { title: "九品笔帖式", type: "standing", quota: 150 }
    ],
    "从九品": [
        { title: "翰林院待诏", type: "standing", quota: 4 },
        { title: "工部制造库司匠", type: "standing", quota: 6 },
        { title: "国子监典籍", type: "standing", quota: 2 },
        { title: "钦天监博士", type: "standing", quota: 6 },
        { title: "漏刻博士", type: "standing", quota: 4 },
        { title: "鸿胪寺鸣赞", type: "standing", quota: 6 },
        { title: "序班", type: "standing", quota: 20 },
        { title: "会典馆序班", type: "standing", quota: 4 },
        { title: "刑部司狱", type: "standing", quota: 6 },
        { title: "太常寺司乐", type: "standing", quota: 8 },
        { title: "太医院吏目", type: "standing", quota: 10 }
    ],
    "未入流": [
        { title: "翰林院孔目", type: "standing", quota: 4 },
        { title: "都察院库使", type: "standing", quota: 8 },
        { title: "礼部铸印局大使", type: "standing", quota: 2 },
        { title: "兵马司吏目", type: "standing", quota: 10 },
        { title: "崇文门副使", type: "standing", quota: 2 },
        { title: "五城兵马司吏目", type: "standing", quota: 10 }
    ]
};

export const OFFICIAL_TIMELINE_BASE_YEAR = 1820;

export const OFFICIAL_RANK_ORDER = [
    "正一品", "从一品", "正二品", "从二品", "正三品", "从三品",
    "正四品", "从四品", "正五品", "从五品", "正六品", "从六品",
    "正七品", "从七品", "正八品", "从八品", "正九品", "从九品", "未入流"
];

export const EXAMINATION_HIERARCHY = {
    "进士·一甲": 100,
    "进士·二甲": 95,
    "进士·三甲": 90,
    "举人": 70,
    "贡生": 50,
    "荫生": 40,
    "捐纳": 25
};

export const RANK_TO_PREFERRED_EXAM = {
    "正一品": ["进士·一甲", "进士·二甲"],
    "从一品": ["进士·一甲", "进士·二甲", "进士·三甲"],
    "正二品": ["进士·二甲", "进士·三甲", "举人"],
    "从二品": ["进士·二甲", "进士·三甲", "举人"],
    "正三品": ["进士·三甲", "举人", "贡生"],
    "从三品": ["进士·三甲", "举人", "贡生"],
    "正四品": ["进士·三甲", "举人", "贡生"],
    "从四品": ["举人", "贡生"],
    "正五品": ["举人", "贡生", "荫生"],
    "从五品": ["举人", "贡生", "荫生"],
    // 低品官员可有更多出身渠道
    "default": ["举人", "贡生", "荫生", "捐纳"]
};

export const OFFICIAL_ASSIGNMENT_RULES = {
    default: {
        maxConcurrent: 3,
        minAge: 24,
        preferredMainPosts: [],
        preferredMainPostKeywords: []
    },
    honorary: {
        maxConcurrent: 4,
        minAge: 45,
        oldMinisterBonusAge: 55,
        preferredMainPostKeywords: ["尚书", "大学士", "御史", "总管"]
    },
    concurrent: {
        maxConcurrent: 3,
        minAge: 30,
        preferredMainPosts: [
            "吏部尚书", "户部尚书", "礼部尚书", "兵部尚书", "刑部尚书", "工部尚书", "理藩院尚书",
            "都察院左都御史", "都察院右都御史"
        ],
        preferredMainPostKeywords: ["尚书", "侍郎", "御史", "卿"]
    },
    byTitle: {
        "保和殿大学士": {
            preferredMainPosts: ["吏部尚书", "户部尚书", "礼部尚书", "兵部尚书", "刑部尚书", "工部尚书"],
            minAge: 40,
            maxConcurrent: 2
        },
        "文华殿大学士": {
            preferredMainPosts: ["吏部尚书", "礼部尚书", "都察院左都御史"],
            minAge: 40,
            maxConcurrent: 2
        },
        "武英殿大学士": {
            preferredMainPosts: ["兵部尚书", "工部尚书", "都察院右都御史"],
            minAge: 40,
            maxConcurrent: 2
        },
        "体仁阁大学士": {
            preferredMainPosts: ["吏部尚书", "户部尚书", "礼部尚书"],
            minAge: 40,
            maxConcurrent: 2
        },
        "文渊阁大学士": {
            preferredMainPosts: ["吏部尚书", "户部尚书", "礼部尚书", "兵部尚书", "刑部尚书", "工部尚书"],
            minAge: 42,
            maxConcurrent: 2
        },
        "东阁大学士": {
            preferredMainPostKeywords: ["尚书", "御史"],
            minAge: 38,
            maxConcurrent: 2
        },
        "协办大学士": {
            preferredMainPostKeywords: ["尚书", "侍郎", "御史"],
            minAge: 36,
            maxConcurrent: 3
        },
        "内阁学士": {
            preferredMainPostKeywords: ["侍郎", "郎中", "给事中", "学士"],
            minAge: 32,
            maxConcurrent: 2
        }
    }
};

export const OFFICIAL_PROFILE_POOLS = {
    birthPlaces: [
        "直隶", "山东", "山西", "河南", "陕西", "甘肃", "河北", "辽宁", "吉林", "黑龙江", "内蒙古", "新疆", "云南", "贵州", "四川", "湖南", "湖北", "安徽", "江苏", "江西", "浙江", "福建", "广东", "广西",
    ],
    birthStatus: ["寒门", "小康士绅", "世宦旁支", "书香门第"],
    examPaths: ["进士", "举人", "贡生", "荫生"],
    personalities: ["谨慎", "果决", "清峻", "宽厚", "务实", "好学", "强项", "圆融", "廉介", "沉毅", "峻急", "宽和"],
    entryRoutes: ["科甲", "部选", "保举", "捐纳后实授"],
    meritEvents: ["平粜赈荒有功", "清理积案有功", "厘金整顿有功", "军需调度得力", "学政考课优等"],
    demeritEvents: ["考成殿后", "失察属吏", "奏报迟延", "赈务不周", "处分从宽记过"]
};

export const LocalOfficialTemplates = {
    prov: [
        { title: "布政使", rank: "从二品", quota: 1 },
        { title: "按察使", rank: "正三品", quota: 1 },
        { title: "提督学政", rank: "正三品", quota: 1 },
        { title: "守巡道员", rank: "正四品", quota: 1 },
        { title: "布政司经历", rank: "从六品", quota: 1 },
        { title: "按察司经历", rank: "正七品", quota: 1 },
        { title: "布政司理问", rank: "从六品", quota: 1 },
        { title: "按察司经历", rank: "正七品", quota: 1 },
        { title: "布政司都事", rank: "从七品", quota: 1 },
        { title: "布政司照磨", rank: "从八品", quota: 1 },
        { title: "按察司知事", rank: "正八品", quota: 1 },
        { title: "按察司照磨", rank: "正九品", quota: 1 },
        { title: "按察使司狱", rank: "从九品", quota: 1 }
    ],
    pref: [
        { title: "同知", rank: "正五品", quota: 1 },
        { title: "通判", rank: "正六品", quota: 2 },
        { title: "府经历", rank: "正八品", quota: 1 },
        { title: "府知事", rank: "正九品", quota: 1 },
        { title: "府教授", rank: "正七品", quota: 1 },
        { title: "府训导", rank: "从八品", quota: 1 },
        { title: "府照磨", rank: "从九品", quota: 1 },
        { title: "府司狱", rank: "从九品", quota: 1 },
        { title: "府检校", rank: "未入流", quota: 1 }
    ],
    county: [
        { title: "县丞", rank: "正八品", quota: 1 },
        { title: "教谕", rank: "正八品", quota: 1 },
        { title: "训导", rank: "从八品", quota: 1 },
        { title: "主簿", rank: "正九品", quota: 1 },
        { title: "典史", rank: "未入流", quota: 1 }
    ]
};

export const SpecialOfficialTemplates = {
    "顺天府": [
        { title: "顺天府丞", rank: "正四品", quota: 1 },
        { title: "顺天府治中", rank: "正五品", quota: 1 },
        { title: "顺天府通判", rank: "正六品", quota: 2 }
    ],
    "奉天府": [
        { title: "奉天府丞", rank: "正四品", quota: 1 },
        { title: "奉天府治中", rank: "正五品", quota: 1 },
        { title: "奉天府通判", rank: "正六品", quota: 2 }
    ],
    "盐务": [
        { title: "都转盐运使司盐运使", rank: "从三品", quota: 1 },
        { title: "盐运司副使", rank: "从五品", quota: 1 },
        { title: "盐课提举司提举", rank: "从五品", quota: 1 },
        { title: "盐运司经历", rank: "从七品", quota: 1 },
        { title: "盐课司大使", rank: "正八品", quota: 2 },
        { title: "盐引批验所大使", rank: "正八品", quota: 1 }
    ],
    "织造": [
        { title: "织造监督", rank: "正五品", quota: 1 },
        { title: "织造局库使", rank: "未入流", quota: 2 }
    ],
    "矿局": [
        { title: "矿务监督", rank: "正五品", quota: 1 },
        { title: "矿课大使", rank: "未入流", quota: 2 }
    ],
    "督粮道": [
        { title: "督粮道", rank: "正四品", quota: 1 },
    ],
};
