import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import Sound from './Sound.js'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class Robot {
    constructor(experience) {
        this.experience = experience
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.physics = this.experience.physics
        this.keyboard = this.experience.keyboard
        this.debug = this.experience.debug
        this.points = 0

        // VIDA
        this.health = 3
        this.maxHealth = 3

        // daño
        this.lastDamageTime = 0
        this.damageCooldown = 800 // ms

        this.setModel()
        this.setSounds()
        this.setPhysics()
        this.setAnimation()
    }

    setModel() {
        this.model = SkeletonUtils.clone(this.resources.items.personajeModel.scene)
        this.model.scale.set(0.5, 0.5, 0.5)
        this.model.position.set(0, -0.1, 0)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        const shape = new CANNON.Sphere(0.4)

        this.body = new CANNON.Body({
            mass: 2,
            shape: shape,
            position: new CANNON.Vec3(0, 1.2, 0),
            linearDamping: 0.99,   // 🔧 FIX: alto damping para que pare inmediatamente al soltar tecla / al chocar
            angularDamping: 1.0    // 🔧 FIX: sin rotación angular en absoluto
        })

        // 🔧 FIX: solo rotación en Y, nunca en X/Z (evita que se vuelque)
        this.body.angularFactor.set(0, 0, 0)

        // 🔧 FIX: bloquear movimiento en Y para que no salga volando hacia arriba en colisiones
        // (el salto se maneja manualmente con impulso)
        this.body.linearFactor.set(1, 1, 1) // lo mantenemos libre pero controlamos Y manualmente

        this.body.velocity.setZero()
        this.body.angularVelocity.setZero()
        this.body.allowSleep = false   // 🔧 FIX TRABADO: el robot NUNCA duerme
        this.body.material = this.physics.robotMaterial

        this.physics.world.addBody(this.body)
    }

    setSounds() {
        this.walkSound = new Sound('/sounds/robot/walking.mp3', { loop: true, volume: 0.5 })
        this.jumpSound = new Sound('/sounds/robot/jump.mp3', { volume: 0.8 })
    }

    setAnimation() {
        this.animation = {}

        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}
        const clips = this.resources.items.personajeModel.animations
        const getClip = (keyword) => clips.find(c => c.name.toLowerCase().includes(keyword)) || clips[0]

        this.animation.actions.run = this.animation.mixer.clipAction(getClip('run'))
        this.animation.actions.death = this.animation.mixer.clipAction(getClip('death'))
        this.animation.actions.idle = this.animation.mixer.clipAction(getClip('idle'))
        this.animation.actions.walking = this.animation.mixer.clipAction(getClip('walk'))

        if (this.animation.actions.death) {
            this.animation.actions.death.setLoop(THREE.LoopOnce)
            this.animation.actions.death.clampWhenFinished = true
        }

        this.animation.actions.current = this.animation.actions.idle
        this.animation.actions.current.play()

        this.animation.play = (name) => {
            const newAction = this.animation.actions[name]
            const oldAction = this.animation.actions.current

            newAction.reset()
            newAction.play()
            newAction.crossFadeFrom(oldAction, 0.3)
            this.animation.actions.current = newAction

            if (name === 'walking') {
                this.walkSound.play()
            } else {
                this.walkSound.stop()
            }

        }
    }

    // RECIBIR DAÑO
    takeDamage(amount) {
        const now = Date.now()

        // evitar daño continuo
        if (now - this.lastDamageTime < this.damageCooldown) return
        this.lastDamageTime = now

        if (!this.body) return

        this.health -= amount
        this.experience.menu.setHealth?.(this.health, this.maxHealth)

        // feedback visual
        this.model.traverse(child => {
            if (child.isMesh) child.material.color.set(0xff0000)
        })

        setTimeout(() => {
            this.model.traverse(child => {
                if (child.isMesh) child.material.color.set(0xffffff)
            })
        }, 200)

        if (this.health <= 0) {
            this.die()
        }
    }

    update() {
        // --- CAMBIO PARA QUE LA ANIMACIÓN NO SE CONGELE ---
        const delta = this.time.delta * 0.001
        this.animation.mixer.update(delta) 
        // -------------------------------------------------

        if (this.animation.actions.current === this.animation.actions.death) return
        if (!this.body) return

        // 🔧 FIX TRABADO: forzar wakeUp cada frame para que Cannon no duerma el cuerpo
        // al estar presionado contra una pared (velocidad neta ≈ 0 → Cannon lo duerme → se traba)
        this.body.wakeUp()

        const keys = this.keyboard.getState()
        const turnSpeed = 2.5
        let isMoving = false

        const walkSpeed = 5
        const runSpeed = 12

        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.group.quaternion)

        // Si cae fuera del mundo, resetear
        if (this.body.position.y > 10 || this.body.position.y < -10) {
            this.body.position.set(0, 1.2, 0)
            this.body.velocity.set(0, 0, 0)
        }

        // Guardar velocidad Y para no cancelar gravedad/salto
        const currentVelY = this.body.velocity.y

        if (keys.up) {
            const isRunning = keys.shift
            const speed = isRunning ? runSpeed : walkSpeed
            this.body.velocity.x = forward.x * speed
            this.body.velocity.z = forward.z * speed
            isMoving = true

            if (isRunning && this.animation.actions.run) {
                if (this.animation.actions.current !== this.animation.actions.run) {
                    this.animation.play('run')
                }
            }
        } else if (keys.down) {
            this.body.velocity.x = -forward.x * walkSpeed
            this.body.velocity.z = -forward.z * walkSpeed
            isMoving = true
        } else {
            // Sin tecla: detener horizontal inmediatamente
            this.body.velocity.x = 0
            this.body.velocity.z = 0
        }

        // Restaurar Y (gravedad y salto siguen funcionando)
        this.body.velocity.y = currentVelY

        if (keys.left) {
            this.group.rotation.y += turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        if (keys.right) {
            this.group.rotation.y -= turnSpeed * delta
            this.body.quaternion.setFromEuler(0, this.group.rotation.y, 0)
        }

        if (isMoving) {
            if (this.animation.actions.current !== this.animation.actions.walking &&
                this.animation.actions.current !== this.animation.actions.run) {
                this.animation.play('walking')
            }
        } else {
            if (this.animation.actions.current !== this.animation.actions.idle) {
                this.animation.play('idle')
            }
        }

        this.group.position.copy(this.body.position)
    }

    die() {
        if (this.animation.actions.current !== this.animation.actions.death) {
            this.animation.actions.current.fadeOut(0.2)
            this.animation.actions.death.reset().fadeIn(0.2).play()
            this.animation.actions.current = this.animation.actions.death


            this.walkSound.stop()

            if (this.physics.world.bodies.includes(this.body)) {
                this.physics.world.removeBody(this.body)
            }
            this.body = null

            // la animación death tumba el modelo sola

            // notificar derrota
            setTimeout(() => {
                this.experience.modal.show({
                    icon: '💀',
                    message: '¡Has sido derrotado!\n¿Quieres intentarlo otra vez?',
                    buttons: [
                        {
                            text: '🔁 Reintentar',
                            onClick: () => this.experience.resetGameToFirstLevel()
                        },
                        {
                            text: '❌ Salir',
                            onClick: () => this.experience.resetGame()
                        }
                    ]
                })
            }, 1200) // Se aumentó un poco para que dé tiempo a ver la caída
        }


    }


    revive() {
        this.health = this.maxHealth   // 👈 recuperar vida
        this.setPhysics()

        this.group.rotation.set(0, 0, 0)

        this.animation.actions.death.stop()
        this.animation.actions.idle.reset().play()
        this.animation.actions.current = this.animation.actions.idle
        setTimeout(() => {
    this.experience.menu.setHealth?.(this.health, this.maxHealth)
}, 500)
    }


}
