import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

export default class Enemy {
    constructor({ experience, playerRef, position }) {
        this.experience = experience
        this.scene = experience.scene
        this.physics = experience.physics
        this.resources = experience.resources
        this.time = experience.time

        this.playerRef = playerRef

        // CONFIGURACIÓN
        this.speed = 1
        this.attackDistance = 1.2   
        this.attackCooldown = 1000  
        this.lastAttackTime = 0

        this.setModel(position)
        this.setPhysics()
        this.setAnimation()
    }

    setModel(position) {
        const resource = this.resources.items.zombieModel

        this.model = SkeletonUtils.clone(resource.scene)
        this.model.scale.set(0.5, 0.5, 0.5)

        // 👇 ajuste de altura (clave)
        this.model.position.set(0, -1, 0)

        this.group = new THREE.Group()
        this.group.add(this.model)
        this.group.position.copy(position)
        this.scene.add(this.group)

        this.model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true
            }
        })
    }

    setPhysics() {
        const shape = new CANNON.Sphere(0.5)

        this.body = new CANNON.Body({
            mass: 1,
            linearDamping: 0.9,
            angularDamping: 1.0,
            shape,
            position: new CANNON.Vec3(
                this.group.position.x,
                this.group.position.y,
                this.group.position.z
            )
        })

        this._spawnY = this.group.position.y
        this.physics.world.addBody(this.body)
    }

    setAnimation() {
        const resource = this.resources.items.zombieModel

        this.animation = {}
        this.animation.mixer = new THREE.AnimationMixer(this.model)
        this.animation.actions = {}

        resource.animations.forEach((clip) => {
            this.animation.actions[clip.name] = this.animation.mixer.clipAction(clip)
        })
        const clips = resource.animations
        this.animation.idleAction = this.animation.actions[clips.find(c => c.name.toLowerCase().includes('idle'))?.name] || Object.values(this.animation.actions)[0]
        this.animation.walkAction  = this.animation.actions[clips.find(c => c.name.toLowerCase().includes('walk'))?.name]
        this.animation.deathAction = this.animation.actions[clips.find(c => c.name.toLowerCase().includes('death'))?.name]
        this.animation.attackAction = this.animation.actions[clips.find(c => c.name.toLowerCase().includes('punch'))?.name]

        if (this.animation.walkAction) {
            this.animation.walkAction.setLoop(THREE.LoopRepeat)
            this.animation.walkAction.play()
            this.animation.actions.current = this.animation.walkAction
        } else if (this.animation.idleAction) {
            this.animation.idleAction.setLoop(THREE.LoopRepeat)
            this.animation.idleAction.play()
            this.animation.actions.current = this.animation.idleAction
        }
    }

    playAnimation(action) {
        if (!action || action === this.animation.actions.current) return

        action.reset().play()
        if (this.animation.actions.current) {
            action.crossFadeFrom(this.animation.actions.current, 0.3)
        }
        this.animation.actions.current = action
    }

    followPlayer(delta) {
        // --- CAMBIO: Si el jugador no existe o está muerto (vida <= 0), el enemigo se queda quieto ---
        if (!this.playerRef || this.playerRef.health <= 0) {
            this.playAnimation(this.animation.idleAction)
            return
        }
        // ------------------------------------------------------------------------------------------

        const enemyPos = this.body.position
        const playerPos = this.playerRef.body ? this.playerRef.body.position : this.playerRef.group.position

        const dx = playerPos.x - enemyPos.x
        const dz = playerPos.z - enemyPos.z
        const distance = Math.sqrt(dx * dx + dz * dz)

        if (!isFinite(dx) || !isFinite(dz)) return

        if (distance > this.attackDistance) {
            this.attacking = false

            const nx = dx / distance
            const nz = dz / distance

            this.body.position.x += nx * this.speed * delta
            this.body.position.z += nz * this.speed * delta
            
            // 🔧 FIX HUNDIMIENTO: Forzamos la Y siempre para que no se entierre al colisionar
            this.body.position.y = this._spawnY  

            const angle = Math.atan2(nx, nz)
            this.group.rotation.y = angle

            this.playAnimation(this.animation.walkAction || this.animation.idleAction)
        } else {
            this.attack()
            // 🔧 FIX HUNDIMIENTO: También mientras ataca mantenemos la altura
            this.body.position.y = this._spawnY 
        }
    }

    attack() {
        // --- CAMBIO: No atacar si el jugador ya murió ---
        if (this.playerRef.health <= 0) return 

        const now = Date.now()

        if (now - this.lastAttackTime < this.attackCooldown) return
        this.lastAttackTime = now

        this.playAnimation(this.animation.attackAction || this.animation.idleAction)

        // HACER DAÑO
        if (this.playerRef?.takeDamage) {
            this.playerRef.takeDamage(1)
        }
    }

    update() {
        const delta = this.time.delta * 0.001

        if (this.animation?.mixer) {
            this.animation.mixer.update(delta)
        }

        if (this.delayActivation > 0) {
            this.delayActivation -= delta
            return
        }

        this.followPlayer(delta)

        this.group.position.copy(this.body.position)
    }

    destroy() {
        if (this.animation?.deathAction) {
            this.animation.deathAction.reset().play()
        }
        if (this.group) {
            setTimeout(() => this.scene.remove(this.group), 800)
        }

        if (this.body && this.physics.world.bodies.includes(this.body)) {
            this.physics.world.removeBody(this.body)
        }
    }
}