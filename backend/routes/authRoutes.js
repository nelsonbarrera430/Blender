const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/User')

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body
        const hashed = await bcrypt.hash(password, 10)
        const user = new User({ username, password: hashed })
        await user.save()
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'secret123', { expiresIn: '2h' })
        res.json({ token })
    } catch (err) {
        res.status(400).json({ message: 'Usuario ya existe o error al registrar' })
    }
})

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body
        const user = await User.findOne({ username })
        if (!user) return res.status(401).json({ message: 'Usuario no encontrado' })
        const valid = await bcrypt.compare(password, user.password)
        if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta' })
        const token = jwt.sign({ username }, process.env.JWT_SECRET || 'secret123', { expiresIn: '2h' })
        res.json({ token })
    } catch (err) {
        res.status(500).json({ message: 'Error del servidor' })
    }
})

module.exports = router
