// Employee routes for dynamic task assignment dropdown
const express = require('express');
const router = express.Router();
const { getPool, getIsUsingMock, mockEmployees } = require('../config/db');

// GET /api/employees - Retrieve all employees for dropdown options
router.get('/', async (req, res) => {
    try {
        const isMock = getIsUsingMock();
        if (isMock) {
            return res.json({ success: true, data: mockEmployees });
        }

        const pool = getPool();
        const [rows] = await pool.query('SELECT id, name, email, department, designation FROM employees ORDER BY name ASC');
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch employees' });
    }
});

module.exports = router;
