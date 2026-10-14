/*
 * American Economy Task
 * Standalone Phaser 3 scene for four experimental conditions (version 8).
 *
 * Required URL parameters supplied by Qualtrics:
 *   gameId=...
 *   qualtricsId=... (responseId and ResponseID are also accepted)
 *   condition=insufficiency|sufficiency|abundance|actual
 *
 * Optional URL parameters:
 *   respondentDecile=1..10 (based on household income divided by household size;
 *   missing/invalid is recorded for analysis)
 *   incomeControlFallback=0|1
 *   incomeRoutingReason=...
 *   saveUrl=https://...
 *   parentOrigin=https://your-qualtrics-domain.example
 *
 * Example Qualtrics link:
 * https://YOUR-GAME-URL/?gameId=${e://Field/gameId}
 *   &qualtricsId=${e://Field/ResponseID}
 *   &respondentDecile=${e://Field/respondentDecile}
 *   &condition=${e://Field/condition}
 *
 * Only the respondent's decile and anonymous IDs are passed to the game.
 * Their reported household income and household size remain in Qualtrics.
 */

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 720;
const NEED_PER_PERSON = 12;
const DOLLARS_PER_UNIT = 1000;

const CLOSED_POOL_TEXT =
    'The number of blocks is fixed.';

/*
 * Keep this true while testing locally.
 * Change it to false before launching the Qualtrics study.
 */
const TEST_MODE = false;
const PUBLISHED_CONDITION = 'actual';

const TEST_DEFAULTS = Object.freeze({
    gameId: 'test_game_001',
    qualtricsId: 'test_response_001',
    respondentDecile: 5,
    condition: 'actual'
});
const CONDITION_CONFIGS = Object.freeze({
    insufficiency: Object.freeze({
        code: 'insufficiency',
        initialAllocation: Object.freeze([
            1, 2, 4, 5, 6, 7, 9, 10, 12, 24
        ]),
        totalUnits: 80,
        manipulationCorrectAnswer: 'no',
        equalUnitsPerPerson: 8,
        equalPeopleMeetingNeed: 0,
        partialMaximumPeople: 5,
        availableIncomeText:
            'There are 80 blocks divided among these 10 people.',
        boardAvailableText:
            '80 blocks available'
    }),

    sufficiency: Object.freeze({
        code: 'sufficiency',
        initialAllocation: Object.freeze([
            2, 4, 6, 7, 8, 10, 12, 15, 20, 36
        ]),
        totalUnits: 120,
        manipulationCorrectAnswer: 'yes',
        equalUnitsPerPerson: 12,
        equalPeopleMeetingNeed: 10,
        partialMaximumPeople: 10,
        availableIncomeText:
            'There are 120 blocks divided among these 10 people.',
        boardAvailableText:
            '120 blocks available'
    }),

    abundance: Object.freeze({
        code: 'abundance',
        initialAllocation: Object.freeze([
            3, 5, 7, 9, 12, 14, 16, 20, 26, 48
        ]),
        totalUnits: 160,
        manipulationCorrectAnswer: 'yes',
        equalUnitsPerPerson: 16,
        equalPeopleMeetingNeed: 10,
        partialMaximumPeople: 10,
        availableIncomeText:
            'There are 160 blocks divided among these 10 people.',
        boardAvailableText:
            '160 blocks available'
    }),

    actual: Object.freeze({
        code: 'actual',
        initialAllocation: Object.freeze([
            8, 15, 21, 26, 31, 38, 46, 56, 73, 136
        ]),
        totalUnits: 450,
        manipulationCorrectAnswer: 'yes',
        equalUnitsPerPerson: 45,
        equalPeopleMeetingNeed: 10,
        partialMaximumPeople: 10,
        availableIncomeText:
            'There are 450 blocks divided among these 10 people.',
        boardAvailableText:
            '450 blocks available'
    })
});

const CONDITION_ALIASES = Object.freeze({
    insufficiency: 'insufficiency',
    insufficient: 'insufficiency',
    scarcity: 'insufficiency',
    sufficiency: 'sufficiency',
    sufficient: 'sufficiency',
    abundance: 'abundance',
    abundant: 'abundance',
    actual: 'actual'
});

// Connect the new study's save service before piloting; never use the prior study's endpoint.
const DEFAULT_SAVE_ENDPOINT = '';

const COLORS = Object.freeze({
    page: 0xf4f6f8,
    panel: 0xffffff,
    card: 0xf9fafb,
    cardSelected: 0xfff4df,
    cardMet: 0xf9fafb,
    cardBelow: 0xf9fafb,
    border: 0x263238,
    mutedBorder: 0xaab2b8,
    resource: 0x86c995,
    resourceBorder: 0x1f6f43,
    resourceSeal: 0xcce8d3,
    resourceSelected: 0xf2994a,
    threshold: 0x8e44ad,
    button: 0x17202a,
    buttonLight: 0xe8ecef,
    ink: '#17202a',
    muted: '#5f6b76',
    buttonText: '#ffffff',
    success: '#1b6f3a',
    warning: '#9c5b00'
});

const REDISTRIBUTION_QUESTIONS = Object.freeze([
    {
        code: 'equal_redistribution',
        prompt:
            'Suppose these were the only two options for the American economy shown in this task: divide income equally among all 10 people, or let each person keep their starting income. Which should the government do?',
        options: [
            {
                code: 'equal',
                title: 'Divide income equally',
                detail:
                    'Income should be divided equally among all people.'
            },
            {
                code: 'keep',
                title: 'Keep the original incomes',
                detail:
                    'Each person should keep their starting income.'
            }
        ]
    },
    {
        code: 'partial_redistribution',
        prompt:
            'Suppose these were the only two options for the American economy shown in this task: redistribute income above the basic-needs line so the greatest possible number of people have at least $12,000, or let each person keep their starting income. Which should the government do?',
        options: [
            {
                code: 'partial',
                title: 'Redistribute to meet basic needs',
                detail:
                    'Redistribute income held above the basic-needs line so that the greatest possible number of people have at least $12,000.'
            },
            {
                code: 'keep',
                title: 'Keep the original incomes',
                detail:
                    'Each person should keep their starting income.'
            }
        ]
    },
    {
        code: 'government_feasibility',
        prompt: 'If the income shown in this task were redistributed, do you think there would be enough for everyone?',
        options: [
            { code: 'possible', title: 'Yes', detail: '' },
            { code: 'not_possible', title: 'No', detail: '' }
        ]
    },
    {
        code: 'redistributive_guarantee',
        prompt:
            'Thinking about the American economy as shown in this task, SHOULD the government create a policy that guarantees each person enough income to meet their basic needs, or not?',
        options: [
            {
                code: 'support_guarantee',
                title: 'Create a policy',
                detail:
                    'The government should create a policy that guarantees that each person will have enough income to meet their basic needs.'
            },
            {
                code: 'oppose_guarantee',
                title: 'Do not create a policy',
                detail:
                    'The government should not create a policy that guarantees that each person will have enough income to meet their basic needs.'
            }
        ]
    }
]);

const ECONOMIC_PRINCIPLES = Object.freeze([
    {
        code: 'responsibility',
        prompt:
            'Thinking about the American economy as shown in this task, which should receive greater priority: personal responsibility or government responsibility for meeting basic needs?',
        options: [
            {
                code: 'shared',
                title: 'Government responsibility',
                detail:
                    'The government should take responsibility for making sure everyone can meet their basic needs.'
            },
            {
                code: 'personal',
                title: 'Personal responsibility',
                detail:
                    'People should be primarily responsible for making sure they can meet their own basic needs.'
            }
        ]
    },
    {
        code: 'fairness',
        prompt:
            'In the American economy shown in this task, which approach should take priority when deciding how income is distributed fairly?',
        options: [
            {
                code: 'equity',
                title: 'Give more to people with less',
                detail:
                    'People with lower incomes should receive more help from the government so that everyone has an equal chance to meet their basic needs.'
            },
            {
                code: 'proportionality',
                title: 'Reward hard work and contribution',
                detail:
                    'People should receive income in proportion to how much they work and contribute, so people are rewarded for working hard.'
            }
        ]
    },
    {
        code: 'income_priority',
        prompt: "People with lower incomes have the least income and need help meeting basic needs. People with higher incomes have the most income and can contribute more in taxes to fund public spending. When deciding how to redistribute income, which group's economic interests should the government prioritize?",
        options: [
            { code: 'lowest', title: 'Lower-income people', detail: '' },
            { code: 'highest', title: 'Higher-income people', detail: '' }
        ]
    },
    {
        code: 'time',
        prompt:
            'Thinking about the American economy as shown in this task, which should receive greater priority: improving economic well-being and production today, or investing to improve economic well-being and production in the future?',
        options: [
            {
                code: 'present',
                title: 'Prioritize the present',
                detail:
                    'Economic resources should be used primarily to improve well-being and production today.'
            },
            {
                code: 'future',
                title: 'Invest for the future',
                detail:
                    'Economic resources should be invested primarily to improve well-being and production in the future.'
            }
        ]
    },
    {
        code: 'scope',
        prompt:
            'Thinking about the American economy as shown in this task, should the U.S. provide foreign aid to help people in other countries meet their basic needs?',
        options: [
            {
                code: 'international',
                title: 'Provide foreign aid',
                detail:
                    'Provide foreign aid, even if this leaves fewer resources in the United States.'
            },
            {
                code: 'domestic',
                title: 'Do not provide foreign aid',
                detail:
                    'Do not provide foreign aid, even if this means more people in other countries cannot meet their basic needs.'
            }
        ]
    },
    {
        code: 'empathy',
        prompt: 'When deciding whether to provide foreign aid, which should weigh more heavily?',
        options: [
            { code: 'guide', title: 'Concern for people in other countries.', detail: '' },
            { code: 'not_guide', title: 'The resources people in the United States would have to give up.', detail: '' }
        ]
    },
    {
        code: 'paid_leave',
        prompt: 'Should workers be guaranteed a minimum amount of paid leave, or should paid leave be left to employers to decide?',
        options: [
            { code: 'guaranteed', title: 'Workers should be guaranteed a minimum amount of paid leave.', detail: '' },
            { code: 'employer_choice', title: 'Paid leave should be left to employers to decide.', detail: '' }
        ]
    },
    {
        code: 'strategy',
        prompt:
            'Thinking about the American economy as shown in this task, are people more likely to cooperate with one another or compete with one another?',
        options: [
            {
                code: 'cooperate',
                title: 'More likely to cooperate',
                detail:
                    'People are more likely to work together.'
            },
            {
                code: 'compete',
                title: 'More likely to compete',
                detail:
                    'People are more likely to compete with one another.'
            }
        ]
    }
]);

export default class Start extends Phaser.Scene
{
    constructor ()
    {
        super('Start');

        this.conditionName = null;
        this.conditionConfig = null;
        this.transferBatchSize = 1;
    }

    preload ()
    {
        // No external assets are required.
    }

    create ()
    {
        // A click must remain a click until the pointer has actually moved.
        this.input.dragDistanceThreshold = 6;
        this.cameras.main.setBackgroundColor(
            COLORS.page
        );

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        const requestedConditionRaw = (
            urlParams.get('condition') ||
            (
                PUBLISHED_CONDITION
            )
        ).trim().toLowerCase();

        const requestedCondition =
            CONDITION_ALIASES[
                requestedConditionRaw
            ] || requestedConditionRaw;

        this.conditionConfig =
            requestedCondition === PUBLISHED_CONDITION
                ? CONDITION_CONFIGS[requestedCondition]
                : null;

        this.conditionName =
            this.conditionConfig
                ? this.conditionConfig.code
                : requestedCondition;

        const gameId = (
            urlParams.get('gameId') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.gameId
                    : ''
            )
        ).trim();

        const qualtricsId = (
            urlParams.get('qualtricsId') ||
            urlParams.get('responseId') ||
            urlParams.get('ResponseID') ||
            (
                TEST_MODE
                    ? TEST_DEFAULTS.qualtricsId
                    : ''
            )
        ).trim();

        // Never replace a survey respondent's missing decile with a test value.
        const useTestDecile = TEST_MODE && window.location.search === '';
        const decileText = (
            urlParams.get('respondentDecile') ??
            (useTestDecile ? String(TEST_DEFAULTS.respondentDecile) : '')
        ).trim();
        const requestedIncomeFallback = urlParams.get('incomeControlFallback') === '1';
        const validDecile = /^(?:[1-9]|10)$/.test(decileText);
        const incomeControlFallback = requestedIncomeFallback || !validDecile;
        const respondentDecile = incomeControlFallback ? null : Number(decileText);
        const allowedIncomeReasons = [
            'invalid_or_missing_income_and_household_size',
            'invalid_or_missing_income',
            'invalid_or_missing_household_size',
            'invalid_income_decile'
        ];
        const suppliedIncomeReason = urlParams.get('incomeRoutingReason') || '';
        const incomeRoutingReason = incomeControlFallback
            ? (allowedIncomeReasons.includes(suppliedIncomeReason)
                ? suppliedIncomeReason : 'invalid_income_decile')
            : '';

        this.initialAllocation =
            this.conditionConfig
                ? [
                    ...this.conditionConfig.initialAllocation
                ]
                : [];

        this.totalUnits =
            this.conditionConfig
                ? this.conditionConfig.totalUnits
                : 0;

        this.saveEndpoint =
            urlParams.get('saveUrl') ||
            DEFAULT_SAVE_ENDPOINT;

        this.parentOrigin =
            this.resolveParentOrigin(
                urlParams.get('parentOrigin')
            );

        this.sessionStartPerformance =
            performance.now();

        this.currentScreenName = null;
        this.currentScreenStartedAt = null;
        this.screenObjects = [];
        this.currentAllocation = [];
        this.allocationMode = null;
        this.selectedSourceDecile = null;
        this.isDraggingResource = false;
        this.cardBounds = [];
        this.boardFeedbackMessage = '';

        this.gameData = {
            gameId,
            qualtricsId,
            condition: this.conditionName,
            gameVersion:
                'national_individuals_fourarm_12k_v2',

            initialAllocation: [
                ...this.initialAllocation
            ],

            totalUnits: this.totalUnits,
            dollarsPerUnit: DOLLARS_PER_UNIT,
            needPerPersonUnits: NEED_PER_PERSON,
            needPerPersonDollars:
                NEED_PER_PERSON * DOLLARS_PER_UNIT,

            closedResourcePool: true,

            simplifiedGini:
                this.calculateGini(
                    this.initialAllocation
                ),

            respondentDecile,
            incomeControlFallback,
            incomeRoutingReason,
            selfInterestConditionIssue: null,
            selfInterestCondition: null,
            respondentDecileRevealed: false,

            gameStartTime:
                new Date().toISOString(),

            gameEndTime: null,
            totalDurationMs: null,
            userAgent: navigator.userAgent,
            deviceInfo: {
                platform: navigator.userAgentData?.platform || navigator.platform || null,
                browserBrands: navigator.userAgentData?.brands || null,
                mobileHint: navigator.userAgentData?.mobile ?? null,
                maxTouchPoints: navigator.maxTouchPoints || 0,
                devicePixelRatio: window.devicePixelRatio || 1,
                screenWidth: window.screen?.width || null,
                screenHeight: window.screen?.height || null,
                viewportWidth: window.innerWidth,
                viewportHeight: window.innerHeight
            },
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            deviceAllowed: this.isDesktopSized(),

            comprehensionCheckChoice: null,
            comprehensionCheckPassed: null,

            manipulationCheckChoice: null,
            manipulationCheckPassed: null,

            dragPracticeAttempts: 0,
            dragPracticeCompleted: false,

            freeAllocationFinal: null,
            freeAllocationPeopleMeetingNeed: null,
            freeAllocationGini: null,
            freeAllocationClassification: null,
            freeAllocationTotalMoved: null,
            respondentFreeAllocationChange: null,

            equalDivisionFinal: null,
            equalDivisionPeopleMeetingNeed: null,
            equalDivisionOutcomeChoice: null,
            equalDivisionOutcomePassed: null,

            partialRedistributionFinal: null,
            partialRedistributionPeopleMeetingNeed: null,

            partialRedistributionMaximumPossible:
                this.conditionConfig
                    ? this.conditionConfig
                        .partialMaximumPeople
                    : null,

            partialRedistributionReachedMaximum: null,
            partialRedistributionTotalMoved: null,

            selfInterestAllocationFinal: null,
            selfInterestAllocationPeopleMeetingNeed: null,
            selfInterestAllocationGini: null,
            selfInterestAllocationClassification: null,
            selfInterestAllocationTotalMoved: null,
            selfInterestOwnStartingBlocks: null,
            selfInterestOwnFinalBlocks: null,
            selfInterestOwnChange: null,
            selfInterestEqualButtonUsed: false,
            selfInterestPartialButtonUsed: false,

            redistributionChecklistChoices: {},
            redistributionChecklistOrders: {},
            redistributionChoices: {},
            redistributionOptionOrders: {},
            economicPrinciples: {},
            economicPrincipleOptionOrders: {},

            actions: [],
            screenTimings: {},

            saveStatus: null,
            saveAcknowledged: false,
            saveError: null,
            parentBackupSent: false,
            localBackupKey: null
        };

        const launchErrors = [];

        if (!this.isValidExternalId(gameId))
        {
            launchErrors.push(
                'a valid task ID'
            );
        }

        if (!this.isValidExternalId(qualtricsId))
        {
            launchErrors.push(
                'a valid Qualtrics response ID'
            );
        }

        if (!this.conditionConfig)
        {
            launchErrors.push(
                'a valid condition ' +
                '(insufficiency, sufficiency, abundance, or actual)'
            );
        }

        if (launchErrors.length > 0)
        {
            this.showLaunchError(
                launchErrors
            );

            return;
        }

        this.validateConditionConfiguration();

        if (!this.isDesktopSized())
        {
            this.showDesktopRequirement();
            return;
        }

        this.showWelcomeScreen();
    }

    isValidExternalId (value)
    {
        return (
            typeof value === 'string' &&
            /^[A-Za-z0-9_-]{3,200}$/.test(
                value
            )
        );
    }

    resolveParentOrigin (configuredOrigin)
    {
        const candidates = [configuredOrigin, document.referrer];

        for (const candidate of candidates)
        {
            if (!candidate) continue;

            try
            {
                const parsed = new URL(candidate);

                if (parsed.protocol === 'https:')
                {
                    return parsed.origin;
                }
            }
            catch (error)
            {
                // Ignore invalid optional origins and try the next candidate.
            }
        }

        return null;
    }

    validateConditionConfiguration ()
    {
        const configuredTotal = this.initialAllocation.reduce(
            (sum, value) => sum + value,
            0
        );

        if (configuredTotal !== this.totalUnits)
        {
            throw new Error(
                `Condition ${this.conditionName} has ${configuredTotal} ` +
                `allocated blocks but totalUnits is ${this.totalUnits}.`
            );
        }

        const calculatedEqualUnits =
            this.totalUnits / this.initialAllocation.length;

        if (
            calculatedEqualUnits !==
            this.conditionConfig.equalUnitsPerPerson
        )
        {
            throw new Error(
                `The configured equal-division result is incorrect for ` +
                `${this.conditionName}.`
            );
        }

        const calculatedEqualPeople =
            calculatedEqualUnits >= NEED_PER_PERSON
                ? this.initialAllocation.length
                : 0;

        if (
            calculatedEqualPeople !==
            this.conditionConfig.equalPeopleMeetingNeed
        )
        {
            throw new Error(
                `The configured equal-division person count is incorrect ` +
                `for ${this.conditionName}.`
            );
        }

        const alreadyMeetingNeed = this.initialAllocation.filter(
            value => value >= NEED_PER_PERSON
        ).length;

        let transferableSurplus = this.initialAllocation.reduce(
            (sum, value) =>
                sum + Math.max(0, value - NEED_PER_PERSON),
            0
        );

        let calculatedPartialMaximum = alreadyMeetingNeed;

        const deficits = this.initialAllocation
            .filter(value => value < NEED_PER_PERSON)
            .map(value => NEED_PER_PERSON - value)
            .sort((a, b) => a - b);

        deficits.forEach(deficit => {
            if (deficit <= transferableSurplus)
            {
                transferableSurplus -= deficit;
                calculatedPartialMaximum += 1;
            }
        });

        if (
            calculatedPartialMaximum !==
            this.conditionConfig.partialMaximumPeople
        )
        {
            throw new Error(
                `The configured partial-redistribution maximum is ` +
                `incorrect for ${this.conditionName}.`
            );
        }
    }

    showLaunchError (launchErrors)
    {
        this.enterScreen('launch_error');
        this.clearScreen();
        this.addPanel(640, 360, 1000, 500);

        this.addScreenText(
            640,
            190,
            'This task could not begin',
            38,
            COLORS.warning,
            800,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            330,
            `The task link is missing ${launchErrors.join(', ')}. ` +
                'Please close this tab, return to the survey, and open the task again.',
            25,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);
    }

    isDesktopSized ()
    {
        const mobileUserAgent = /Mobi|Android|iPhone|iPad/i.test(
            navigator.userAgent
        );

        return !mobileUserAgent && window.innerWidth >= 1000;
    }

    showDesktopRequirement ()
    {
        this.enterScreen('desktop_requirement');
        this.clearScreen();
        this.addPanel(640, 360, 980, 430);

        this.addScreenText(
            640,
            245,
            'A laptop or desktop computer is required',
            36,
            COLORS.ink,
            850,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            390,
            'This activity cannot be completed on a phone or tablet. Please restart the survey from the study invitation on a laptop or desktop computer. Do not move the game link between devices.',
            26,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);
    }

showWelcomeScreen ()
{
    this.enterScreen('welcome');
    this.clearScreen();
    this.addPanel(640, 360, 1000, 500);

    this.addScreenText(
        640,
        220,
        'Welcome to the American Economy Task',
        40,
        COLORS.ink,
        850,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        350,
        'This task uses a simplified version of the American economy.\n\nYou will take on the role of a government decision-maker and make decisions about how income is distributed in America.',
        27,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        465,
        'Please read carefully and answer each question.',
        24,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        555,
        190,
        56,
        'Next',
        () => {
            this.showIncomeDifferencesIntroduction();
        }
    );
    }

    // Screen 1
    showIncomeDifferencesIntroduction ()
{
    this.enterScreen('income_differences_introduction');
    this.clearScreen();
    this.addPanel(640, 360, 1080, 600);

    this.addScreenText(
        640,
        150,
        'People in the United States have different incomes. Some have enough to meet their basic needs; others do not.',
        27,
        COLORS.ink,
        920,
        'center'
    ).setOrigin(0.5);

    this.drawPersonWithBlocks(410, 365, 10, 1.35);
    this.drawPersonWithBlocks(870, 365, 20, 1.35);

    const basicNeedsLineY = 370;

    const basicNeedsLine = this.add.line(
        0,
        0,
        300,
        basicNeedsLineY,
        980,
        basicNeedsLineY,
        COLORS.threshold,
        1
    ).setOrigin(0, 0);

    basicNeedsLine.setLineWidth(4);
    basicNeedsLine.setDepth(60);
    this.addScreenObject(basicNeedsLine);

    this.addScreenText(
        640,
        basicNeedsLineY - 26,
        'Basic-needs line',
        16,
        '#6c3483',
        180,
        'center'
    ).setOrigin(0.5, 0).setDepth(61);

    this.addButton(640, 635, 190, 56, 'Next', () => {
        this.showGovernmentChoicesIntroduction();
    });
}

    showGovernmentChoicesIntroduction ()
{
    this.enterScreen('government_choices_introduction');
    this.clearScreen();
    this.addPanel(640, 360, 1080, 600);

    this.addScreenText(
        640,
        240,
        'Governments make choices about whether income should be redistributed and, if so, how.',
        27,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        390,
        'In this task, federal and state assistance programs remain in place. Assistance programs cover some, but not all, basic needs.',
        27,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.addButton(640, 635, 190, 56, 'Next', () => {
        this.showBasicNeedsBlocks();
    });
}
    // Screen 2
    showBasicNeedsThreshold ()
    {
        this.enterScreen('basic_needs_threshold');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 620);
        this.addScreenText(
            640,
            195,
            'Even with assistance programs, a person still needs $12,000 a year ($1,000 a month) in income to meet all basic needs.',
            27,
            COLORS.ink,
            930,
            'center'
        ).setOrigin(0.5);


        this.drawPersonGlyph(640, 310, 1.35);
        this.addScreenText(640, 400, '$12,000', 28, COLORS.ink, 300, 'center').setOrigin(0.5);

        const blockHeight = 9;
        const blockGap = 2;
        const stackBottom = 590;
        const needsLineY = stackBottom - (NEED_PER_PERSON - 1) * (blockHeight + blockGap) - blockHeight / 2;
        this.drawBlockStack(640, stackBottom, NEED_PER_PERSON, 140, blockHeight, blockGap);
        const needsLine = this.add.line(0, 0, 465, needsLineY, 815, needsLineY, COLORS.threshold, 1).setOrigin(0, 0);
        needsLine.setLineWidth(3);
        this.addScreenObject(needsLine);
        this.addScreenText(835, needsLineY - 22, 'Basic-needs line', 20, '#6c3483', 350, 'center').setOrigin(0.5);
        this.addButton(640, 635, 190, 54, 'Next', () => {
            this.showUnmetNeedsConsequences();
        });
    }

    showUnmetNeedsConsequences ()
    {
        this.enterScreen('unmet_needs_consequences');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 660);

        this.addScreenText(
            640, 140, '$12,000 or more', 29,
            COLORS.ink, 900, 'center'
        ).setOrigin(0.5).setFontStyle('bold');

        this.addScreenText(
            640, 240,
            'A person can meet basic needs. They will have adequate food, shelter, and medical care. More income can still improve their life.',
            26, COLORS.ink, 930, 'center'
        ).setOrigin(0.5);

        this.addScreenObject(
            this.add.rectangle(640, 325, 880, 2, COLORS.mutedBorder)
        );

        this.addScreenText(
            640, 395, 'Below $12,000', 29,
            COLORS.ink, 900, 'center'
        ).setOrigin(0.5).setFontStyle('bold');

        this.addScreenText(
            640, 495,
            'A person cannot meet all basic needs. They will go hungry, lack housing, or miss needed care—even lifesaving medicine. When basic needs go unmet, the risk of death rises.',
            26, COLORS.ink, 930, 'center'
        ).setOrigin(0.5);

        this.addButton(640, 650, 190, 54, 'Next', () => {
            this.showBasicNeedsComprehensionCheck();
        });
    }

    showBasicNeedsBlocks ()
    {
        this.enterScreen('single_income_block');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 620);
        this.addScreenText(640, 150, 'In this task, 1 block = $1,000', 30, COLORS.ink, 860, 'center').setOrigin(0.5);
        this.drawBlockStack(640, 370, 1, 140, 12, 5);
        this.addButton(640, 635, 190, 54, 'Next', () => {
            this.showTenIncomeBlocks();
        });
    }

    showTenIncomeBlocks ()
    {
        this.enterScreen('basic_needs_blocks');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 620);
        this.addScreenText(640, 150, 'So, 12 blocks = $12,000', 30, COLORS.ink, 860, 'center').setOrigin(0.5);
        this.drawBlockStack(640, 445, 12, 140, 12, 5);
        this.addButton(640, 635, 190, 54, 'Next', () => {
            this.showBasicNeedsThreshold();
        });
    }

   // Comprehension check
showBasicNeedsComprehensionCheck ()
{
    this.enterScreen('basic_needs_comprehension_check');
    this.clearScreen();
    this.addPanel(640, 360, 1000, 520);

    this.addScreenText(
        640,
        175,
        'How many blocks represent $12,000?',
        29,
        COLORS.ink,
        880,
        'center'
    ).setOrigin(0.5);

    const choices = [
        '10 blocks',
        '12 blocks',
        '20 blocks'
    ];

    if (Phaser.Math.Between(0, 1) === 1) choices.reverse();

        choices.forEach((choice, index) => {
        this.addConfirmedButton(
            640,
            320 + index * 76,
            360,
            52,
            choice,
            () => {
                const correct =
                    choice === '12 blocks';

                this.gameData.comprehensionCheckChoice = choice;
                this.gameData.comprehensionCheckPassed = correct;

                this.recordAnswer(
                    'comprehension_check',
                    choice
                );

                if (correct)
                {
                    this.showCorrectBasicNeedsFeedback();
                }
                else
                {
                    this.showIncorrectBasicNeedsFeedback(choice);
                }
            },
            COLORS.buttonLight,
            COLORS.ink
        );
    });

        this.addInstructionReview('', 150, () => this.showWelcomeScreen());
    }

// Shown after selecting 12 blocks
showCorrectBasicNeedsFeedback ()
{
    this.enterScreen('basic_needs_check_correct');
    this.clearScreen();
    this.addPanel(640, 360, 900, 540);

    this.addScreenText(
        640,
        135,
        'Correct',
        40,
        COLORS.success,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        220,
        '12 blocks represent $12,000.',
        27,
        COLORS.ink,
        760,
        'center'
    ).setOrigin(0.5);

    this.drawBlockStack(
        640,
        450,
        12,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        505,
        '$12,000 = 12 blocks',
        24,
        COLORS.ink,
        600,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        615,
        190,
        54,
        'Next',
        () => {
            this.showAboveAndBelowThreshold();
        }
    );
}

// Shown after selecting 10 or 20 blocks
showIncorrectBasicNeedsFeedback (selectedChoice)
{
    this.enterScreen('basic_needs_check_incorrect');
    this.clearScreen();
    this.addPanel(640, 360, 900, 560);

    this.addScreenText(
        640,
        120,
        'Not quite',
        38,
        COLORS.warning,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        195,
        `You selected ${selectedChoice}.`,
        24,
        COLORS.ink,
        700,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        250,
        'The correct answer is 12 blocks.',
        28,
        COLORS.ink,
        760,
        'center'
    ).setOrigin(0.5);

    this.drawBlockStack(
        640,
        465,
        12,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        520,
        '$12,000 = 12 blocks',
        24,
        COLORS.ink,
        600,
        'center'
    ).setOrigin(0.5);
    this.addButton(
        640,
        635,
        190,
        54,
        'Next',
        () => {
            this.showAboveAndBelowThreshold();
        }
    );
}

// Screen 4
showAboveAndBelowThreshold ()
{
    this.enterScreen('above_and_below_threshold');
    this.clearScreen();
    this.addPanel(640, 360, 1080, 620);

    this.addScreenText(
        640,
        95,
        'Some people have more than $12,000 a year; others have less.',
        25,
        COLORS.ink,
        980,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        127,
        'The purple line marks the $12,000 basic-needs level.',
        25,
        COLORS.ink,
        920,
        'center'
    ).setOrigin(0.5);

    this.drawExampleIncomeCard(
        415,
        170,
        300,
        375,
       20,
        'Annual income',
        1,
        '$20,000',
        '$20,000 is more than $12,000.'
    );

    this.drawExampleIncomeCard(
        865,
        170,
        300,
        375,
       10,
        'Annual income',
        1,
        '$10,000',
        '$10,000 is less than $12,000.'
    );

    this.addButton(
    640,
    650,
    190,
    54,
    'Next',
    () => {
        this.showRepresentativePersonExplanation();
    }
);
}

// Screen 5
showRepresentativePersonExplanation ()
{
    this.enterScreen('representative_person_explanation');
    this.clearScreen();
    this.addPanel(640, 360, 1040, 600);

    this.addScreenText(
        640,
        150,
        'Each person represents one-tenth of U.S. adults, ranked by household income per person.',
        27,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.drawPersonGlyph(
        640,
        275,
        2
    );

    this.drawBlockStack(
        640,
        475,
        8,
        110,
        9,
        4
    );

    this.addScreenText(
        640,
        535,
        "The blocks show each group’s average yearly household income per person. The amounts include money from government programs and subtract taxes.",
        26,
        COLORS.ink,
        900,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        650,
        190,
        54,
        'Next',
        () => {
            this.showBottomDecile();
        }
    );
}
    // Screen 5
    showBottomDecile ()
    {
        this.enterScreen('bottom_decile_example');
        this.clearScreen();
        this.addPanel(640, 360, 1040, 610);

        this.addScreenText(
            640,
            75,
            'This person represents the lowest-income 10% of U.S. adults.',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        this.drawExampleIncomeCard(
            640,
            145,
            300,
            380,
            this.initialAllocation[0],
            'Person 1'
        );

        this.addScreenText(
            640,
            575,
            'Their yearly income falls below the $12,000 basic-needs line.',
            27,
            COLORS.ink,
            880,
            'center'
        ).setOrigin(0.5);

        this.addButton(640, 665, 190, 52, 'Next', () => {
            this.showTopDecile();
        });
    }

    // Screen 6
    showTopDecile ()
    {
        this.enterScreen('top_decile_example');
        this.clearScreen();
        this.addPanel(640, 360, 1100, 620);

        this.addScreenText(
            640,
            75,
            'This person represents the highest-income 10% of U.S. adults.',
            27,
            COLORS.ink,
            940,
            'center'
        ).setOrigin(0.5);

        this.drawExampleIncomeCard(
            640,
            125,
            270,
            400,
            this.initialAllocation[9],
            'Person 10'
        );

        this.addScreenText(
            640,
            570,
            'Their yearly income exceeds the $12,000 basic-needs line.',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5)
        this.addButton(640, 668, 190, 50, 'Next', () => {
            this.showFullStartingDistribution();
        });
    }

    // Screen 7
    showBatchMoveNote ()
    {
        this.enterScreen('batch_move_note');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 600);
        this.addScreenText(
            640, 155,
            'You can also move 5 or 10 blocks at a time. Choose 5 or 10 under “Blocks per move,” then move the blocks to another person.',
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        [5, 10].forEach((amount, index) => {
            const centerX = index === 0 ? 390 : 890;
            this.addScreenText(centerX, 280, 'Blocks per move', 22, COLORS.ink, 300, 'center').setOrigin(0.5);
            this.addScreenObject(this.add.rectangle(centerX, 325, 90, 42, COLORS.ink));
            this.addScreenText(centerX, 325, String(amount), 25, '#ffffff', 80, 'center').setOrigin(0.5);
            const blockHeight = 12;
            const gap = 5;
            const bottomY = 455 + (amount - 1) * (blockHeight + gap) / 2;
            this.drawBlockStack(centerX - 115, bottomY, amount, 100, blockHeight, gap);
            this.addScreenText(centerX, 455, '→', 45, COLORS.ink, 90, 'center').setOrigin(0.5);
            this.drawPersonGlyph(centerX + 115, 455, 0.95);
        });

        this.addButton(640, 635, 190, 56, 'Next', () => {
            this.showGovernmentPolicyRole();
        });
    }

    showGovernmentPolicyRole ()
    {
        this.enterScreen('government_policy_role');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 600);
        this.addScreenText(
            640, 330,
            'Imagine you are in charge of deciding whether and how the government redistributes income among people.',
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        this.addButton(640, 635, 190, 56, 'Next', () => {
            this.startFreeAllocation();
        });
    }

    showFullStartingDistribution ()
    {
        this.enterScreen('full_starting_distribution');
        this.clearScreen();

        this.addScreenText(
            640,
            50,
            'Each person represents about 27 million U.S. adults. The income shown is that group’s average.',
            27,
            COLORS.ink,
            1120,
            'center'
        ).setOrigin(0.5, 0);

        this.drawStaticTenDecileDistribution(155, 415);

        this.addScreenText(
            55,
            595,
            'Lowest income',
            16,
            COLORS.muted,
            180,
            'left'
        ).setOrigin(0, 0.5);

        this.addScreenText(
            1225,
            595,
            'Highest income',
            16,
            COLORS.muted,
            180,
            'right'
        ).setOrigin(1, 0.5);

       this.addButton(
    640,
    665,
    190,
    50,
    'Next',
    () => {
        this.showCollectiveThresholdExplanation();
    }
);
    }

    showCollectiveThresholdExplanation ()
{
    this.enterScreen('collective_threshold_explanation');
    this.clearScreen();
    this.addPanel(640, 360, 1120, 610);

    this.addScreenText(
        640,
        95,
        'Each person needs 12 blocks to reach the $12,000 basic-needs line.',
        29,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    for (let index = 0; index < 10; index += 1)
    {
        const x = 135 + index * 112;

        this.drawPersonGlyph(
            x,
            285,
            0.52
        );

        this.drawBlockStack(
            x,
            430,
            NEED_PER_PERSON,
            66,
            6,
            2
        );

        this.addScreenText(
            x,
            465,
            '12 blocks',
            16,
            COLORS.ink,
            85,
            'center'
        ).setOrigin(0.5);
    }

    this.addScreenText(
        640,
        520,
        '10 people × 12 blocks each = 120 blocks',
        31,
        COLORS.ink,
        950,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        570,
        'There must be at least 120 blocks in total for all 10 people to meet their basic needs.',
        23,
        COLORS.ink,
        960,
        'center'
    ).setOrigin(0.5);

    this.addButton(
        640,
        665,
        190,
        50,
        'Next',
        () => {
            this.showAvailableIncomeDistribution();
        }
    );
}

showAvailableIncomeDistribution ()
{
    this.enterScreen('available_income_distribution');
    this.clearScreen();

    this.addScreenText(
        640,
        55,
        this.conditionConfig.availableIncomeText,
        31,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        105,
        CLOSED_POOL_TEXT,
        19,
        COLORS.muted,
        1040,
        'center'
    ).setOrigin(0.5);

    this.drawStaticTenDecileDistribution(
        155,
        410
    );

    this.addScreenText(
        85,
        595,
        'Lowest income',
        16,
        COLORS.muted,
        180,
        'left'
    ).setOrigin(0, 0.5);

    this.addScreenText(
        1195,
        595,
        'Highest income',
        16,
        COLORS.muted,
        180,
        'right'
    ).setOrigin(1, 0.5);

    this.addButton(
        640,
        665,
        190,
        50,
        'Next',
        () => {
            this.showIncomeSharingExplanation();
        }
    );
}

    // Screen 8
    showManipulationCheck ()
    {
        this.enterScreen('manipulation_check');
        this.clearScreen();
        this.addPanel(640, 360, 1040, 550);

        this.addScreenText(
            640,
            130,
            'Thinking about all 10 people',
            37,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            245,
            'If the total income shown were redistributed, could each of the 10 representative people have at least $12,000?',
            27,
            COLORS.ink,
            900,
            'center'
        ).setOrigin(0.5);

        const choices = [
            { code: 'yes', label: 'Yes' },
            { code: 'no', label: 'No' },
            { code: 'not_sure', label: 'Not sure' }
        ];

        if (Phaser.Math.Between(0, 1) === 1) [choices[0], choices[1]] = [choices[1], choices[0]];

        choices.forEach((choice, index) => {
            this.addConfirmedButton(
                640,
                370 + index * 76,
                360,
                52,
                choice.label,
                () => {
                    this.gameData.manipulationCheckChoice = choice.code;
                    this.gameData.manipulationCheckPassed =
                        choice.code ===
                        this.conditionConfig.manipulationCorrectAnswer;
                    this.recordAnswer(
    'manipulation_check',
    choice.code
);

const incomeDebrief = this.conditionConfig.code === 'actual'
    ? 'The incomes shown are simplified estimates of the U.S. income distribution, not the exact incomes of particular Americans.'
    : 'The income amounts shown were hypothetical and created for this study. They were not the actual U.S. income levels.';

this.showTaskTransition('debrief', 'About this task', [
    'This task presented a simplified version of the American economy. It did not include every feature of the real U.S. economy.',
    incomeDebrief
], () => this.showFinalScreen());
                },
                COLORS.buttonLight,
                COLORS.ink
            );
        });
    
        ;
    }

    // Screen 9
    showTaskTransition (screen, title, paragraphs, next)
    {
        this.enterScreen(screen);
        this.clearScreen();
        this.addPanel(640, 360, 1120, 630);
        this.addScreenText(640, 105, title, 32, COLORS.ink, 1020, 'center').setOrigin(0.5);
        const positions = paragraphs.length === 3 ? [230, 365, 505] : [280, 440];
        paragraphs.forEach((text, index) => {
            this.addScreenText(640, positions[index], text, 25, COLORS.ink, 980, 'center').setOrigin(0.5);
        });
        this.addButton(640, 635, 210, 52, 'Continue', next);
    
        if (screen !== 'income_sharing_explanation') ;
    }

    showIncomeSharingExplanation ()
    {
        this.showTaskTransition('income_sharing_explanation', '', [
            'The government can use taxes and benefits to change how income is shared among people.',
            'In this task, moving blocks represents those changes. For example, moving one block lowers one person’s income and raises another’s by $1,000.',
            'The total number of blocks stays the same.'
        ], () => this.showFreeAllocationInstructions());
    }

    showFreeAllocationInstructions ()
    {
        this.enterScreen('drag_practice');
        this.clearScreen();
        this.addPanel(640, 360, 1120, 630);

        this.addScreenText(
            640,
            65,
            'Practice moving one income block',
            34,
            COLORS.ink,
            950,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            125,
            'Click and hold the outlined green income block. Drag it into the person’s box on the right, then release it.',
            24,
            COLORS.ink,
            940,
            'center'
        ).setOrigin(0.5);

        const leftX = 390;
        const rightX = 890;
        const cardTop = 205;
        const cardWidth = 270;
        const cardHeight = 320;
        const stackBottom = 490;
        const blockWidth = 108;
        const blockHeight = 12;
        const blockGap = 4;

        [leftX, rightX].forEach((centerX, index) => {
            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                COLORS.card
            );
            card.setStrokeStyle(3, COLORS.border);
            this.addScreenObject(card);

            this.drawPersonGlyph(centerX, cardTop + 68, 0.9);
            this.addScreenText(
                centerX,
                cardTop + 125,
                index === 0 ? 'Move from here' : 'Drop here',
                21,
                COLORS.ink,
                220,
                'center'
            ).setOrigin(0.5);
        });

        this.drawBlockStack(
            leftX,
            stackBottom,
            3,
            blockWidth,
            blockHeight,
            blockGap
        );

        this.drawBlockStack(
            rightX,
            stackBottom,
            2,
            blockWidth,
            blockHeight,
            blockGap
        );

        const practiceStartX = leftX;
        const practiceStartY =
            stackBottom - 3 * (blockHeight + blockGap);
        const practiceDestinationY =
            stackBottom - 2 * (blockHeight + blockGap);

        const destinationBounds = new Phaser.Geom.Rectangle(
            rightX - cardWidth / 2,
            cardTop,
            cardWidth,
            cardHeight
        );

        const practiceBlock = this.add.rectangle(
            practiceStartX,
            practiceStartY,
            blockWidth,
            blockHeight,
            COLORS.resource
        );

        practiceBlock.setStrokeStyle(3, 0x000000);
        practiceBlock.setDepth(100);

        practiceBlock.setInteractive(
            new Phaser.Geom.Rectangle(
                -12,
                -12,
                blockWidth + 24,
                blockHeight + 24
            ),
            Phaser.Geom.Rectangle.Contains
        );

        this.input.setDraggable(practiceBlock);
        this.addScreenObject(practiceBlock);

        const feedback = this.addScreenText(
            640,
            565,
            'Drag the outlined block into the box on the right.',
            20,
            COLORS.muted,
            850,
            'center'
        ).setOrigin(0.5);

        let practiceCompleted = false;

        practiceBlock.on('dragstart', () => {
            practiceBlock.setFillStyle(COLORS.resource);
            practiceBlock.setDepth(500);
        });

        practiceBlock.on('drag', (pointer, dragX, dragY) => {
            practiceBlock.x = dragX;
            practiceBlock.y = dragY - 12;
        });

        practiceBlock.on('dragend', pointer => {
            if (practiceCompleted) return;

            this.gameData.dragPracticeAttempts += 1;

            const successfulDrop = Phaser.Geom.Rectangle.Contains(
                destinationBounds,
                pointer.worldX,
                pointer.worldY
            );

            this.recordAction({
                action: 'drag_practice_attempt',
                attempt: this.gameData.dragPracticeAttempts,
                successful: successfulDrop
            });

            if (successfulDrop)
            {
                practiceCompleted = true;
                this.gameData.dragPracticeCompleted = true;
                practiceBlock.x = rightX;
                practiceBlock.y = practiceDestinationY;
                practiceBlock.setFillStyle(COLORS.resource);
                practiceBlock.setStrokeStyle(3, COLORS.success);
                practiceBlock.disableInteractive();

                feedback.setText(
                    'You moved one income block from one person to another.'
                );
                feedback.setColor(COLORS.success);

                this.addButton(640, 640, 230, 52, 'Next', () => {
                    this.showBatchMoveNote();
                });
            }
            else
            {
                practiceBlock.x = practiceStartX;
                practiceBlock.y = practiceStartY;
                practiceBlock.setFillStyle(COLORS.resource);
                practiceBlock.setDepth(100);

                feedback.setText(
                    'Place the block anywhere inside the person’s box on the right.'
                );
            }
        });
    }

    startFreeAllocation ()
    {
        this.allocationMode = 'free';
        this.transferBatchSize = 1;
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('free_allocation_board');
        this.redrawAllocationBoard();
    }

    redrawAllocationBoard ()
    {
        this.clearScreen();
        this.cardBounds = [];

        const mode = this.allocationMode || 'free';

        const boardTitles = {
            free: 'Arrange the blocks in the way you think is best for America',
            equal: 'Divide the income equally among all 10 people',
            partial: 'Use income above $12,000 to help as many people as possible reach $12,000.'
        };

const equalValue =
    this.conditionConfig.equalUnitsPerPerson;

const isEqualAllocation =
    Number.isInteger(equalValue) &&
    this.currentAllocation.every(
        value => value === equalValue
    );

const automaticPartialAllocation =
    mode === 'partial'
        ? this.buildAutomaticPartialAllocation()
        : null;

const isAutomaticPartialAllocation =
    automaticPartialAllocation !== null &&
    this.currentAllocation.every(
        (value, index) =>
            value === automaticPartialAllocation[index]
    );

this.addScreenText(
    640,
    13,
            boardTitles[mode],
            25,
            COLORS.ink,
            1180,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            47,
            this.conditionConfig.boardAvailableText,
            20,
            COLORS.ink,
            420,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            640,
            72,
            `${CLOSED_POOL_TEXT} Purple line: $12,000 basic-needs level.`,
            14,
            COLORS.muted,
            1050,
            'center'
        ).setOrigin(0.5, 0);

        const startX = 68;
        const gap = 127;
        const cardTop = 100;
        const cardWidth = 112;
        const cardHeight = 445;
        const stackBottom = 520;

        const tallestStack = Math.max(...this.currentAllocation);
        const { blockHeight, blockGap } = this.fitStackLayout(
            tallestStack, cardTop + 140, stackBottom, 6
        );

        const thresholdY = this.getThresholdY(
            stackBottom,
            blockHeight,
            blockGap
        );

        for (let index = 0; index < 10; index += 1)
        {
            const centerX = startX + index * gap;
            const amount = this.currentAllocation[index];
            const meetsNeed = amount >= NEED_PER_PERSON;
            const selected = this.selectedSourceDecile === index;
            const fillColor = selected
                ? COLORS.cardSelected
                : meetsNeed
                    ? COLORS.cardMet
                    : COLORS.cardBelow;

            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                fillColor
            );

            card.setStrokeStyle(
                selected ? 4 : 2,
                selected
                    ? COLORS.resourceSelected
                    : COLORS.border
            );

            card.setInteractive({ useHandCursor: selected });
            this.addScreenObject(card);

            this.cardBounds[index] = new Phaser.Geom.Rectangle(
                centerX - cardWidth / 2,
                cardTop,
                cardWidth,
                cardHeight
            );

            card.on('pointerdown', () => {
                if (
                    this.selectedSourceDecile !== null &&
                    this.selectedSourceDecile !== index
                )
                {
                    this.moveOneUnit(
                        this.selectedSourceDecile,
                        index,
                        'click'
                    );
                }
            });

            this.drawPersonGlyph(centerX, cardTop + 29, 0.55);

            this.addScreenText(
                centerX,
                cardTop + 67,
                `Group ${index + 1}`,
                15,
                COLORS.ink,
                104,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 89,
                this.formatIncome(amount),
                15,
                COLORS.ink,
                106,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 112,
                `${amount} blocks`,
                13,
                COLORS.muted,
                102,
                'center'
            ).setOrigin(0.5);

            this.drawDraggableStack(
                index,
                centerX,
                stackBottom,
                amount,
                blockHeight,
                blockGap
            );
        }

        const thresholdLine = this.add.line(
            0,
            0,
            12,
            thresholdY,
            1268,
            thresholdY,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        thresholdLine.setLineWidth(3);
        thresholdLine.setDepth(60);
        this.addScreenObject(thresholdLine);

        const meetingNeed = this.countPeopleMeetingNeed(
            this.currentAllocation
        );

      let selectionMessage;

if (mode === 'equal')
{
    selectionMessage = isEqualAllocation
        ? `Income is now divided equally: ${equalValue} blocks per person.`
        : 'Select “Divide income equally” to see what equal division produces.';
}
else if (mode === 'partial')
{
    selectionMessage =
        isAutomaticPartialAllocation
            ? 'Income above $12,000 has now been redistributed.'
            : 'Select “Redistribute to meet basic needs” to see the result.';
}
else
{
    selectionMessage = this.boardFeedbackMessage ||
        'Choose how many blocks to move. Select a block, then another person, or drag a block to that person.';
}

        this.addScreenText(
            45,
            578,
            `${meetingNeed} of 10 people have at least $12,000`,
            21,
            COLORS.ink,
            470,
            'left'
        ).setOrigin(0, 0.5);

        if (mode === 'free')
        {
            this.addScreenText(740, 578, 'Blocks per move', 16, COLORS.ink, 175, 'right')
                .setOrigin(1, 0.5);
            [1, 5, 10].forEach((value, index) => {
                const selected = this.transferBatchSize === value;
                this.addButton(790 + index * 105, 578, 90, 36,
                    String(value), () => {
                        this.transferBatchSize = value;
                        this.recordAction({action: 'select_transfer_size', task: mode, value});
                        this.redrawAllocationBoard();
                    }, selected ? COLORS.button : COLORS.buttonLight,
                    selected ? '#ffffff' : COLORS.ink);
            });
        }

        this.addScreenText(
            640,
            612,
            selectionMessage,
            16,
            COLORS.muted,
            1140,
            'center'
        ).setOrigin(0.5);

            this.addButton(
                480,
                675,
                180,
                50,
                'Reset',
                () => {
                    this.currentAllocation = [...this.initialAllocation];
                    this.selectedSourceDecile = null;
                    this.boardFeedbackMessage = '';

                    this.recordAction({
                        action: 'reset_allocation',
                        task: mode
                    });

                    this.redrawAllocationBoard();
                },
                COLORS.buttonLight,
                COLORS.ink
            );

        if (mode === 'free')
        {
            this.addButton(
                800,
                675,
                290,
                50,
                'Submit this arrangement',
                () => {
                    this.showAllocationConfirmation();
                }
            );
        }
        else if (mode === 'equal')
        {
            if (isEqualAllocation)
            {
                this.addButton(
                    800,
                    675,
                    290,
                    50,
                    'Continue',
                    () => {
                        this.storeEqualDivision(this.currentAllocation);
                        this.showRedistributionQuestion(0);
                    }
                );
            }
            else
            {
                this.addButton(
                    800,
                    675,
                    290,
                    50,
                    'Divide income equally',
                    () => {
                        const before = [...this.currentAllocation];

                        this.currentAllocation = new Array(
                            this.currentAllocation.length
                        ).fill(equalValue);

                        this.selectedSourceDecile = null;

                        this.recordAction({
                            action: 'apply_equal_division',
                            before,
                            allocation: [...this.currentAllocation]
                        });

                        this.redrawAllocationBoard();
                    }
                );
            }
        }
       else if (mode === 'partial')
{
    if (isAutomaticPartialAllocation)
    {
        this.addButton(
            800,
            675,
            290,
            50,
            'Continue',
            () => {
                this.storePartialRedistribution(
                    this.currentAllocation
                );

                this.showRedistributionQuestion(1);
            }
        );
    }
    else
    {
        this.addButton(
            800,
            675,
            320,
            50,
            'Redistribute to meet basic needs',
            () => {
                const before = [
                    ...this.currentAllocation
                ];

                this.currentAllocation = [
                    ...automaticPartialAllocation
                ];

                this.selectedSourceDecile = null;
                this.boardFeedbackMessage = '';

                this.recordAction({
    action:
        'apply_automatic_partial_redistribution',

    before,

    allocation: [
        ...this.currentAllocation
    ],

    recipientPriority:
        'highest_below_threshold_first',

    donorRule:
        'proportional_to_income_above_threshold'
});
                this.redrawAllocationBoard();
            }
        );
    }
}
    
        ;
    }

    drawDraggableStack (
        decileIndex,
        centerX,
        stackBottom,
        amount,
        blockHeight,
        blockGap
    )
    {
        const blockWidth = 88;
        const cellHeight = blockHeight + blockGap;
        const stackResources = [];

        for (let unitIndex = 0; unitIndex < amount; unitIndex += 1)
        {
            const y = stackBottom - unitIndex * cellHeight;

            const resource = this.add.rectangle(
                centerX,
                y,
                blockWidth,
                blockHeight,
                COLORS.resource
            );

            resource.setStrokeStyle(this.allocationMode === 'practice' ? 2 : 1, this.allocationMode === 'practice' ? 0x000000 : COLORS.resourceBorder);
            resource.setDepth(20);
            this.addScreenObject(resource);

            const mayMoveThisBlock =
    this.allocationMode !== 'equal' &&
    this.allocationMode !== 'partial' &&
    !(this.allocationMode === 'practice' && this.practiceStageCompleted);

            if (!mayMoveThisBlock)
            {
                continue;
            }

            resource.setInteractive(
                new Phaser.Geom.Rectangle(
                    -5,
                    -9,
                    blockWidth + 10,
                    blockHeight + 18
                ),
                Phaser.Geom.Rectangle.Contains
            );

            stackResources.push(resource);
            resource.setData('sourceDecile', decileIndex);
            resource.setData('wasDragged', false);
            this.input.setDraggable(resource);

            resource.on('dragstart', pointer => {
                resource.setData('wasDragged', true);
                this.isDraggingResource = true;
                const selectedSize = [1, 5, 10].includes(this.transferBatchSize) ? this.transferBatchSize : 1;
                const count = Math.min(selectedSize, this.currentAllocation[decileIndex]);
                // Hide exactly the blocks being carried, including the grabbed one.
                const carried = [resource, ...stackResources.slice().reverse().filter(item => item !== resource)].slice(0, count);
                carried.forEach(item => item.setAlpha(0));
                resource.setData('carriedResources', carried);
                resource.setData('dragBundle', this.createTransferBundle(
                    pointer.worldX, pointer.worldY - 12, count, blockWidth, blockHeight, blockGap
                ));
            });

            resource.on('drag', pointer => {
                const bundle = resource.getData('dragBundle');
                if (bundle) bundle.setPosition(pointer.worldX, pointer.worldY - 12);
            });

            resource.on('dragend', pointer => {
                const bundle = resource.getData('dragBundle');
                if (bundle) bundle.destroy();
                resource.setData('dragBundle', null);
                const source = resource.getData('sourceDecile');

                const destination = this.findCardAt(
                    pointer.worldX,
                    pointer.worldY
                );

                this.isDraggingResource = false;

                this.time.delayedCall(0, () => {
                    if (destination !== null && destination !== source)
                    {
                        this.moveOneUnit(source, destination, 'drag');
                    }
                    else
                    {
                        this.redrawAllocationBoard();
                    }
                });
            });

            resource.on('pointerup', () => {
                if (!resource.getData('wasDragged') && !this.isDraggingResource)
                {
                    if (this.selectedSourceDecile !== null && this.selectedSourceDecile !== decileIndex)
                    {
                        this.moveOneUnit(this.selectedSourceDecile, decileIndex, 'click');
                    }
                    else
                    {
                        this.selectedSourceDecile = decileIndex;
                        this.redrawAllocationBoard();
                    }
                }
            });
        }
    }

    createTransferBundle (x, y, count, blockWidth, blockHeight, blockGap)
    {
        const bundle = this.add.container(x, y).setDepth(500);
        for (let index = 0; index < count; index += 1)
        {
            const block = this.add.rectangle(
                0, -index * (blockHeight + blockGap),
                blockWidth, blockHeight, COLORS.resource
            ).setStrokeStyle(1, COLORS.resourceBorder);
            bundle.add(block);
        }
        this.addScreenObject(bundle);
        return bundle;
    }

    findCardAt (x, y)
    {
        for (let index = 0; index < this.cardBounds.length; index += 1)
        {
            if (Phaser.Geom.Rectangle.Contains(this.cardBounds[index], x, y))
            {
                return index;
            }
        }

        return null;
    }

    moveOneUnit (source, destination, method)
    {
        const partialTransferWouldCrossNeedsLine =
            this.allocationMode === 'partial' &&
            this.currentAllocation[source] <= NEED_PER_PERSON;

        if (
            !Number.isInteger(source) || !Number.isInteger(destination) ||
            source === destination ||
            source < 0 || destination < 0 ||
            source >= this.currentAllocation.length || destination >= this.currentAllocation.length ||
            this.currentAllocation[source] <= 0 ||
            partialTransferWouldCrossNeedsLine
        )
        {
            if (partialTransferWouldCrossNeedsLine)
            {
                this.boardFeedbackMessage =
                    'Only blocks above the basic-needs line may be moved in this task.';
            }

            this.selectedSourceDecile = null;
            this.redrawAllocationBoard();
            return;
        }

        const sourceBefore = this.currentAllocation[source];
        const destinationBefore = this.currentAllocation[destination];
        const availableUnits = this.allocationMode === 'partial'
            ? Math.max(0, sourceBefore - NEED_PER_PERSON) : sourceBefore;
        const requestedUnits = [1, 5, 10].includes(this.transferBatchSize) ? this.transferBatchSize : 1;
        const movedUnits = Math.min(availableUnits, requestedUnits);

        this.currentAllocation[source] -= movedUnits;
        this.currentAllocation[destination] += movedUnits;
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';

        this.recordAction({
            action: 'transfer',
            task: this.allocationMode,
            method,
            units: movedUnits,
            requestedUnits,
            transferBatch: this.transferBatchSize,
            sourceDecile: source + 1,
            destinationDecile: destination + 1,
            sourceBefore,
            sourceAfter: this.currentAllocation[source],
            destinationBefore,
            destinationAfter: this.currentAllocation[destination]
        });

        this.redrawAllocationBoard();
    }

    showAllocationConfirmation ()
    {
        const submittedAllocation = [...this.currentAllocation];
        const meetingNeed = this.countPeopleMeetingNeed(submittedAllocation);

        this.enterScreen('free_allocation_confirmation');
        this.clearScreen();
        this.addPanel(640, 360, 980, 510);

        this.addScreenText(
            640,
            145,
            'Submit this arrangement?',
            38,
            COLORS.ink,
            850,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            640,
            270,
            `${meetingNeed} of 10 people have at least $12,000.`,
            29,
            COLORS.ink,
            820,
            'center'
        ).setOrigin(0.5);



        this.addButton(
            465,
            540,
            230,
            56,
            'Return to board',
            () => {
                this.enterScreen('free_allocation_board');
                this.redrawAllocationBoard();
            },
            COLORS.buttonLight,
            COLORS.ink
        );

        this.addButton(815, 540, 230, 56, 'Submit', () => {
            this.storeFreeAllocation(submittedAllocation);
            this.showRedistributionBlock();
        });
    
        ;
    }

    storeFreeAllocation (allocation)
    {
        const meetingNeed = this.countPeopleMeetingNeed(allocation);

        const totalMoved = allocation.reduce(
            (sum, value, index) =>
                sum + Math.abs(value - this.initialAllocation[index]),
            0
        ) / 2;

        this.gameData.freeAllocationFinal = [...allocation];
        this.gameData.freeAllocationPeopleMeetingNeed = meetingNeed;
        this.gameData.freeAllocationGini = this.calculateGini(allocation);
        this.gameData.freeAllocationTotalMoved = totalMoved;
        this.gameData.freeAllocationClassification =
            this.classifyAllocation(allocation);

        if (this.gameData.respondentDecile !== null)
        {
            const respondentIndex = this.gameData.respondentDecile - 1;

            this.gameData.respondentFreeAllocationChange =
                allocation[respondentIndex] -
                this.initialAllocation[respondentIndex];
        }

        this.recordAction({
            action: 'submit_free_allocation',
            allocation: [...allocation],
            peopleMeetingNeed: meetingNeed,
            gini: this.gameData.freeAllocationGini,
            totalMoved,
            classification: this.gameData.freeAllocationClassification
        });
    }

    showRedistributionBlock(index = 0) {
        if (!this.gameData.redistributionTaskOrder) {
            this.gameData.redistributionTaskOrder = Phaser.Math.Between(0, 1) === 0
                ? ['equal', 'partial'] : ['partial', 'equal'];
            this.gameData.redistributionBlocksCompleted = [];
        }
        const block = this.gameData.redistributionTaskOrder[index];
        if (!block) {
            this.showRedistributionQuestion(2);
            return;
        }
        if (block === 'equal') this.showEqualDivisionInstructions();
        else this.showPartialPolicyIntroduction();
    }
    completeRedistributionBlock(block) {
        const order = this.gameData.redistributionTaskOrder;
        if (!order || !order.includes(block)) throw new Error('Redistribution block order missing');
        if (!this.gameData.redistributionBlocksCompleted.includes(block)) {
            this.gameData.redistributionBlocksCompleted.push(block);
        }
        this.showRedistributionBlock(order.indexOf(block) + 1);
    }

    showEqualDivisionInstructions ()
    {
        this.enterScreen('equal_division_instructions');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 600);
        this.addScreenText(
            640, 250,
            "One option governments have is to redistribute income so all people have the same income.",
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        this.addScreenText(
            640, 420,
            "We’ll start again with the original incomes. Next, see what happens with this option.",
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        this.addButton(640, 635, 190, 56, 'Next', () => {
            this.startEqualDivisionTask();
        });
    
        ;
    }

    startEqualDivisionTask ()
    {
        this.allocationMode = 'equal';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('equal_division_board');
        this.redrawAllocationBoard();
    }

    storeEqualDivision (allocation)
    {
        const finalAllocation = [...allocation];
        const meetingNeed = this.countPeopleMeetingNeed(finalAllocation);

        this.gameData.equalDivisionFinal = finalAllocation;
        this.gameData.equalDivisionPeopleMeetingNeed = meetingNeed;

        this.recordAction({
            action: 'complete_equal_division',
            allocation: finalAllocation,
            peopleMeetingNeed: meetingNeed
        });
    }

    showPartialPolicyIntroduction ()
    {
        this.enterScreen('partial_policy_introduction');
        this.clearScreen();
        this.addPanel(640, 360, 1080, 600);
        this.addScreenText(
            640, 250,
            "One option governments have is to redistribute some income from people above the basic-needs line to people below it.",
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        this.addScreenText(
            640, 420,
            "We’ll start again with the original incomes. Next, see what happens with this option.",
            27, COLORS.ink, 900, 'center'
        ).setOrigin(0.5);
        this.addButton(640, 635, 190, 56, 'Next', () => {
            this.startPartialRedistributionTask();
        });
    
        ;
    }

buildAutomaticPartialAllocation ()
{
    const allocation = [
        ...this.initialAllocation
    ];

    /*
     * Identify people who begin above the
     * basic-needs line and calculate their surplus.
     */
    const donors = this.initialAllocation
        .map((amount, index) => {
            return {
                index,
                surplus: Math.max(
                    0,
                    amount - NEED_PER_PERSON
                )
            };
        })
        .filter(donor => donor.surplus > 0);

    const totalAvailableSurplus = donors.reduce(
        (sum, donor) =>
            sum + donor.surplus,
        0
    );

    let remainingSurplus =
        totalAvailableSurplus;

    let totalTransferRequired = 0;

    /*
     * Begin with the highest-income person below
     * the line and work downward. Transfer income
     * only when enough is available to bring the
     * person fully to the basic-needs line.
     */
    for (
        let recipient = allocation.length - 1;
        recipient >= 0;
        recipient -= 1
    )
    {
        if (
            this.initialAllocation[recipient] >=
            NEED_PER_PERSON
        )
        {
            continue;
        }

        const deficit =
            NEED_PER_PERSON -
            this.initialAllocation[recipient];

        if (deficit <= remainingSurplus)
        {
            allocation[recipient] =
                NEED_PER_PERSON;

            remainingSurplus -= deficit;
            totalTransferRequired += deficit;
        }
    }

    if (
        totalTransferRequired === 0 ||
        totalAvailableSurplus === 0
    )
    {
        return allocation;
    }

    /*
     * Divide the required contribution among
     * donors in proportion to the income each
     * holds above the basic-needs line.
     */
    const contributionShares = donors.map(
        donor => {
            const exactContribution =
                (
                    donor.surplus /
                    totalAvailableSurplus
                ) *
                totalTransferRequired;

            const baseContribution =
                Math.floor(exactContribution);

            return {
                ...donor,

                contribution: Math.min(
                    baseContribution,
                    donor.surplus
                ),

                remainder:
                    exactContribution -
                    baseContribution
            };
        }
    );

    let assignedContributions =
        contributionShares.reduce(
            (sum, donor) =>
                sum + donor.contribution,
            0
        );

    /*
     * Assign any remaining whole blocks using
     * the largest-remainder method.
     */
    contributionShares.sort(
        (donorA, donorB) =>
            donorB.remainder -
                donorA.remainder ||
            donorB.surplus -
                donorA.surplus ||
            donorB.index -
                donorA.index
    );

    let donorCursor = 0;

    while (
        assignedContributions <
        totalTransferRequired
    )
    {
        const donor =
            contributionShares[
                donorCursor %
                contributionShares.length
            ];

        if (
            donor.contribution <
            donor.surplus
        )
        {
            donor.contribution += 1;
            assignedContributions += 1;
        }

        donorCursor += 1;
    }

    contributionShares.forEach(donor => {
        allocation[donor.index] -=
            donor.contribution;
    });

    return allocation;
}

    startPartialRedistributionTask ()
    {
        this.allocationMode = 'partial';
        this.currentAllocation = [...this.initialAllocation];
        this.selectedSourceDecile = null;
        this.boardFeedbackMessage = '';
        this.enterScreen('partial_redistribution_board');
        this.redrawAllocationBoard();
    }

    storePartialRedistribution (allocation)
    {
        const finalAllocation = [...allocation];
        const meetingNeed = this.countPeopleMeetingNeed(finalAllocation);

        const maximumPossible =
            this.conditionConfig.partialMaximumPeople;

        const totalMoved = finalAllocation.reduce(
            (sum, value, index) =>
                sum + Math.abs(value - this.initialAllocation[index]),
            0
        ) / 2;

        this.gameData.partialRedistributionFinal = finalAllocation;
        this.gameData.partialRedistributionPeopleMeetingNeed = meetingNeed;
        this.gameData.partialRedistributionMaximumPossible = maximumPossible;
        this.gameData.partialRedistributionReachedMaximum =
            meetingNeed === maximumPossible;
        this.gameData.partialRedistributionTotalMoved = totalMoved;

        this.recordAction({
            action: 'complete_partial_redistribution',
            allocation: finalAllocation,
            peopleMeetingNeed: meetingNeed,
            maximumPossible,
            reachedMaximum: meetingNeed === maximumPossible,
            totalMoved
        });
    }

    selectAnswerForConfirmation(box, callback) {
        (this.confirmedChoiceBoxes || []).forEach(choice => choice.setStrokeStyle(2, COLORS.border));
        box.setStrokeStyle(5, COLORS.border);
        this.pendingAnswerCallback = callback;
        if (!this.answerNextButton) {
            this.answerNextButton = this.addButton(640, 680, 180, 48, 'Next', () => {
                const answer = this.pendingAnswerCallback;
                this.pendingAnswerCallback = null;
                if (answer) answer();
            });
        }
    }
    addConfirmedButton(x, y, width, height, label, callback, fill, color) {
        const box = this.addButton(x, y, width, height, label, () => this.selectAnswerForConfirmation(box, callback), fill, color);
        (this.confirmedChoiceBoxes ||= []).push(box);
        return box;
    }
    addConfirmedLargeChoice(y, title, detail, callback) {
        const box = this.addLargeChoice(y, title, detail, () => this.selectAnswerForConfirmation(box, callback));
        (this.confirmedChoiceBoxes ||= []).push(box);
        return box;
    }
    drawConfirmedPrincipleChoice(x, principle, option, callback) {
        const box = this.drawPrincipleChoice(x, principle, option, () => this.selectAnswerForConfirmation(box, callback));
        (this.confirmedChoiceBoxes ||= []).push(box);
        return box;
    }
    showRedistributionQuestion (questionIndex)
{
    if (questionIndex >= REDISTRIBUTION_QUESTIONS.length)
    {
        this.showEconomicPrinciple(0);
        return;
    }

    const question = REDISTRIBUTION_QUESTIONS[questionIndex];

    this.enterScreen(`redistribution_${question.code}`);
    this.clearScreen();
    this.addPanel(640, 360, 1120, 610);

    this.addScreenText(
        640,
        135,
        question.prompt,
        26,
        COLORS.ink,
        1000,
        'center'
    ).setOrigin(0.5);

    this.addScreenText(
        640,
        245,
        ['equal_redistribution', 'partial_redistribution'].includes(question.code)
            ? 'For this question, choose one of the two options below.'
            : CLOSED_POOL_TEXT,
        18,
        COLORS.muted,
        1000,
        'center'
    ).setOrigin(0.5);

    if (question.code === 'government_feasibility')
    {
        const choices = this.getOrderedOptions(question.code, question.options, this.gameData.redistributionOptionOrders);
        this.gameData.redistributionOptionOrders[question.code] = choices.map(option => option.code);
        choices.forEach((option, index) => this.addConfirmedButton(
            640, 350 + index * 85, 360, 60, option.title,
            () => {
                this.gameData.redistributionChoices[question.code] = option.code;
                this.recordAnswer(question.code, option.code);
                this.showRedistributionQuestion(questionIndex + 1);
            }, COLORS.buttonLight, COLORS.ink
        ));
        return;
    }

    const orderedOptions = this.getOrderedOptions(
        question.code,
        question.options,
        this.gameData.redistributionOptionOrders
    );

    orderedOptions.forEach((option, index) => {
        const centerY = 365 + index * 175;

        this.addConfirmedLargeChoice(
            centerY,
            option.title,
            option.detail,
            () => {
                this.gameData.redistributionChoices[question.code] =
                    option.code;

                this.recordAnswer(
                    question.code,
                    option.code
                );

                if (question.code === 'equal_redistribution' || question.code === 'partial_redistribution')
                {
                    this.completeRedistributionBlock(question.code === 'equal_redistribution' ? 'equal' : 'partial');
                }
                else
                {
                    this.showRedistributionQuestion(
                        questionIndex + 1
                    );
                }
            }
        );
    });

        ;
    }

    showEconomicPrinciple (principleIndex)
    {
        if (principleIndex >= ECONOMIC_PRINCIPLES.length)
{
    this.showManipulationCheck();
    return;
}

        if (!this.gameData.economicPrincipleOrder) {
            const principleBlocks = Phaser.Utils.Array.Shuffle([
                ...ECONOMIC_PRINCIPLES
                    .map(item => item.code)
                    .filter(code => code !== 'scope' && code !== 'empathy'),
                'foreign_aid_block'
            ]);
            const foreignAidOrder = Phaser.Utils.Array.Shuffle(['scope', 'empathy']);
            this.gameData.economicPrincipleOrder = principleBlocks.flatMap(
                block => block === 'foreign_aid_block' ? foreignAidOrder : [block]
            );
        }
        const principle = ECONOMIC_PRINCIPLES.find(
            item => item.code === this.gameData.economicPrincipleOrder[principleIndex]
        );

        this.enterScreen(`economic_principle_${principle.code}`);
        this.clearScreen();

        this.addScreenText(
            640,
            45,
            principle.prompt,
            principle.code === 'income_priority' ? 24 : 27,
            COLORS.ink,
            principle.code === 'income_priority' ? 1190 : 1130,
            'center'
        ).setOrigin(0.5, 0);

        this.addScreenText(
            1215,
            690,
            `${principleIndex + 1} of ${ECONOMIC_PRINCIPLES.length}`,
            15,
            COLORS.muted,
            100,
            'right'
        ).setOrigin(1, 0.5);

        const orderedOptions = this.getOrderedOptions(
            principle.code,
            principle.options,
            this.gameData.economicPrincipleOptionOrders
        );

        orderedOptions.forEach((option, index) => {
            const centerX = index === 0 ? 330 : 950;

            this.drawConfirmedPrincipleChoice(
                centerX,
                principle.code,
                option,
                () => {
                    this.gameData.economicPrinciples[principle.code] =
                        option.code;

                    this.recordAnswer(
                        `economic_principle_${principle.code}`,
                        option.code
                    );

                    this.showEconomicPrinciple(principleIndex + 1);
                }
            );
        });
    
        ;
    }

    drawPrincipleChoice (centerX, principleCode, option, callback)
    {
        const box = this.add.rectangle(
            centerX,
            415,
            560,
            460,
            COLORS.panel
        );

        box.setStrokeStyle(2, COLORS.border);
        box.setInteractive({ useHandCursor: true });
        this.addScreenObject(box);

        if (option.textOnly || principleCode === 'paid_leave' || principleCode === 'empathy')
        {
            this.addScreenText(centerX, 370, option.title, 27, COLORS.ink, 490, 'center').setOrigin(0.5);
            this.addScreenText(centerX, 610, 'Select this option', 17, COLORS.muted, 300, 'center').setOrigin(0.5);
            box.on('pointerdown', callback);
            return box;
        }

        this.addScreenText(
            centerX,
            225,
            option.title,
            27,
            COLORS.ink,
            500,
            'center'
        ).setOrigin(0.5);

        this.drawPrincipleVisualization(
            principleCode,
            option.code,
            centerX,
            345
        );

        this.addScreenText(
            centerX,
            505,
            option.detail,
            20,
            COLORS.ink,
            490,
            'center'
        ).setOrigin(0.5);

        this.addScreenText(
            centerX,
            610,
            'Select this option',
            17,
            COLORS.muted,
            300,
            'center'
        ).setOrigin(0.5);

        box.on('pointerdown', callback);
        return box;
    }

    drawPrincipleVisualization (principleCode, optionCode, centerX, centerY)
    {
        if (principleCode === 'responsibility')
{
    const offsets = [-115, 0, 115];
    const pileSizes = [2, 5, 8];

    offsets.forEach((offset, index) => {
        this.drawPersonGlyph(
            centerX + offset,
            centerY - 50,
            0.48
        );

        this.drawBlockStack(
            centerX + offset,
            centerY + 60,
            pileSizes[index],
            52,
            7,
            3
        );
    });

    if (optionCode === 'shared')
    {
        this.addArrowText(
            centerX - 58,
            centerY + 25,
            '←'
        );

        this.addArrowText(
            centerX + 58,
            centerY + 25,
            '←'
        );

        this.addScreenText(
            centerX,
            centerY + 115,
            'Income transfers between people',
            16,
            COLORS.muted,
            310,
            'center'
        ).setOrigin(0.5);
    }
    else
    {
        this.addScreenText(
            centerX,
            centerY + 115,
            'People keep their own income',
            16,
            COLORS.muted,
            310,
            'center'
        ).setOrigin(0.5);
    }

    return;
}
        if (principleCode === 'fairness')
{
    if (optionCode === 'equity')
    {
        this.addVisualSymbol(
            centerX - 105,
            centerY - 5,
            'EQUAL\nCHANCE'
        );

        this.drawBlockStack(
            centerX + 100,
            centerY + 45,
            5,
            60,
            7,
            3
        );

        this.addArrowText(
            centerX,
            centerY,
            '→'
        );
    }
    else if (optionCode === 'proportionality')
    {
        this.addVisualSymbol(
            centerX - 105,
            centerY - 5,
            'HARD\nWORK'
        );

        this.drawBlockStack(
            centerX + 100,
            centerY + 45,
            5,
            60,
            7,
            3
        );

        this.addArrowText(
            centerX,
            centerY,
            '→'
        );
    }

    return;
}

        if (principleCode === 'time')
        {
            this.drawBlockStack(
                centerX - 105,
                centerY + 35,
                5,
                60,
                7,
                3
            );

            this.addArrowText(centerX, centerY, '→');

            if (optionCode === 'future')
            {
                this.addVisualSymbol(centerX + 105, centerY, 'FUTURE');

                this.addScreenText(
                    centerX + 105,
                    centerY + 80,
                    'Benefits later',
                    17,
                    COLORS.muted,
                    170,
                    'center'
                ).setOrigin(0.5);
            }
            else
            {
                this.addVisualSymbol(centerX + 105, centerY, 'NOW');

                this.addScreenText(
                    centerX + 105,
                    centerY + 80,
                    'Production today',
                    17,
                    COLORS.muted,
                    170,
                    'center'
                ).setOrigin(0.5);
            }

            return;
        }

        if (principleCode === 'income_priority')
        {
            // Identical person silhouettes; only the depicted income differs.
            this.drawPersonGlyph(centerX - 80, centerY, 0.85);
            this.drawBlockStack(centerX + 95, centerY + 55,
                optionCode === 'lowest' ? 3 : 12, 80, 8, 3);
            return;
        }

        if (principleCode === 'paid_leave')
        {
            const picture = this.add.graphics({ x: centerX, y: centerY + 20 });
            this.addScreenObject(picture);
            const ink = 0x000000;
            const line = (x1, y1, x2, y2, width = 10) => {
                picture.lineStyle(width, ink, 1);
                picture.lineBetween(x1, y1, x2, y2);
            };
            const polygon = (points) => {
                picture.fillStyle(ink, 1);
                picture.fillPoints(points.map(([x, y]) => ({ x, y })), true);
            };
            picture.fillStyle(ink, 1);
            if (optionCode === 'guaranteed')
            {
                // Original silhouette: reading in an outdoor reclining chair.
                polygon([[-108, 30], [14, 30], [65, -67], [83, -62], [34, 51], [-108, 45]]);
                polygon([[-88, 43], [-76, 43], [-93, 93], [-104, 93]]);
                polygon([[14, 46], [27, 46], [65, 93], [51, 93]]);
                picture.fillCircle(43, -76, 16);
                polygon([[33, -61], [56, -55], [40, -20], [24, 22], [-5, 24], [11, -18]]);
                line(17, 22, -42, 22, 19);
                line(-42, 22, -88, 21, 17);
                line(-87, 21, -96, 3, 12);
                line(32, -40, 7, -15, 11);
                line(7, -15, -16, -34, 10);
                polygon([[-40, -60], [-18, -57], [-2, -36], [-20, -39]]);
                polygon([[-18, -57], [0, -69], [16, -47], [-2, -36]]);
            }
            else
            {
                // Original silhouette: manual labor with a shovel and soil.
                picture.fillCircle(0, -82, 17);
                polygon([[-21, -65], [0, -55], [-7, -10], [-32, -16], [-34, -31], [-42, -47]]);
                line(-27, -58, -63, -64, 12);
                line(-63, -64, -62, -30, 12);
                line(-8, -49, -7, 6, 13);
                line(-27, -22, -47, 25, 17);
                line(-47, 25, -65, 74, 17);
                picture.fillCircle(-65, 74, 8);
                line(-25, -20, -18, 23, 17);
                line(-18, 23, -17, 76, 17);
                picture.fillCircle(-17, 76, 8);
                line(-64, -31, 47, 44, 5);
                polygon([[39, 29], [62, 42], [70, 59], [56, 64], [39, 56], [31, 48]]);
                picture.fillEllipse(83, 85, 63, 36);
                polygon([[14, 99], [36, 88], [69, 81], [106, 86], [123, 99]]);
            }
            return;
        }

        if (principleCode === 'empathy')
        {
            // Match the preceding foreign-aid visuals for the two empathy options.
            this.drawPrincipleVisualization('scope', optionCode === 'guide' ? 'international' : 'domestic', centerX, centerY);
            return;
        }

        if (principleCode === 'scope')
        {
            if (optionCode === 'international')
            {
                this.addVisualSymbol(centerX - 110, centerY, 'U.S.');
                this.addArrowText(centerX, centerY, '→');
                this.addVisualSymbol(centerX + 110, centerY, 'WORLD');
            }
            else
            {
                this.addVisualSymbol(centerX, centerY, 'U.S.');
            }

            this.drawBlockStack(
                centerX,
                centerY + 105,
                5,
                58,
                7,
                3
            );

            return;
        }

        if (principleCode === 'strategy')
        {
            if (optionCode === 'cooperate')
            {
                this.drawPersonGlyph(
                    centerX - 135,
                    centerY - 45,
                    0.48
                );

                this.drawPersonGlyph(
                    centerX + 135,
                    centerY - 45,
                    0.48
                );

                this.addVisualSymbol(
                    centerX,
                    centerY + 35,
                    'SHARED\nGOAL'
                );

                this.addArrowText(
                    centerX - 72,
                    centerY - 5,
                    '↘'
                );

                this.addArrowText(
                    centerX + 72,
                    centerY - 5,
                    '↙'
                );
            }
            else
            {
                this.drawPersonGlyph(centerX - 135, centerY, 0.48);
                this.drawPersonGlyph(centerX + 135, centerY, 0.48);
                this.addScreenText(
                    centerX,
                    centerY,
                    'VS',
                    28,
                    COLORS.ink,
                    100,
                    'center'
                ).setOrigin(0.5);
            }
        }
    }

    drawStaticTenDecileDistribution (
        cardTop,
        cardHeight
    )
    {
        const startX = 68;
        const gap = 127;
        const cardWidth = 112;
        const stackBottom = cardTop + cardHeight - 32;
        const { blockHeight, blockGap } = this.fitStackLayout(
            Math.max(...this.initialAllocation), cardTop + 115, stackBottom, 4
        );

        const thresholdY = this.getThresholdY(
            stackBottom,
            blockHeight,
            blockGap
        );

        for (let index = 0; index < 10; index += 1)
        {
            const centerX = startX + index * gap;
            const amount = this.initialAllocation[index];
            const card = this.add.rectangle(
                centerX,
                cardTop + cardHeight / 2,
                cardWidth,
                cardHeight,
                amount >= NEED_PER_PERSON
                    ? COLORS.cardMet
                    : COLORS.cardBelow
            );

            card.setStrokeStyle(2, COLORS.border);
            this.addScreenObject(card);
            this.drawPersonGlyph(centerX, cardTop + 26, 0.52);

            this.addScreenText(
                centerX,
                cardTop + 62,
                `Group ${index + 1}`,
                14,
                COLORS.ink,
                105,
                'center'
            ).setOrigin(0.5);

            this.addScreenText(
                centerX,
                cardTop + 84,
                this.formatIncome(amount),
                14,
                COLORS.ink,
                106,
                'center'
            ).setOrigin(0.5);

            this.drawBlockStack(
                centerX,
                stackBottom,
                amount,
                74,
                blockHeight,
                blockGap
            );
        }

        const thresholdLine = this.add.line(
            0,
            0,
            12,
            thresholdY,
            1268,
            thresholdY,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        thresholdLine.setLineWidth(3);
        thresholdLine.setDepth(60);
        this.addScreenObject(thresholdLine);

        this.addScreenText(
            20,
            thresholdY - 22,
            '$12,000',
            14,
            '#6c3483',
            90,
            'left'
        ).setBackgroundColor('#f4f6f8').setPadding(3, 1, 3, 1).setDepth(61);
    }

    drawExampleIncomeCard (
        centerX,
        topY,
        width,
        height,
        amount,
        label,
        alpha = 1,
        displayIncome = null,
        comparisonText = null
    )
    {
        const card = this.add.rectangle(
            centerX,
            topY + height / 2,
            width,
            height,
            amount >= NEED_PER_PERSON
                ? COLORS.cardMet
                : COLORS.cardBelow
        );

        card.setStrokeStyle(2, COLORS.border);
        card.setAlpha(alpha);
        this.addScreenObject(card);

        this.drawPersonGlyph(centerX, topY + 40, 0.8, alpha);

        this.addScreenText(
            centerX,
            topY + 95,
            label,
            21,
            COLORS.ink,
            width - 30,
            'center'
        ).setOrigin(0.5).setAlpha(alpha);

        const incomeText = displayIncome || this.formatIncome(amount);
        const annualIncomeText = /per year/i.test(incomeText)
            ? incomeText
            : `${incomeText} per year`;

        this.addScreenText(
            centerX,
            topY + 124,
            annualIncomeText,
            20,
            COLORS.ink,
            width - 30,
            'center'
        ).setOrigin(0.5).setAlpha(alpha);

        if (comparisonText)
        {
            this.addScreenText(
                centerX,
                topY + 154,
                comparisonText,
                18,
                COLORS.ink,
                width - 32,
                'center'
            ).setOrigin(0.5).setAlpha(alpha);
        }

        const chartTop = topY + (comparisonText ? 195 : 170);
        const chartBottom = topY + height - 22;
        // The two comparison cards share a scale; a single-decile card uses
        // its own scale so a small income is not flattened by another arm's maximum.
        const chartMaximum = comparisonText
            ? 22
            : Math.max(20, Math.ceil(amount * 1.05));
        const unitHeight = (chartBottom - chartTop) / chartMaximum;
        const thresholdY = chartBottom - NEED_PER_PERSON * unitHeight;
        const barWidth = Math.min(130, width - 60);

        // Keep every $1,000 block visible, even in the tallest income group.
        const blockGap = Math.min(1.2, unitHeight * 0.45);
        const blockHeight = unitHeight - blockGap;
        this.drawBlockStack(
            centerX,
            chartBottom - blockHeight / 2,
            amount,
            barWidth,
            blockHeight,
            blockGap,
            COLORS.resource,
            alpha
        );

        const line = this.add.line(
            0,
            0,
            centerX - width / 2 + 15,
            thresholdY,
            centerX + width / 2 - 15,
            thresholdY,
            COLORS.threshold,
            alpha
        ).setOrigin(0, 0);

        line.setLineWidth(3);
        line.setDepth(60);
        this.addScreenObject(line);

        this.addScreenText(
            centerX + width / 2 - 18,
            thresholdY - 20,
            '$12,000',
            13,
            '#6c3483',
            80,
            'right'
        ).setOrigin(1, 0).setAlpha(alpha).setDepth(61);
    }

    drawPersonWithBlocks (centerX, centerY, amount, scale)
    {
        this.drawPersonGlyph(centerX, centerY - 85, scale);
        this.drawBlockStack(
            centerX,
            centerY + 150,
            amount,
            86,
            6,
            3
        );
    }

    drawBasicNeedsLine (startX, endX, y, label)
    {
        const line = this.add.line(
            0,
            0,
            startX,
            y,
            endX,
            y,
            COLORS.threshold,
            1
        ).setOrigin(0, 0);

        line.setLineWidth(4);
        line.setDepth(60);
        this.addScreenObject(line);

        this.addScreenText(
            endX - 4,
            y - 26,
            label,
            16,
            '#6c3483',
            180,
            'right'
        ).setOrigin(1, 0).setDepth(61);
    }

        drawPersonGlyph (centerX, centerY, scale = 1, alpha = 1)
    {
        const graphics = this.add.graphics();
        graphics.setAlpha(alpha);

        const silhouette = 0x111111;
        graphics.fillStyle(silhouette, 1);

        const drawPerson = (xOffset, size) => {
            const isAdult = size === 'adult';
            const x = centerX + xOffset * scale;
            const headRadius = (isAdult ? 8 : 6) * scale;
            const headY = centerY + (isAdult ? -28 : -13) * scale;
            const torsoTop = centerY + (isAdult ? -17 : -4) * scale;
            const torsoWidth = (isAdult ? 19 : 14) * scale;
            const torsoHeight = (isAdult ? 35 : 24) * scale;
            const legTop = torsoTop + torsoHeight - 3 * scale;
            const legWidth = (isAdult ? 7 : 5) * scale;
            const legHeight = (isAdult ? 24 : 18) * scale;
            const armStartY = torsoTop + 6 * scale;
            const armEndY = torsoTop + (isAdult ? 25 : 19) * scale;
            const armReach = (isAdult ? 17 : 12) * scale;

            graphics.fillCircle(x, headY, headRadius);

            // Neutral, straight-sided torso
            graphics.fillRoundedRect(
                x - torsoWidth / 2,
                torsoTop,
                torsoWidth,
                torsoHeight,
                4 * scale
            );

            // Legs
            graphics.fillRoundedRect(
                x - legWidth - 1.5 * scale,
                legTop,
                legWidth,
                legHeight,
                2.5 * scale
            );

            graphics.fillRoundedRect(
                x + 1.5 * scale,
                legTop,
                legWidth,
                legHeight,
                2.5 * scale
            );

            // Arms
            graphics.lineStyle(
                Math.max(2, (isAdult ? 6 : 5) * scale),
                silhouette,
                1
            );

            graphics.lineBetween(
                x - torsoWidth / 2 + 2 * scale,
                armStartY,
                x - armReach,
                armEndY
            );

            graphics.lineBetween(
                x + torsoWidth / 2 - 2 * scale,
                armStartY,
                x + armReach,
                armEndY
            );
        };

        drawPerson(0, 'adult');

        this.addScreenObject(graphics);
        return graphics;
    }
    drawBlockStack (
        centerX,
        bottomY,
        amount,
        blockWidth = 70,
        blockHeight = 7,
        gap = 3,
        color = COLORS.resource,
        alpha = 1
    )
    {
        for (let index = 0; index < amount; index += 1)
        {
            const block = this.add.rectangle(
                centerX,
                bottomY - index * (blockHeight + gap),
                blockWidth,
                blockHeight,
                color
            );

            block.setAlpha(alpha);
            this.addScreenObject(block);
        }
    }

    addArrowText (x, y, arrow)
    {
        return this.addScreenText(
            x,
            y,
            arrow,
            35,
            COLORS.muted,
            60,
            'center'
        ).setOrigin(0.5);
    }

    addVisualSymbol (centerX, centerY, label)
    {
        const circle = this.add.circle(
            centerX,
            centerY,
            55,
            COLORS.card
        );

        circle.setStrokeStyle(3, COLORS.border);
        this.addScreenObject(circle);

        this.addScreenText(
            centerX,
            centerY,
            label,
            label.length > 4 ? 18 : 24,
            COLORS.ink,
            95,
            'center'
        ).setOrigin(0.5);
    }

    // Reserve the header area before sizing stacks, including extreme allocations.
    fitStackLayout (amount, stackTop, stackBottom, preferredHeight = 6)
    {
        const commonStartingMaximum = Math.max(...this.initialAllocation);
        const rows = Math.max(NEED_PER_PERSON, commonStartingMaximum, amount, 1);
        const cellHeight = Math.min(preferredHeight + 1, (stackBottom - stackTop) / rows);
        const blockGap = Math.min(1, cellHeight * 0.2);
        return { blockHeight: cellHeight - blockGap, blockGap };
    }

    getThresholdY (stackBottom, blockHeight, blockGap)
    {
        return stackBottom -
            (NEED_PER_PERSON - 1) * (blockHeight + blockGap) -
            blockHeight / 2 -
            1;
    }

    formatIncome (units)
    {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0
        }).format(units * DOLLARS_PER_UNIT);
    }

    addLargeChoice (centerY, title, detail, callback)
    {
        const box = this.add.rectangle(
            640,
            centerY,
            1000,
            135,
            COLORS.card
        );

        box.setStrokeStyle(2, COLORS.border);
        box.setInteractive({ useHandCursor: true });
        this.addScreenObject(box);

        this.addScreenText(
            175,
            centerY - 40,
            title,
            24,
            COLORS.ink,
            920,
            'left'
        ).setOrigin(0, 0);

        this.addScreenText(
            175,
            centerY - 2,
            detail,
            19,
            COLORS.muted,
            920,
            'left'
        ).setOrigin(0, 0);

        box.on('pointerdown', callback);
        return box;
    }

    getOrderedOptions (questionCode, options, orderStore)
    {
        if (!orderStore[questionCode])
        {
            orderStore[questionCode] = Phaser.Utils.Array.Shuffle(
                options.map(option => option.code)
            );
        }

        return orderStore[questionCode].map(
            code => options.find(option => option.code === code)
        );
    }

    countPeopleMeetingNeed (allocation)
    {
        return allocation.filter(
            value => value >= NEED_PER_PERSON
        ).length;
    }

    classifyAllocation (allocation)
    {
        const unchanged = allocation.every(
            (value, index) =>
                value === this.initialAllocation[index]
        );

        if (unchanged)
        {
            return 'starting_distribution';
        }

        const equalValue =
            this.totalUnits / allocation.length;

        const equal = allocation.every(
            value => value === equalValue
        );

        if (equal)
        {
            return 'equal_distribution';
        }

        const maximumPossible = Math.min(
            allocation.length,
            Math.floor(this.totalUnits / NEED_PER_PERSON)
        );

        if (
            this.countPeopleMeetingNeed(allocation) ===
            maximumPossible
        )
        {
            return 'maximum_basic_needs_attainment';
        }

        return 'other_distribution';
    }

    calculateGini (values)
    {
        const count = values.length;
        const total = values.reduce(
            (sum, value) => sum + value,
            0
        );

        if (count === 0 || total === 0)
        {
            return 0;
        }

        let absoluteDifferenceSum = 0;

        values.forEach(valueA => {
            values.forEach(valueB => {
                absoluteDifferenceSum += Math.abs(
                    valueA - valueB
                );
            });
        });

        return Number(
            (
                absoluteDifferenceSum /
                (2 * count * total)
            ).toFixed(4)
        );
    }

showFinalScreen ()
{
    this.enterScreen('final_screen');
    this.finishCurrentScreen();
    this.clearScreen();

    this.gameData.gameEndTime = new Date().toISOString();

    this.gameData.totalDurationMs = Math.round(
        performance.now() -
        this.sessionStartPerformance
    );

    this.gameData.allocationInteractionSummary = this.buildAllocationInteractionSummary();
    this.gameData.saveStatus = 'attempted';

    this.addPanel(
        640,
        360,
        970,
        470
    );

    this.addScreenText(
        640,
        245,
        'Thank you for completing the American Economy Task.',
        34,
        COLORS.ink,
        820,
        'center'
    ).setOrigin(0.5);

    const statusText = this.addScreenText(
        640,
        340,
        'Please wait while we save your answers.',
        25,
        COLORS.muted,
        780,
        'center'
    ).setOrigin(0.5);

    this.saveGameData()
        .then(() => {
            this.gameData.saveStatus = 'confirmed';
            this.gameData.saveAcknowledged = true;

            statusText.setText(
                'Your answers are saved. Return to the survey to finish.'
            );

            this.sendSurveyBackup('confirmed');
            this.addFinalCloseControls();
        })
        .catch(error => {
            this.gameData.saveStatus = 'unconfirmed';
            this.gameData.saveAcknowledged = false;
            this.gameData.saveError = String(error);

            const localBackupSaved = this.persistLocalBackup();
            const surveyBackupSent =
                this.sendSurveyBackup('unconfirmed');

            statusText.setText(
                localBackupSaved || surveyBackupSent
                    ? 'A copy of your answers has been kept. Return to the survey to finish.'
                    : 'We could not save your answers. Please notify the researcher before closing this tab.'
            );

            this.addFinalCloseControls();
        });
}

      addFinalCloseControls ()
    {
        this.addButton(
            640,
            485,
            260,
            58,
            'Return to survey',
            () => {
                window.close();
            }
        );

        this.addScreenText(
            640,
            555,
            'If this tab stays open, close it and return to the survey.',
            18,
            COLORS.muted,
            800,
            'center'
        ).setOrigin(0.5);
    } // This brace is required

    async saveGameData ()
    {
        console.log(
            'NATIONAL GAME DATA:',
            this.gameData
        );

    if (
        !this.isValidExternalId(
            this.gameData.gameId
        ) ||
        !this.isValidExternalId(
            this.gameData.qualtricsId
        )
    )
    {
        throw new Error(
            'The task ID or Qualtrics response ID is invalid.'
        );
    }

    if (!this.saveEndpoint)
    {
        throw new Error(
            'No save endpoint is configured.'
        );
    }

    this.gameData.saveStatus =
        'awaiting_confirmation';

    this.persistLocalBackup();

    this.sendSurveyBackup(
        'awaiting_confirmation'
    );

    const controller = new AbortController();
    let timeoutId;
    let saveAcknowledgement;
    const timeout = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error('Save confirmation timed out after 30 seconds.'));
            controller.abort();
        }, 30000);
    });

    try
    {
        // Bound both the request and reading its confirmation body.
        saveAcknowledgement = await Promise.race([
            (async () => {
                const response = await fetch(
                    this.saveEndpoint,
                    {
                        method: 'POST',
                        signal: controller.signal,
                        mode: 'cors',
                        credentials: 'omit',
                        cache: 'no-store',
                        redirect: 'follow',
                        headers: {
                            'Content-Type':
                                'text/plain;charset=utf-8'
                        },
                        body: JSON.stringify(
                            this.gameData
                        )
                    }
                );

                if (!response.ok)
                {
                    throw new Error(
                        `The save server returned HTTP ${response.status}.`
                    );
                }

                let acknowledgement;

                try
                {
                    acknowledgement =
                        await response.json();
                }
                catch (error)
                {
                    throw new Error(
                        'The save server did not return a valid JSON confirmation.'
                    );
                }

                const acknowledgementMatches =
                    acknowledgement &&
                    acknowledgement.ok === true &&
                    String(acknowledgement.gameId) ===
                        String(this.gameData.gameId) &&
                    String(acknowledgement.qualtricsId) ===
                        String(this.gameData.qualtricsId);

                if (!acknowledgementMatches)
                {
                    throw new Error(
                        'The save server did not confirm the matching game and Qualtrics IDs.'
                    );
                }

                return acknowledgement;
            })(),
            timeout
        ]);
    }
    finally
    {
        clearTimeout(timeoutId);
    }

    this.gameData.saveAcknowledged = true;
    this.gameData.saveStatus = 'confirmed';

    this.clearLocalBackup();

    return saveAcknowledgement;
}

getLocalBackupKey ()
{
    return (
        'americanEconomyTaskBackup:' +
        this.gameData.gameId
    );
}

persistLocalBackup ()
{
    const backupKey =
        this.getLocalBackupKey();

    try
    {
        localStorage.setItem(
            backupKey,
            JSON.stringify(this.gameData)
        );

        this.gameData.localBackupKey =
            backupKey;

        return true;
    }
    catch (error)
    {
        this.gameData.localBackupKey =
            null;

        return false;
    }
}

clearLocalBackup ()
{
    try
    {
        localStorage.removeItem(
            this.getLocalBackupKey()
        );

        this.gameData.localBackupKey =
            null;
    }
    catch (error)
    {
        /*
         * The confirmed server copy remains
         * the authoritative record.
         */
    }
}

buildAllocationInteractionSummary ()
{
    const summary = {};
    for (const task of ['free', 'self_interest'])
    {
        const actions = this.gameData.actions.filter(action => action.task === task);
        const transfers = actions.filter(action => action.action === 'transfer');
        summary[task] = {
            transferCount: transfers.length,
            multiBlockTransferCount: transfers.filter(action => action.units > 1).length,
            transferSizeSelectionCount: actions.filter(action => action.action === 'select_transfer_size').length,
            transferredUnits: transfers.reduce((total, action) => total + action.units, 0),
            clickTransferCount: transfers.filter(action => action.method === 'click').length,
            dragTransferCount: transfers.filter(action => action.method === 'drag').length,
            equalPresetCount: actions.filter(action => action.action === 'apply_equal_division').length,
            basicNeedsPresetCount: actions.filter(action => action.action === 'apply_automatic_partial_redistribution').length,
            resetCount: actions.filter(action => action.action === 'reset_allocation').length,
            elapsedMs: this.gameData.screenTimings[task === 'free' ? 'free_allocation_board' : 'self_interest_allocation_board'] || 0
        };
    }
    return summary;
}

buildSurveyBackupSummary ()
{
    return {
        economicPrincipleOrder: this.gameData.economicPrincipleOrder,
                redistributionTaskOrder: this.gameData.redistributionTaskOrder,
        redistributionBlocksCompleted: this.gameData.redistributionBlocksCompleted,
        gameId:
            this.gameData.gameId,

        qualtricsId:
            this.gameData.qualtricsId,

        condition:
            this.gameData.condition,

        respondentDecile:
            this.gameData.respondentDecile,
        incomeControlFallback: this.gameData.incomeControlFallback,
        incomeRoutingReason: this.gameData.incomeRoutingReason,
        selfInterestConditionIssue: this.gameData.selfInterestConditionIssue,

        deviceInfo: this.gameData.deviceInfo,
        userAgent: this.gameData.userAgent,
        screenTimings: this.gameData.screenTimings,
        allocationInteractionSummary: this.buildAllocationInteractionSummary(),
        practiceStages: this.gameData.practiceStages || [],
        dragPracticeCompleted: this.gameData.dragPracticeCompleted,

        comprehensionCheckChoice:
            this.gameData
                .comprehensionCheckChoice,

        comprehensionCheckPassed:
            this.gameData
                .comprehensionCheckPassed,

        manipulationCheckChoice:
            this.gameData
                .manipulationCheckChoice,

        manipulationCheckPassed:
            this.gameData
                .manipulationCheckPassed,

        freeAllocationFinal:
            this.gameData
                .freeAllocationFinal,

        equalDivisionOutcomeChoice:
            this.gameData
                .equalDivisionOutcomeChoice,

        partialRedistributionFinal:
            this.gameData
                .partialRedistributionFinal,

        redistributionChecklistChoices: this.gameData.redistributionChecklistChoices,
        redistributionChecklistOrders: this.gameData.redistributionChecklistOrders,
        redistributionChoices:
            this.gameData
                .redistributionChoices,

        economicPrinciples:
            this.gameData
                .economicPrinciples,

        selfInterestCondition:
            this.gameData
                .selfInterestCondition,

        respondentDecileRevealed:
            this.gameData
                .respondentDecileRevealed,

        selfInterestAllocationFinal:
            this.gameData
                .selfInterestAllocationFinal,

        selfInterestOwnChange:
            this.gameData
                .selfInterestOwnChange,

        selfInterestEqualButtonUsed:
            this.gameData
                .selfInterestEqualButtonUsed,

        selfInterestPartialButtonUsed:
            this.gameData
                .selfInterestPartialButtonUsed,

        gameEndTime:
            this.gameData.gameEndTime,

        totalDurationMs:
            this.gameData.totalDurationMs
    };
}

sendSurveyBackup (saveStatus)
{
    const message = {
        type:
            'national-resource-game-complete',

        saveStatus,

        gameId:
            this.gameData.gameId,

        qualtricsId:
            this.gameData.qualtricsId,

        condition:
            this.conditionName,

        summary:
            this.buildSurveyBackupSummary(),

        payload:
            this.gameData
    };

    const targetOrigin =
        this.parentOrigin || '*';

    const targets = [];

    if (
        window.opener &&
        !window.opener.closed
    )
    {
        targets.push(
            window.opener
        );
    }

    if (
        window.parent &&
        window.parent !== window
    )
    {
        targets.push(
            window.parent
        );
    }

    const uniqueTargets = [
        ...new Set(targets)
    ];

    uniqueTargets.forEach(target => {
        target.postMessage(
            message,
            targetOrigin
        );
    });

    this.gameData.parentBackupSent =
        uniqueTargets.length > 0;

    return this.gameData.parentBackupSent;
}

recordAction (action)
{
    this.gameData.actions.push({
        ...action,
        task: action.task || this.allocationMode || null,
        screen: this.currentScreenName,

        elapsedMs: Math.round(
            performance.now() -
            this.sessionStartPerformance
        ),

        timestamp:
            new Date().toISOString()
    });
}

recordAnswer (question, answer)
{
    this.recordAction({
        action: 'answer',
        question,
        answer
    });
}

enterScreen (screenName)
{
    this.finishCurrentScreen();

    this.currentScreenName =
        screenName;

    this.currentScreenStartedAt =
        performance.now();
}

finishCurrentScreen ()
{
    if (
        this.currentScreenName === null ||
        this.currentScreenStartedAt === null ||
        !this.gameData
    )
    {
        return;
    }

    const elapsed = Math.round(
        performance.now() -
        this.currentScreenStartedAt
    );

    const prior =
        this.gameData.screenTimings[
            this.currentScreenName
        ] || 0;

    this.gameData.screenTimings[
        this.currentScreenName
    ] = prior + elapsed;

    this.currentScreenStartedAt = null;
}

addPanel (
    centerX,
    centerY,
    width,
    height
)
{
    const panel = this.add.rectangle(
        centerX,
        centerY,
        width,
        height,
        COLORS.panel
    );

    panel.setStrokeStyle(
        2,
        COLORS.border
    );

    this.addScreenObject(panel);

    return panel;
}

addScreenText (
    x,
    y,
    text,
    fontSize,
    color,
    wrapWidth,
    align = 'left'
)
{
    const object = this.add.text(
        x,
        y,
        text,
        {
            fontFamily:
                'Arial, sans-serif',

            fontSize:
                `${fontSize}px`,

            color,
            align,
            lineSpacing: 6,

            wordWrap: {
                width: wrapWidth
            }
        }
    );

    this.addScreenObject(object);

    return object;
}

addButton (
    centerX,
    centerY,
    width,
    height,
    label,
    callback,
    fillColor = COLORS.button,
    textColor = COLORS.buttonText
)
{
    const button = this.add.rectangle(
        centerX,
        centerY,
        width,
        height,
        fillColor
    );

    button.setStrokeStyle(
        2,
        COLORS.border
    );

    button.setInteractive({
        useHandCursor: true
    });

    button.setDepth(100);

    this.addScreenObject(button);

    const labelText =
        this.addScreenText(
            centerX,
            centerY,
            label,
            21,
            textColor,
            width - 22,
            'center'
        ).setOrigin(0.5);

    labelText.setDepth(101);

    button.on(
        'pointerdown',
        callback
    );

    return button;
}

addScreenObject (object)
{
    this.screenObjects.push(object);

    return object;
}

clearScreen ()
{
        this.clearInstructionReview();
    this.confirmedChoiceBoxes = [];
    this.pendingAnswerCallback = null;
    this.answerNextButton = null;
    this.screenObjects.forEach(object => {
        if (
            object &&
            object.destroy &&
            object.active !== false
        )
        {
            object.destroy();
        }
    });

    this.screenObjects = [];
}

    addInstructionReview(text, x = 150, onReview = null) {
        this.reviewInstructionsText = text;
        const button = this.add.rectangle(x, 675, 250, 42, 0xffffff).setStrokeStyle(2, 0x263238).setDepth(2000).setInteractive({useHandCursor: true});
        const label = this.add.text(x, 675, 'Review instructions', {fontFamily: 'Arial', fontSize: '20px', color: '#263238'}).setOrigin(0.5).setDepth(2001);
        this.reviewInstructionsControls = [button, label];
        button.on('pointerdown', () => { if (onReview) onReview(); else this.openInstructionReview(); });
    }
    openInstructionReview() {
        if (this.instructionReviewOverlay) return;
        const disabled = [];
        const visit = object => {
            if (object.input && object.input.enabled) { disabled.push(object); object.input.enabled = false; }
            if (object.list) object.list.forEach(visit);
        };
        this.children.list.forEach(visit);
        const pausedTime = this.time.paused;
        this.time.paused = true;
        const tweens = this.tweens.getTweens().filter(tween => !tween.paused);
        tweens.forEach(tween => tween.pause());
        const objects = [];
        const add = object => { objects.push(object); return object; };
        const shade = add(this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.55).setDepth(10000).setInteractive());
        const stop = (...args) => { const event = args[args.length - 1]; if (event && event.stopPropagation) event.stopPropagation(); };
        ['pointerdown', 'pointerup', 'pointermove'].forEach(event => shade.on(event, stop));
        add(this.add.rectangle(640, 360, 1020, 500, 0xffffff).setStrokeStyle(3, 0x263238).setDepth(10001));
        add(this.add.text(640, 165, 'Review instructions', {fontFamily: 'Arial', fontSize: '30px', color: '#17212b'}).setOrigin(0.5).setDepth(10002));
        add(this.add.text(640, 340, this.reviewInstructionsText, {fontFamily: 'Arial', fontSize: '26px', color: '#17212b', align: 'center', wordWrap: {width: 890}, lineSpacing: 12}).setOrigin(0.5).setDepth(10002));
        const close = add(this.add.rectangle(640, 550, 260, 56, 0x17212b).setDepth(10003).setInteractive({useHandCursor: true}));
        add(this.add.text(640, 550, 'Return to task', {fontFamily: 'Arial', fontSize: '24px', color: '#ffffff'}).setOrigin(0.5).setDepth(10004));
        this.instructionReviewOverlay = {objects, disabled, pausedTime, tweens};
        close.on('pointerup', (...args) => { stop(...args); this.closeInstructionReview(); });
    }
    closeInstructionReview() {
        const overlay = this.instructionReviewOverlay;
        if (!overlay) return;
        this.instructionReviewOverlay = null;
        overlay.objects.forEach(object => object.destroy());
        overlay.disabled.forEach(object => { if (object.active && object.input) object.input.enabled = true; });
        this.time.paused = overlay.pausedTime;
        overlay.tweens.forEach(tween => { if (tween.parent) tween.resume(); });
    }
    clearInstructionReview() {
        this.closeInstructionReview();
        (this.reviewInstructionsControls || []).forEach(object => { if (object.active) object.destroy(); });
        this.reviewInstructionsControls = [];
    }
}
