export default class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
      super(scene, x, y, 'player')
      scene.add.existing(this)
      scene.physics.add.existing(this)
  
      this.setCollideWorldBounds(true)
    }

    jump() {

    }

    shoot() {

    }

    duck() {

    }

    go(direction) {
        
    }

    preload() {

    }

    create() {

    }

    update() {

    }
  }
  