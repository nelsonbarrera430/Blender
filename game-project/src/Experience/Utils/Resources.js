import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from './EventEmitter.js'

const MAX_CONCURRENT = 6  // descargas en paralelo

export default class Resources extends EventEmitter {
    /**
     * @param {Array} sources - lista completa de sources
     * @param {Object} options
     * @param {number} options.currentLevel - nivel actual (1-5). Si no se pasa, carga todo.
     * @param {boolean} options.preloadOthers - precargar otros niveles en background (default true)
     */
    constructor(sources, options = {}) {
        super()

        this.allSources = sources
        this.currentLevel = options.currentLevel ?? null
        this.preloadOthers = options.preloadOthers ?? true

        this.items = {}

        // Filtrar lo que vamos a cargar AHORA (prioridad alta)
        this.sources = this._filterByLevel(this.currentLevel)

        // Lo demás queda para precarga en background
        this.deferredSources = this.allSources.filter(s => !this.sources.includes(s))

        this.toLoad = this.sources.length
        this.loaded = 0

        console.log(`📦 Cargando ${this.toLoad} recursos prioritarios (de ${this.allSources.length} totales)`)

        this.setLoaders()
        this.startLoading()
    }

    /**
     * Devuelve los sources que se deben cargar para el nivel dado.
     * - Si currentLevel es null → todo
     * - Si currentLevel es 1..5 → recursos sin prefijo de nivel + solo los del nivel pedido
     */
    _filterByLevel(level) {
        if (level === null || level === undefined) return [...this.allSources]

        return this.allSources.filter(source => {
            // Si no es modelo gltf, siempre se carga (texturas, cubemaps, sonidos…)
            if (source.type !== 'gltfModel') return true

            const name = source.name || ''
            const path = (Array.isArray(source.path) ? source.path[0] : source.path) || ''

            // Detectar prefijo de nivel en el nombre o en el path
            const match = name.match(/^n([1-5])_/) || path.match(/\/toycarN([1-5])\//i)

            if (!match) {
                // Sin prefijo de nivel: es un modelo "global" (fox, robot, zombie, etc.) → cargar
                return true
            }

            return parseInt(match[1], 10) === level
        })
    }

    setLoaders() {
        this.loaders = {}
        this.loaders.gltfLoader = new GLTFLoader()
        this.loaders.textureLoader = new THREE.TextureLoader()
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
    }

    /**
     * Carga un source individual y resuelve cuando termine (éxito o error).
     * El error no rompe el flujo: se loggea y se sigue.
     */
    loadSource(source) {
        return new Promise((resolve) => {
            // Si ya está cargado (por dedupe), no rehacerlo
            if (this.items[source.name]) {
                this._onSourceLoaded(source, this.items[source.name], true)
                resolve()
                return
            }

            const onSuccess = (file) => {
                this._onSourceLoaded(source, file, false)
                resolve()
            }

            const onError = (error) => {
                console.error(`❌ Error en ${source.name} (${source.path})`)
                console.error(error)
                this._onSourceLoaded(source, null, false)
                resolve()
            }

            if (source.type === 'gltfModel') {
                this.loaders.gltfLoader.load(source.path, onSuccess, undefined, onError)
            } else if (source.type === 'texture') {
                this.loaders.textureLoader.load(source.path, onSuccess, undefined, onError)
            } else if (source.type === 'cubeTexture') {
                this.loaders.cubeTextureLoader.load(source.path, onSuccess, undefined, onError)
            } else {
                resolve()
            }
        })
    }

    _onSourceLoaded(source, file, fromCache) {
        if (file && !fromCache) {
            this.items[source.name] = file
        }
        this.loaded++

        const percent = Math.floor((this.loaded / this.toLoad) * 100)
        window.dispatchEvent(new CustomEvent('resource-progress', { detail: percent }))

        if (this.loaded === this.toLoad) {
            console.log(`✅ Recursos prioritarios listos`)
            window.dispatchEvent(new CustomEvent('resource-complete'))
            this.trigger('ready')

            // Empezar precarga de los demás niveles en background
            if (this.preloadOthers && this.deferredSources.length > 0) {
                this._startBackgroundPreload()
            }
        }
    }

    /**
     * Lanza varios "workers" que comparten la cola.
     * Cada worker procesa de a un source, evitando el bombardeo de fetches.
     */
    async startLoading() {
        if (this.toLoad === 0) {
            // No hay nada que cargar, disparar ready inmediatamente
            window.dispatchEvent(new CustomEvent('resource-complete'))
            this.trigger('ready')
            return
        }

        const queue = [...this.sources]

        const runWorker = async () => {
            while (queue.length > 0) {
                const source = queue.shift()
                if (!source) break
                await this.loadSource(source)
            }
        }

        const workers = []
        for (let i = 0; i < MAX_CONCURRENT; i++) {
            workers.push(runWorker())
        }
        await Promise.all(workers)
    }

    /**
     * Precarga el resto de niveles en background, con menor concurrencia
     * para no saturar la red mientras el usuario ya está jugando.
     */
    async _startBackgroundPreload() {
        console.log(`🌙 Precargando ${this.deferredSources.length} recursos en background…`)

        const queue = [...this.deferredSources]
        const BG_CONCURRENT = 2

        const runWorker = async () => {
            while (queue.length > 0) {
                const source = queue.shift()
                if (!source || this.items[source.name]) continue
                await this.loadSource(source)
            }
        }

        const workers = []
        for (let i = 0; i < BG_CONCURRENT; i++) {
            workers.push(runWorker())
        }
        await Promise.all(workers)

        console.log(`✅ Background preload terminado`)
        this.trigger('all-ready')
    }
}