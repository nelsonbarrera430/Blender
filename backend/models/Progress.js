const mongoose = require('mongoose')

const progressSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    currentLevel: { type: Number, default: 1 },
    coinsCollected: { type: Number, default: 0 },
    totalCoins: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Progress', progressSchema)
