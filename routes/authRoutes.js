// User authentication routes (Login/Logout functionality)
const express = require('express');
const router = express.Router();
const { getPool, getIsUsingMock, mockUsers } = require('../config/db');

// Simple in-memory active session store
let currentUserSession = {
    id: 1,
    name: 'Admin Manager',
    email: 'admin@company.com',
    role: 'Manager'
};

// POST /api/auth/login - User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide both email and password' });
    }

    try {
        const isMock = getIsUsingMock();
        let userFound = null;

        if (isMock) {
            userFound = mockUsers.find(u => u.email === email && u.password === password);
        } else {
            const pool = getPool();
            const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE email = ? AND password = ?', [email, password]);
            if (rows.length > 0) {
                userFound = rows[0];
            }
        }

        if (!userFound) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        currentUserSession = {
            id: userFound.id,
            name: userFound.name,
            email: userFound.email,
            role: userFound.role || 'Manager'
        };

        res.json({
            success: true,
            message: 'Login successful',
            user: currentUserSession
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed due to server error' });
    }
});

// GET /api/auth/user - Get active user profile
router.get('/user', (req, res) => {
    res.json({
        success: true,
        user: currentUserSession
    });
});

// POST /api/auth/logout - User Logout
router.post('/logout', (req, res) => {
    currentUserSession = null;
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = router;
