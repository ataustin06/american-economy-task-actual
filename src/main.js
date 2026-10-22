import Start from './scenes/TaskScene.js?v=20261021-feasibility-labels';

window.TASK_SETUP = Object.freeze({kind: 'economy', condition: 'actual'});

const portrait = window.innerHeight > window.innerWidth;
const logicalWidth = portrait ? 720 : 1280;
const logicalHeight = portrait ? 1280 : 720;
const displayScale = Math.min(window.innerWidth / logicalWidth, window.innerHeight / logicalHeight);
const physicalScale = displayScale * (window.devicePixelRatio || 1);
const renderScale = Math.min(2, Math.max(1, Math.ceil(physicalScale * 4) / 4));
const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: logicalWidth * renderScale,
    height: logicalHeight * renderScale,
    backgroundColor: '#f4f6f8',
    scene: [Start],
    scale: {mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH}
};

window.taskGame = new Phaser.Game(config);
