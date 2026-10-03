// Main Application Frontend Logic - Employee Task Management System

// Global Application State
const AppState = {
    tasks: [],
    employees: [],
    stats: {},
    pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        itemsPerPage: 10
    },
    filters: {
        search: '',
        status: 'All',
        priority: 'All',
        sortBy: 'due_date',
        sortOrder: 'asc'
    },
    viewMode: 'table' // 'table' or 'grid'
};

// DOM Content Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

/**
 * Initialize application listeners and load initial dataset
 */
async function initApp() {
    setupEventListeners();
    await fetchEmployees();
    await fetchTasks();
    
    // Set default due date in form to today + 7 days
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    document.getElementById('dueDate').value = defaultDueDate.toISOString().split('T')[0];
}

/**
 * Attach event listeners to search, filter, sort, modal, and view toggles
 */
function setupEventListeners() {
    // Search input with 300ms debounce
    let searchDebounceTimer;
    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            AppState.filters.search = e.target.value;
            AppState.pagination.currentPage = 1;
            fetchTasks();
        }, 300);
    });

    // Filter dropdowns
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        AppState.filters.status = e.target.value;
        AppState.pagination.currentPage = 1;
        fetchTasks();
    });

    document.getElementById('priorityFilter').addEventListener('change', (e) => {
        AppState.filters.priority = e.target.value;
        AppState.pagination.currentPage = 1;
        fetchTasks();
    });

    // Sorting
    document.getElementById('sortBySelect').addEventListener('change', (e) => {
        AppState.filters.sortBy = e.target.value;
        updateSortOrderLabel();
        fetchTasks();
    });

    document.getElementById('btnSortOrderToggle').addEventListener('click', () => {
        AppState.filters.sortOrder = AppState.filters.sortOrder === 'asc' ? 'desc' : 'asc';
        updateSortOrderLabel();
        fetchTasks();
    });

    // View Mode Toggle (Table vs Cards)
    document.getElementById('btnTableView').addEventListener('click', () => setViewMode('table'));
    document.getElementById('btnGridView').addEventListener('click', () => setViewMode('grid'));

    // Items Per Page
    document.getElementById('itemsPerPageSelect').addEventListener('change', (e) => {
        AppState.pagination.itemsPerPage = parseInt(e.target.value, 10);
        AppState.pagination.currentPage = 1;
        fetchTasks();
    });

    // Pagination buttons
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (AppState.pagination.currentPage > 1) {
            AppState.pagination.currentPage--;
            fetchTasks();
        }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
        if (AppState.pagination.currentPage < AppState.pagination.totalPages) {
            AppState.pagination.currentPage++;
            fetchTasks();
        }
    });

    // Add Task Modal Controls
    document.getElementById('btnOpenAddTaskModal').addEventListener('click', openAddTaskModal);
    document.getElementById('btnCloseTaskModal').addEventListener('click', closeTaskModal);
    document.getElementById('btnCancelTaskModal').addEventListener('click', closeTaskModal);
    document.getElementById('taskForm').addEventListener('submit', handleTaskFormSubmit);

    // Delete Modal Controls
    document.getElementById('btnCloseDeleteModal').addEventListener('click', closeDeleteModal);
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', handleConfirmDelete);
}

/**
 * Fetch Employee List for Assignee Dropdown Options
 */
async function fetchEmployees() {
    try {
        const response = await fetch('/api/employees');
        const result = await response.json();
        if (result.success) {
            AppState.employees = result.data;
            populateEmployeeDropdown(result.data);
        }
    } catch (error) {
        console.error('Failed to fetch employees:', error);
        showToast('Error loading employees dropdown', 'error');
    }
}

/**
 * Populate Form Dropdown with Employees
 */
function populateEmployeeDropdown(employees) {
    const selectEl = document.getElementById('assignedEmployeeId');
    selectEl.innerHTML = '<option value="">-- Select Employee --</option>';

    employees.forEach(emp => {
        const option = document.createElement('option');
        option.value = emp.id;
        option.innerText = `${emp.name} (${emp.designation || emp.department})`;
        selectEl.appendChild(option);
    });
}

/**
 * Fetch Tasks from Backend REST API
 */
async function fetchTasks() {
    try {
        const queryParams = new URLSearchParams({
            search: AppState.filters.search,
            status: AppState.filters.status,
            priority: AppState.filters.priority,
            sortBy: AppState.filters.sortBy,
            sortOrder: AppState.filters.sortOrder,
            page: AppState.pagination.currentPage,
            limit: AppState.pagination.itemsPerPage
        });

        const response = await fetch(`/api/tasks?${queryParams.toString()}`);
        const result = await response.json();

        if (result.success) {
            AppState.tasks = result.data;
            AppState.stats = result.stats;
            AppState.pagination = result.pagination;

            renderDashboardStats(result.stats);
            renderTaskList();
            renderPaginationBar();
        } else {
            showToast(result.message || 'Failed to fetch tasks', 'error');
        }
    } catch (error) {
        console.error('Error fetching tasks:', error);
        showToast('Network error while connecting to server', 'error');
    }
}

/**
 * Render Dashboard Metric Cards
 */
function renderDashboardStats(stats) {
    if (!stats) return;
    document.getElementById('statTotalTasks').innerText = stats.totalTasks || 0;
    document.getElementById('statPendingTasks').innerText = stats.pendingTasks || 0;
    document.getElementById('statInProgressTasks').innerText = stats.inProgressTasks || 0;
    document.getElementById('statCompletedTasks').innerText = stats.completedTasks || 0;
    document.getElementById('statHighPriorityTasks').innerText = stats.highPriorityTasks || 0;
}

/**
 * Render Tasks List (Table View or Grid View)
 */
function renderTaskList() {
    const tableBody = document.getElementById('tasksTableBody');
    const gridContainer = document.getElementById('gridViewWrapper');
    const emptyState = document.getElementById('emptyState');

    if (AppState.tasks.length === 0) {
        tableBody.innerHTML = '';
        gridContainer.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    if (AppState.viewMode === 'table') {
        renderTableRows(AppState.tasks);
    } else {
        renderGridCards(AppState.tasks);
    }
}

/**
 * Render Data Table Rows
 */
function renderTableRows(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '';

    tasks.forEach(task => {
        const tr = document.createElement('tr');

        // Status Badge Class
        const statusClass = task.status === 'Completed' ? 'badge-status-completed' :
                           task.status === 'In Progress' ? 'badge-status-in-progress' : 'badge-status-pending';

        // Priority Badge Class
        const priorityClass = task.priority === 'High' ? 'badge-priority-high' :
                             task.priority === 'Medium' ? 'badge-priority-medium' : 'badge-priority-low';

        tr.innerHTML = `
            <td>
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-desc" title="${escapeHtml(task.description)}">${escapeHtml(task.description || 'No description provided')}</div>
            </td>
            <td>
                <strong style="color: #334155;">${escapeHtml(task.assigned_employee_name || 'Unassigned')}</strong>
            </td>
            <td>
                <span class="badge ${priorityClass}">${task.priority}</span>
            </td>
            <td>
                <select class="status-select ${statusClass}" onchange="quickUpdateTaskStatus(${task.id}, this.value)">
                    <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
                    <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>⚙️ In Progress</option>
                    <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>✅ Completed</option>
                </select>
            </td>
            <td>
                <span style="font-size: 0.88rem; color: #475569;">${task.due_date}</span>
            </td>
            <td style="text-align: right;">
                <div class="action-btns" style="justify-content: flex-end;">
                    <button class="btn-icon btn-icon-edit" onclick="openEditTaskModal(${task.id})" title="Edit Task">✏️</button>
                    <button class="btn-icon btn-icon-delete" onclick="openDeleteModal(${task.id}, '${escapeJsString(task.title)}')" title="Delete Task">🗑️</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

/**
 * Render Grid Cards View
 */
function renderGridCards(tasks) {
    const container = document.getElementById('gridViewWrapper');
    container.innerHTML = '';

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';

        const priorityClass = task.priority === 'High' ? 'badge-priority-high' :
                             task.priority === 'Medium' ? 'badge-priority-medium' : 'badge-priority-low';

        card.innerHTML = `
            <div>
                <div class="task-card-header">
                    <span class="badge ${priorityClass}">${task.priority} Priority</span>
                    <select class="status-select" onchange="quickUpdateTaskStatus(${task.id}, this.value)">
                        <option value="Pending" ${task.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${task.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Completed" ${task.status === 'Completed' ? 'selected' : ''}>Completed</option>
                    </select>
                </div>
                <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 6px; color: #1e293b;">${escapeHtml(task.title)}</h3>
                <p style="font-size: 0.85rem; color: #64748b; margin-bottom: 12px;">${escapeHtml(task.description || 'No description provided')}</p>
            </div>
            
            <div class="task-card-footer">
                <div>
                    <div><strong>Assigned:</strong> ${escapeHtml(task.assigned_employee_name || 'Unassigned')}</div>
                    <div><strong>Due Date:</strong> ${task.due_date}</div>
                </div>
                <div class="action-btns">
                    <button class="btn-icon btn-icon-edit" onclick="openEditTaskModal(${task.id})" title="Edit Task">✏️</button>
                    <button class="btn-icon btn-icon-delete" onclick="openDeleteModal(${task.id}, '${escapeJsString(task.title)}')" title="Delete Task">🗑️</button>
                </div>
            </div>
        `;

        container.appendChild(card);
    });
}

/**
 * Update Task Status from Row/Card Dropdown directly
 */
async function quickUpdateTaskStatus(taskId, newStatus) {
    try {
        const response = await fetch(`/api/tasks/${taskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        const result = await response.json();

        if (result.success) {
            showToast(`Task status updated to ${newStatus}`, 'success');
            fetchTasks(); // Refresh dashboard counts & task list
        } else {
            showToast(result.message || 'Failed to update status', 'error');
        }
    } catch (error) {
        console.error('Error updating task status:', error);
        showToast('Error connecting to server', 'error');
    }
}

/**
 * Render Pagination Controls Bar
 */
function renderPaginationBar() {
    const { currentPage, totalPages, totalItems, itemsPerPage } = AppState.pagination;
    const paginationInfo = document.getElementById('paginationInfo');
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    const numbersContainer = document.getElementById('pageNumbersContainer');

    if (totalItems === 0) {
        paginationInfo.innerText = 'Showing 0 tasks';
        prevBtn.disabled = true;
        nextBtn.disabled = true;
        numbersContainer.innerHTML = '';
        return;
    }

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    paginationInfo.innerText = `Showing ${startItem} to ${endItem} of ${totalItems} tasks`;

    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Build numeric page buttons
    numbersContainer.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.innerText = i;
        pageBtn.addEventListener('click', () => {
            AppState.pagination.currentPage = i;
            fetchTasks();
        });
        numbersContainer.appendChild(pageBtn);
    }
}

/**
 * Open Modal to Add New Task
 */
function openAddTaskModal() {
    document.getElementById('modalTitle').innerText = 'Add New Employee Task';
    document.getElementById('taskId').value = '';
    document.getElementById('taskForm').reset();
    
    // Set default due date (today + 7 days)
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);
    document.getElementById('dueDate').value = defaultDueDate.toISOString().split('T')[0];

    FormValidator.clearErrors(document.getElementById('taskForm'));
    document.getElementById('taskModal').classList.add('active');
}

/**
 * Open Modal to Edit Existing Task
 */
async function openEditTaskModal(taskId) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const task = result.data;
            document.getElementById('modalTitle').innerText = `Edit Task #${task.id}`;
            document.getElementById('taskId').value = task.id;
            document.getElementById('title').value = task.title;
            document.getElementById('description').value = task.description || '';
            document.getElementById('priority').value = task.priority;
            document.getElementById('status').value = task.status;
            document.getElementById('assignedEmployeeId').value = task.assigned_employee_id || '';
            document.getElementById('dueDate').value = task.due_date;

            FormValidator.clearErrors(document.getElementById('taskForm'));
            document.getElementById('taskModal').classList.add('active');
        } else {
            showToast('Task details could not be retrieved', 'error');
        }
    } catch (error) {
        console.error('Error fetching task details:', error);
        showToast('Failed to load task details for editing', 'error');
    }
}

/**
 * Close Add/Edit Task Modal
 */
function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
}

/**
 * Handle Add/Edit Task Form Submit
 */
async function handleTaskFormSubmit(e) {
    e.preventDefault();

    const taskId = document.getElementById('taskId').value;
    const formData = {
        title: document.getElementById('title').value,
        description: document.getElementById('description').value,
        priority: document.getElementById('priority').value,
        status: document.getElementById('status').value,
        assignedEmployeeId: document.getElementById('assignedEmployeeId').value,
        dueDate: document.getElementById('dueDate').value
    };

    // Client-side validation
    const validation = FormValidator.validateTaskForm(formData);
    if (!validation.isValid) {
        FormValidator.showErrors(validation.errors, document.getElementById('taskForm'));
        return;
    }

    FormValidator.clearErrors(document.getElementById('taskForm'));

    const payload = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        assigned_employee_id: formData.assignedEmployeeId,
        due_date: formData.dueDate
    };

    const isEdit = !!taskId;
    const url = isEdit ? `/api/tasks/${taskId}` : '/api/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            showToast(isEdit ? 'Task updated successfully' : 'New task created successfully', 'success');
            closeTaskModal();
            fetchTasks();
        } else {
            showToast(result.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Error saving task:', error);
        showToast('Network error while saving task', 'error');
    }
}

/**
 * Open Delete Confirmation Modal
 */
function openDeleteModal(taskId, taskTitle) {
    document.getElementById('deleteTaskId').value = taskId;
    document.getElementById('deleteTaskTitle').innerText = `"${taskTitle}"`;
    document.getElementById('deleteModal').classList.add('active');
}

/**
 * Close Delete Modal
 */
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('active');
}

/**
 * Confirm Task Deletion
 */
async function handleConfirmDelete() {
    const taskId = document.getElementById('deleteTaskId').value;
    if (!taskId) return;

    try {
        const response = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
        const result = await response.json();

        if (result.success) {
            showToast('Task deleted successfully', 'success');
            closeDeleteModal();
            fetchTasks();
        } else {
            showToast(result.message || 'Failed to delete task', 'error');
        }
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Network error during deletion', 'error');
    }
}

/**
 * Toggle View Mode (Table vs Cards)
 */
function setViewMode(mode) {
    AppState.viewMode = mode;
    const btnTable = document.getElementById('btnTableView');
    const btnGrid = document.getElementById('btnGridView');
    const tableWrapper = document.getElementById('tableViewWrapper');
    const gridWrapper = document.getElementById('gridViewWrapper');

    if (mode === 'table') {
        btnTable.classList.add('active');
        btnGrid.classList.remove('active');
        tableWrapper.style.display = 'block';
        gridWrapper.style.display = 'none';
    } else {
        btnGrid.classList.add('active');
        btnTable.classList.remove('active');
        tableWrapper.style.display = 'none';
        gridWrapper.style.display = 'grid';
    }
    renderTaskList();
}

/**
 * Update Sort Order Label UI
 */
function updateSortOrderLabel() {
    const label = document.getElementById('sortOrderLabel');
    const fieldName = document.getElementById('sortBySelect').options[document.getElementById('sortBySelect').selectedIndex].text;
    const arrow = AppState.filters.sortOrder === 'asc' ? '↑' : '↓';
    label.innerText = `${fieldName.replace('Sort by: ', '')} ${arrow}`;
}

/**
 * Show Toast Notification Alert
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${type === 'success' ? '✅' : '⚠️'}</span>
        <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/**
 * String Helper Escapes
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeJsString(str) {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}
