import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from './EventEmitter.js'

const MAX_CONCURRENT = 6 // ajusta entre 4 y 8 si quieres

export default class Resources extends EventEmitter {
    constructor(sources) {
        super()

        this.sources = sources
        this.items = {}
        this.toLoad = this.sources.length
        this.loaded = 0

        this.setLoaders()
        this.startLoading()
    }

    setLoaders() {
        this.loaders = {}
        this.loaders.gltfLoader = new GLTFLoader()
        this.loaders.textureLoader = new THREE.TextureLoader()
        this.loaders.cubeTextureLoader = new THREE.CubeTextureLoader()
    }

    // Envuelve cada loader en una Promise para poder controlar la concurrencia
    loadSource(source) {
        return new Promise((resolve) => {
            const onSuccess = (file) => {
                this.sourceLoaded(source, file)
                resolve()
            }
            const onError = (error) => {
                console.error(`❌ Error al cargar ${source.type} ${source.name} desde ${source.path}`)
                console.error(error)
                // Aún así avanzamos para no bloquear el resto
                this.loaded++
                const percent = Math.floor((this.loaded / this.toLoad) * 100)
                window.dispatchEvent(new CustomEvent('resource-progress', { detail: percent }))
                if (this.loaded === this.toLoad) {
                    window.dispatchEvent(new CustomEvent('resource-complete'))
                    this.trigger('ready')
                }
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

    async startLoading() {
        const queue = [...this.sources]
        const workers = []

        const runWorker = async () => {
            while (queue.length > 0) {
                const source = queue.shift()
                await this.loadSource(source)
            }
        }

        for (let i = 0; i < MAX_CONCURRENT; i++) {
            workers.push(runWorker())
        }

        await Promise.all(workers)
    }

    sourceLoaded(source, file) {
        this.items[source.name] = file
        this.loaded++

        const percent = Math.floor((this.loaded / this.toLoad) * 100)
        window.dispatchEvent(new CustomEvent('resource-progress', { detail: percent }))

        if (this.loaded === this.toLoad) {
            window.dispatchEvent(new CustomEvent('resource-complete'))
            this.trigger('ready')
        }
    }
}