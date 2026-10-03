CREATE DATABASE IF NOT EXISTS employee_task_db;
USE employee_task_db;

CREATE TABLE IF NOT EXISTS employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);

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

INSERT INTO employees (id, name, email, department) VALUES
(1, 'Rahul Sharma', 'rahul@company.com', 'Engineering'),
(2, 'Priya Patel', 'priya@company.com', 'Design'),
(3, 'Amit Verma', 'amit@company.com', 'Backend'),
(4, 'Sneha Gupta', 'sneha@company.com', 'Testing'),
(5, 'Vikram Malhotra', 'vikram@company.com', 'Marketing')
ON DUPLICATE KEY UPDATE name=VALUES(name);

INSERT INTO tasks (id, title, description, priority, status, assigned_employee_id, due_date) VALUES
(1, 'Redesign Mobile App Onboarding Flow', 'Improve user retention by simplifying the signup screen and adding interactive feature tooltips.', 'High', 'In Progress', 2, '2026-10-15'),
(2, 'Optimize Database Indexing for Order Queries', 'Add composite indexes on customer order tables to reduce query latency during peak traffic hours.', 'High', 'Pending', 3, '2026-10-18'),
(3, 'Prepare Q4 Marketing Campaign Plan', 'Draft target audience persona sheets, social media schedule, and budget breakdown for Q4 product launch.', 'Medium', 'Pending', 5, '2026-10-25'),
(4, 'Execute Regression Test Suite for v2.4 Release', 'Perform manual end-to-end testing on checkout workflow, payment gateway integration, and email triggers.', 'Medium', 'In Progress', 4, '2026-10-12'),
(5, 'Update Security Certificates & SSL Config', 'Renew production domain SSL certificates and update server security protocols before expiry.', 'Low', 'Completed', 1, '2026-10-05')
ON DUPLICATE KEY UPDATE title=VALUES(title);
