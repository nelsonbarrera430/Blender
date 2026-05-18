// FinalPrizeParticles.js — Vórtex permanente centrado en el portal
import * as THREE from 'three'

export default class FinalPrizeParticles {
  constructor({ scene, targetPosition, sourcePosition, experience }) {
    this.scene = scene
    this.experience = experience
    this.clock = new THREE.Clock()
    this.time = 0
    this.target = targetPosition.clone()
    this.group = new THREE.Group()
    this.scene.add(this.group)

    this._createVortex()
    this._createRings()
    this._createLightning()
    this._createCore()
    this._createShockwave()
    this._createOrbitParticles()  // nuevo: partículas orbitales

    this.experience.time.on('tick', this.update)
    // SIN setTimeout dispose — permanente hasta que se limpie la escena
  }

  _createVortex() {
    this.vortexCount = 180
    this.vortexAngles  = new Float32Array(this.vortexCount)
    this.vortexRadii   = new Float32Array(this.vortexCount)
    this.vortexHeights = new Float32Array(this.vortexCount)
    this.vortexSpeeds  = new Float32Array(this.vortexCount)

    const positions = new Float32Array(this.vortexCount * 3)
    const colors    = new Float32Array(this.vortexCount * 3)

    // Paleta con verde incluido
    const palette = [
      new THREE.Color(0x00ffff),
      new THREE.Color(0xff00ff),
      new THREE.Color(0x00ff00),  // verde
      new THREE.Color(0x00ff88),  // verde neón
      new THREE.Color(0x44ff44),  // verde claro
      new THREE.Color(0x8800ff),
    ]

    for (let i = 0; i < this.vortexCount; i++) {
      const t = i / this.vortexCount
      const angle  = t * Math.PI * 8
      const radius = 0.2 + t * 1.2   // más compacto, cerca del objeto
      const height = (t - 0.5) * 1.5 // centrado verticalmente en 0

      this.vortexAngles[i]  = angle
      this.vortexRadii[i]   = radius
      this.vortexHeights[i] = height
      this.vortexSpeeds[i]  = 3 + Math.random() * 4

      const i3 = i * 3
      positions[i3]     = this.target.x + Math.cos(angle) * radius
      positions[i3 + 1] = this.target.y + height
      positions[i3 + 2] = this.target.z + Math.sin(angle) * radius

      const c = palette[i % palette.length]
      colors[i3]     = c.r
      colors[i3 + 1] = c.g
      colors[i3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
    })

    this.vortexPoints = new THREE.Points(geo, mat)
    this.group.add(this.vortexPoints)
    this.vortexGeo = geo
  }

  _createRings() {
    this.rings = []
    const ringColors = [0x00ff00, 0x00ffff, 0x44ff44]  // verdes y cyan

    for (let r = 0; r < 3; r++) {
      const geo = new THREE.TorusGeometry(0.5 + r * 0.35, 0.04, 8, 48)
      const mat = new THREE.MeshBasicMaterial({
        color: ringColors[r],
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.copy(this.target)
      mesh.position.y += (r - 1) * 0.4  // centrado alrededor del objeto
      mesh.rotation.x = Math.PI / 2
      this.scene.add(mesh)
      this.rings.push({ mesh, baseY: mesh.position.y, speed: 2 + r * 1.5, phase: r * 1.1 })
    }
  }

  _createLightning() {
    this.lightnings = []
    for (let i = 0; i < 6; i++) {
      const points = this._randomLightningPoints()
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? 0x00ff00 : 0x00ffff,  // verde y cyan
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      })
      const line = new THREE.Line(geo, mat)
      this.scene.add(line)
      this.lightnings.push({ line, geo, timer: 0, interval: 0.05 + Math.random() * 0.1 })
    }
  }

  _randomLightningPoints() {
    const pts = []
    const cx = this.target.x
    const cy = this.target.y
    const cz = this.target.z
    const angle = Math.random() * Math.PI * 2
    const r = 1.0 + Math.random() * 1.0
    let x = cx + Math.cos(angle) * r
    let z = cz + Math.sin(angle) * r
    pts.push(new THREE.Vector3(x, cy + Math.random() * 1, z))
    for (let s = 0; s < 4; s++) {
      x += (Math.random() - 0.5) * 0.5
      z += (Math.random() - 0.5) * 0.5
      pts.push(new THREE.Vector3(x, cy - s * 0.3 + (Math.random() - 0.5) * 0.3, z))
    }
    pts.push(new THREE.Vector3(cx, cy - 0.5, cz))
    return pts
  }

  _createCore() {
    const geo = new THREE.SphereGeometry(0.2, 16, 16)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
    this.core = new THREE.Mesh(geo, mat)
    this.core.position.copy(this.target)
    this.scene.add(this.core)

    const haloGeo = new THREE.SphereGeometry(0.4, 16, 16)
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.BackSide,
    })
    this.halo = new THREE.Mesh(haloGeo, haloMat)
    this.halo.position.copy(this.core.position)
    this.scene.add(this.halo)
  }

  _createShockwave() {
    const geo = new THREE.RingGeometry(0.1, 0.3, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    this.shockwave = new THREE.Mesh(geo, mat)
    this.shockwave.rotation.x = -Math.PI / 2
    this.shockwave.position.copy(this.target)
    this.scene.add(this.shockwave)
    this.shockwaveRadius = 0.2
  }

  // Partículas orbitales — nueva forma, orbitan como electrones
  _createOrbitParticles() {
    this.orbitCount = 60
    this.orbitAngles = new Float32Array(this.orbitCount)
    this.orbitRadii  = new Float32Array(this.orbitCount)
    this.orbitSpeeds = new Float32Array(this.orbitCount)
    this.orbitTilts  = new Float32Array(this.orbitCount)

    const positions = new Float32Array(this.orbitCount * 3)
    const colors    = new Float32Array(this.orbitCount * 3)

    const palette = [
      new THREE.Color(0x00ff00),
      new THREE.Color(0x44ff44),
      new THREE.Color(0x00ff88),
      new THREE.Color(0x00ffff),
    ]

    for (let i = 0; i < this.orbitCount; i++) {
      this.orbitAngles[i] = Math.random() * Math.PI * 2
      this.orbitRadii[i]  = 0.6 + Math.random() * 1.0
      this.orbitSpeeds[i] = (1 + Math.random() * 2) * (Math.random() > 0.5 ? 1 : -1)
      this.orbitTilts[i]  = Math.random() * Math.PI  // inclinación del plano orbital

      const r = this.orbitRadii[i]
      const a = this.orbitAngles[i]
      const i3 = i * 3
      positions[i3]     = this.target.x + Math.cos(a) * r
      positions[i3 + 1] = this.target.y + Math.sin(a) * 0.3
      positions[i3 + 2] = this.target.z + Math.sin(a) * r

      const c = palette[i % palette.length]
      colors[i3]     = c.r
      colors[i3 + 1] = c.g
      colors[i3 + 2] = c.b
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

    const mat = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      depthWrite: false,
    })

    this.orbitPoints = new THREE.Points(geo, mat)
    this.group.add(this.orbitPoints)
    this.orbitGeo = geo
  }

  update = () => {
    const delta = this.clock.getDelta()
    this.time += delta

    const accel = 1 + Math.min(this.time * 0.2, 1)  // acelera pero con tope

    // — Vórtex — (sin shrink, permanente)
    const pos = this.vortexGeo.attributes.position.array
    for (let i = 0; i < this.vortexCount; i++) {
      this.vortexAngles[i] += this.vortexSpeeds[i] * accel * delta

      const r = this.vortexRadii[i]
      const h = this.vortexHeights[i]

      const i3 = i * 3
      pos[i3]     = this.target.x + Math.cos(this.vortexAngles[i]) * r
      pos[i3 + 1] = this.target.y + h
      pos[i3 + 2] = this.target.z + Math.sin(this.vortexAngles[i]) * r
    }
    this.vortexGeo.attributes.position.needsUpdate = true
    this.vortexPoints.material.opacity = 1  // siempre visible

    // — Anillos —
    for (const ring of this.rings) {
      ring.mesh.rotation.z += (4 + accel) * delta
      ring.mesh.rotation.y += 2 * delta
      ring.mesh.position.y = ring.baseY + Math.sin(this.time * 3 + ring.phase) * 0.1
      ring.mesh.material.opacity = 0.85  // siempre visible
      const s = 1 + Math.sin(this.time * 5 + ring.phase) * 0.1
      ring.mesh.scale.set(s, s, s)
    }

    // — Rayos —
    for (const bolt of this.lightnings) {
      bolt.timer += delta
      if (bolt.timer >= bolt.interval) {
        bolt.timer = 0
        bolt.interval = 0.04 + Math.random() * 0.08
        const pts = this._randomLightningPoints()
        bolt.geo.setFromPoints(pts)
        bolt.line.material.opacity = 0.6 + Math.random() * 0.4
      }
    }

    // — Núcleo pulsa —
    const pulse = 1 + Math.sin(this.time * 12) * 0.3
    this.core.scale.setScalar(pulse)
    this.halo.scale.setScalar(pulse * 1.5)
    this.halo.material.opacity = 0.2 + Math.sin(this.time * 6) * 0.1

    // color del núcleo oscila entre verde y cyan
    const hue = 0.3 + Math.sin(this.time) * 0.1  // verde-cyan
    this.core.material.color.setHSL(hue, 1, 0.6)

    // — Onda de choque se expande, reinicia al llegar al límite —
    this.shockwaveRadius += delta * 2
    if (this.shockwaveRadius > 3) this.shockwaveRadius = 0.2  // reinicia
    this.shockwave.scale.setScalar(this.shockwaveRadius)
    this.shockwave.material.opacity = Math.max(0, 0.8 - this.shockwaveRadius * 0.3)

    // — Partículas orbitales —
    const opos = this.orbitGeo.attributes.position.array
    for (let i = 0; i < this.orbitCount; i++) {
      this.orbitAngles[i] += this.orbitSpeeds[i] * delta

      const r = this.orbitRadii[i]
      const a = this.orbitAngles[i]
      const tilt = this.orbitTilts[i]

      const i3 = i * 3
      opos[i3]     = this.target.x + Math.cos(a) * r * Math.cos(tilt)
      opos[i3 + 1] = this.target.y + Math.sin(a) * r * Math.sin(tilt)
      opos[i3 + 2] = this.target.z + Math.sin(a) * r * Math.cos(tilt)
    }
    this.orbitGeo.attributes.position.needsUpdate = true
  }

  dispose() {
    this.experience.time.off('tick', this.update)

    this.scene.remove(this.group)
    this.vortexGeo.dispose()
    this.vortexPoints.material.dispose()

    for (const ring of this.rings) {
      this.scene.remove(ring.mesh)
      ring.mesh.geometry.dispose()
      ring.mesh.material.dispose()
    }

    for (const bolt of this.lightnings) {
      this.scene.remove(bolt.line)
      bolt.geo.dispose()
      bolt.line.material.dispose()
    }

    this.scene.remove(this.core)
    this.scene.remove(this.halo)
    this.core.geometry.dispose()
    this.core.material.dispose()
    this.halo.geometry.dispose()
    this.halo.material.dispose()

    this.scene.remove(this.shockwave)
    this.shockwave.geometry.dispose()
    this.shockwave.material.dispose()

    if (this.orbitPoints) {
      this.orbitGeo.dispose()
      this.orbitPoints.material.dispose()
    }
  }
}
