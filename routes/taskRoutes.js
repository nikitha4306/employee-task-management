// REST API Routes for Task Management (CRUD, Search, Filter, Sort, Pagination, Stats)
const express = require('express');
const router = express.Router();
const { getPool, getIsUsingMock, mockTasks, mockEmployees } = require('../config/db');

// Helper function to format dates nicely YYYY-MM-DD
function formatDateString(dateVal) {
    if (!dateVal) return '';
    if (typeof dateVal === 'string') {
        return dateVal.split('T')[0];
    }
    const d = new Date(dateVal);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// GET /api/tasks - Retrieve tasks with search, filter, sort, pagination, and dashboard stats
router.get('/', async (req, res) => {
    try {
        const searchQuery = req.query.search ? req.query.search.trim().toLowerCase() : '';
        const statusFilter = req.query.status || 'All';
        const priorityFilter = req.query.priority || 'All';
        const sortBy = req.query.sortBy || 'due_date';
        const sortOrder = (req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;

        const isMock = getIsUsingMock();

        if (isMock) {
            // Processing in-memory data for fallback mode
            let filteredList = [...mockTasks];

            // Attach employee names
            filteredList = filteredList.map(task => {
                const emp = mockEmployees.find(e => e.id === Number(task.assigned_employee_id));
                return {
                    ...task,
                    due_date: formatDateString(task.due_date),
                    assigned_employee_name: emp ? emp.name : (task.assigned_employee_name || 'Unassigned')
                };
            });

            // Stats calculation from total dataset
            const stats = {
                totalTasks: filteredList.length,
                pendingTasks: filteredList.filter(t => t.status === 'Pending').length,
                inProgressTasks: filteredList.filter(t => t.status === 'In Progress').length,
                completedTasks: filteredList.filter(t => t.status === 'Completed').length,
                highPriorityTasks: filteredList.filter(t => t.priority === 'High').length
            };

            // Search filter
            if (searchQuery) {
                filteredList = filteredList.filter(task =>
                    task.title.toLowerCase().includes(searchQuery) ||
                    (task.description && task.description.toLowerCase().includes(searchQuery)) ||
                    (task.assigned_employee_name && task.assigned_employee_name.toLowerCase().includes(searchQuery))
                );
            }

            // Status filter
            if (statusFilter !== 'All') {
                filteredList = filteredList.filter(task => task.status === statusFilter);
            }

            // Priority filter
            if (priorityFilter !== 'All') {
                filteredList = filteredList.filter(task => task.priority === priorityFilter);
            }

            // Sorting
            filteredList.sort((a, b) => {
                let valA = a[sortBy] || '';
                let valB = b[sortBy] || '';
                if (sortBy === 'priority') {
                    const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
                    valA = priorityWeight[a.priority] || 0;
                    valB = priorityWeight[b.priority] || 0;
                }
                if (valA < valB) return sortOrder === 'ASC' ? -1 : 1;
                if (valA > valB) return sortOrder === 'ASC' ? 1 : -1;
                return 0;
            });

            // Pagination
            const totalItems = filteredList.length;
            const totalPages = Math.ceil(totalItems / limit) || 1;
            const startIndex = (page - 1) * limit;
            const paginatedTasks = filteredList.slice(startIndex, startIndex + limit);

            return res.json({
                success: true,
                stats: stats,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalItems,
                    itemsPerPage: limit
                },
                data: paginatedTasks
            });
        }

        // --- MySQL Execution Path ---
        const pool = getPool();

        // 1. Fetch Dashboard Stats
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

        // 2. Build Dynamic WHERE conditions for query
        let whereClauses = [];
        let queryParams = [];

        if (searchQuery) {
            whereClauses.push('(LOWER(t.title) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(e.name) LIKE ?)');
            const searchPattern = `%${searchQuery}%`;
            queryParams.push(searchPattern, searchPattern, searchPattern);
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

        // 3. Count Total Items matching query
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM tasks t 
            LEFT JOIN employees e ON t.assigned_employee_id = e.id 
            ${whereSql}
        `;
        const [countResult] = await pool.query(countQuery, queryParams);
        const totalItems = countResult[0].total;
        const totalPages = Math.ceil(totalItems / limit) || 1;

        // 4. Safe Column Sorting
        let orderByClause = 't.due_date ASC';
        if (sortBy === 'title') orderByClause = `t.title ${sortOrder}`;
        else if (sortBy === 'priority') orderByClause = `FIELD(t.priority, 'High', 'Medium', 'Low') ${sortOrder}`;
        else if (sortBy === 'status') orderByClause = `t.status ${sortOrder}`;
        else if (sortBy === 'created_at') orderByClause = `t.created_at ${sortOrder}`;
        else orderByClause = `t.due_date ${sortOrder}`;

        // 5. Fetch Paginated Tasks
        const offset = (page - 1) * limit;
        const selectTasksQuery = `
            SELECT 
                t.id, 
                t.title, 
                t.description, 
                t.priority, 
                t.status, 
                t.assigned_employee_id, 
                t.due_date, 
                t.created_at,
                e.name as assigned_employee_name,
                e.department as assigned_employee_department
            FROM tasks t
            LEFT JOIN employees e ON t.assigned_employee_id = e.id
            ${whereSql}
            ORDER BY ${orderByClause}
            LIMIT ? OFFSET ?
        `;

        const [tasks] = await pool.query(selectTasksQuery, [...queryParams, limit, offset]);

        // Format dates cleanly
        const formattedTasks = tasks.map(task => ({
            ...task,
            due_date: formatDateString(task.due_date),
            assigned_employee_name: task.assigned_employee_name || 'Unassigned'
        }));

        res.json({
            success: true,
            stats: stats,
            pagination: {
                currentPage: page,
                totalPages: totalPages,
                totalItems: totalItems,
                itemsPerPage: limit
            },
            data: formattedTasks
        });

    } catch (error) {
        console.error('Error in GET /api/tasks:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tasks' });
    }
});

// GET /api/tasks/:id - Fetch single task by ID
router.get('/:id', async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    try {
        const isMock = getIsUsingMock();

        if (isMock) {
            const task = mockTasks.find(t => t.id === taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
            return res.json({
                success: true,
                data: { ...task, due_date: formatDateString(task.due_date) }
            });
        }

        const pool = getPool();
        const [rows] = await pool.query(`
            SELECT t.*, e.name as assigned_employee_name 
            FROM tasks t 
            LEFT JOIN employees e ON t.assigned_employee_id = e.id 
            WHERE t.id = ?
        `, [taskId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        const task = rows[0];
        task.due_date = formatDateString(task.due_date);

        res.json({ success: true, data: task });
    } catch (error) {
        console.error('Error fetching single task:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch task details' });
    }
});

// POST /api/tasks - Create a new task (with field validation)
router.post('/', async (req, res) => {
    const { title, description, priority, status, assigned_employee_id, due_date } = req.body;

    // Form Validation for Mandatory Fields
    if (!title || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'Task Title is mandatory' });
    }
    if (!due_date || due_date.trim() === '') {
        return res.status(400).json({ success: false, message: 'Due Date is mandatory' });
    }
    if (!assigned_employee_id) {
        return res.status(400).json({ success: false, message: 'Assigning an employee is mandatory' });
    }

    const taskPriority = ['Low', 'Medium', 'High'].includes(priority) ? priority : 'Medium';
    const taskStatus = ['Pending', 'In Progress', 'Completed'].includes(status) ? status : 'Pending';

    try {
        const isMock = getIsUsingMock();

        if (isMock) {
            const newId = mockTasks.length > 0 ? Math.max(...mockTasks.map(t => t.id)) + 1 : 1;
            const employee = mockEmployees.find(e => e.id === Number(assigned_employee_id));
            
            const newTask = {
                id: newId,
                title: title.trim(),
                description: (description || '').trim(),
                priority: taskPriority,
                status: taskStatus,
                assigned_employee_id: Number(assigned_employee_id),
                assigned_employee_name: employee ? employee.name : 'Unassigned',
                due_date: formatDateString(due_date),
                created_at: new Date().toISOString()
            };

            mockTasks.push(newTask);
            return res.status(201).json({
                success: true,
                message: 'Task created successfully',
                data: newTask
            });
        }

        const pool = getPool();
        const insertQuery = `
            INSERT INTO tasks (title, description, priority, status, assigned_employee_id, due_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        const [result] = await pool.query(insertQuery, [
            title.trim(),
            (description || '').trim(),
            taskPriority,
            taskStatus,
            Number(assigned_employee_id),
            formatDateString(due_date)
        ]);

        res.status(201).json({
            success: true,
            message: 'Task created successfully',
            taskId: result.insertId
        });
    } catch (error) {
        console.error('Error creating task:', error);
        res.status(500).json({ success: false, message: 'Failed to create task' });
    }
});

// PUT /api/tasks/:id - Edit an existing task
router.put('/:id', async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { title, description, priority, status, assigned_employee_id, due_date } = req.body;

    // Validation
    if (!title || title.trim() === '') {
        return res.status(400).json({ success: false, message: 'Task Title is mandatory' });
    }
    if (!due_date || due_date.trim() === '') {
        return res.status(400).json({ success: false, message: 'Due Date is mandatory' });
    }

    try {
        const isMock = getIsUsingMock();

        if (isMock) {
            const index = mockTasks.findIndex(t => t.id === taskId);
            if (index === -1) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
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
            return res.json({ success: true, message: 'Task updated successfully', data: mockTasks[index] });
        }

        const pool = getPool();
        const updateQuery = `
            UPDATE tasks 
            SET title = ?, description = ?, priority = ?, status = ?, assigned_employee_id = ?, due_date = ?
            WHERE id = ?
        `;
        const [result] = await pool.query(updateQuery, [
            title.trim(),
            (description || '').trim(),
            priority,
            status,
            Number(assigned_employee_id),
            formatDateString(due_date),
            taskId
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, message: 'Task updated successfully' });
    } catch (error) {
        console.error('Error updating task:', error);
        res.status(500).json({ success: false, message: 'Failed to update task' });
    }
});

// PATCH /api/tasks/:id/status - Quick Task Status Change
router.patch('/:id/status', async (req, res) => {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    try {
        const isMock = getIsUsingMock();

        if (isMock) {
            const task = mockTasks.find(t => t.id === taskId);
            if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
            task.status = status;
            return res.json({ success: true, message: `Status updated to ${status}` });
        }

        const pool = getPool();
        const [result] = await pool.query('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, message: `Status updated to ${status}` });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ success: false, message: 'Failed to update task status' });
    }
});

// DELETE /api/tasks/:id - Delete a task with confirmation
router.delete('/:id', async (req, res) => {
    const taskId = parseInt(req.params.id, 10);

    try {
        const isMock = getIsUsingMock();

        if (isMock) {
            const index = mockTasks.findIndex(t => t.id === taskId);
            if (index === -1) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            mockTasks.splice(index, 1);
            return res.json({ success: true, message: 'Task deleted successfully' });
        }

        const pool = getPool();
        const [result] = await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ success: false, message: 'Failed to delete task' });
    }
});

module.exports = router;
