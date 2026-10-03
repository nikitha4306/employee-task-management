-- Simple Database Schema for Employee Task Management System

CREATE DATABASE IF NOT EXISTS employee_task_db;
USE employee_task_db;

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

-- 2. Tasks Table
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

-- Sample Employees Data
INSERT INTO employees (id, name, email, department) VALUES
(1, 'Rahul Sharma', 'rahul@company.com', 'Engineering'),
(2, 'Priya Patel', 'priya@company.com', 'Design'),
(3, 'Amit Verma', 'amit@company.com', 'Backend'),
(4, 'Sneha Gupta', 'sneha@company.com', 'Testing')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Sample Tasks Data
INSERT INTO tasks (id, title, description, priority, status, assigned_employee_id, due_date) VALUES
(1, 'Design UI Mockups', 'Create simple wireframes for company portal.', 'High', 'In Progress', 2, '2026-10-15'),
(2, 'Fix Login API Bug', 'Resolve password authentication issue.', 'High', 'Pending', 3, '2026-10-18'),
(3, 'Write User Manual', 'Document system features for end users.', 'Low', 'Completed', 1, '2026-10-05'),
(4, 'QA Testing', 'Run manual test cases for release.', 'Medium', 'Pending', 4, '2026-10-22')
ON DUPLICATE KEY UPDATE title=VALUES(title);
