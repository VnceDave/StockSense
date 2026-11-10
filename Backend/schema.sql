
-- =====================================
-- STOCKSENSE DATABASE
-- USER LOGIN INFORMATION ONLY
-- =====================================

CREATE DATABASE stocksense_db;

USE stocksense_db;

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(120) NOT NULL,

    username VARCHAR(60) NOT NULL UNIQUE,

    email VARCHAR(150) NOT NULL UNIQUE,

    password_hash VARCHAR(255) NOT NULL,

    role ENUM(
        'Admin',
        'Shop Owner',
        'Staff'
    ) NOT NULL DEFAULT 'Staff',

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);
