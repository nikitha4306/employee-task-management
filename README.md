# Employee Task Management System

A clean, human-readable, full-stack web application designed for managing employee tasks, tracking progress, filtering, sorting, and monitoring dashboard statistics.

Built with **HTML, CSS, JavaScript** on the frontend, **Node.js & Express** on the backend, and **MySQL** for persistent database storage.

---

## 🌟 Key Features

### Required Website Functionalities
- 📊 **Dashboard Overview**: Live counter cards showing **Total Tasks**, **Pending Tasks**, **In Progress Tasks**, **Completed Tasks**, and **High Priority Tasks**.
- ➕ **Add Task Form**: Modal dialog for creating tasks with Task Title, Description, Priority (Low, Medium, High), Status (Pending, In Progress, Completed), Assigned Employee, and Due Date.
- 📋 **Table & Card Views**: Display tasks in a clear data table view or switch to a grid cards layout.
- ✏️ **Edit Existing Tasks**: Modal form pre-populated with existing task details for updating.
- 🗑️ **Delete Task**: Custom confirmation modal dialog preventing accidental deletion.
- ⚡ **Quick Status Update**: Change task status directly from rows/cards dropdown menu.
- 🔍 **Search Tasks**: Real-time live search by task title, description, or assigned employee name.
- 🎯 **Multi-Criteria Filtering**: Filter tasks by Status and Priority simultaneously.
- ✅ **Form Validation**: Client-side and server-side validation for mandatory fields (Title, Due Date, Assigned Employee, Status, Priority) and valid dates.
- 💾 **Data Persistence**: Uses **MySQL** database with auto-initialization script (`schema.sql`).

### Bonus Features Included
- 🔐 **User Login / Logout**: Authentication session handling with login page (`login.html`).
- 👥 **Task Assignment to Employees**: Dynamic assignee selection dropdown linked to employee database table (`employees`).
- 📄 **Pagination**: Configurable items per page (5, 10, 20) with previous/next page navigation controls.
- 🔀 **Sorting**: Sort tasks by Due Date, Priority, Title, or Date Created in Ascending or Descending order.
- 📱 **Responsive Design**: Clean layout adaptable to desktop and mobile viewports.

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+).
- **Backend**: Node.js, Express.js.
- **Database**: MySQL (`mysql2` library with promise support).
- **Environment & Tools**: `dotenv`, `cors`, `git`.

---

## 📁 Project Structure

```
employee_management system/
├── config/
│   └── db.js                 # MySQL pool configuration & auto-initialization
├── public/
│   ├── index.html            # Main single-page application dashboard
│   ├── login.html            # Login page UI
│   ├── css/
│   │   └── style.css         # Clean CSS design system & layout
│   └── js/
│       ├── app.js            # Core frontend state management & API interaction
│       ├── auth.js           # Authentication & header profile management
│       └── validation.js     # Form validation helper functions
├── routes/
│   ├── authRoutes.js         # User login / logout REST endpoints
│   ├── employeeRoutes.js     # Employee list REST endpoints
│   └── taskRoutes.js         # Task CRUD, search, filter, sort, pagination REST endpoints
├── .env.example              # Sample environment configuration
├── .env                      # Local environment configuration
├── package.json              # Node.js dependencies
├── schema.sql                # MySQL database creation & seed data script
├── server.js                 # Express server entry point
└── README.md                 # Complete documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MySQL Server](https://www.mysql.com/) (Optional: if MySQL server is running locally on port 3306, it will automatically connect and create `employee_task_db`. If MySQL is not running, the application seamlessly runs in fallback mode).

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=employee_task_db
DB_PORT=3306
```

### Step 3: Database Setup (Automatic)
The application automatically creates the `employee_task_db` database and initial seed data on startup. Alternatively, you can run `schema.sql` manually in MySQL Workbench or CLI:
```bash
mysql -u root -p < schema.sql
```

### Step 4: Run Application
```bash
npm start
```
Open your browser and navigate to: **`http://localhost:3000`**

### Demo Login Credentials
- **Email**: `admin@company.com`
- **Password**: `admin123`

---

## 🔌 REST API Endpoints

### Tasks API (`/api/tasks`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | Get all tasks (Supports `search`, `status`, `priority`, `sortBy`, `sortOrder`, `page`, `limit`) |
| `GET` | `/api/tasks/:id` | Get single task details by ID |
| `POST` | `/api/tasks` | Create a new task (Validates mandatory fields) |
| `PUT` | `/api/tasks/:id` | Update an existing task by ID |
| `PATCH` | `/api/tasks/:id/status` | Quick update task status |
| `DELETE` | `/api/tasks/:id` | Delete a task by ID |

### Employees API (`/api/employees`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/employees` | Get list of all employees for task assignment |

### Auth API (`/api/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/login` | User login |
| `GET` | `/api/auth/user` | Get current active user session |
| `POST` | `/api/auth/logout` | User logout |
