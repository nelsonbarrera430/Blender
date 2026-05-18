const express = require('express')
const router = express.Router()
const Progress = require('../models/Progress')

// Guardar progreso
router.post('/save', async (req, res) => {
    try {
        const { username, currentLevel, coinsCollected, totalCoins } = req.body
        const progress = await Progress.findOneAndUpdate(
            { username },
            { currentLevel, coinsCollected, totalCoins, updatedAt: Date.now() },
            { upsert: true, new: true }
        )
        res.json(progress)
    } catch (err) {
        res.status(500).json({ message: 'Error guardando progreso' })
    }
})

// Cargar progreso
router.get('/load/:username', async (req, res) => {
    try {
        const progress = await Progress.findOne({ username: req.params.username })
        res.json(progress || { currentLevel: 1, coinsCollected: 0 })
    } catch (err) {
        res.status(500).json({ message: 'Error cargando progreso' })
    }
})

module.exports = router
