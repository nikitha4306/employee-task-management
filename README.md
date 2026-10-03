# Employee Task Management System (Simple & Beginner Friendly)

A simple, easy-to-understand Employee Task Management System web application built with **HTML, CSS, JavaScript**, **Node.js + Express**, and **MySQL**.

Designed with **ultra-simple code structure** so that any developer or interviewer can read, understand, and run the project in minutes!

---

## 📁 Simple Project Structure (Only 5 Main Files!)

```
employee_management system/
├── server.js             # Simple Node.js Express server & REST API (~100 lines)
├── schema.sql            # Simple MySQL database script (employees & tasks tables)
├── package.json          # Node dependencies (express, mysql2, dotenv, cors)
├── .env                  # MySQL database configuration settings
├── public/
│   ├── index.html        # Simple HTML page (Dashboard, Task Table & Modal)
│   ├── style.css         # Simple CSS styling
│   └── script.js         # Simple JavaScript DOM & Fetch API logic
└── README.md             # Project documentation
```

---

## 🌟 Key Functionalities Included

1. **Dashboard Overview**: Stat cards displaying **Total Tasks**, **Pending Tasks**, **In Progress Tasks**, and **Completed Tasks**.
2. **Add Task Form**: Modal dialog with Task Title, Description, Priority (Low, Medium, High), Status, Assigned Employee, and Due Date.
3. **Task Table View**: Display all tasks with employee name, priority badge, status badge, due date, Edit button, and Delete button.
4. **Edit Task**: Pre-fills the modal form with existing task details for quick updating.
5. **Delete Task**: Confirmation prompt before deleting a task.
6. **Search & Filter**: Real-time search by task title and filtering by Status and Priority.
7. **Form Validation**: Simple client and server validation for required fields.
8. **MySQL Data Persistence**: Persistent storage with sample seed data.

---

## 🚀 How to Run the Project

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Server
```bash
npm start
```
Open your browser at: **`http://localhost:3000`**
