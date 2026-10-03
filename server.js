// Employee Task Management System - Pure Native Node.js Server (No Express.js)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
require('dotenv').config();

const { initializeDatabase, getPool, getIsUsingMock, mockTasks, mockEmployees, mockUsers } = require('./config/db');

const PORT = process.env.PORT || 3000;

// User Session Store (Simple In-Memory)
let currentUserSession = {
    id: 1,
    name: 'Admin Manager',
    email: 'admin@company.com',
    role: 'Manager'
};

// MIME Types map for static files
const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

/**
 * Helper to send JSON response
 */
function sendJSON(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

/**
 * Helper to parse incoming HTTP JSON request body
 */
function parseRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            if (!body) return resolve({});
            try {
                resolve(JSON.parse(body));
            } catch (err) {
                reject(new Error('Invalid JSON payload'));
            }
        });
        req.on('error', reject);
    });
}

/**
 * Helper to format date YYYY-MM-DD
 */
function formatDateString(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') return dateVal.split('T')[0];
    const d = new Date(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Main Native HTTP Server Request Handler
 */
const server = http.createServer(async (req, res) => {
    // Enable CORS preflight handling
    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        return res.end();
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();

    try {
        // ==========================================
        // 1. AUTHENTICATION REST API ROUTES
        // ==========================================
        if (pathname === '/api/auth/login' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { email, password } = body;

            if (!email || !password) {
                return sendJSON(res, 400, { success: false, message: 'Please provide both email and password' });
            }

            const isMock = getIsUsingMock();
            let userFound = null;

            if (isMock) {
                userFound = mockUsers.find(u => u.email === email && u.password === password);
            } else {
                const pool = getPool();
                const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE email = ? AND password = ?', [email, password]);
                if (rows.length > 0) userFound = rows[0];
            }

            if (!userFound) {
                return sendJSON(res, 401, { success: false, message: 'Invalid email or password' });
            }

            currentUserSession = {
                id: userFound.id,
                name: userFound.name,
                email: userFound.email,
                role: userFound.role || 'Manager'
            };

            return sendJSON(res, 200, { success: true, message: 'Login successful', user: currentUserSession });
        }

        if (pathname === '/api/auth/user' && method === 'GET') {
            return sendJSON(res, 200, { success: true, user: currentUserSession });
        }

        if (pathname === '/api/auth/logout' && method === 'POST') {
            currentUserSession = null;
            return sendJSON(res, 200, { success: true, message: 'Logged out successfully' });
        }

        // ==========================================
        // 2. EMPLOYEES REST API ROUTE
        // ==========================================
        if (pathname === '/api/employees' && method === 'GET') {
            const isMock = getIsUsingMock();
            if (isMock) {
                return sendJSON(res, 200, { success: true, data: mockEmployees });
            }

            const pool = getPool();
            const [rows] = await pool.query('SELECT id, name, email, department, designation FROM employees ORDER BY name ASC');
            return sendJSON(res, 200, { success: true, data: rows });
        }

        // ==========================================
        // 3. TASKS REST API ROUTES
        // ==========================================

        // GET /api/tasks - Search, Filter, Sort, Pagination & Stats
        if (pathname === '/api/tasks' && method === 'GET') {
            const searchQuery = (parsedUrl.searchParams.get('search') || '').trim().toLowerCase();
            const statusFilter = parsedUrl.searchParams.get('status') || 'All';
            const priorityFilter = parsedUrl.searchParams.get('priority') || 'All';
            const sortBy = parsedUrl.searchParams.get('sortBy') || 'due_date';
            const sortOrder = (parsedUrl.searchParams.get('sortOrder') || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
            const page = parseInt(parsedUrl.searchParams.get('page'), 10) || 1;
            const limit = parseInt(parsedUrl.searchParams.get('limit'), 10) || 10;

            const isMock = getIsUsingMock();

            if (isMock) {
                let filteredList = mockTasks.map(t => {
                    const emp = mockEmployees.find(e => e.id === Number(t.assigned_employee_id));
                    return {
                        ...t,
                        due_date: formatDateString(t.due_date),
                        assigned_employee_name: emp ? emp.name : (t.assigned_employee_name || 'Unassigned')
                    };
                });

                const stats = {
                    totalTasks: filteredList.length,
                    pendingTasks: filteredList.filter(t => t.status === 'Pending').length,
                    inProgressTasks: filteredList.filter(t => t.status === 'In Progress').length,
                    completedTasks: filteredList.filter(t => t.status === 'Completed').length,
                    highPriorityTasks: filteredList.filter(t => t.priority === 'High').length
                };

                if (searchQuery) {
                    filteredList = filteredList.filter(t =>
                        t.title.toLowerCase().includes(searchQuery) ||
                        (t.description && t.description.toLowerCase().includes(searchQuery)) ||
                        (t.assigned_employee_name && t.assigned_employee_name.toLowerCase().includes(searchQuery))
                    );
                }

                if (statusFilter !== 'All') filteredList = filteredList.filter(t => t.status === statusFilter);
                if (priorityFilter !== 'All') filteredList = filteredList.filter(t => t.priority === priorityFilter);

                filteredList.sort((a, b) => {
                    let valA = a[sortBy] || '';
                    let valB = b[sortBy] || '';
                    if (sortBy === 'priority') {
                        const weights = { High: 3, Medium: 2, Low: 1 };
                        valA = weights[a.priority] || 0;
                        valB = weights[b.priority] || 0;
                    }
                    if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
                    if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
                    return 0;
                });

                const totalItems = filteredList.length;
                const totalPages = Math.ceil(totalItems / limit) || 1;
                const startIndex = (page - 1) * limit;
                const paginatedTasks = filteredList.slice(startIndex, startIndex + limit);

                return sendJSON(res, 200, {
                    success: true,
                    stats: stats,
                    pagination: { currentPage: page, totalPages, totalItems, itemsPerPage: limit },
                    data: paginatedTasks
                });
            }

            // MySQL Execution
            const pool = getPool();
            const [statsResult] = await pool.query(`
                SELECT 
                    COUNT(*) as totalTasks,
                    SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingTasks,
                    SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) as inProgressTasks,
                    SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedTasks,
                    SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as highPriorityTasks
                FROM tasks
            `);

            const stats = {
                totalTasks: statsResult[0].totalTasks || 0,
                pendingTasks: statsResult[0].pendingTasks || 0,
                inProgressTasks: statsResult[0].inProgressTasks || 0,
                completedTasks: statsResult[0].completedTasks || 0,
                highPriorityTasks: statsResult[0].highPriorityTasks || 0
            };

            let whereClauses = [];
            let queryParams = [];

            if (searchQuery) {
                whereClauses.push('(LOWER(t.title) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(e.name) LIKE ?)');
                const pat = `%${searchQuery}%`;
                queryParams.push(pat, pat, pat);
            }
            if (statusFilter !== 'All') {
                whereClauses.push('t.status = ?');
                queryParams.push(statusFilter);
            }
            if (priorityFilter !== 'All') {
                whereClauses.push('t.priority = ?');
                queryParams.push(priorityFilter);
            }

            const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

            const [countRes] = await pool.query(`SELECT COUNT(*) as total FROM tasks t LEFT JOIN employees e ON t.assigned_employee_id = e.id ${whereSql}`, queryParams);
            const totalItems = countRes[0].total;
            const totalPages = Math.ceil(totalItems / limit) || 1;

            let orderByClause = 't.due_date ASC';
            if (sortBy === 'title') orderByClause = `t.title ${sortOrder}`;
            else if (sortBy === 'priority') orderByClause = `FIELD(t.priority, 'High', 'Medium', 'Low') ${sortOrder}`;
            else if (sortBy === 'status') orderByClause = `t.status ${sortOrder}`;
            else if (sortBy === 'created_at') orderByClause = `t.created_at ${sortOrder}`;
            else orderByClause = `t.due_date ${sortOrder}`;

            const offset = (page - 1) * limit;
            const [tasks] = await pool.query(`
                SELECT t.id, t.title, t.description, t.priority, t.status, t.assigned_employee_id, t.due_date, t.created_at, e.name as assigned_employee_name
                FROM tasks t
                LEFT JOIN employees e ON t.assigned_employee_id = e.id
                ${whereSql}
                ORDER BY ${orderByClause}
                LIMIT ? OFFSET ?
            `, [...queryParams, limit, offset]);

            const formattedTasks = tasks.map(task => ({
                ...task,
                due_date: formatDateString(task.due_date),
                assigned_employee_name: task.assigned_employee_name || 'Unassigned'
            }));

            return sendJSON(res, 200, {
                success: true,
                stats: stats,
                pagination: { currentPage: page, totalPages, totalItems, itemsPerPage: limit },
                data: formattedTasks
            });
        }

        // GET /api/tasks/:id - Single Task Details
        const getTaskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
        if (getTaskMatch && method === 'GET') {
            const taskId = parseInt(getTaskMatch[1], 10);
            const isMock = getIsUsingMock();

            if (isMock) {
                const task = mockTasks.find(t => t.id === taskId);
                if (!task) return sendJSON(res, 404, { success: false, message: 'Task not found' });
                return sendJSON(res, 200, { success: true, data: { ...task, due_date: formatDateString(task.due_date) } });
            }

            const pool = getPool();
            const [rows] = await pool.query('SELECT t.*, e.name as assigned_employee_name FROM tasks t LEFT JOIN employees e ON t.assigned_employee_id = e.id WHERE t.id = ?', [taskId]);
            if (rows.length === 0) return sendJSON(res, 404, { success: false, message: 'Task not found' });
            
            const task = rows[0];
            task.due_date = formatDateString(task.due_date);
            return sendJSON(res, 200, { success: true, data: task });
        }

        // POST /api/tasks - Create Task
        if (pathname === '/api/tasks' && method === 'POST') {
            const body = await parseRequestBody(req);
            const { title, description, priority, status, assigned_employee_id, due_date } = body;

            if (!title || title.trim() === '') {
                return sendJSON(res, 400, { success: false, message: 'Task Title is mandatory' });
            }
            if (!due_date || due_date.trim() === '') {
                return sendJSON(res, 400, { success: false, message: 'Due Date is mandatory' });
            }
            if (!assigned_employee_id) {
                return sendJSON(res, 400, { success: false, message: 'Assigning an employee is mandatory' });
            }

            const isMock = getIsUsingMock();
            if (isMock) {
                const newId = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.id)) + 1 : 1;
                const emp = mockEmployees.find(e => e.id === Number(assigned_employee_id));
                const newTask = {
                    id: newId,
                    title: title.trim(),
                    description: (description || '').trim(),
                    priority: priority || 'Medium',
                    status: status || 'Pending',
                    assigned_employee_id: Number(assigned_employee_id),
                    assigned_employee_name: emp ? emp.name : 'Unassigned',
                    due_date: formatDateString(due_date),
                    created_at: new Date().toISOString()
                };
                mockTasks.push(newTask);
                return sendJSON(res, 201, { success: true, message: 'Task created successfully', data: newTask });
            }

            const pool = getPool();
            const [result] = await pool.query(
                'INSERT INTO tasks (title, description, priority, status, assigned_employee_id, due_date) VALUES (?, ?, ?, ?, ?, ?)',
                [title.trim(), (description || '').trim(), priority || 'Medium', status || 'Pending', Number(assigned_employee_id), formatDateString(due_date)]
            );
            return sendJSON(res, 201, { success: true, message: 'Task created successfully', taskId: result.insertId });
        }

        // PUT /api/tasks/:id - Edit Task
        const putTaskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
        if (putTaskMatch && method === 'PUT') {
            const taskId = parseInt(putTaskMatch[1], 10);
            const body = await parseRequestBody(req);
            const { title, description, priority, status, assigned_employee_id, due_date } = body;

            if (!title || title.trim() === '') return sendJSON(res, 400, { success: false, message: 'Task Title is mandatory' });
            if (!due_date || due_date.trim() === '') return sendJSON(res, 400, { success: false, message: 'Due Date is mandatory' });

            const isMock = getIsUsingMock();
            if (isMock) {
                const index = mockTasks.findIndex(t => t.id === taskId);
                if (index === -1) return sendJSON(res, 404, { success: false, message: 'Task not found' });
                const emp = mockEmployees.find(e => e.id === Number(assigned_employee_id));
                mockTasks[index] = {
                    ...mockTasks[index],
                    title: title.trim(),
                    description: (description || '').trim(),
                    priority: priority || mockTasks[index].priority,
                    status: status || mockTasks[index].status,
                    assigned_employee_id: Number(assigned_employee_id),
                    assigned_employee_name: emp ? emp.name : mockTasks[index].assigned_employee_name,
                    due_date: formatDateString(due_date)
                };
                return sendJSON(res, 200, { success: true, message: 'Task updated successfully', data: mockTasks[index] });
            }

            const pool = getPool();
            const [result] = await pool.query(
                'UPDATE tasks SET title = ?, description = ?, priority = ?, status = ?, assigned_employee_id = ?, due_date = ? WHERE id = ?',
                [title.trim(), (description || '').trim(), priority, status, Number(assigned_employee_id), formatDateString(due_date), taskId]
            );
            if (result.affectedRows === 0) return sendJSON(res, 404, { success: false, message: 'Task not found' });
            return sendJSON(res, 200, { success: true, message: 'Task updated successfully' });
        }

        // PATCH /api/tasks/:id/status - Quick Status Update
        const patchStatusMatch = pathname.match(/^\/api\/tasks\/(\d+)\/status$/);
        if (patchStatusMatch && method === 'PATCH') {
            const taskId = parseInt(patchStatusMatch[1], 10);
            const body = await parseRequestBody(req);
            const { status } = body;

            if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
                return sendJSON(res, 400, { success: false, message: 'Invalid status value' });
            }

            const isMock = getIsUsingMock();
            if (isMock) {
                const task = mockTasks.find(t => t.id === taskId);
                if (!task) return sendJSON(res, 404, { success: false, message: 'Task not found' });
                task.status = status;
                return sendJSON(res, 200, { success: true, message: `Status updated to ${status}` });
            }

            const pool = getPool();
            const [result] = await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
            if (result.affectedRows === 0) return sendJSON(res, 404, { success: false, message: 'Task not found' });
            return sendJSON(res, 200, { success: true, message: `Status updated to ${status}` });
        }

        // DELETE /api/tasks/:id - Delete Task
        const deleteTaskMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
        if (deleteTaskMatch && method === 'DELETE') {
            const taskId = parseInt(deleteTaskMatch[1], 10);
            const isMock = getIsUsingMock();

            if (isMock) {
                const index = mockTasks.findIndex(t => t.id === taskId);
                if (index === -1) return sendJSON(res, 404, { success: false, message: 'Task not found' });
                mockTasks.splice(index, 1);
                return sendJSON(res, 200, { success: true, message: 'Task deleted successfully' });
            }

            const pool = getPool();
            const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
            if (result.affectedRows === 0) return sendJSON(res, 404, { success: false, message: 'Task not found' });
            return sendJSON(res, 200, { success: true, message: 'Task deleted successfully' });
        }

        // ==========================================
        // 4. STATIC FILE SERVING (HTML, CSS, JS)
        // ==========================================
        let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

        // Check if path exists
        fs.stat(filePath, (err, stats) => {
            if (err || !stats.isFile()) {
                // SPA Fallback to index.html
                filePath = path.join(__dirname, 'public', 'index.html');
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            fs.readFile(filePath, (readErr, content) => {
                if (readErr) {
                    res.writeHead(500);
                    return res.end('Internal Server Error');
                }
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content, 'utf-8');
            });
        });

    } catch (error) {
        console.error('Server error:', error);
        sendJSON(res, 500, { success: false, message: 'Internal server error: ' + error.message });
    }
});

// Start Pure Native Node HTTP Server
async function startServer() {
    console.log('🚀 Starting Employee Task Management System (Pure Native Node.js)...');
    await initializeDatabase();
    server.listen(PORT, () => {
        console.log(`==================================================`);
        console.log(`✅ Native HTTP Server running on http://localhost:${PORT}`);
        console.log(`==================================================`);
    });
}

startServer();
