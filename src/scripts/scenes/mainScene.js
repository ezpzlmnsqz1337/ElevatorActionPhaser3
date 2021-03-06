import ObjectFactory from '../factory/ObjectFactory'
import FpsText from '../objects/fpsText'
import EventType from '../types/EventType'
import BulletOwner from '../types/BulletOwner'
import Direction from '../types/Direction'
import eventBus from '../EventBus'

import io from 'socket.io-client'

export default class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' })
        this.objectFactory = ObjectFactory.getInstance()
        
        // network
        this.socket = null

        // game status
        this.gameOver = false
        this.scoreText = null
        this.fpsText = null
    }

    bindEvents() {
        this.socket = io('http://localhost:3000')
        // socket status
        this.socket.on('connect', () => console.log('connect'))
        this.socket.on('disconnect', () => console.log('disconnect'))
        // game socket events
        this.socket.on(EventType.GAME_INFO, e => this.handleGameInfo(e))
        this.socket.on(EventType.PLAYER_DISCONNECTED, e => this.handlePlayerDisconnected(e))
        this.socket.on(EventType.PLAYER_MOVED, e => this.handlePlayerMoved(e))
        this.socket.on(EventType.PLAYER_CONNECTED, e => this.handlePlayerConnected(e))
        this.socket.on(EventType.BULLET_CREATE, e => this.handleBulletCreate(e))        
        this.socket.on(EventType.PLAYER_DIED, e => this.handlePlayerDied(e))

        // game events
        eventBus.on(EventType.PLAYER_SHOOT, e => this.handlePlayerShoot(e))
    }

    handlePlayerConnected(e) {
        const playerInfo = e
        console.log('Player connected: ', playerInfo)
        const player = this.objectFactory.createPlayer(this, playerInfo.x, playerInfo.y, { mainPlayer: false, playerId: playerInfo.playerId })
        this.otherPlayers.add(player)
        console.log(this.otherPlayers.getChildren())
    }

    handlePlayerDisconnected(e) {
        const playerId = e
        console.log('Player disconnected: ', playerId)
        this.otherPlayers.getChildren().forEach(x => {
            if (playerId === x.playerId) {
                x.destroy()
            }
        })
    }

    handleGameInfo(e) {
        const players = e.players
        console.log('Current players: ', players)
        Object.keys(players).forEach(id => {            
            if (players[id].playerId === this.socket.id) {
                const player = this.objectFactory.createPlayer(this, players[id].x, players[id].y, { mainPlayer: true, playerId: players[id].playerId })
                this.player = player
            } else {
                console.log('Adding other player:  ', players[id].playerId)
                const player = this.objectFactory.createPlayer(this, players[id].x, players[id].y, { mainPlayer: false, playerId: players[id].playerId })
                this.otherPlayers.add(player)
            }
        })
        
        const bullets = e.bullets
        Object.keys(bullets).forEach(bulletId => {
            if (!this.bullets.getChildren().map(x => x.id).includes(bulletId)) {
                this.objectFactory.createBullet(this, bullets[bulletId].x, bullets[bulletId].y, { direction: bullets[bulletId].direction, id: bulletId, group: this.bullets })
            }
        })
    }

    handlePlayerMoved(e) {
        const playerInfo = e        
        console.log('Player moved', playerInfo.playerId)
        this.otherPlayers.getChildren().forEach(x => {            
            if (playerInfo.playerId === x.id) {
                x.setPosition(playerInfo.x, playerInfo.y)
                const loop = Object.keys(Direction).includes(playerInfo.animation) ? true : false
                x.anims.play(playerInfo.animation, loop)
            }
        })
    }

    handlePlayerShoot(e) {
        const y = e.player.body.top + e.player.height / 2
        const bullet = this.objectFactory.createBullet(this, e.player.x, y, { owner: e.player.id, direction: e.player.anims.currentAnim.key, group: this.bullets })
        console.log('Bullet: ', bullet.id)
        this.socket.emit(EventType.BULLET_CREATED, { id: bullet.id, x: bullet.x, y: bullet.y, owner: bullet.owner, direction: bullet.direction })
    }

    handleBulletCreate(e) {
        const bullet = e
        this.objectFactory.createBullet(this, bullet.x, bullet.y, { id: bullet.id, owner: bullet.owner, direction: bullet.direction, group: this.bullets })
    }

    handlePlayerDied(e) {
        console.log('Player died', e)
        // main player kills
        if (e.killer.id === this.player.id) {
            this.player.frag()
        }

        // main player died
        if (e.dead.id === this.player.id) {
            this.player.die()
        }
    }

    create() {
        this.player = null
        this.otherPlayers = this.physics.add.group()
        this.platforms = this.physics.add.staticGroup()
        this.stars = this.physics.add.group()
        this.bombs = this.physics.add.group()
        this.bullets = this.physics.add.group()

        // controls
        this.cursors = this.input.keyboard.createCursorKeys()//  Input Events
        this.spacebar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)


        console.log('Create', this)
        this.bindEvents()

        this.fpsText = new FpsText(this)
        //  A simple background for our game
        this.add.image(400, 300, 'sky')

        // ground
        this.objectFactory.createPlatform(this, 400, 0, { name: 'platform', scale: 2, group: this.platforms })
        const leftWall = this.objectFactory.createPlatform(this, 5, 270, { name: 'platform', scale: 2, group: this.platforms })
        leftWall.displayWidth = 10
        leftWall.displayHeight = 540
        const rightWall = this.objectFactory.createPlatform(this, 795, 270, { name: 'platform', scale: 2, group: this.platforms })
        rightWall.displayWidth = 10
        rightWall.displayHeight = 540


        this.objectFactory.createPlatform(this, 400, 568, { name: 'platform', scale: 2, group: this.platforms })
        //  Now let's create some ledges
        this.objectFactory.createPlatform(this, 600, 400, { name: 'platform', group: this.platforms })
        this.objectFactory.createPlatform(this, 50, 250, { name: 'platform', group: this.platforms })
        this.objectFactory.createPlatform(this, 750, 220, { name: 'platform', group: this.platforms })

        //  Input Events

        //  The score
        this.scoreText = this.add.text(16, 16, 'score: 0', { fontSize: '32px', fill: '#000' })

        // display the Phaser.VERSION
        this.add
        .text(this.cameras.main.width - 15, 15, `Phaser v${Phaser.VERSION}`, {
            color: '#000000',
            fontSize: 24
        })
        .setOrigin(1, 0)
    }

    update() {
        this.fpsText.update()

        if (this.player && !this.gameOver) {
            this.player.update()
        }

        // emit bullet movement
        if (this.bullets) {
            this.bullets.getChildren().forEach(b => b.update())
        }
    }
}
