// Database configuration and connection module
const mysql = require('mysql2/promise');
require('dotenv').config();

// Standard MySQL Pool Configuration
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true
};

const dbName = process.env.DB_NAME || 'employee_task_db';

let pool = null;
let isUsingMock = false;

// In-memory Mock Data Fallback (used if MySQL server connection fails)
let mockEmployees = [
    { id: 1, name: 'Rahul Sharma', email: 'rahul@company.com', department: 'Engineering', designation: 'Senior Developer' },
    { id: 2, name: 'Priya Patel', email: 'priya@company.com', department: 'Design', designation: 'UI/UX Designer' },
    { id: 3, name: 'Amit Verma', email: 'amit@company.com', department: 'Engineering', designation: 'Backend Developer' },
    { id: 4, name: 'Sneha Gupta', email: 'sneha@company.com', department: 'QA', designation: 'Quality Analyst' },
    { id: 5, name: 'Vikram Singh', email: 'vikram@company.com', department: 'DevOps', designation: 'Cloud Engineer' }
];

let mockTasks = [
    { id: 1, title: 'Design New Dashboard UI', description: 'Create responsive wireframes and layout for internal portal.', priority: 'High', status: 'In Progress', assigned_employee_id: 2, assigned_employee_name: 'Priya Patel', due_date: '2026-10-15', created_at: new Date().toISOString() },
    { id: 2, title: 'Refactor Database Queries', description: 'Optimize MySQL queries for task search and pagination.', priority: 'Medium', status: 'Pending', assigned_employee_id: 3, assigned_employee_name: 'Amit Verma', due_date: '2026-10-20', created_at: new Date().toISOString() },
    { id: 3, title: 'Setup CI/CD Pipeline', description: 'Configure GitHub Actions for deployment.', priority: 'High', status: 'Completed', assigned_employee_id: 5, assigned_employee_name: 'Vikram Singh', due_date: '2026-10-05', created_at: new Date().toISOString() },
    { id: 4, title: 'Write API Documentation', description: 'Document all REST API endpoints with request/response format.', priority: 'Low', status: 'Pending', assigned_employee_id: 1, assigned_employee_name: 'Rahul Sharma', due_date: '2026-10-25', created_at: new Date().toISOString() },
    { id: 5, title: 'Execute Regression Testing', description: 'Perform test suite check before system release.', priority: 'Medium', status: 'In Progress', assigned_employee_id: 4, assigned_employee_name: 'Sneha Gupta', due_date: '2026-10-12', created_at: new Date().toISOString() }
];

let mockUsers = [
    { id: 1, name: 'Admin Manager', email: 'admin@company.com', password: 'admin123', role: 'Manager' },
    { id: 2, name: 'Sarah Manager', email: 'sarah@company.com', password: 'pass123', role: 'Team Lead' }
];

/**
 * Initialize MySQL Database and Tables
 */
async function initializeDatabase() {
    try {
        console.log('🔄 Connecting to MySQL Database server...');
        // Step 1: Connect to MySQL server without database specified
        const connection = await mysql.createConnection(dbConfig);
        
        // Step 2: Create Database if not exists
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        await connection.end();

        // Step 3: Create connection pool with specified database
        pool = mysql.createPool({
            ...dbConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Step 4: Create Tables
        const createTablesSql = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'Manager',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                department VARCHAR(100) NOT NULL,
                designation VARCHAR(100) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
                status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
                assigned_employee_id INT,
                due_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
            );
        `;
        
        await pool.query(createTablesSql);

        // Step 5: Seed initial data if tables are empty
        const [empRows] = await pool.query('SELECT COUNT(*) as count FROM employees');
        if (empRows[0].count === 0) {
            console.log('🌱 Seeding initial MySQL employees data...');
            await pool.query(`
                INSERT INTO employees (id, name, email, department, designation) VALUES
                (1, 'Rahul Sharma', 'rahul@company.com', 'Engineering', 'Senior Developer'),
                (2, 'Priya Patel', 'priya@company.com', 'Design', 'UI/UX Designer'),
                (3, 'Amit Verma', 'amit@company.com', 'Engineering', 'Backend Developer'),
                (4, 'Sneha Gupta', 'sneha@company.com', 'QA', 'Quality Analyst'),
                (5, 'Vikram Singh', 'vikram@company.com', 'DevOps', 'Cloud Engineer');
            `);
        }

        const [taskRows] = await pool.query('SELECT COUNT(*) as count FROM tasks');
        if (taskRows[0].count === 0) {
            console.log('🌱 Seeding initial MySQL tasks data...');
            await pool.query(`
                INSERT INTO tasks (id, title, description, priority, status, assigned_employee_id, due_date) VALUES
                (1, 'Design New Dashboard UI', 'Create responsive wireframes and layout for internal portal.', 'High', 'In Progress', 2, '2026-10-15'),
                (2, 'Refactor Database Queries', 'Optimize MySQL queries for task search and pagination.', 'Medium', 'Pending', 3, '2026-10-20'),
                (3, 'Setup CI/CD Pipeline', 'Configure GitHub Actions for deployment.', 'High', 'Completed', 5, '2026-10-05'),
                (4, 'Write API Documentation', 'Document all REST API endpoints with request/response format.', 'Low', 'Pending', 1, '2026-10-25'),
                (5, 'Execute Regression Testing', 'Perform test suite check before system release.', 'Medium', 'In Progress', 4, '2026-10-12');
            `);
        }

        const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users');
        if (userRows[0].count === 0) {
            await pool.query(`
                INSERT INTO users (id, name, email, password, role) VALUES
                (1, 'Admin Manager', 'admin@company.com', 'admin123', 'Manager'),
                (2, 'Sarah Manager', 'sarah@company.com', 'pass123', 'Team Lead');
            `);
        }

        console.log('✅ MySQL Database initialized successfully!');
        isUsingMock = false;
    } catch (error) {
        console.warn('⚠️  MySQL connection could not be established:', error.message);
        console.warn('⚡ Using in-memory dataset mode so the app remains fully functional.');
        isUsingMock = true;
    }
}

// Get Database Pool or Mock Interface
function getPool() {
    return pool;
}

function getIsUsingMock() {
    return isUsingMock;
}

module.exports = {
    initializeDatabase,
    getPool,
    getIsUsingMock,
    mockTasks,
    mockEmployees,
    mockUsers
};
