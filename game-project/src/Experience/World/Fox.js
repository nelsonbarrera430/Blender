import * as THREE from 'three'

export default class Fox {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug

        // Debug
        if (this.debug.active) {
            this.debugFolder = this.debug.ui.addFolder('fox')
        }

        // Resource
        this.resource = this.resources.items.foxModel

        this.setModel()
        this.setAnimation()
    }

    setModel() {
        this.model = this.resource.scene
        this.model.scale.set(0.02, 0.02, 0.02)
        this.model.position.set(3, 0, 0)
        this.scene.add(this.model)
        //Activando la sobra de fox
        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }
    //Manejo GUI
    setAnimation() {
        this.animation = {}

        // Mixer
        this.animation.mixer = new THREE.AnimationMixer(this.model)

        // Actions
        this.animation.actions = {}

        this.animation.actions.idle = this.animation.mixer.clipAction(this.resource.animations[0])
        this.animation.actions.walking = this.animation.mixer.clipAction(this.resource.animations[1])
        this.animation.actions.running = this.animation.mixer.clipAction(this.resource.animations[2])

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        // Play the action
        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 1)

            this.animation.actions.current = newAction
        }

        // Debug
        if (this.debug.active) {
            const debugObject = {
                playIdle: () => { this.animation.play('idle') },
                playWalking: () => { this.animation.play('walking') },
                playRunning: () => { this.animation.play('running') }
            }
            this.debugFolder.add(debugObject, 'playIdle')
            this.debugFolder.add(debugObject, 'playWalking')
            this.debugFolder.add(debugObject, 'playRunning')
        }
    }

    update() {
    this.animation.mixer.update(this.time.delta * 0.001)

    const robot = this.experience.world?.robot
    if (!robot?.group) return

    const foxPos = this.model.position
    const playerPos = robot.group.position

    const dx = playerPos.x - foxPos.x
    const dz = playerPos.z - foxPos.z
    const distance = Math.sqrt(dx * dx + dz * dz)

    // Seguir al jugador si está lejos
    const followDistance = 5
    const stopDistance = 2

    if (distance > followDistance) {
        // Correr
        const speed = 0.05
        foxPos.x += (dx / distance) * speed * this.time.delta * 0.1
        foxPos.z += (dz / distance) * speed * this.time.delta * 0.1

        if (this.animation.actions.current !== this.animation.actions.running) {
            this.animation.play('running')
        }
    } else if (distance > stopDistance) {
        // Caminar
        const speed = 0.02
        foxPos.x += (dx / distance) * speed * this.time.delta * 0.1
        foxPos.z += (dz / distance) * speed * this.time.delta * 0.1

        if (this.animation.actions.current !== this.animation.actions.walking) {
            this.animation.play('walking')
        }
    } else {
        // Idle
        if (this.animation.actions.current !== this.animation.actions.idle) {
            this.animation.play('idle')
        }
    }

    // Rotar hacia el jugador
    if (distance > stopDistance) {
        const angle = Math.atan2(dx, dz)
        this.model.rotation.y = angle
    }
}
}
