export const EconomyLvls = ["凋敝", "贫困", "平平", "富庶", "繁华"];
export const MilitaryEconomyLvls = ["苦寒戍边", "军屯自给", "粮草充足", "军备森严"];
export const CoastalSpecialties = ["渔业", "盐业", "海贸", "造船", "采珠"];
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

export const officialData = {
    "正一品": [
        { title: "太师", quota: 1 },
        { title: "太傅", quota: 1 },
        { title: "太保", quota: 1 },
        { title: "保和殿大学士", quota: 1 },
        { title: "文华殿大学士", quota: 1 },
        { title: "武英殿大学士", quota: 1 },
        { title: "体仁阁大学士", quota: 1 },
        { title: "文渊阁大学士", quota: 1 },
        { title: "东阁大学士", quota: 1 },
        { title: "协办大学士", quota: 2 }
    ],
    "从一品": [
        { title: "少师", quota: 1 },
        { title: "少傅", quota: 1 },
        { title: "少保", quota: 1 },
        { title: "太子太师", quota: 1 },
        { title: "太子太傅", quota: 1 },
        { title: "太子太保", quota: 1 },
        { title: "吏部尚书", quota: 1 },
        { title: "户部尚书", quota: 1 },
        { title: "礼部尚书", quota: 1 },
        { title: "兵部尚书", quota: 1 },
        { title: "刑部尚书", quota: 1 },
        { title: "工部尚书", quota: 1 },
        { title: "理藩院尚书", quota: 1 },
        { title: "都察院左都御史", quota: 1 },
        { title: "都察院右都御史", quota: 1 }
    ],
    "正二品": [
        { title: "太子少师", quota: 1 },
        { title: "太子少傅", quota: 1 },
        { title: "太子少保", quota: 1 },
        { title: "内务府总管", quota: 3 },
        { title: "銮仪卫使", quota: 1 }
    ],
    "从二品": [
        { title: "吏部侍郎", quota: 2 },
        { title: "户部侍郎", quota: 2 },
        { title: "礼部侍郎", quota: 2 },
        { title: "兵部侍郎", quota: 2 },
        { title: "刑部侍郎", quota: 2 },
        { title: "工部侍郎", quota: 2 },
        { title: "理藩院侍郎", quota: 2 },
        { title: "内阁学士", quota: 6 },
        { title: "翰林院掌院学士", quota: 2 }
    ],
    "正三品": [
        { title: "都察院副都御史", quota: 4 },
        { title: "宗人府府丞", quota: 1 },
        { title: "通政使司通政使", quota: 1 },
        { title: "大理寺卿", quota: 1 },
        { title: "詹事府詹事", quota: 1 },
        { title: "太常寺卿", quota: 1 },
        { title: "上驷院卿", quota: 2 },
        { title: "大理院少卿", quota: 2 }
    ],
    "从三品": [
        { title: "光禄寺卿", quota: 1 },
        { title: "太仆寺卿", quota: 1 }
    ],
    "正四品": [
        { title: "通政使司副使", quota: 2 },
        { title: "大理寺少卿", quota: 2 },
        { title: "詹事府少詹事", quota: 2 },
        { title: "太常寺少卿", quota: 2 },
        { title: "鸿胪寺卿", quota: 1 },
        { title: "太仆寺少卿", quota: 2 },
        { title: "都察院六科掌印给事中", quota: 6 },
        { title: "佥都御史", quota: 4 }
    ],
    "从四品": [
        { title: "内阁侍读学士", quota: 4 },
        { title: "翰林院侍读学士", quota: 4 },
        { title: "翰林院侍讲学士", quota: 4 },
        { title: "国子监祭酒", quota: 2 },
        { title: "光禄寺少卿", quota: 2 }
    ],
    "正五品": [
        { title: "左右春坊左右庶子", quota: 4 },
        { title: "通政使司参议", quota: 2 },
        { title: "六科给事中", quota: 12 },
        { title: "宗人府理事官", quota: 4 },
        { title: "吏部郎中", quota: 6 },
        { title: "户部郎中", quota: 14 },
        { title: "礼部郎中", quota: 6 },
        { title: "兵部郎中", quota: 8 },
        { title: "刑部郎中", quota: 12 },
        { title: "工部郎中", quota: 6 },
        { title: "理藩院郎中", quota: 6 },
        { title: "内务府郎中", quota: 10 },
        { title: "钦天监监正", quota: 1 },
        { title: "太医院院使", quota: 1 },
        { title: "五品京堂", quota: 8 }
    ],
    "从五品": [
        { title: "翰林院侍读", quota: 8 },
        { title: "翰林院侍讲", quota: 8 },
        { title: "鸿胪寺少卿", quota: 2 },
        { title: "司经局洗马", quota: 2 },
        { title: "宗人府副理事官", quota: 4 },
        { title: "十五道掌印监察御史", quota: 15 },
        { title: "吏部员外郎", quota: 8 },
        { title: "户部员外郎", quota: 20 },
        { title: "礼部员外郎", quota: 8 },
        { title: "兵部员外郎", quota: 10 },
        { title: "刑部员外郎", quota: 16 },
        { title: "工部员外郎", quota: 8 },
        { title: "理藩院员外郎", quota: 8 }
    ],
    "正六品": [
        { title: "内阁侍读", quota: 6 },
        { title: "左右春坊左右中允", quota: 4 },
        { title: "国子监司业", quota: 3 },
        { title: "吏部主事", quota: 10 },
        { title: "户部主事", quota: 24 },
        { title: "礼部主事", quota: 10 },
        { title: "兵部主事", quota: 12 },
        { title: "刑部主事", quota: 20 },
        { title: "工部主事", quota: 10 },
        { title: "理藩院主事", quota: 10 },
        { title: "宗人府主事", quota: 6 },
        { title: "内务府主事", quota: 15 },
        { title: "都察院都事", quota: 4 },
        { title: "都察院经历", quota: 2 },
        { title: "大理寺左右寺丞", quota: 4 },
        { title: "宗人府经历", quota: 2 },
        { title: "太常寺寺丞", quota: 2 },
        { title: "钦天监监副", quota: 2 },
        { title: "太医院院判", quota: 2 },
        { title: "神乐署署正", quota: 1 },
        { title: "僧录司左右善事", quota: 2 },
        { title: "道录司左右正一", quota: 2 },
        { title: "起居注主事", quota: 6 }
    ],
    "从六品": [
        { title: "左右春坊左右赞善", quota: 4 },
        { title: "翰林院修撰", quota: 6 },
        { title: "光禄寺署正", quota: 2 },
        { title: "钦天监满洲蒙古五官正", quota: 2 },
        { title: "汉军秋官正", quota: 1 },
        { title: "和声署正", quota: 1 },
        { title: "僧录司左右阐教", quota: 2 },
        { title: "道录司左右演法", quota: 2 }
    ],
    "正七品": [
        { title: "翰林院编修", quota: 20 },
        { title: "通政使司知事", quota: 2 },
        { title: "通政使司经历", quota: 2 },
        { title: "大理寺左右评事", quota: 4 },
        { title: "太常寺博士", quota: 4 },
        { title: "太常寺满洲读祝官", quota: 4 },
        { title: "赞礼郎", quota: 8 },
        { title: "国子监监丞", quota: 2 },
        { title: "内阁典籍", quota: 4 },
        { title: "太常寺典簿", quota: 2 },
        { title: "太仆寺主簿", quota: 2 },
        { title: "内务府司库", quota: 10 },
        { title: "兵马司副指挥", quota: 10 },
        { title: "各部院七品笔帖式", quota: 80 },
        { title: "中书", quota: 30 },
        { title: "皇史宬尉", quota: 2 }
    ],
    "从七品": [
        { title: "翰林院检讨", quota: 25 },
        { title: "銮仪卫经历", quota: 2 },
        { title: "中书科掌印中书", quota: 1 },
        { title: "内阁中书", quota: 60 },
        { title: "办事中书", quota: 20 },
        { title: "詹事府主簿", quota: 2 },
        { title: "光禄寺典簿", quota: 2 },
        { title: "国子监博士", quota: 6 },
        { title: "国子监助教", quota: 15 },
        { title: "钦天监五官灵台郎", quota: 4 },
        { title: "祠祭署奉祀", quota: 2 },
        { title: "和声署署丞", quota: 2 }
    ],
    "正八品": [
        { title: "国子监学正", quota: 6 },
        { title: "国子监学录", quota: 6 },
        { title: "钦天监主簿", quota: 2 },
        { title: "太医院御医", quota: 10 },
        { title: "五经博士", quota: 20 },
        { title: "太常寺协律郎", quota: 4 },
        { title: "各部院八品笔帖式", quota: 120 },
        { title: "僧录司左右讲经", quota: 2 },
        { title: "道录司左右至灵", quota: 2 },
        { title: "六部司务", quota: 12 }
    ],
    "从八品": [
        { title: "翰林院典簿", quota: 2 },
        { title: "国子监典簿", quota: 2 },
        { title: "鸿胪寺主簿", quota: 2 },
        { title: "钦天监五官司挈壶正", quota: 2 },
        { title: "太医院吏目", quota: 8 },
        { title: "祠祭署祀丞", quota: 2 },
        { title: "神乐署署丞", quota: 2 },
        { title: "僧录司左右觉义", quota: 2 },
        { title: "道录司左右至义", quota: 2 }
    ],
    "正九品": [
        { title: "钦天监五官监侯", quota: 4 },
        { title: "五官司书", quota: 4 },
        { title: "太常寺赞礼郎", quota: 12 },
        { title: "礼部四译会同馆大使", quota: 2 },
        { title: "九品笔帖式", quota: 150 }
    ],
    "从九品": [
        { title: "翰林院待诏", quota: 4 },
        { title: "工部制造库司匠", quota: 6 },
        { title: "国子监典籍", quota: 2 },
        { title: "钦天监博士", quota: 6 },
        { title: "漏刻博士", quota: 4 },
        { title: "鸿胪寺鸣赞", quota: 6 },
        { title: "序班", quota: 20 },
        { title: "会典馆序班", quota: 4 },
        { title: "刑部司狱", quota: 6 },
        { title: "太常寺司乐", quota: 8 },
        { title: "太医院吏目", quota: 10 }
    ],
    "未入流": [
        { title: "翰林院孔目", quota: 4 },
        { title: "都察院库使", quota: 8 },
        { title: "礼部铸印局大使", quota: 2 },
        { title: "兵马司吏目", quota: 10 },
        { title: "崇文门副使", quota: 2 },
        { title: "五城兵马司吏目", quota: 10 }
    ]
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

export const NameGen = {
    generatedNames: new Set(),
    weightedPick(arr) { let t=arr.reduce((s,i)=>s+i.weight,0), r=Math.random()*t; for(let i of arr) if((r-=i.weight)<0) return i.value; },
    get(arr) { return arr[Math.floor(Math.random() * arr.length)]; },

    good: [ ["安",10],["宁",10],["平",9],["顺",8],["兴",8],["盛",6],["昌",6],["和",7],["泰",6],["康",5],["德",8],["仁",5],["福",6],["永",7],["定",7],["靖",6],["绥",4],["化",5],["同",5],["恩",5],["惠",5],["祥",5],["瑞",4],["熙",4],["裕",4] ].map(([v,w])=>({value:v,weight:w})),
    geo: [ ["山",10],["川",10],["河",9],["江",8],["湖",6],["岭",6],["原",5],["林",7],["溪",6],["源",5],["洲",5],["泽",4],["浦",4],["岩",4],["峰",5],["关",4],["口",3],["城",5],["阳",6],["阴",3],["海",6],["泉",5] ].map(([v,w])=>({value:v,weight:w})),
    dir: [ ["东",6],["西",6],["南",6],["北",6],["中",4],["上",3],["下",2],["前",2] ].map(([v,w])=>({value:v,weight:w})),
    ethnic: [ ["阿",3],["巴",3],["喀",1],["塔",2] ].map(([v,w])=>({value:v,weight:w})),
    suffix: [ {value:"县", weight:95}, {value:"邑", weight:1}, {value:"关", weight:2}, {value:"镇", weight:3} ],
    
    surnamesWeighted: [
        {value: "王", weight: 100}, {value: "李", weight: 95}, {value: "张", weight: 90}, 
        {value: "刘", weight: 85}, {value: "陈", weight: 80}, {value: "杨", weight: 70}, 
        {value: "赵", weight: 65}, {value: "黄", weight: 60}, {value: "周", weight: 55}, 
        {value: "吴", weight: 50}, {value: "徐", weight: 45}, {value: "孙", weight: 40}, 
        {value: "朱", weight: 35}, {value: "马", weight: 30}, {value: "胡", weight: 30},
        {value: "林", weight: 25}, {value: "郭", weight: 25}, {value: "何", weight: 20},
        {value: "高", weight: 20}, {value: "罗", weight: 15}, {value: "郑", weight: 15},
        {value: "梁", weight: 10}, {value: "谢", weight: 10}, {value: "宋", weight: 10},
        {value: "唐", weight: 5}, {value: "许", weight: 5}, {value: "韩", weight: 5}, {value: "邓", weight: 5}, 
        {value: "冯", weight: 5}, {value: "权", weight: 5}, {value: "曹", weight: 5}, {value: "庞", weight: 5}, 
        {value: "彭", weight: 5}, {value: "曾", weight: 5}, {value: "萧", weight: 5}, {value: "虞", weight: 5}, 
        {value: "田", weight: 5}, {value: "董", weight: 5}, {value: "袁", weight: 5}, {value: "万", weight: 5}, {value: "左", weight: 5}, {value: "景", weight: 5}, {value: "凃", weight: 5}, {value: "成", weight: 5}, {value: "齐", weight: 5}, {value: "史", weight: 5},
        {value: "牛", weight: 5}, {value: "文", weight: 5},
        {value: "颜", weight: 5}, {value: "安", weight: 5},
    ],
    
    zibeiPool: Array.from("允文遵祖训钦武大君胜顺道宜逢吉师良善用晟尚志公诚秉惟怀敬谊存辅嗣资廉直匡时永信惇济美锺奇表知新慎敏求审心咸景慕述学继前修高瞻祁见祐厚载翊常由慈和怡伯仲简靖迪先猷有子同安睦勤朝在肃恭绍伦敷惠润昭格广登庸孟季均荣显英华蕴盛容宏才升博衍茂士立全功贤能长可庆睿智实堪宗养性期渊雅寅思复会通肇泰阳当健观颐寿以弘振举希兼达康庄遇本宁悦友申宾让承宣奉至平懋进深滋益端居务穆清久镇开方岳扬威谨礼仪刚毅循超卓权衡素自持逊仕成聪俊充廷鼐鼎彝传贻连秀郁炳燿壮洪基赡禄贡真弼缙绅识烈忠省衡岳毓灵秀沧海映朝晖熙溪君伯桦居重世成"),
    givenChars: Array.from("德恩泽渊浩宇霖翰廷栋伯仲叔季天明国正世广大宏志道学立生希绍茂士汝时清之懋修齐治平坚刚健伟达全仁义礼智信诚敬轩景泰元亨利尘时中贞文武斌辉豪杰俊英光华博雅致远宁静克己复礼钦林澟山水望知隶理器督期思斯工府朝庭绅士戬云帆济川启瑞承宣维桢致远明哲思诚俊朗浩初秉钧怀瑾佩瑜熙溪熹涪福雅玢胤运脩楷峭绩妙业察法"),

    genCountyName(){ 
        let r = Math.random();
        let prefix = "";
        if(r < 0.1) prefix = this.weightedPick(this.ethnic);
        else if(r < 0.3) prefix = this.weightedPick(this.dir);
        else prefix = this.weightedPick(this.good);
        
        return prefix + this.weightedPick(this.geo) + this.weightedPick(this.suffix); 
    },
    genPrefName(isCap){ 
        if(isCap) return "顺天府";
        let r = Math.random();
        let p1 = r < 0.4 ? this.weightedPick(this.dir) : this.weightedPick(this.good);
        let p2 = r < 0.2 ? this.weightedPick(this.good) : this.weightedPick(this.geo);
        return p1 + p2 + "府"; 
    },
    genProvName(isCap){ 
        if(isCap) return "直隶省";
        let r = Math.random();
        let p1 = r < 0.5 ? this.weightedPick(this.geo) : this.weightedPick(this.dir);
        let p2 = r < 0.5 ? this.weightedPick(this.dir) : this.weightedPick(this.good);
        if (p1 === p2) p2 = this.weightedPick(this.geo); // 避免重复字
        return p1 + p2 + "省"; 
    },
    
    person() {
        for(let i=0; i<50; i++){
            let surname = this.weightedPick(this.surnamesWeighted);
            let rand = Math.random();
            let given = "";
            if(rand > 0.6) {
                given = this.get(this.zibeiPool) + this.get(this.givenChars);
            } else if (rand > 0.3) {
                given = this.get(this.givenChars) + this.get(this.givenChars);
            } else {
                given = this.get(this.givenChars);
            }
            let name = surname + given;
            if(!this.generatedNames.has(name)){ this.generatedNames.add(name); return name; }
        }
        return "无名氏" + Math.floor(Math.random()*100);
    }
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
    ]
};