require('dotenv').config()
const mongoose = require('mongoose')
const Block = require('./models/Block')
const fs = require('fs')
const path = require('path')

async function seedDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log('✅ Conectado a MongoDB')

        await Block.deleteMany()
        console.log('🗑️ Colección limpiada')

        for (let i = 1; i <= 5; i++) {
            const filePath = path.join(__dirname, `../game-project/public/data/toy_car_blocks${i}.json`)
            const blocks = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            await Block.insertMany(blocks)
            console.log(`📦 Nivel ${i}: ${blocks.length} bloques insertados`)
        }

        console.log('✅ Todos los niveles cargados en MongoDB')
        process.exit()
    } catch (err) {
        console.error('❌ Error:', err)
        process.exit(1)
    }
}

seedDatabase()