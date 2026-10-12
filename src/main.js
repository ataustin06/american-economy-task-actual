console.log('MAIN.JS LOADED');

import Start from './scenes/Start.js';

console.log('START IMPORTED:', Start);

const config = {
    type: Phaser.AUTO,

    parent: 'game-container',

    width: 1280,
    height: 720,

    backgroundColor: '#ffffff',

    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },

    scene: [Start],

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

new Phaser.Game(config);