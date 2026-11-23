
-- ==========================================
-- STOCKSENSE DATABASE
-- Food Business Management System
-- ==========================================

CREATE DATABASE IF NOT EXISTS stocksense_db;
USE stocksense_db;

-- ==========================================
-- 1. USERS-
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    username VARCHAR(60) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Shop Owner', 'Staff')
        NOT NULL DEFAULT 'Staff',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. SUPPLIERS
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120),
    phone VARCHAR(30),
    email VARCHAR(150),
    address TEXT,
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. PRODUCTS
-- ==========================================

CREATE TABLE IF NOT EXISTS products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(60) NOT NULL UNIQUE,
    product_name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    unit VARCHAR(30) NOT NULL DEFAULT 'piece',
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    reorder_level INT NOT NULL DEFAULT 10,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. INVENTORY
-- ==========================================

CREATE TABLE IF NOT EXISTS inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_inventory_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
        ON DELETE CASCADE
);

-- ==========================================
-- 5. PURCHASES
-- ==========================================

CREATE TABLE IF NOT EXISTS purchases (
    purchase_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT,
    reference_number VARCHAR(80) UNIQUE,
    purchase_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('Pending', 'Received', 'Cancelled')
        NOT NULL DEFAULT 'Pending',
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_purchase_supplier
        FOREIGN KEY (supplier_id)
        REFERENCES suppliers(supplier_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_purchase_user
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);

-- ==========================================
-- 6. PURCHASE ITEMS
-- ==========================================

CREATE TABLE IF NOT EXISTS purchase_items (
    purchase_item_id INT AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_purchase_item_purchase
        FOREIGN KEY (purchase_id)
        REFERENCES purchases(purchase_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_purchase_item_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
);

-- ==========================================
-- 7. BATCHES AND EXPIRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    purchase_item_id INT,
    batch_code VARCHAR(80) NOT NULL,
    quantity_received INT NOT NULL,
    quantity_remaining INT NOT NULL,
    received_date DATE NOT NULL,
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_batch_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_batch_purchase_item
        FOREIGN KEY (purchase_item_id)
        REFERENCES purchase_items(purchase_item_id)
        ON DELETE SET NULL,

    INDEX idx_batch_expiry (expiry_date),
    INDEX idx_batch_product (product_id)
);

-- ==========================================
-- 8. SALES
-- ==========================================

CREATE TABLE IF NOT EXISTS sales (
    sale_id INT AUTO_INCREMENT PRIMARY KEY,
    receipt_number VARCHAR(80) NOT NULL UNIQUE,
    sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('Cash', 'Card', 'E-Wallet', 'Other')
        NOT NULL DEFAULT 'Cash',
    status ENUM('Completed', 'Cancelled')
        NOT NULL DEFAULT 'Completed',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sale_user
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    INDEX idx_sale_date (sale_date)
);

-- ==========================================
-- 9. SALE ITEMS
-- ==========================================

CREATE TABLE IF NOT EXISTS sale_items (
    sale_item_id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,

    CONSTRAINT fk_sale_item_sale
        FOREIGN KEY (sale_id)
        REFERENCES sales(sale_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_sale_item_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id)
);

-- ==========================================
-- 10. STOCK MOVEMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS stock_movements (
    movement_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    movement_type ENUM(
        'Stock In',
        'Stock Out',
        'Adjustment',
        'Sale',
        'Purchase'
    ) NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id INT,
    remarks TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_movement_product
        FOREIGN KEY (product_id)
        REFERENCES products(product_id),

    CONSTRAINT fk_movement_user
        FOREIGN KEY (created_by)
        REFERENCES users(user_id)
        ON DELETE SET NULL,

    INDEX idx_movement_date (created_at),
    INDEX idx_movement_product (product_id)
);

-- ==========================================
-- 11. NOTIFICATIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM(
        'Low Stock',
        'Expiring',
        'Expired',
        'System'
    ) NOT NULL DEFAULT 'System',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_notification_read (is_read),
    INDEX idx_notification_date (created_at)
);

-- ==========================================
-- DATABASE SETUP COMPLETE
-- ==========================================

SELECT 'StockSense database tables created successfully.'
AS setup_message;
