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

    genCountyName() {
        let r = Math.random();
        let prefix = "";
        if (r < 0.1) prefix = this.weightedPick(this.ethnic);
        else if (r < 0.3) prefix = this.weightedPick(this.dir);
        else prefix = this.weightedPick(this.good);
        return prefix + this.weightedPick(this.geo) + this.weightedPick(this.suffix);
    },
    genPrefName(isCap) {
        if (isCap) return "顺天府";
        let r = Math.random();
        let p1 = r < 0.4 ? this.weightedPick(this.dir) : this.weightedPick(this.good);
        let p2 = r < 0.2 ? this.weightedPick(this.good) : this.weightedPick(this.geo);
        return p1 + p2 + "府";
    },
    genProvName(isCap) {
        if (isCap) return "直隶省";
        let r = Math.random();
        let p1 = r < 0.5 ? this.weightedPick(this.geo) : this.weightedPick(this.dir);
        let p2 = r < 0.5 ? this.weightedPick(this.dir) : this.weightedPick(this.good);
        if (p1 === p2) p2 = this.weightedPick(this.geo);
        return p1 + p2 + "省";
    },

    person() {
        for (let i = 0; i < 50; i++) {
            let surname = this.weightedPick(this.surnamesWeighted);
            let rand = Math.random();
            let given = "";
            if (rand > 0.6) {
                given = this.get(this.zibeiPool) + this.get(this.givenChars);
            } else if (rand > 0.3) {
                given = this.get(this.givenChars) + this.get(this.givenChars);
            } else {
                given = this.get(this.givenChars);
            }
            let name = surname + given;
            if (!this.generatedNames.has(name)) { this.generatedNames.add(name); return name; }
        }
        return "无名氏" + Math.floor(Math.random() * 100);
    }
};
