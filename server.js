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
let sampleTasks = [];

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

        await dbPool.query(`DROP TABLE IF EXISTS tasks;`);

        await dbPool.query(`
            CREATE TABLE tasks (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                priority ENUM('Low', 'Medium', 'High') DEFAULT 'Medium',
                status ENUM('Pending', 'In Progress', 'Completed') DEFAULT 'Pending',
                due_date DATE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        useFallbackData = false;
        console.log('✅ MySQL Database connected & cleaned (0 tasks)');
    } catch (err) {
        useFallbackData = true;
        sampleTasks = [];
    }
}

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
            whereClauses.push('LOWER(title) LIKE ?');
            params.push(`%${search}%`);
        }
        if (status !== 'All') {
            whereClauses.push('status = ?');
            params.push(status);
        }
        if (priority !== 'All') {
            whereClauses.push('priority = ?');
            params.push(priority);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const sql = `SELECT * FROM tasks ${whereSql} ORDER BY due_date ASC`;

        const [rows] = await dbPool.query(sql, params);
        res.json({ tasks: rows, stats: statRows[0] || { total: 0, pending: 0, inProgress: 0, completed: 0 } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

app.post('/api/tasks', async (req, res) => {
    const { title, description, priority, status, due_date } = req.body;

    if (!title || !due_date) {
        return res.status(400).json({ error: 'Title and Due Date are required fields.' });
    }

    if (useFallbackData) {
        const newTask = {
            id: sampleTasks.length > 0 ? Math.max(...sampleTasks.map(t => t.id)) + 1 : 1,
            title,
            description,
            priority: priority || 'Medium',
            status: status || 'Pending',
            due_date
        };
        sampleTasks.push(newTask);
        return res.status(201).json({ message: 'Task created successfully', task: newTask });
    }

    try {
        const sql = 'INSERT INTO tasks (title, description, priority, status, due_date) VALUES (?, ?, ?, ?, ?)';
        const [result] = await dbPool.query(sql, [title, description, priority || 'Medium', status || 'Pending', due_date]);
        res.status(201).json({ message: 'Task created successfully', id: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create task' });
    }
});

app.put('/api/tasks/:id', async (req, res) => {
    const taskId = req.params.id;
    const { title, description, priority, status, due_date } = req.body;

    if (!title || !due_date) {
        return res.status(400).json({ error: 'Title and Due Date are required fields.' });
    }

    if (useFallbackData) {
        const index = sampleTasks.findIndex(t => t.id == taskId);
        if (index === -1) return res.status(404).json({ error: 'Task not found' });
        sampleTasks[index] = { ...sampleTasks[index], title, description, priority, status, due_date };
        return res.json({ message: 'Task updated successfully' });
    }

    try {
        const sql = 'UPDATE tasks SET title=?, description=?, priority=?, status=?, due_date=? WHERE id=?';
        await dbPool.query(sql, [title, description, priority, status, due_date, taskId]);
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
