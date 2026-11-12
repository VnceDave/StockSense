
const db = require("./db");

async function recordLogin({
    userId = null,
    identifier,
    status,
    req
}) {
    try {
        await db.execute(
            `INSERT INTO login_logs
            (user_id, email, status, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                String(identifier || "Unknown").trim().slice(0, 255),
                status,
                req.ip || null,
                req.get("user-agent") || null
            ]
        );
    } catch (error) {
        // Login should still work even if history recording fails.
        console.error("Login history recording error:", error);
    }
}

module.exports = recordLogin;
