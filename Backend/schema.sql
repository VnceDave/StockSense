
-- ==========================================
-- STOCKSENSE DATABASE
-- USER LOGIN MANAGEMENT
-- ==========================================

PRAGMA foreign_keys = ON;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('Admin', 'Shop Owner', 'Staff')) DEFAULT 'Staff',
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- SAMPLE USERS
-- Passwords must be securely hashed by the backend.
-- Do not insert plain-text passwords.

-- Example view for reading user data
SELECT
    user_id,
    full_name,
    username,
    email,
    role,
    is_active,
    created_at
FROM users;
