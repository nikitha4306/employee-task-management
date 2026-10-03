// Employee Task Management System - Express Backend Server
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./config/db');
const taskRoutes = require('./routes/taskRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/employees', employeeRoutes);

// Fallback route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server and Initialize Database
async function startServer() {
    console.log('🚀 Starting Employee Task Management System...');
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`✅ Server is running on http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
}

startServer();
