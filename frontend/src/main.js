import Phaser from "phaser";
import PlayScene from "./PlayScene.js";

const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 800,
        height: 800,
        resize: true,
    },
    backgroundColor: "#ac7630",
    parent: "game-container",
    scene: [PlayScene],
};

new Phaser.Game(config);


