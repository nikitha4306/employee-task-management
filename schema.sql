-- Database Creation Script for Employee Task Management System
CREATE DATABASE IF NOT EXISTS employee_task_db;
USE employee_task_db;

-- 1. Users Table (For user login/logout authentication)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'Manager',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Employees Table (For assigning tasks to team members)
CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    department VARCHAR(100) NOT NULL,
    designation VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tasks Table (Core task data)
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

-- Initial Seed Data for Users
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Admin User', 'admin@company.com', 'admin123', 'Manager'),
(2, 'Sarah Manager', 'sarah@company.com', 'pass123', 'Team Lead')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Initial Seed Data for Employees
INSERT INTO employees (id, name, email, department, designation) VALUES
(1, 'Rahul Sharma', 'rahul@company.com', 'Engineering', 'Senior Developer'),
(2, 'Priya Patel', 'priya@company.com', 'Design', 'UI/UX Designer'),
(3, 'Amit Verma', 'amit@company.com', 'Engineering', 'Backend Developer'),
(4, 'Sneha Gupta', 'sneha@company.com', 'QA', 'Quality Analyst'),
(5, 'Vikram Singh', 'vikram@company.com', 'DevOps', 'Cloud Engineer')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Initial Seed Data for Tasks
INSERT INTO tasks (id, title, description, priority, status, assigned_employee_id, due_date) VALUES
(1, 'Design New Dashboard UI', 'Create responsive wireframes and layout for the internal analytics portal.', 'High', 'In Progress', 2, '2026-10-15'),
(2, 'Refactor Database Queries', 'Optimize MySQL queries for task search and pagination endpoints.', 'Medium', 'Pending', 3, '2026-10-20'),
(3, 'Setup CI/CD Pipeline', 'Configure GitHub Actions for automatic deployment to staging server.', 'High', 'Completed', 5, '2026-10-05'),
(4, 'Write API Documentation', 'Document all REST API endpoints with request and response examples.', 'Low', 'Pending', 1, '2026-10-25'),
(5, 'Execute Regression Testing', 'Perform complete test suite check before releasing version 1.2 update.', 'Medium', 'In Progress', 4, '2026-10-12')
ON DUPLICATE KEY UPDATE title=VALUES(title);
