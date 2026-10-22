/* Shared, local source for the parallel three-position task redesign.
 * Each deployed game receives its own copy; TASK_SETUP in main.js fixes its arm.
 */
const DESIGN = Object.freeze({
    survival: {
        threshold: 8, unit: 'pieces', name: 'Survival Task',
        distributions: {
            insufficiency: [1, 4, 13],
            sufficiency: [1, 6, 17],
            abundance: [2, 6, 22]
        },
        labels: ['Person C', 'Person B', 'Person A'],
        line: '8 pieces needed to survive'
    },
    economy: {
        threshold: 12, unit: '$1,000 blocks', name: 'American Economy Task',
        distributions: {
            insufficiency: [2, 5, 20],
            sufficiency: [2, 8, 26],
            abundance: [3, 9, 33],
            actual: [11, 44, 143]
        },
        labels: ['Lower income', 'Middle income', 'Higher income'],
        line: '$12,000 basic-needs line'
    }
});

const SURVIVAL_PRINCIPLES = [
    {code:'personalVsGroupResponsibility', prompt:'In this situation, which should receive greater priority: personal responsibility or shared responsibility for meeting food needs?', options:['The group sharing responsibility for meeting everyone’s food needs.','Each person taking responsibility for meeting their own food needs.']},
    {code:'fairRuleChoice', prompt:'In this situation, is it fair for the group to give extra food to people who have less?', options:['Yes—give extra food to people who have less.','No—do not give extra food to people who have less.']},
    {code:'foodPriorityChoice', prompt:'Person C usually collects the least food and needs help to survive. Person A usually collects the most food and can contribute more to feeding the group. When deciding whom to give food to, which person should the group prioritize?', options:['Person C','Person A']},
    {code:'workBreakChoice', intro:'Hunting and gathering food is hard work.', prompt:'One day, one of the people is exhausted and wants to take a break from hunting and gathering food. Should the person keep working or take a break?', options:['The person should take a break.','The person should keep hunting and gathering food.']},
    {code:'floodPreparationChoice', intro:'It is highly likely the location will flood when the rainy season arrives in a few weeks.', prompt:'Should the group spend the rest of the day looking for more food to eat or preparing the location to withstand flooding in a few weeks?', options:['The group should spend the rest of the day looking for more food to eat.','The group should spend the rest of the day preparing the location to withstand flooding in a few weeks.']},
    {code:'personDShareChoice', block:'personD', intro:'A new person (Person D) wanders into the group’s location and begs for food. The new person is peaceful and not threatening.', prompt:'Should the members of the group share their food with Person D or ask Person D to get food elsewhere?', options:['Members of the group should share their food with Person D.','Members of the group should ask Person D to get food elsewhere.']},
    {code:'personDEmpathyChoice', block:'personD', prompt:'When deciding whether to give Person D food, which should weigh more heavily?', options:['Concern for Person D’s well-being.','The food other group members would have to give up.']},
    {code:'cooperationCompetitionChoice', intro:'Most people are cooperative in some situations and competitive in others.', prompt:'Do you think that the people in this group are probably more cooperative or competitive?', options:['The people in this group are probably more competitive.','The people in this group are probably more cooperative.']}
];

const ECONOMY_PRINCIPLES = [
    {code:'responsibility', prompt:'Thinking about the American economy as shown in this task, which should receive greater priority: personal responsibility or government responsibility for meeting basic needs?', options:[{code:'shared',title:'Government responsibility',detail:'The government should take responsibility for making sure everyone can meet their basic needs.'},{code:'personal',title:'Personal responsibility',detail:'People should be primarily responsible for making sure they can meet their own basic needs.'}]},
    {code:'fairness', prompt:'Would it be fair to have a law requiring people who have more income than needed to meet basic needs to help fund assistance for people who lack enough income to meet basic needs?', options:[{code:'equity',title:'Yes, this law would be fair.'},{code:'no_equity',title:'No, this law would not be fair.'}]},
    {code:'income_priority', prompt:"People with lower incomes have the least income and need help meeting basic needs. People with higher incomes have the most income and can contribute more in taxes to fund public spending. When deciding whether to redistribute income, which group's economic interests should the government prioritize?", options:[{code:'lowest',title:'Lower-income people'},{code:'highest',title:'Higher-income people'}]},
    {code:'time', prompt:'Should the U.S. prioritize putting its resources toward present productivity or preparation for future disasters?', options:[{code:'present',title:'Prioritize present productivity'},{code:'future',title:'Prioritize preparation for future disasters'}]},
    {code:'scope', block:'foreignAid', prompt:'Thinking about the American economy as shown in this task, should the U.S. provide foreign aid to help people in other countries meet their basic needs?', options:[{code:'international',title:'Provide foreign aid',detail:'Provide foreign aid, even if this leaves fewer resources in the United States.'},{code:'domestic',title:'Do not provide foreign aid',detail:'Do not provide foreign aid, even if this means more people in other countries cannot meet their basic needs.'}]},
    {code:'empathy', block:'foreignAid', prompt:'When deciding whether to provide foreign aid, which should weigh more heavily?', options:[{code:'guide',title:'Concern for people in other countries.'},{code:'not_guide',title:'The resources people in the United States would have to give up.'}]},
    {code:'paid_leave', prompt:'If a worker is sick or exhausted and needs a few days to recover, should they be able to take paid time off?', options:[{code:'paid_recovery',title:'Yes, let the worker take paid time off to recover.'},{code:'no_paid_recovery',title:'No, the worker should not receive pay for days they do not work.'}]},
    {code:'strategy', prompt:'Thinking about the American economy as shown in this task, are people more likely to cooperate with one another or compete with one another?', options:[{code:'cooperate',title:'More likely to cooperate',detail:'People are more likely to work together.'},{code:'compete',title:'More likely to compete',detail:'People are more likely to compete with one another.'}]}
];

function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function partialAllocation(start, threshold) {
    const result = [...start];
    const donors = start.map((amount, index) => ({index, surplus: Math.max(0, amount - threshold)})).filter(x => x.surplus);
    const totalSurplus = donors.reduce((s, x) => s + x.surplus, 0);
    let available = totalSurplus;
    let required = 0;
    const recipients = start.map((amount, index) => ({amount,index,deficit:threshold - amount}))
        .filter(x => x.deficit > 0).sort((a,b) => b.amount - a.amount || a.index - b.index);
    for (const person of recipients) {
        if (person.deficit <= available) {
            result[person.index] = threshold;
            available -= person.deficit;
            required += person.deficit;
        }
    }
    if (!required) return result;
    const shares = donors.map(d => {
        const exact = required * d.surplus / totalSurplus;
        return {...d, contribution: Math.floor(exact), remainder: exact - Math.floor(exact)};
    }).sort((a,b) => b.remainder - a.remainder || b.surplus - a.surplus || a.index - b.index);
    let left = required - shares.reduce((s,x) => s + x.contribution,0);
    for (const d of shares) {
        if (left && d.contribution < d.surplus) { d.contribution++; left--; }
    }
    if (left) throw new Error('Partial allocation could not assign all contributions.');
    for (const d of shares) result[d.index] -= d.contribution;
    return result;
}

function gini(values) {
    const sum = values.reduce((a,b) => a+b,0);
    if (!sum) return 0;
    let differences = 0;
    for (const a of values) for (const b of values) differences += Math.abs(a-b);
    return differences / (2 * values.length * sum);
}

export default class TaskScene extends Phaser.Scene {
    constructor() { super('Start'); }

    create() {
        const setup = window.TASK_SETUP;
        if (!setup || !DESIGN[setup.kind] || !DESIGN[setup.kind].distributions[setup.condition]) {
            throw new Error('Missing or invalid local task setup.');
        }
        this.kind = setup.kind;
        this.condition = setup.condition;
        this.spec = DESIGN[this.kind];
        this.original = [...this.spec.distributions[this.condition]];
        this.total = this.original.reduce((a,b) => a+b,0);
        this.partial = partialAllocation(this.original,this.spec.threshold);
        this.equal = Array(3).fill(this.total / 3);
        if (!Number.isInteger(this.equal[0]) || Math.abs(gini(this.original) - 4/9) > 1e-10) {
            throw new Error('Invalid distribution or unequal Gini.');
        }
        this.portrait = this.scale.height > this.scale.width;
        this.w = this.portrait ? 720 : 1280;
        this.h = this.portrait ? 1280 : 720;
        this.cameras.main.setZoom(this.scale.gameSize.width / this.w);
        this.cameras.main.centerOn(this.w / 2, this.h / 2);
        if (this.kind === 'economy') this.input.dragDistanceThreshold = 6;
        this.params = new URLSearchParams(window.location.search);
        this.gameId = this.params.get('gameId') || (location.hostname === 'localhost' || location.protocol === 'file:' ? 'test_game_001' : '');
        this.qualtricsId = this.params.get('qualtricsId') || this.params.get('responseId') || this.params.get('ResponseID') || (location.hostname === 'localhost' || location.protocol === 'file:' ? 'test_response_001' : '');
        this.parentOrigin = this.params.get('parentOrigin') || null;
        this.saveEndpoint = this.params.get('saveUrl') || (this.kind === 'survival' ? 'https://script.google.com/macros/s/AKfycbzd6bRGpnjN0vrM1ZTUNd640ecyPM-wCAFYojwogNJbUJ-2qlbaqaUica4moWKokAF-/exec' : '');
        this.startPerformance = performance.now();
        this.objects = [];
        this.currentScreen = null;
        this.currentScreenStarted = null;
        this.pageHistory = [];
        this.questionOrders = {};
        this.taskOrder = ['free',...shuffle(['equal','partial']),'self'];
        this.assignedPosition = Math.floor(Math.random()*3);
        this.gameData = {
            gameId:this.gameId, qualtricsId:this.qualtricsId, condition:this.condition,
            gameVersion:`parallel_terciles_${this.kind}_${this.kind==='economy'?'v16':'v4'}`,
            gameStartTime:new Date().toISOString(), gameEndTime:null, totalDurationMs:null,
            initialAllocation:[...this.original], totalUnits:this.total,
            needPerPersonUnits:this.spec.threshold, dollarsPerUnit:this.kind === 'economy' ? 1000 : null,
            incomeRepresentation:this.kind==='economy'?'average annual income per person in each equally sized group':null,
            blockMovePracticeCompleted:this.kind==='economy'?false:null,
            blockMovePracticeMethod:null,
            simplifiedGini:gini(this.original), partialRedistributionFinal:null,
            equalDivisionFinal:[...this.equal], taskOrder:[...this.taskOrder],
            redistributionTaskOrder:this.taskOrder.slice(1,3),
            assignedPosition:this.assignedPosition + 1,
            assignedPositionLabel:this.spec.labels[this.assignedPosition],
            respondentDecile:null, incomeControlFallback:null, incomeRoutingReason:null,
            taskResponses:{}, redistributionChoices:{}, redistributionOptionOrders:{}, redistributionFeasibility:null,
            economicPrinciples:{}, economicPrincipleOptionOrders:{},
            answerChoiceOrders:{}, answerChoiceOrderHistory:{},
            actions:[], screenTimings:{}, saveStatus:null, closedResourcePool:true,
            needPerPersonDollars:this.kind==='economy'?12000:null,
            thresholdCheckChoice:null, thresholdCheckPassed:null,
            partialRedistributionMaximumPossible:this.count(this.partial),
            deviceInfo:{viewportWidth:window.innerWidth,viewportHeight:window.innerHeight,portrait:this.portrait,maxTouchPoints:navigator.maxTouchPoints||0},
            userAgent:navigator.userAgent, screenWidth:window.innerWidth,screenHeight:window.innerHeight,
            isMobile:this.portrait || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
        };
        if (!/^[A-Za-z0-9_-]{3,200}$/.test(this.gameId) || !/^[A-Za-z0-9_-]{3,200}$/.test(this.qualtricsId)) {
            this.info('This task could not begin','Please return to the survey and open the task link again.',null);
            return;
        }
        const requestedCondition = (this.params.get('condition') || '').toLowerCase();
        const aliases = {scarcity:'insufficiency',insufficient:'insufficiency',sufficient:'sufficiency',abundant:'abundance'};
        if (requestedCondition && (aliases[requestedCondition] || requestedCondition) !== this.condition) {
            this.info('This task could not begin','The task link does not match the assigned condition. Please return to the survey.',null);
            return;
        }
        this.showIntro(0);
    }

    clear(screen) {
        if (this.currentScreen) {
            this.gameData.screenTimings[this.currentScreen] = (this.gameData.screenTimings[this.currentScreen] || 0) + Math.max(0,performance.now()-this.currentScreenStarted);
        }
        this.currentScreen = screen;
        this.currentScreenStarted = performance.now();
        for (const obj of this.objects) obj.destroy();
        this.objects = [];
        this.cameras.main.setBackgroundColor('#f4f6f8');
    }
    keep(obj) { this.objects.push(obj); return obj; }
    text(x,y,value,size=30,width=this.w-80,align='center',color='#17202a') {
        return this.keep(this.add.text(x,y,value,{fontFamily:'Arial',fontSize:`${size}px`,color,align,wordWrap:{width},lineSpacing:7})
            .setResolution(2).setOrigin(.5));
    }
    button(x,y,width,height,label,callback,light=false,fontSizeOverride=null) {
        const bg = this.keep(this.add.rectangle(x,y,width,height,light?0xe8ecef:0x17202a).setStrokeStyle(2,0x263238));
        const touchHeight=this.portrait?Math.max(100,height):height;
        bg.setInteractive(new Phaser.Geom.Rectangle(0,(height-touchHeight)/2,width,touchHeight),
            Phaser.Geom.Rectangle.Contains,{useHandCursor:true});
        const fontSize=fontSizeOverride??this.buttonFontSize(label.length);
        const fg = this.text(x,y,label,fontSize,width-24,'center',light?'#17202a':'#ffffff');
        fg.setInteractive({useHandCursor:true});
        let fired=false;
        const activate=()=>{if(fired)return;fired=true;callback();};
        bg.on('pointerdown',activate); fg.on('pointerdown',activate);
        return {bg,fg};
    }
    buttonFontSize(labelLength) {
        return labelLength>115?(this.portrait?24:18):labelLength>70?(this.portrait?26:20):(this.portrait?27:23);
    }
    answerFontSize(labels,width,height) {
        const probe=this.add.text(-10000,-10000,'',{fontFamily:'Arial',wordWrap:{width:width-24},lineSpacing:7});
        const preferred=this.portrait?27:23;
        let size=preferred;
        for(;size>=14;size--){
            probe.setFontSize(size);
            if(labels.every(label=>{
                probe.setText(label);
                return probe.width<=width-24&&probe.height<=height-16;
            }))break;
        }
        probe.destroy();
        return Math.max(size,14);
    }
    panel() { this.keep(this.add.rectangle(this.w/2,this.h/2,this.w-32,this.h-32,0xffffff).setStrokeStyle(2,0x263238)); }
    rememberPage(screen,render) {
        const page={screen,render,stage:this.stage,taskIndex:this.taskIndex,
            currentAllocation:this.currentAllocation?.slice(),selectedSource:this.selectedSource,
            batch:this.batch,applied:this.applied,practiceAllocation:this.practiceAllocation?.slice()};
        if(this.pageHistory.at(-1)?.screen===screen)this.pageHistory[this.pageHistory.length-1]=page;
        else this.pageHistory.push(page);
    }
    showBackButton() {
        if(this.currentScreen==='intro_1')return;
        const x=this.portrait?125:105,y=this.portrait?66:52;
        const width=this.portrait?190:140,height=this.portrait?70:48;
        if(this.pageHistory.length<2){
            this.keep(this.add.rectangle(x,y,width,height,0xe8ecef).setStrokeStyle(2,0x9aa5ac));
            this.text(x,y,'Back',this.portrait?27:23,width-24,'center','#697780');
            return;
        }
        this.button(x,y,width,height,'Back',()=>{
            this.record('back',{from:this.currentScreen});
            this.pageHistory.pop();
            const previous=this.pageHistory.pop();
            this.stage=previous.stage;
            this.taskIndex=previous.taskIndex;
            this.currentAllocation=previous.currentAllocation?.slice();
            this.selectedSource=previous.selectedSource;
            this.batch=previous.batch;
            this.applied=previous.applied;
            this.practiceAllocation=previous.practiceAllocation?.slice();
            previous.render();
        },true);
    }
    info(title,body,next,screen='information',emphasis=null) {
        if(['save','complete','save_error'].includes(screen))this.pageHistory=[];
        this.rememberPage(screen,()=>this.info(title,body,next,screen,emphasis));
        this.clear(screen); this.panel();
        this.text(this.w/2,this.portrait?155:135,title,this.portrait?41:37);
        if(emphasis){
            this.text(this.w/2,this.h/2-(this.portrait?85:50),body,this.portrait?33:29,this.w-100);
            this.text(this.w/2,this.h/2+(this.portrait?80:56),emphasis,this.portrait?33:29,this.w-100).setFontStyle('bold');
        } else {
            this.text(this.w/2,this.h/2,body,this.portrait?33:29,this.w-100);
        }
        if(next) this.button(this.w/2,this.h-(this.portrait?100:65),this.portrait?400:260,this.portrait?92:62,this.kind==='economy'&&['complete','save_error'].includes(screen)?'Close task':'Next',next);
        this.showBackButton();
    }
    incomeBlockIntro(next,screen) {
        this.rememberPage(screen,()=>this.incomeBlockIntro(next,screen));
        this.clear(screen); this.panel();
        this.text(this.w/2,this.portrait?155:120,'Income blocks',this.portrait?41:37);
        this.text(this.w/2,this.portrait?345:250,
            'Each green block represents $1,000. The total number of blocks for all three income groups is fixed.',
            this.portrait?33:29,this.w-100);
        const blockY=this.portrait?585:445;
        this.keep(this.add.rectangle(this.w/2,blockY,this.portrait?135:120,this.portrait?48:42,0x86c995).setStrokeStyle(2,0x1f6f43));
        this.text(this.w/2,blockY+(this.portrait?68:66),'$1,000',this.portrait?28:24);
        this.button(this.w/2,this.h-(this.portrait?100:65),this.portrait?400:260,this.portrait?92:62,'Next',next);
        this.showBackButton();
    }
    showEconomyGroupSizes() {
        this.rememberPage('intro_group_sizes',()=>this.showEconomyGroupSizes());
        this.clear('intro_group_sizes'); this.panel();
        this.text(this.w/2,this.portrait?145:115,'How many people are in each group?',this.portrait?39:36);
        this.text(this.w/2,this.portrait?275:215,'Each group represents one-third of U.S. adults.',this.portrait?31:27,this.w-100);
        // Census Vintage 2025 estimates about 270 million U.S. residents age 18 or older.
        const labels=['Lower income','Middle income','Higher income'];
        const positions=this.portrait
            ? labels.map((_,i)=>({x:this.w/2,y:435+i*225,w:560,h:175}))
            : labels.map((_,i)=>({x:230+i*410,y:410,w:345,h:225}));
        positions.forEach(({x,y,w,h},i)=>{
            this.keep(this.add.rectangle(x,y,w,h,0xf4f8f5).setStrokeStyle(2,0x263238));
            this.text(x,y-(this.portrait?33:48),labels[i],this.portrait?30:29,w-28);
            this.text(x,y+(this.portrait?35:42),'About 90 million adults',this.portrait?29:27,w-28);
        });
        this.button(this.w/2,this.h-(this.portrait?100:65),this.portrait?400:260,this.portrait?92:62,'Next',()=>this.showEconomyGroupAverages());
        this.showBackButton();
    }
    showEconomyGroupAverages() {
        this.info('What the income amounts mean',
            'People in the same income group do not all have the same income. The amount you will see next to each group is its average annual income per person.',
            ()=>this.showIntro(2),'intro_group_averages');
    }
    format(value) { return this.kind === 'survival' ? `${value} pieces` : `$${(value*1000).toLocaleString()}`; }
    incomeNeedStatus(amount) {
        const shortfall=this.spec.threshold-amount;
        return shortfall>0?`Below basic needs by ${this.format(shortfall)}`:
            shortfall===0?'At the basic-needs line':'Above the basic-needs line';
    }
    count(values) { return values.filter(v=>v>=this.spec.threshold).length; }
    stageName(stage) {
        return (this.kind==='survival'
            ? {free:'Arrange the resources',equal:'Divide equally',partial:'Help as many as possible',self:'Your place in the group'}
            : {free:'Arrange income',equal:'Equalize income',partial:'Redistribute income',self:'Consider your income'})[stage];
    }
    shuffleOptions(options) {
        const isTie=option=>typeof option==='string'&&option.startsWith('Both are equally good');
        return [...shuffle(options.filter(option=>!isTie(option))),...options.filter(isTie)];
    }
    record(action,detail={}) { this.gameData.actions.push({action,...detail,screen:this.currentScreen,elapsedMs:Math.round(performance.now()-this.startPerformance)}); }

    restoreOriginalDistribution() {
        this.currentAllocation=[...this.original];
        this.applied=false;
        this.selectedSource=null;
        this.record('restore_original',{task:this.stage});
        this.board();
    }

    showIntro(index) {
        const s=this.spec;
        const introductions = this.kind === 'survival' ? [
            'Three people have been hunting and gathering food in an otherwise uninhabited location. Today they collected different amounts.',
            `Each person needs ${s.threshold} pieces of food to survive. Food above that amount can be saved for the next day.`,
            `Food is usually ${this.condition==='insufficiency'?'scarce':this.condition==='sufficiency'?'sufficient':'abundant'} in this location.`,
            `The food shown totals ${this.total} pieces. Person C collected ${this.original[0]}, Person B collected ${this.original[1]}, and Person A collected ${this.original[2]}. Each red circle is one piece. The total cannot change.`,
            'For the first three tasks, you make decisions from outside the group. Later, you will be randomly assigned a place in it.'
        ] : [
            'In this task, you will make decisions about how income is distributed in America.',
            'You will see three U.S. income groups: lower, middle, and higher income. Each will represent one-third of U.S. adults.',
            'Income is shown after people have paid taxes and received government benefits. Existing assistance programs cover some, but not all, basic needs.',
            'One person needs at least $12,000 per year ($1,000 per month) in income to meet basic needs.',
            'At or above $12,000, a person will have adequate food, shelter, and medical care. More income can still improve their life.',
            'Below $12,000, a person cannot meet all basic needs. They will go hungry, lack housing, or miss needed care—even lifesaving medicine. When basic needs go unmet, the risk of death rises.',
            'Each green block represents $1,000. The total number of blocks for all three income groups is fixed.'
        ];
        if(index>=introductions.length) {
            if(this.kind==='economy') this.showEconomyPractice();
            else this.beginTask(0);
            return;
        }
        if(this.kind==='economy'&&index===6) {
            this.incomeBlockIntro(()=>this.showIntro(index+1),`intro_${index+1}`);
            return;
        }
        const title=this.kind==='economy'&&index===0?'Welcome to the American Economy Task':this.spec.name;
        const next=this.kind==='economy'&&index===1
            ? ()=>this.showEconomyGroupSizes()
            : this.kind==='economy'&&index===5
                ? ()=>this.showEconomyThresholdCheck()
                : ()=>this.showIntro(index+1);
        this.info(title,introductions[index],next,`intro_${index+1}`);
    }

    showEconomyThresholdCheck() {
        this.question('Basic-needs line',
            'According to this task, what annual income does one person need to meet basic needs?',
            ['$10,000','$12,000','$14,000'],choice=>{
                if(this.gameData.thresholdCheckChoice===null){
                    this.gameData.thresholdCheckChoice=choice;
                    this.gameData.thresholdCheckPassed=choice==='$12,000';
                }
                this.info('Basic-needs line',
                    choice==='$12,000'?'Correct. The basic-needs line is $12,000 per year.':'The basic-needs line is $12,000 per year.',
                    ()=>this.showIntro(6),'threshold_check_feedback');
            },'threshold_check');
    }

    showEconomyPractice() {
        this.rememberPage('block_move_practice',()=>this.showEconomyPractice());
        if(!this.practiceAllocation) this.practiceAllocation=[3,2];
        this.clear('block_move_practice'); this.panel();
        this.text(this.w/2,this.portrait?120:75,'Practice moving an income block',this.portrait?35:33);
        this.text(this.w/2,this.portrait?245:155,
            'Drag the outlined block from the box on the left to the box on the right.',
            this.portrait?27:23,this.w-100);
        const boxes=this.portrait
            ? [{x:this.w/2,y:430,w:this.w-130,h:205},{x:this.w/2,y:710,w:this.w-130,h:205}]
            : [{x:400,y:390,w:300,h:310},{x:880,y:390,w:300,h:310}];
        boxes.forEach((box,index)=>{
            const card=this.keep(this.add.rectangle(box.x,box.y,box.w,box.h,0xffffff)
                .setStrokeStyle(index===0&&this.practiceSourceSelected?4:2,index===0&&this.practiceSourceSelected?0xf2994a:0x263238));
            if(index===0&&!this.practiceCompleted){
                card.setInteractive({useHandCursor:true});
                card.on('pointerdown',()=>{
                    this.practiceSourceSelected=true;
                    this.showEconomyPractice();
                });
            }
            if(index===1&&!this.practiceCompleted){
                card.setInteractive({useHandCursor:true});
                card.on('pointerdown',()=>{
                    if(this.practiceSourceSelected) this.completeEconomyPractice('tap');
                });
            }
            this.text(box.x,box.y-box.h/2+35,index===0?'Move from here':'Move to here',this.portrait?26:23,box.w-25);
            const amount=this.practiceAllocation[index];
            const bottom=box.y+box.h/2-32;
            for(let n=0;n<amount;n++){
                const block=this.keep(this.add.rectangle(box.x,bottom-n*20,this.portrait?140:120,13,0x86c995)
                    .setStrokeStyle(index===0&&n===amount-1&&!this.practiceCompleted?3:1,index===0&&n===amount-1&&!this.practiceCompleted?0x17202a:0x1f6f43));
                if(index===0&&n===amount-1&&!this.practiceCompleted){
                    block.setInteractive({useHandCursor:true});
                    this.input.setDraggable(block);
                    block.on('pointerup',()=>{
                        if(!block.getData('wasDragged')){
                            this.practiceSourceSelected=true;
                            this.showEconomyPractice();
                        }
                    });
                    block.on('dragstart',()=>{block.setData('wasDragged',true);block.setDepth(500);});
                    block.on('drag',(pointer,dragX,dragY)=>block.setPosition(dragX,dragY));
                    block.on('dragend',pointer=>{
                        const target=boxes[1];
                        const inside=Math.abs(pointer.worldX-target.x)<=target.w/2&&Math.abs(pointer.worldY-target.y)<=target.h/2;
                        if(inside) this.completeEconomyPractice('drag');
                        else this.showEconomyPractice();
                    });
                }
            }
        });
        this.text(this.w/2,this.portrait?945:585,
            this.practiceCompleted?'Good—you moved one block between income groups.':'Drag the outlined block into the box on the right.',
            this.portrait?26:21,this.w-100);
        if(this.practiceCompleted) this.button(this.w/2,this.h-(this.portrait?100:65),this.portrait?400:260,this.portrait?92:62,
            'Next',()=>this.showEconomyBatchNote());
        this.showBackButton();
    }

    completeEconomyPractice(method) {
        if(this.practiceCompleted) return;
        this.practiceCompleted=true;
        this.practiceAllocation=[2,3];
        this.gameData.blockMovePracticeCompleted=true;
        this.gameData.blockMovePracticeMethod=method;
        this.record('block_move_practice',{method});
        this.showEconomyPractice();
    }

    showEconomyBatchNote() {
        this.rememberPage('blocks_per_move_instruction',()=>this.showEconomyBatchNote());
        this.clear('blocks_per_move_instruction'); this.panel();
        this.text(this.w/2,this.portrait?145:95,'Blocks per move',this.portrait?39:35);
        this.text(this.w/2,this.portrait?320:205,
            'In the task, choose 1, 5, or 10 under “Blocks per move.” Then drag a block from one income group into another. That many blocks will move together.',
            this.portrait?30:26,this.w-100);
        const values=[1,5,10];
        values.forEach((value,index)=>{
            const x=this.w/2+(index-1)*(this.portrait?175:285);
            const y=this.portrait?650:440;
            this.keep(this.add.rectangle(x,y,this.portrait?140:125,this.portrait?66:55,index===0?0x17202a:0xe8ecef)
                .setStrokeStyle(2,0x263238));
            this.text(x,y,String(value),this.portrait?27:23,80,'center',index===0?'#ffffff':'#17202a');
            for(let n=0;n<value;n++) this.keep(this.add.rectangle(x,y+(this.portrait?80:65)+n*8,this.portrait?88:80,5,0x86c995)
                .setStrokeStyle(1,0x1f6f43));
        });
        this.button(this.w/2,this.h-(this.portrait?100:65),this.portrait?400:260,this.portrait?92:62,'Next',()=>this.beginTask(0));
        this.showBackButton();
    }

    beginTask(index) {
        if(index>=this.taskOrder.length) {
            if(this.kind==='economy')this.showManipulationCheck();
            else this.showPolicyQuestion();
            return;
        }
        this.taskIndex=index;
        this.stage=this.taskOrder[index];
        this.currentAllocation=[...this.original];
        this.selectedSource=null;
        this.batch=1;
        this.applied=false;
        const role=this.kind==='survival'
            ? (this.stage==='self' ? ` You are ${this.spec.labels[this.assignedPosition]} (${['lower','middle','higher'][this.assignedPosition]} position).` : ' You are outside the group.')
            : (this.stage==='self' ? ` Imagine you are in the ${this.spec.labels[this.assignedPosition].toLowerCase()} group.` : '');
        const instructions=this.kind==='survival' ? {
            free:'Arrange the resources as you think best for the group.',
            equal:'Start with the original amounts and see what equal division produces.',
            partial:'Start with the original amounts. Use only resources above the threshold to help the greatest possible number fully reach it.',
            self:'Start with the original amounts again and arrange them as you think best. Your assigned position is hypothetical, not based on your real income.'
        } : {
            free:'Arrange the three groups’ average income as you think best for the country.',
            equal:'Go back to the original income distribution. See what happens when income is divided equally among the three groups.',
            partial:'Go back to the original income distribution. See what happens when only income above $12,000 is redistributed to help as many people as possible reach $12,000 per year.',
            self:'Start with the original group averages again and arrange them as you think best.'
        };
        const emphasizeRole=this.stage==='self';
        this.info(this.stageName(this.stage),instructions[this.stage]+(emphasizeRole?'':role),()=>this.board(),`task_${index+1}_introduction`,emphasizeRole?role.trim():null);
    }

    board() {
        if(this.kind==='economy') {this.economyBoard();return;}
        this.clear(`task_${this.taskIndex+1}_${this.stage}_board`);
        this.text(this.w/2,this.portrait?65:34,this.stageName(this.stage),this.portrait?36:29);
        this.text(this.w/2,this.portrait?115:78,`${this.total} ${this.kind==='survival'?'pieces':'blocks'} total • ${this.spec.line}`,this.portrait?25:19);
        const boxes=this.portrait
            ? [0,1,2].map(i=>({x:this.w/2,y:260+i*255,w:this.w-100,h:230}))
            : [0,1,2].map(i=>({x:245+i*395,y:345,w:350,h:450}));
        const max=Math.max(...this.original,...this.currentAllocation,this.spec.threshold);
        boxes.forEach((box,index)=>{
            const highlighted=this.stage==='self' && index===this.assignedPosition;
            const chosen=this.selectedSource===index;
            const card=this.keep(this.add.rectangle(box.x,box.y,box.w,box.h,highlighted?0xfff4df:0xffffff).setStrokeStyle(chosen?5:2,chosen?0xf2994a:0x263238).setInteractive({useHandCursor:true}));
            card.on('pointerdown',()=>this.tapCard(index));
            const name=this.spec.labels[index]+(highlighted?' — YOU':'');
            const labelY=this.portrait?box.y-box.h/2+32:box.y-box.h/2+38;
            this.text(box.x,labelY,name,this.portrait?28:24,box.w-22);
            this.text(box.x,labelY+43,this.format(this.currentAllocation[index])+(this.kind==='economy'?' average':''),this.kind==='survival'?(this.portrait?32:28):(this.portrait?27:24),box.w-22);
            const base=box.y+box.h/2-22;
            const availableHeight=this.portrait?105:245;
            const columns=this.spec.threshold;
            const rows=Math.ceil(max/columns);
            const blockHeight=Math.min(availableHeight/rows,this.portrait?22:25);
            const blockWidth=(this.portrait?252:216)/columns;
            const left=box.x-blockWidth*columns/2;
            for(let slot=0;slot<columns;slot++) {
                const xx=left+(slot+.5)*blockWidth;
                const yy=base-blockHeight/2;
                this.keep(this.add.rectangle(xx,yy,blockWidth-2,blockHeight-2,0xf4f6f8).setStrokeStyle(1,0xd8dee2));
            }
            for(let piece=0;piece<this.currentAllocation[index];piece++) {
                const row=Math.floor(piece/columns);
                const column=piece%columns;
                const xx=left+(column+.5)*blockWidth;
                const yy=base-(row+.5)*blockHeight;
                if(this.kind==='survival') this.keep(this.add.circle(xx,yy,Math.max(3,Math.min(blockWidth,blockHeight)/2-2),0xe57358).setStrokeStyle(1,0x9f3f2f));
                else this.keep(this.add.rectangle(xx,yy,blockWidth-2,blockHeight-2,0x86c995).setStrokeStyle(1,0x1f6f43));
            }
            const thresholdY=base-blockHeight-3;
            this.keep(this.add.rectangle(box.x,thresholdY,box.w-16,3,0x8e44ad));
            this.text(box.x+box.w/2-14,thresholdY-18,this.kind==='survival'?'8':'$12k',this.portrait?19:16,75,'right','#8e44ad').setOrigin(1,.5);
        });
        const countY=this.portrait?940:600;
        const countLabel=this.kind==='survival'
            ? `${this.count(this.currentAllocation)} of 3 survive`
            : `${this.count(this.currentAllocation)} of 3 group averages reach $12,000`;
        this.text(this.w/2,countY,countLabel,this.kind==='survival'?(this.portrait?29:23):(this.portrait?27:23),this.w-90);
        if(this.stage==='free'||this.stage==='self') {
            const hint=this.kind==='survival'
                ? (this.selectedSource===null?'Tap a person to choose where to take from. Then tap another person.':'Now tap the person who should receive the blocks.')
                : 'Drag a block from one income group into another.';
            this.text(this.w/2,this.portrait?995:633,hint,this.portrait?24:17,this.w-90);
            const values=this.kind==='survival'?[1,2,5]:[1,5,10];
            const by=this.portrait?1100:668;
            values.forEach((n,j)=>this.button(this.w/2+(j-1)*(this.portrait?155:125),by,this.portrait?140:110,this.portrait?70:40,`${n}`,()=>{this.batch=n;this.board();},this.batch!==n));
            this.button(this.portrait?190:280,this.portrait?1200:677,this.portrait?290:230,this.portrait?80:48,'Reset',()=>{this.currentAllocation=[...this.original];this.selectedSource=null;this.board();},true);
            this.button(this.portrait?530:1000,this.portrait?1200:677,this.portrait?290:230,this.portrait?80:48,'Submit',()=>this.finishBoard());
        } else {
            this.text(this.w/2,this.portrait?995:635,this.applied?'This is the result.':'The original amounts are shown.',this.portrait?25:19);
            if(this.applied) this.button(this.portrait?190:280,this.portrait?1110:677,this.portrait?290:230,this.portrait?88:52,'Reset',()=>this.restoreOriginalDistribution(),true);
            this.button(this.applied?(this.portrait?530:1000):this.w/2,this.portrait?1110:677,this.applied?(this.portrait?290:230):(this.portrait?470:330),this.portrait?88:52,this.applied?'Continue':(this.stage==='equal'?'Divide equally':'Redistribute'),()=>{
                if(!this.applied){this.currentAllocation=[...(this.stage==='equal'?this.equal:this.partial)];this.applied=true;this.board();}
                else this.finishBoard();
            });
        }
    }
    economyBoard() {
        this.clear(`task_${this.taskIndex+1}_${this.stage}_board`);
        this.text(this.w/2,this.portrait?65:34,this.stageName(this.stage),this.portrait?36:29);
        this.text(this.w/2,this.portrait?115:78,`${this.total} blocks total • $12,000 basic-needs line`,this.portrait?25:19);
        const boxes=this.portrait
            ? [0,1,2].map(i=>({x:this.w/2,y:260+i*255,w:this.w-100,h:230}))
            : [0,1,2].map(i=>({x:245+i*395,y:345,w:350,h:450}));
        const max=Math.max(...this.original,...this.currentAllocation,12);
        const bottomInset=this.portrait?(this.condition==='actual'?5:18):(this.condition==='actual'?3:22);
        const extraStackHeight=this.condition==='actual'?(this.portrait?5:20):0;
        const availableHeight=(this.portrait?105:285)+(this.portrait?18:22)-bottomInset+extraStackHeight;
        const step=Math.min(this.portrait?12:15,availableHeight/max);
        const gap=Math.min(2,Math.max(.18,step*.16));
        const blockHeight=Math.max(.55,step-gap);
        const blockWidth=this.portrait?240:185;
        const movable=this.stage==='free'||this.stage==='self';
        this.boardBoxes=boxes;
        boxes.forEach((box,index)=>{
            const amount=this.currentAllocation[index];
            const highlighted=this.stage==='self'&&index===this.assignedPosition;
            const selected=this.selectedSource===index;
            const fill=highlighted?0xfff4df:amount>=12?0xf5faf6:0xffffff;
            const belowNeed=this.condition==='actual'&&amount<this.spec.threshold;
            const card=this.keep(this.add.rectangle(box.x,box.y,box.w,box.h,fill)
                .setStrokeStyle(selected?5:belowNeed?3:2,selected?0xf2994a:belowNeed?0x8e44ad:0x263238));
            if(movable){card.setInteractive({useHandCursor:true});card.on('pointerdown',()=>this.tapCard(index));}
            const top=box.y-box.h/2;
            const labelShift=this.condition==='actual'?10:0;
            this.text(box.x,top+(this.portrait?32:38)-labelShift,this.spec.labels[index]+(highlighted?' — YOU':''),this.portrait?28:24,box.w-20);
            const incomeLabel=this.text(box.x,top+(this.portrait?(this.condition==='actual'?68:75):82)-labelShift,`${this.format(amount)} average`,this.portrait?27:24,box.w-20);
            const blockCountLabel=this.condition==='actual'
                ? this.text(box.x,top+(this.portrait?97:112)-labelShift,this.incomeNeedStatus(amount),this.portrait?23:17,box.w-20,'center',belowNeed?'#8e44ad':'#1f6f43')
                : this.portrait?null:this.text(box.x,top+112,`${amount} blocks`,17,box.w-20,'center','#66747e');
            const bottom=box.y+box.h/2-bottomInset;
            const stackBlocks=[];
            for(let n=0;n<amount;n++){
                const y=bottom-n*step;
                stackBlocks.push(this.keep(this.add.rectangle(box.x,y,blockWidth,blockHeight,0x86c995)
                    .setStrokeStyle(step>3?1:.45,0x1f6f43)));
            }
            if(movable&&amount>0){
                const zoneHeight=Math.max(this.portrait?88:48,(amount-1)*step+blockHeight+16);
                const zoneY=Math.min(bottom-(amount-1)*step/2,bottom-zoneHeight/2+8);
                const zone=this.keep(this.add.rectangle(box.x,zoneY,blockWidth+24,zoneHeight,0xffffff,.001)
                    .setInteractive({useHandCursor:true}));
                this.input.setDraggable(zone);
                zone.on('pointerup',()=>{if(!zone.getData('wasDragged'))this.tapCard(index);});
                zone.on('dragstart',pointer=>{
                    zone.setData('wasDragged',true);
                    const units=Math.min(this.batch,amount);
                    for(let n=amount-units;n<amount;n++) stackBlocks[n].setVisible(false);
                    incomeLabel.setText(`${this.format(amount-units)} average`);
                    if(blockCountLabel){
                        blockCountLabel.setText(this.condition==='actual'?this.incomeNeedStatus(amount-units):`${amount-units} blocks`);
                        if(this.condition==='actual')blockCountLabel.setColor(amount-units<this.spec.threshold?'#8e44ad':'#1f6f43');
                    }
                    if(this.condition==='actual'&&!selected)card.setStrokeStyle(amount-units<this.spec.threshold?3:2,amount-units<this.spec.threshold?0x8e44ad:0x263238);
                    if(!highlighted) card.setFillStyle(amount-units>=12?0xf5faf6:0xffffff);
                    const ghost=this.keep(this.add.container(pointer.worldX,pointer.worldY).setDepth(500));
                    for(let n=0;n<units;n++) ghost.add(this.add.rectangle(0,-n*step,blockWidth,blockHeight,0x86c995)
                        .setStrokeStyle(step>3?1:.45,0x1f6f43));
                    this.dragGhost=ghost;
                });
                zone.on('drag',pointer=>{if(this.dragGhost)this.dragGhost.setPosition(pointer.worldX,pointer.worldY-10);});
                zone.on('dragend',pointer=>{
                    const destination=boxes.findIndex(target=>Math.abs(pointer.worldX-target.x)<=target.w/2&&Math.abs(pointer.worldY-target.y)<=target.h/2);
                    this.dragGhost=null;
                    if(destination>=0&&destination!==index)this.moveAllocation(index,destination,'drag');
                    else this.economyBoard();
                });
            }
            if(this.portrait){
                const thresholdY=bottom-11.5*step;
                this.keep(this.add.rectangle(box.x,thresholdY,box.w-18,3,0x8e44ad).setDepth(60));
                this.text(box.x-box.w/2+12,thresholdY-16,'$12,000',18,95,'left','#8e44ad').setOrigin(0,.5).setDepth(61);
            }
        });
        if(!this.portrait){
            const thresholdY=boxes[0].y+boxes[0].h/2-bottomInset-11.5*step;
            this.keep(this.add.rectangle(this.w/2,thresholdY,this.w-40,3,0x8e44ad).setDepth(60));
            this.text(28,thresholdY-17,'$12,000',17,100,'left','#8e44ad').setOrigin(0,.5).setDepth(61);
        }
        this.text(this.w/2,this.portrait?935:590,`${this.count(this.currentAllocation)} of 3 group averages reach $12,000`,this.portrait?27:23,this.w-90);
        if(movable){
            const hint='Drag a block from one income group into another.';
            this.text(this.w/2,this.portrait?985:620,hint,this.portrait?23:17,this.w-90);
            this.text(this.w/2,this.portrait?1040:646,'Blocks per move',this.portrait?21:16);
            [1,5,10].forEach((n,j)=>this.button(this.w/2+(j-1)*(this.portrait?155:125),this.portrait?1100:678,
                this.portrait?140:110,this.portrait?90:40,String(n),()=>{this.batch=n;this.economyBoard();},this.batch!==n));
            this.button(this.portrait?190:280,this.portrait?1200:677,this.portrait?290:230,this.portrait?80:48,
                'Reset',()=>{this.currentAllocation=[...this.original];this.selectedSource=null;this.economyBoard();},true);
            this.button(this.portrait?530:1000,this.portrait?1200:677,this.portrait?290:230,this.portrait?80:48,
                'Submit',()=>this.finishBoard());
        } else {
            this.text(this.w/2,this.portrait?995:635,this.applied?'This is the result.':'The original group averages are shown.',this.portrait?25:19);
            if(this.applied) this.button(this.portrait?190:280,this.portrait?1110:677,this.portrait?290:230,this.portrait?88:52,'Reset',()=>this.restoreOriginalDistribution(),true);
            this.button(this.applied?(this.portrait?530:1000):this.w/2,this.portrait?1110:677,this.applied?(this.portrait?290:230):(this.portrait?470:330),this.portrait?88:52,
                this.applied?'Continue':(this.stage==='equal'?'Divide equally':'Redistribute'),()=>{
                    if(!this.applied){this.currentAllocation=[...(this.stage==='equal'?this.equal:this.partial)];this.applied=true;this.economyBoard();}
                    else this.finishBoard();
                });
        }
    }
    moveAllocation(source,destination,method='tap') {
        const amount=Math.min(this.batch,this.currentAllocation[source]);
        if(amount>0){
            this.currentAllocation[source]-=amount;
            this.currentAllocation[destination]+=amount;
            this.record('transfer',{task:this.stage,from:source,to:destination,units:amount,method});
        }
        this.selectedSource=null;
        this.board();
    }
    tapCard(index) {
        if(this.stage!=='free'&&this.stage!=='self') return;
        if(this.selectedSource===null){this.selectedSource=index;this.board();return;}
        if(index===this.selectedSource){this.selectedSource=null;this.board();return;}
        this.moveAllocation(this.selectedSource,index);
    }
    finishBoard() {
        if((this.stage==='equal'||this.stage==='partial')&&!this.applied)return;
        const allocation=[...this.currentAllocation];
        if(allocation.some(x=>!Number.isInteger(x)||x<0)||allocation.reduce((a,b)=>a+b,0)!==this.total)throw new Error('Invalid submitted allocation.');
        const item={stage:this.stage,initial:[...this.original],final:allocation,peopleMeetingNeed:this.count(allocation),gini:gini(allocation),totalMoved:allocation.reduce((s,v,i)=>s+Math.abs(v-this.original[i]),0)/2,answers:{}};
        if(this.kind==='economy')item.groupAveragesAtOrAboveNeed=item.peopleMeetingNeed;
        this.gameData.taskResponses[this.stage]=item;
        if(this.stage==='free'){
            this.gameData.freeAllocationFinal=this.kind==='survival'?this.survivalLegacyAllocation(allocation):allocation;
            this.gameData.freeAllocationPeopleMeetingNeed=item.peopleMeetingNeed;
            this.gameData.freeAllocationSurvivors=item.peopleMeetingNeed;
            this.gameData.freeAllocationGini=item.gini;
            this.gameData.freeAllocationTotalMoved=item.totalMoved;
            this.gameData.freeAllocationClassification=allocation.every(x=>x===allocation[0])?'equal':allocation.every((x,i)=>x===this.original[i])?'retention':'other';
        } else if(this.stage==='equal'){
            this.gameData.equalDivisionFinal=this.kind==='survival'?this.survivalLegacyAllocation(allocation):allocation;
            this.gameData.equalDivisionPeopleMeetingNeed=item.peopleMeetingNeed;
        } else if(this.stage==='partial'){
            this.gameData.partialRedistributionFinal=this.kind==='survival'?this.survivalLegacyAllocation(allocation):allocation;
            this.gameData.partialRedistributionPeopleMeetingNeed=item.peopleMeetingNeed;
            this.gameData.partialRedistributionTotalMoved=item.totalMoved;
            this.gameData.partialRedistributionReachedMaximum=item.peopleMeetingNeed===this.count(this.partial);
        } else {
            this.gameData.selfInterestAllocationFinal=allocation;
            this.gameData.selfInterestOwnStartingBlocks=this.original[this.assignedPosition];
            this.gameData.selfInterestOwnFinalBlocks=allocation[this.assignedPosition];
            this.gameData.selfInterestOwnChange=allocation[this.assignedPosition]-this.original[this.assignedPosition];
        }
        this.record('submit_task',{stage:this.stage,allocation});
        if((this.kind==='economy'&&this.stage==='free')||this.stage==='self')this.beginTask(this.taskIndex+1);
        else this.askTaskFollowup(0);
    }
    survivalLegacyAllocation(values) {return {personA:values[2],personB:values[1],personC:values[0]};}

    askTaskFollowup(step) {
        const stage=this.stage;
        const original=this.kind==='survival'?'Each person keeps the food collected':'Keep the original income distribution';
        const applied=stage==='equal'
            ? (this.kind==='survival'?'Divide the food equally':'Divide income equally')
            : stage==='partial'
                ? (this.kind==='survival'?'Help as many people survive as possible':'Raise as many group averages to $12,000 as possible')
                : 'Use the arrangement you made';
        const binaryPrompt=stage==='equal'
            ? (this.kind==='survival'
                ? 'If these were the only two options, should the group divide the food equally or let each person keep what they collected?'
                : 'If these were the only two options, should the government divide the income shown equally across the population or leave the original distribution unchanged?')
            : stage==='partial'
                ? (this.kind==='survival'
                    ? 'If these were the only two options, should the group use food above the survival line to help as many people survive as possible, or let each person keep what they collected?'
                    : 'If these were the only two options, should the government use income above the basic-needs line to raise as many group averages as possible to $12,000, or leave the original distribution unchanged?')
                : 'Which arrangement would you choose?';
        const frames=[
            ...(this.kind==='survival'?[{key:'feasibility',prompt:'If the group redistributed the food it collected, do you think there would be enough for everyone?',options:['Yes','No']}]:[]),
            {key:'groupOutcome',prompt:this.kind==='survival'?(stage==='equal'||stage==='partial'?'Which arrangement do you think is better for the group as a whole?':'Which arrangement do you think is best for the group as a whole?'):'Which arrangement do you think is better for the country as a whole?',options:this.kind==='economy'&&stage!=='self'?[applied,original]:[applied,original,this.kind==='survival'?'Both are equally good for the group':'Both are equally good for the country']},
            {key:'personalPreference',prompt:binaryPrompt,options:[applied,original]}
        ];
        if(step>=frames.length){
            if(this.kind==='economy'&&this.taskIndex===2)this.showEconomyFeasibility();
            else this.beginTask(this.taskIndex+1);
            return;
        }
        const q=frames[step];
        this.question(this.stageName(this.stage),q.prompt,q.options,(choice)=>{
            this.gameData.taskResponses[stage].answers[q.key]=choice;
            if(stage==='equal'&&q.key==='personalPreference')this.gameData.redistributionChoices.equal_redistribution=choice===applied?'equal':'keep';
            if(stage==='partial'&&q.key==='personalPreference')this.gameData.redistributionChoices.partial_redistribution=choice===applied?'partial':'keep';
            if(this.kind==='survival'&&stage==='equal'&&q.key==='personalPreference')this.gameData.groupDistributionPreference=choice;
            if(this.kind==='survival'&&stage==='partial'&&q.key==='personalPreference')this.gameData.partialRedistributionPreference=choice;
            if(q.key==='feasibility'){
                this.gameData.redistributionChoices[`feasibility_${stage}`]=choice;
                if(stage==='free')this.gameData.redistributionFeasibility=choice;
            }
            this.askTaskFollowup(step+1);
        },`task_${this.taskIndex+1}_${q.key}`);
    }
    showEconomyFeasibility() {
        const yes='Yes, there is enough income for everyone to meet their basic needs.';
        const no='No, there is not enough income for everyone to meet their basic needs.';
        this.question('','In the economy shown in this task, do you think there is enough income for everyone to meet their basic needs?',[yes,no],choice=>{
            const answer=choice===yes?'Yes':'No';
            this.gameData.redistributionFeasibility=answer;
            this.gameData.redistributionChoices.feasibility=answer;
            this.showPolicyQuestion();
        },'redistribution_feasibility');
    }
    showPolicyQuestion() {
        if(this.kind==='survival') {
            const choices=['The group should guarantee that everyone has enough food to survive.','The group should not guarantee that everyone has enough food to survive.'];
            this.question('About the group','Should the group guarantee that everyone has enough food to survive, or not?',choices,choice=>{
                this.gameData.socialContractGuarantee=choice;
                this.startPrinciples();
            },'social_contract_guarantee');
        } else {
            const choices=[{code:'support_guarantee',title:'Create a policy',detail:'The government should create a policy that guarantees that each person will have enough income to meet their basic needs.'},{code:'oppose_guarantee',title:'Do not create a policy',detail:'The government should not create a policy that guarantees that each person will have enough income to meet their basic needs.'}];
            this.question('','Thinking about the American economy as shown in this task, SHOULD the government create a policy that guarantees each person enough income to meet their basic needs, or not?',choices,choice=>{
                this.gameData.redistributionChoices.redistributive_guarantee=choice.code;
                this.startPrinciples();
            },'redistributive_guarantee');
        }
    }
    question(title,prompt,options,onAnswer,screen) {
        const order=this.questionOrders[screen] ||= (screen==='threshold_check'
            ? (Math.random()<.5 ? [...options] : [...options].reverse())
            : this.shuffleOptions(options));
        this.rememberPage(screen,()=>this.question(title,prompt,options,onAnswer,screen));
        this.clear(screen);
        this.panel();
        if(title) this.text(this.w/2,this.portrait?150:100,title,this.portrait?32:24);
        this.text(this.w/2,this.portrait?345:235,prompt,prompt.length>155?(this.portrait?29:24):(this.portrait?33:28),this.w-95);
        this.gameData.answerChoiceOrders[screen]=order;
        (this.gameData.answerChoiceOrderHistory[screen] ||= []).push(order);
        const labels=order.map(o=>typeof o==='string'?o:(o.detail||o.title));
        const longOptions=order.length===2&&labels.some(label=>label.length>75);
        const answerWidth=this.w-(this.portrait?90:220);
        const answerHeight=longOptions?(this.portrait?210:120):(this.portrait?110:78);
        const answerFontSize=this.answerFontSize(labels,answerWidth,answerHeight);
        const positions=longOptions?(this.portrait?[610,845]:[420,560]):(this.portrait?[570,720,870,1020]:[390,490,590,660]);
        order.forEach((option,i)=>{
            const label=labels[i];
            this.button(this.w/2,positions[i],answerWidth,answerHeight,label,()=>{
                this.record('answer',{question:screen,answer:option});
                onAnswer(option);
            },true,answerFontSize);
        });
        this.showBackButton();
    }

    startPrinciples() {
        if(this.principleOrder){this.showPrinciple(0);return;}
        const principles=this.kind==='survival'?SURVIVAL_PRINCIPLES:ECONOMY_PRINCIPLES;
        const paired=this.kind==='survival'?['personDShareChoice','personDEmpathyChoice']:['scope','empathy'];
        const singles=principles.filter(p=>!paired.includes(p.code)).map(p=>p.code);
        const order=shuffle([...singles,'paired']).flatMap(code=>code==='paired'?shuffle(paired):[code]);
        this.principleOrder=order;
        this.gameData.economicPrincipleOrder=order;
        this.showPrinciple(0);
    }
    showPrinciple(index) {
        if(index>=this.principleOrder.length){
            if(this.kind==='economy')this.beginTask(3);
            else this.showManipulationCheck();
            return;
        }
        const item=(this.kind==='survival'?SURVIVAL_PRINCIPLES:ECONOMY_PRINCIPLES).find(p=>p.code===this.principleOrder[index]);
        if(item.intro && item.block!=='personD' && !this.gameData[`introSeen_${item.code}`]){
            this.gameData[`introSeen_${item.code}`]=true;
            this.info('One more situation',item.intro,()=>this.showPrinciple(index),`principle_intro_${item.code}`);
            return;
        }
        if(item.block==='personD'&&!this.gameData.personDIntroSeen){
            this.gameData.personDIntroSeen=true;
            this.info('A new person arrives',SURVIVAL_PRINCIPLES.find(p=>p.code==='personDShareChoice').intro,()=>this.showPrinciple(index),'principle_intro_personD');
            return;
        }
        const choices=this.kind==='survival'?item.options:item.options.map(o=>o);
        this.question('',item.prompt,choices,(selected)=>{
            if(this.kind==='survival')this.gameData[item.code]=selected;
            else this.gameData.economicPrinciples[item.code]=selected.code;
            this.gameData.economicPrincipleOptionOrders[item.code]=this.gameData.answerChoiceOrders[`principle_${item.code}`].map(o=>typeof o==='string'?o:o.code);
            this.showPrinciple(index+1);
        },`principle_${item.code}`);
    }
    showManipulationCheck() {
        const answer=this.total>=this.spec.threshold*3?'Yes':'No';
    this.question('',this.kind==='survival'?`Was there enough food in total for all three people to have at least ${this.spec.threshold} pieces each?`:'If the income shown were divided equally across the three income groups, would each group average at least $12,000 per person?',['Yes','No','Not sure'],choice=>{
            this.gameData.manipulationCheckChoice=choice.toLowerCase().replace(' ','_');
            this.gameData.manipulationCheckPassed=choice===answer;
            this.showDebrief();
        },'manipulation_check');
    }
    showDebrief() {
        const body=this.kind==='survival'
            ? 'This was a simplified, hypothetical survival scenario. The food amounts were set for this task.'
            : this.condition==='actual'
                ? 'This task used simplified estimates of the U.S. income distribution. People within each group have different incomes, so the group average shown does not describe everyone in that group.'
                : 'This task used a simplified, hypothetical U.S. income distribution. The amounts shown do not necessarily reflect average group incomes in the U.S. today.';
        this.info('About this task',body,()=>this.finish(),'debrief');
    }
    async finish() {
        this.clear('save');
        this.gameData.gameEndTime=new Date().toISOString();
        this.gameData.totalDurationMs=new Date(this.gameData.gameEndTime)-new Date(this.gameData.gameStartTime);
        this.info('Task complete','Please wait while your answers are saved.',null,'save');
        this.gameData.saveStatus='attempted';
        this.sendSurveyMessage('attempted');
        try {
            if(this.kind==='economy') {
                try {localStorage.setItem(`americanEconomyTaskBackup:${this.gameId}`,JSON.stringify(this.gameData));}
                catch(error) {this.gameData.localBackupError=String(error);}
            }
            if(!this.saveEndpoint) throw new Error('No save endpoint is configured.');
            if(this.kind==='survival'){
                await fetch(this.saveEndpoint,{method:'POST',mode:'no-cors',keepalive:true,body:JSON.stringify(this.gameData)});
                this.gameData.saveStatus='request_sent';
            } else {
                const controller=new AbortController();
                const timeout=setTimeout(()=>controller.abort(),30000);
                let ack;
                try {
                    const response=await fetch(this.saveEndpoint,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(this.gameData)});
                    if(!response.ok)throw new Error(`Save server returned ${response.status}.`);
                    ack=await response.json();
                } finally {clearTimeout(timeout);}
                if(!ack.ok||String(ack.gameId)!==this.gameId||String(ack.qualtricsId)!==this.qualtricsId)throw new Error('Save server did not confirm matching IDs.');
                localStorage.removeItem(`americanEconomyTaskBackup:${this.gameId}`);
                this.gameData.saveStatus='confirmed';
                this.gameData.saveAcknowledged=true;
            }
            this.sendSurveyMessage(this.gameData.saveStatus);
            this.info('Task complete',this.kind==='economy'?'Your answers have been sent. Close this task tab and return to the survey to finish.':'Your answers have been sent. Please return to the survey to finish.',()=>window.close(),'complete');
        } catch(error) {
            this.gameData.saveStatus=this.kind==='economy'?'unconfirmed':'request_failed';
            this.gameData.saveError=String(error);
            this.sendSurveyMessage(this.gameData.saveStatus);
            this.info('Saving needs attention',this.kind==='economy'?'We could not confirm that your answers were saved. Close this task tab and return to the survey to finish.':'Please return to the survey and tell the researcher that your task could not be saved.',()=>window.close(),'save_error');
        }
    }
    sendSurveyMessage(status) {
        const type=this.kind==='survival'?'survival-game-complete':'national-resource-game-complete';
        const principleAnswers=this.kind==='survival'?Object.fromEntries(SURVIVAL_PRINCIPLES.map(item=>[item.code,this.gameData[item.code]])):this.gameData.economicPrinciples;
        const summary={condition:this.condition,gameVersion:this.gameData.gameVersion,taskOrder:this.taskOrder,assignedPosition:this.gameData.assignedPosition,taskResponses:this.gameData.taskResponses,redistributionChoices:this.gameData.redistributionChoices,economicPrincipleOrder:this.gameData.economicPrincipleOrder,economicPrinciples:principleAnswers,answerChoiceOrders:this.gameData.answerChoiceOrders,screenTimings:this.gameData.screenTimings,freeAllocationFinal:this.gameData.freeAllocationFinal,equalDivisionFinal:this.gameData.equalDivisionFinal,partialRedistributionFinal:this.gameData.partialRedistributionFinal,redistributionFeasibility:this.gameData.redistributionFeasibility,thresholdCheckChoice:this.gameData.thresholdCheckChoice,thresholdCheckPassed:this.gameData.thresholdCheckPassed,manipulationCheckChoice:this.gameData.manipulationCheckChoice,manipulationCheckPassed:this.gameData.manipulationCheckPassed};
        const msg={type,saveStatus:status,gameId:this.gameId,qualtricsId:this.qualtricsId,condition:this.condition,summary,payload:this.gameData};
        let origin='*';
        try {if(this.parentOrigin) origin=new URL(this.parentOrigin).origin;}catch(_){}
        let sent=false;
        if(window.opener&&!window.opener.closed){window.opener.postMessage(msg,origin);sent=true;}
        if(window.parent&&window.parent!==window){window.parent.postMessage(msg,origin);sent=true;}
        this.gameData.parentBackupSent=sent;
    }
}
