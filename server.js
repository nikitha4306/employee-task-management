const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const INITIAL_PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'employee_task_db',
    port: process.env.DB_PORT || 3306
};

let dbPool = null;
let useFallbackData = false;

let sampleEmployees = [
    { id: 1, name: 'Rahul Sharma', email: 'rahul@company.com' },
    { id: 2, name: 'Priya Patel', email: 'priya@company.com' },
    { id: 3, name: 'Amit Verma', email: 'amit@company.com' },
    { id: 4, name: 'Sneha Gupta', email: 'sneha@company.com' },
    { id: 5, name: 'Vikram Malhotra', email: 'vikram@company.com' }
];

let sampleTasks = [
    { id: 1, title: 'Redesign Mobile App Onboarding Flow', description: 'Improve user retention by simplifying the signup screen and adding interactive feature tooltips.', priority: 'High', status: 'In Progress', assigned_employee_id: 2, assigned_employee_name: 'Priya Patel', due_date: '2026-10-15' },
    { id: 2, title: 'Optimize Database Indexing for Order Queries', description: 'Add composite indexes on customer order tables to reduce query latency during peak traffic hours.', priority: 'High', status: 'Pending', assigned_employee_id: 3, assigned_employee_name: 'Amit Verma', due_date: '2026-10-18' },
    { id: 3, title: 'Prepare Q4 Marketing Campaign Plan', description: 'Draft target audience persona sheets, social media schedule, and budget breakdown for Q4 product launch.', priority: 'Medium', status: 'Pending', assigned_employee_id: 5, assigned_employee_name: 'Vikram Malhotra', due_date: '2026-10-25' },
    { id: 4, title: 'Execute Regression Test Suite for v2.4 Release', description: 'Perform manual end-to-end testing on checkout workflow, payment gateway integration, and email triggers.', priority: 'Medium', status: 'In Progress', assigned_employee_id: 4, assigned_employee_name: 'Sneha Gupta', due_date: '2026-10-12' },
    { id: 5, title: 'Update Security Certificates & SSL Config', description: 'Renew production domain SSL certificates and update server security protocols before expiry.', priority: 'Low', status: 'Completed', assigned_employee_id: 1, assigned_employee_name: 'Rahul Sharma', due_date: '2026-10-05' }
];

async function connectDatabase() {
    try {
        const rootConnection = await mysql.createConnection({
            host: dbConfig.host,
            user: dbConfig.user,
            password: dbConfig.password,
            port: dbConfig.port
        });
        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
        await rootConnection.end();

        dbPool = mysql.createPool(dbConfig);

        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS employees (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL,
                department VARCHAR(100) NOT NULL
            );
        `);

        await dbPool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
                status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
                assigned_employee_id INT,
                due_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (assigned_employee_id) REFERENCES employees(id) ON DELETE SET NULL
            );
        `);

        const [empRows] = await dbPool.query('SELECT COUNT(*) as count FROM employees');
        if (empRows[0].count === 0) {
            await dbPool.query(`
                INSERT INTO employees (id, name, email, department) VALUES
                (1, 'Rahul Sharma', 'rahul@company.com', 'Engineering'),
                (2, 'Priya Patel', 'priya@company.com', 'Design'),
                (3, 'Amit Verma', 'amit@company.com', 'Backend'),
                (4, 'Sneha Gupta', 'sneha@company.com', 'Testing'),
                (5, 'Vikram Malhotra', 'vikram@company.com', 'Marketing');
            `);
        }

        const [taskRows] = await dbPool.query('SELECT COUNT(*) as count FROM tasks');
        if (taskRows[0].count === 0) {
            await dbPool.query(`
                INSERT INTO tasks (id, title, description, priority, status, assigned_employee_id, due_date) VALUES
                (1, 'Redesign Mobile App Onboarding Flow', 'Improve user retention by simplifying the signup screen and adding interactive feature tooltips.', 'High', 'In Progress', 2, '2026-10-15'),
                (2, 'Optimize Database Indexing for Order Queries', 'Add composite indexes on customer order tables to reduce query latency during peak traffic hours.', 'High', 'Pending', 3, '2026-10-18'),
                (3, 'Prepare Q4 Marketing Campaign Plan', 'Draft target audience persona sheets, social media schedule, and budget breakdown for Q4 product launch.', 'Medium', 'Pending', 5, '2026-10-25'),
                (4, 'Execute Regression Test Suite for v2.4 Release', 'Perform manual end-to-end testing on checkout workflow, payment gateway integration, and email triggers.', 'Medium', 'In Progress', 4, '2026-10-12'),
                (5, 'Update Security Certificates & SSL Config', 'Renew production domain SSL certificates and update server security protocols before expiry.', 'Low', 'Completed', 1, '2026-10-05');
            `);
        }

        useFallbackData = false;
        console.log('✅ MySQL Database connected & initialized!');
    } catch (err) {
        console.log('⚡ Running in fallback mode with sample data.');
        useFallbackData = true;
    }
}

app.get('/api/employees', async (req, res) => {
    if (useFallbackData) {
        return res.json(sampleEmployees);
    }
    try {
        const [rows] = await dbPool.query('SELECT id, name FROM employees ORDER BY name ASC');
        if (!rows || rows.length === 0) {
            return res.json(sampleEmployees);
        }
        res.json(rows);
    } catch (err) {
        res.json(sampleEmployees);
    }
});

app.get('/api/tasks', async (req, res) => {
    const search = (req.query.search || '').toLowerCase();
    const status = req.query.status || 'All';
    const priority = req.query.priority || 'All';

    if (useFallbackData) {
        let result = [...sampleTasks];
        if (search) result = result.filter(t => t.title.toLowerCase().includes(search));
        if (status !== 'All') result = result.filter(t => t.status === status);
        if (priority !== 'All') result = result.filter(t => t.priority === priority);

        const stats = {
            total: sampleTasks.length,
            pending: sampleTasks.filter(t => t.status === 'Pending').length,
            inProgress: sampleTasks.filter(t => t.status === 'In Progress').length,
            completed: sampleTasks.filter(t => t.status === 'Completed').length
        };
        return res.json({ tasks: result, stats: stats });
    }

    try {
        const [statRows] = await dbPool.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM tasks
        `);

        let whereClauses = [];
        let params = [];

        if (search) {
            whereClauses.push('LOWER(t.title) LIKE ?');
            params.push(`%${search}%`);
        }
        if (status !== 'All') {
            whereClauses.push('t.status = ?');
            params.push(status);
        }
        if (priority !== 'All') {
            whereClauses.push('t.priority = ?');
            params.push(priority);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const sql = `
            SELECT t.*, e.name as assigned_employee_name 
            FROM tasks t 
            LEFT JOIN employees e ON t.assigned_employee_id = e.id 
            ${whereSql} 
            ORDER BY t.due_date ASC
        `;

        const [rows] = await dbPool.query(sql, params);
        res.json({ tasks: rows, stats: statRows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { title, description, priority, status, assigned_employee_id, due_date } = req.body;

    if (!title || !due_date || !assigned_employee_id) {
        return res.status(400).json({ error: 'Title, Due Date, and Employee are required fields.' });
    }

    if (useFallbackData) {
        const emp = sampleEmployees.find(e => e.id == assigned_employee_id);
        const newTask = {
            id: sampleTasks.length + 1,
            title,
            description,
            priority,
            status,
            assigned_employee_id: Number(assigned_employee_id),
            assigned_employee_name: emp ? emp.name : 'Unassigned',
            due_date
        };
        sampleTasks.push(newTask);
        return res.status(201).json({ message: 'Task created successfully', task: newTask });
    }

    try {
        const sql = 'INSERT INTO tasks (title, description, priority, status, assigned_employee_id, due_date) VALUES (?, ?, ?, ?, ?, ?)';
        const [result] = await dbPool.query(sql, [title, description, priority, status, assigned_employee_id, due_date]);
        res.status(201).json({ message: 'Task created successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    const { title, description, priority, status, assigned_employee_id, due_date } = req.body;

    if (useFallbackData) {
        const index = sampleTasks.findIndex(t => t.id == taskId);
        if (index === -1) return res.status(404).json({ error: 'Task not found' });
        const emp = sampleEmployees.find(e => e.id == assigned_employee_id);
        sampleTasks[index] = { ...sampleTasks[index], title, description, priority, status, assigned_employee_id: Number(assigned_employee_id), assigned_employee_name: emp ? emp.name : 'Unassigned', due_date };
        return res.json({ message: 'Task updated successfully' });
    }

    try {
        const sql = 'UPDATE tasks SET title=?, description=?, priority=?, status=?, assigned_employee_id=?, due_date=? WHERE id=?';
        await dbPool.query(sql, [title, description, priority, status, assigned_employee_id, due_date, taskId]);
        res.json({ message: 'Task updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update task' });
    }
});

app.delete('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id;

    if (useFallbackData) {
        sampleTasks = sampleTasks.filter(t => t.id != taskId);
        return res.json({ message: 'Task deleted successfully' });
    }

    try {
        await dbPool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
        res.json({ message: 'Task deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

function startServer(portToTry) {
    const srv = app.listen(portToTry, async () => {
        await connectDatabase();
        console.log(`Server running on http://localhost:${srv.address().port}`);
    });
    srv.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            startServer(portToTry + 1);
        } else {
            console.error(err);
        }
    });
}

startServer(Number(INITIAL_PORT));
