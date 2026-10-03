const API_URL = '/api';
let allTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    loadTasks();
});

async function loadEmployees() {
    try {
        const response = await fetch(`${API_URL}/employees`);
        const employees = await response.json();
        
        const select = document.getElementById('taskEmployee');
        select.innerHTML = '<option value="">-- Select Employee --</option>';
        
        employees.forEach(emp => {
            select.innerHTML += `<option value="${emp.id}">${emp.name}</option>`;
        });
    } catch (err) {
        console.error('Failed to load employees:', err);
    }
}

async function loadTasks() {
    const search = document.getElementById('searchInput').value;
    const status = document.getElementById('statusFilter').value;
    const priority = document.getElementById('priorityFilter').value;

    const query = new URLSearchParams({ search, status, priority });

    try {
        const response = await fetch(`${API_URL}/tasks?${query}`);
        const data = await response.json();

        allTasks = data.tasks || [];

        document.getElementById('statTotal').innerText = data.stats.total || 0;
        document.getElementById('statPending').innerText = data.stats.pending || 0;
        document.getElementById('statInProgress').innerText = data.stats.inProgress || 0;
        document.getElementById('statCompleted').innerText = data.stats.completed || 0;

        renderTable(allTasks);
    } catch (err) {
        console.error('Failed to load tasks:', err);
    }
}

function renderTable(tasks) {
    const tableBody = document.getElementById('taskTableBody');
    tableBody.innerHTML = '';

    if (tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No tasks found.</td></tr>';
        return;
    }

    tasks.forEach(task => {
        const priorityBadge = `badge-${task.priority.toLowerCase()}`;
        const statusBadge = task.status === 'In Progress' ? 'badge-progress' : `badge-${task.status.toLowerCase()}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <strong>${escapeHtml(task.title)}</strong>
                <br><small style="color: #666;">${escapeHtml(task.description || '')}</small>
            </td>
            <td>${escapeHtml(task.assigned_employee_name || 'Unassigned')}</td>
            <td><span class="badge ${priorityBadge}">${task.priority}</span></td>
            <td><span class="badge ${statusBadge}">${task.status}</span></td>
            <td>${formatDate(task.due_date)}</td>
            <td>
                <button class="btn btn-edit" onclick="openEditModal(${task.id})">Edit</button>
                <button class="btn btn-delete" onclick="deleteTask(${task.id})">Delete</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

function openAddModal() {
    document.getElementById('modalTitle').innerText = 'Add New Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskTitle').value = '';
    document.getElementById('taskDescription').value = '';
    document.getElementById('taskPriority').value = 'Medium';
    document.getElementById('taskStatus').value = 'Pending';
    document.getElementById('taskEmployee').value = '';
    document.getElementById('taskDueDate').value = '';
    document.getElementById('formError').style.display = 'none';

    document.getElementById('taskModal').style.display = 'flex';
}

function openEditModal(taskId) {
    const task = allTasks.find(t => t.id == taskId);
    if (!task) return;

    document.getElementById('modalTitle').innerText = 'Edit Task';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskStatus').value = task.status;
    document.getElementById('taskEmployee').value = task.assigned_employee_id || '';
    document.getElementById('taskDueDate').value = formatDate(task.due_date);
    document.getElementById('formError').style.display = 'none';

    document.getElementById('taskModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('taskModal').style.display = 'none';
}

async function saveTask() {
    const id = document.getElementById('taskId').value;
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const status = document.getElementById('taskStatus').value;
    const assigned_employee_id = document.getElementById('taskEmployee').value;
    const due_date = document.getElementById('taskDueDate').value;

    const errorDiv = document.getElementById('formError');

    if (!title || !due_date || !assigned_employee_id) {
        errorDiv.innerText = 'Please fill out all required fields (*).';
        errorDiv.style.display = 'block';
        return;
    }

    const payload = { title, description, priority, status, assigned_employee_id, due_date };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/tasks/${id}` : `${API_URL}/tasks`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            loadTasks();
        } else {
            const errData = await response.json();
            errorDiv.innerText = errData.error || 'Failed to save task.';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Error saving task:', err);
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`${API_URL}/tasks/${taskId}`, { method: 'DELETE' });
        if (response.ok) {
            loadTasks();
        }
    } catch (err) {
        console.error('Error deleting task:', err);
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
