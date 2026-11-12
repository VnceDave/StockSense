
USE stocksense_db;

CREATE TABLE IF NOT EXISTS login_logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('SUCCESS', 'FAILED') NOT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_login_user (user_id),
    INDEX idx_login_date (login_at),

    CONSTRAINT fk_login_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE SET NULL
);
