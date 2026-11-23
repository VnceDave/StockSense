const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST || "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER || "kJ2FRmMejYkSEfJ.root",
    password: process.env.DB_PASSWORD || "T0rQBzOu72Km8xH9",
    database: process.env.DB_NAME || "stocksense_db",

    // TiDB Cloud SSL Configuration
    ssl: {
        minVersion: "TLSv1.2"
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

module.exports = db;