
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const db = require("./db");
const recordLogin = require("./loginHistory");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json());

// =====================================
// HELPERS
// =====================================

function validId(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
}

function validateProduct(data) {
    if (!data.sku || !String(data.sku).trim()) {
        return "SKU is required.";
    }

    if (!data.product_name || !String(data.product_name).trim()) {
        return "Product name is required.";
    }

    const cost = Number(data.cost_price ?? 0);
    const selling = Number(data.selling_price ?? 0);
    const reorder = Number(data.reorder_level ?? 10);

    if (
        !Number.isFinite(cost) ||
        !Number.isFinite(selling) ||
        !Number.isInteger(reorder) ||
        cost < 0 || selling < 0 || reorder < 0
    ) {
        return "Please enter valid prices and reorder level.";
    }

    if (data.quantity !== undefined) {
        const quantity = Number(data.quantity);

        if (!Number.isInteger(quantity) || quantity < 0) {
            return "Quantity must be a non-negative whole number.";
        }
    }

    return null;
}

function validateSupplier(data) {
    if (!data.supplier_name || !String(data.supplier_name).trim()) {
        return "Supplier name is required.";
    }

    if (
        data.status !== undefined &&
        !["Active", "Inactive"].includes(data.status)
    ) {
        return "Invalid supplier status.";
    }

    return null;
}

function validDate(value) {
    if (!value) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

    const date = new Date(`${value}T00:00:00`);

    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
}

// =====================================
// SERVER CHECK
// =====================================

app.get("/", (req, res) => {
    res.json({
        message: "StockSense API is running!"
    });
});

// =====================================
// REGISTER
// =====================================


// =====================================
// REGISTER
// =====================================

app.post("/api/register", async (req, res) => {
    try {
        const {
            shop_name,
            name,
            username,
            email,
            password
        } = req.body;

        const shopName = String(shop_name || name || "").trim();
        const cleanUsername = String(username || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();

        if (!shopName || !cleanUsername || !cleanEmail || !password) {
            return res.status(400).json({
                message: "Please complete all required fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters."
            });
        }

        const [existing] = await db.execute(
            `SELECT user_id FROM users
             WHERE username = ? OR email = ?`,
            [cleanUsername, cleanEmail]
        );

        if (existing.length) {
            return res.status(409).json({
                message: "Username or email is already registered."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await db.execute(
            `INSERT INTO users
            (full_name, shop_name, username, email, password_hash)
            VALUES (?, ?, ?, ?, ?)`,
            [
                shopName,
                shopName,
                cleanUsername,
                cleanEmail,
                hashedPassword
            ]
        );

        res.status(201).json({
            success: true,
            message: "Account created successfully. You can now log in."
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(500).json({
            message: "Registration failed."
        });
    }
});

// =====================================
// LOGIN
// =====================================

app.post("/api/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Please enter your username and password."
            });
        }

        const identifier = String(username).trim();

        const [users] = await db.execute(
            `SELECT
                user_id,
                full_name,
                shop_name,
                username,
                email,
                password_hash,
                role
             FROM users
             WHERE username = ? OR email = ?
             LIMIT 1`,
            [identifier, identifier.toLowerCase()]
        );

        if (!users.length) {
            await recordLogin({
                identifier,
                status: "FAILED",
                req
            });

            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        const user = users[0];

        const match = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!match) {
            await recordLogin({
                userId: user.user_id,
                identifier: user.email,
                status: "FAILED",
                req
            });

            return res.status(401).json({
                message: "Invalid username or password."
            });
        }

        if (!JWT_SECRET) {
            throw new Error("JWT_SECRET is missing in .env");
        }

        const token = jwt.sign(
            {
                user_id: user.user_id,
                username: user.username,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: "8h" }
        );

        await recordLogin({
            userId: user.user_id,
            identifier: user.email,
            status: "SUCCESS",
            req
        });

        const displayName = user.shop_name || user.full_name;

        res.json({
            success: true,
            message: "Login successful.",
            token,
            user: {
                user_id: user.user_id,
                name: displayName,
                shop_name: displayName,
                full_name: user.full_name,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed."
        });
    }
});

// =====================================
// INVENTORY
// =====================================

app.get("/api/inventory", async (req, res) => {
    try {
        const [inventory] = await db.execute(`
            SELECT
                p.product_id,
                p.sku,
                p.product_name,
                p.category,
                p.description,
                p.unit,
                p.cost_price,
                p.selling_price,
                p.reorder_level,
                COALESCE(i.quantity, 0) AS quantity,
                i.last_updated
            FROM products p
            LEFT JOIN inventory i
                ON p.product_id = i.product_id
            WHERE p.is_active = 1
            ORDER BY p.product_name ASC
        `);

        res.json({ success: true, inventory });

    } catch (error) {
        console.error("Inventory error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory."
        });
    }
});

// =====================================
// PRODUCTS
// =====================================

app.get("/api/products", async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT
                p.product_id,
                p.sku,
                p.product_name,
                p.category,
                p.description,
                p.unit,
                p.cost_price,
                p.selling_price,
                p.reorder_level,
                p.created_at,
                p.updated_at,
                COALESCE(i.quantity, 0) AS quantity
            FROM products p
            LEFT JOIN inventory i
                ON p.product_id = i.product_id
            WHERE p.is_active = 1
            ORDER BY p.created_at DESC
        `);

        res.json({ success: true, products });

    } catch (error) {
        console.error("Get products error:", error);
        res.status(500).json({
            message: "Failed to retrieve products."
        });
    }
});

app.post("/api/products", async (req, res) => {
    const validationError = validateProduct(req.body);

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const {
        sku,
        product_name,
        category,
        description,
        unit,
        cost_price,
        selling_price,
        reorder_level,
        quantity
    } = req.body;

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [result] = await connection.execute(
            `INSERT INTO products
            (
                sku, product_name, category, description,
                unit, cost_price, selling_price, reorder_level
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                sku.trim(),
                product_name.trim(),
                category || null,
                description || null,
                unit || "piece",
                Number(cost_price ?? 0),
                Number(selling_price ?? 0),
                Number(reorder_level ?? 10)
            ]
        );

        const productId = result.insertId;

        await connection.execute(
            `INSERT INTO inventory (product_id, quantity)
             VALUES (?, ?)`,
            [productId, Number(quantity ?? 0)]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Product added successfully!",
            product_id: productId
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Add product error:", error);

        res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
            message: error.code === "ER_DUP_ENTRY"
                ? "This SKU already exists."
                : "Failed to add product."
        });

    } finally {
        if (connection) connection.release();
    }
});

app.put("/api/products/:id", async (req, res) => {
    const productId = Number(req.params.id);

    if (!validId(productId)) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    const validationError = validateProduct(req.body);

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const {
        sku,
        product_name,
        category,
        description,
        unit,
        cost_price,
        selling_price,
        reorder_level
    } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE products
             SET sku = ?, product_name = ?, category = ?,
                 description = ?, unit = ?, cost_price = ?,
                 selling_price = ?, reorder_level = ?
             WHERE product_id = ? AND is_active = 1`,
            [
                sku.trim(),
                product_name.trim(),
                category || null,
                description || null,
                unit || "piece",
                Number(cost_price ?? 0),
                Number(selling_price ?? 0),
                Number(reorder_level ?? 10),
                productId
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully!"
        });

    } catch (error) {
        console.error("Update product error:", error);

        res.status(error.code === "ER_DUP_ENTRY" ? 409 : 500).json({
            message: error.code === "ER_DUP_ENTRY"
                ? "This SKU is already used by another product."
                : "Failed to update product."
        });
    }
});

app.delete("/api/products/:id", async (req, res) => {
    const productId = Number(req.params.id);

    if (!validId(productId)) {
        return res.status(400).json({
            message: "Invalid product ID."
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE products
             SET is_active = 0
             WHERE product_id = ? AND is_active = 1`,
            [productId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully."
        });

    } catch (error) {
        console.error("Delete product error:", error);
        res.status(500).json({
            message: "Failed to delete product."
        });
    }
});

// =====================================
// NOTIFICATIONS
// =====================================

app.get("/api/notifications", async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT
                p.product_id,
                p.product_name,
                p.reorder_level,
                COALESCE(i.quantity, 0) AS quantity
            FROM products p
            LEFT JOIN inventory i
                ON p.product_id = i.product_id
            WHERE p.is_active = 1
              AND COALESCE(i.quantity, 0) <= p.reorder_level
            ORDER BY quantity ASC, p.product_name ASC
        `);

        const notifications = products.map(product => {
            const outOfStock = Number(product.quantity) === 0;

            return {
                id: `stock-${product.product_id}`,
                type: outOfStock ? "out_of_stock" : "low_stock",
                title: outOfStock ? "Out of Stock" : "Low Stock",
                message: `${product.product_name} ${
                    outOfStock
                        ? "is out of stock."
                        : `has only ${product.quantity} remaining.`
                }`,
                product_id: product.product_id,
                product_name: product.product_name,
                quantity: Number(product.quantity),
                reorder_level: Number(product.reorder_level)
            };
        });

        res.json({
            success: true,
            notifications,
            count: notifications.length
        });

    } catch (error) {
        console.error("Get notifications error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to retrieve notifications."
        });
    }
});

// =====================================
// SUPPLIERS
// =====================================

app.get("/api/suppliers", async (req, res) => {
    try {
        const [suppliers] = await db.execute(`
            SELECT supplier_id, supplier_name, contact_person,
                   phone, email, address, status, created_at
            FROM suppliers
            ORDER BY supplier_id DESC
        `);

        res.json({ success: true, suppliers });

    } catch (error) {
        console.error("Get suppliers error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve suppliers."
        });
    }
});

app.post("/api/suppliers", async (req, res) => {
    const validationError = validateSupplier(req.body);

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const {
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        status
    } = req.body;

    try {
        const [result] = await db.execute(
            `INSERT INTO suppliers
            (
                supplier_name, contact_person, phone,
                email, address, status
            )
            VALUES (?, ?, ?, ?, ?, ?)`,
            [
                supplier_name.trim(),
                contact_person || null,
                phone || null,
                email || null,
                address || null,
                status || "Active"
            ]
        );

        res.status(201).json({
            success: true,
            message: "Supplier added successfully!",
            supplier_id: result.insertId
        });

    } catch (error) {
        console.error("Add supplier error:", error);
        res.status(500).json({
            message: "Failed to add supplier."
        });
    }
});

app.put("/api/suppliers/:id", async (req, res) => {
    const supplierId = Number(req.params.id);

    if (!validId(supplierId)) {
        return res.status(400).json({
            message: "Invalid supplier ID."
        });
    }

    const validationError = validateSupplier(req.body);

    if (validationError) {
        return res.status(400).json({
            message: validationError
        });
    }

    const {
        supplier_name,
        contact_person,
        phone,
        email,
        address,
        status
    } = req.body;

    try {
        const [result] = await db.execute(
            `UPDATE suppliers
             SET supplier_name = ?, contact_person = ?,
                 phone = ?, email = ?, address = ?, status = ?
             WHERE supplier_id = ?`,
            [
                supplier_name.trim(),
                contact_person || null,
                phone || null,
                email || null,
                address || null,
                status || "Active",
                supplierId
            ]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Supplier not found."
            });
        }

        res.json({
            success: true,
            message: "Supplier updated successfully!"
        });

    } catch (error) {
        console.error("Update supplier error:", error);
        res.status(500).json({
            message: "Failed to update supplier."
        });
    }
});

app.delete("/api/suppliers/:id", async (req, res) => {
    const supplierId = Number(req.params.id);

    if (!validId(supplierId)) {
        return res.status(400).json({
            message: "Invalid supplier ID."
        });
    }

    try {
        const [result] = await db.execute(
            `UPDATE suppliers
             SET status = 'Inactive'
             WHERE supplier_id = ?`,
            [supplierId]
        );

        if (!result.affectedRows) {
            return res.status(404).json({
                message: "Supplier not found."
            });
        }

        res.json({
            success: true,
            message: "Supplier deactivated successfully."
        });

    } catch (error) {
        console.error("Deactivate supplier error:", error);
        res.status(500).json({
            message: "Failed to deactivate supplier."
        });
    }
});

// =====================================
// SALES
// =====================================

// GET SALES
app.get("/api/sales", async (req, res) => {
    try {
        const [sales] = await db.execute(`
            SELECT
                s.sale_id,
                s.receipt_number,
                s.sale_date,
                s.total_amount,
                s.payment_method,
                s.status,
                s.created_by,
                u.full_name AS cashier,
                (
                    SELECT COUNT(*)
                    FROM sale_items si
                    WHERE si.sale_id = s.sale_id
                ) AS item_count
            FROM sales s
            LEFT JOIN users u ON s.created_by = u.user_id
            ORDER BY s.sale_date DESC
        `);

        res.json({ success: true, sales });

    } catch (error) {
        console.error("Get sales error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve sales."
        });
    }
});

// GET SALE DETAILS
app.get("/api/sales/:id", async (req, res) => {
    const saleId = Number(req.params.id);

    if (!validId(saleId)) {
        return res.status(400).json({
            message: "Invalid sale ID."
        });
    }

    try {
        const [sales] = await db.execute(`
            SELECT s.*, u.full_name AS cashier
            FROM sales s
            LEFT JOIN users u ON s.created_by = u.user_id
            WHERE s.sale_id = ?
        `, [saleId]);

        if (!sales.length) {
            return res.status(404).json({
                message: "Sale not found."
            });
        }

        const [items] = await db.execute(`
            SELECT
                si.sale_item_id,
                si.product_id,
                p.sku,
                p.product_name,
                si.quantity,
                si.unit_price,
                si.subtotal
            FROM sale_items si
            INNER JOIN products p ON si.product_id = p.product_id
            WHERE si.sale_id = ?
        `, [saleId]);

        res.json({
            success: true,
            sale: sales[0],
            items
        });

    } catch (error) {
        console.error("Sale details error:", error);
        res.status(500).json({
            message: "Failed to retrieve sale details."
        });
    }
});

// CREATE SALE
app.post("/api/sales", async (req, res) => {
    const {
        items,
        payment_method,
        created_by
    } = req.body;

    const methods = ["Cash", "Card", "E-Wallet", "Other"];

    if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({
            message: "Please add at least one product."
        });
    }

    if (!methods.includes(payment_method || "Cash")) {
        return res.status(400).json({
            message: "Invalid payment method."
        });
    }

    if (
        created_by !== undefined &&
        created_by !== null &&
        !validId(created_by)
    ) {
        return res.status(400).json({
            message: "Invalid cashier ID."
        });
    }

    const quantities = new Map();

    for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);

        if (!validId(productId) ||
            !Number.isInteger(quantity) ||
            quantity <= 0) {
            return res.status(400).json({
                message: "Invalid product or quantity."
            });
        }

        quantities.set(
            productId,
            (quantities.get(productId) || 0) + quantity
        );
    }

    const normalizedItems = [...quantities.entries()]
        .map(([product_id, quantity]) => ({
            product_id,
            quantity
        }))
        .sort((a, b) => a.product_id - b.product_id);

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const saleItems = [];
        let totalAmount = 0;

        for (const item of normalizedItems) {
            const [products] = await connection.execute(`
                SELECT
                    p.product_id,
                    p.product_name,
                    p.selling_price,
                    i.quantity AS stock_quantity
                FROM products p
                INNER JOIN inventory i ON p.product_id = i.product_id
                WHERE p.product_id = ?
                AND p.is_active = 1
                FOR UPDATE
            `, [item.product_id]);

            if (!products.length) {
                const error = new Error("Product not found.");
                error.statusCode = 404;
                throw error;
            }

            const product = products[0];

            if (Number(product.stock_quantity) < item.quantity) {
                const error = new Error(
                    `Insufficient stock for ${product.product_name}. Available: ${product.stock_quantity}.`
                );
                error.statusCode = 409;
                throw error;
            }

            const unitPrice = Number(product.selling_price);
            const subtotal = Number(
                (unitPrice * item.quantity).toFixed(2)
            );

            totalAmount += subtotal;

            saleItems.push({
                product_id: item.product_id,
                product_name: product.product_name,
                quantity: item.quantity,
                unit_price: unitPrice,
                subtotal
            });
        }

        totalAmount = Number(totalAmount.toFixed(2));

        const receiptNumber =
            `SS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const [saleResult] = await connection.execute(`
            INSERT INTO sales
            (
                receipt_number,
                total_amount,
                payment_method,
                status,
                created_by
            )
            VALUES (?, ?, ?, 'Completed', ?)
        `, [
            receiptNumber,
            totalAmount,
            payment_method || "Cash",
            created_by ? Number(created_by) : null
        ]);

        const saleId = saleResult.insertId;

        for (const item of saleItems) {
            await connection.execute(`
                INSERT INTO sale_items
                (sale_id, product_id, quantity, unit_price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `, [
                saleId,
                item.product_id,
                item.quantity,
                item.unit_price,
                item.subtotal
            ]);

            await connection.execute(`
                UPDATE inventory
                SET quantity = quantity - ?
                WHERE product_id = ?
            `, [item.quantity, item.product_id]);

            await connection.execute(`
                INSERT INTO stock_movements
                (
                    product_id, movement_type, quantity,
                    reference_type, reference_id, remarks, created_by
                )
                VALUES (?, 'Sale', ?, 'Sale', ?, ?, ?)
            `, [
                item.product_id,
                item.quantity,
                saleId,
                `Sold through receipt ${receiptNumber}`,
                created_by ? Number(created_by) : null
            ]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Sale completed successfully!",
            sale_id: saleId,
            receipt_number: receiptNumber,
            total_amount: totalAmount,
            payment_method: payment_method || "Cash",
            items: saleItems
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Create sale error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to process sale."
        });

    } finally {
        if (connection) connection.release();
    }
});

// CANCEL SALE
app.put("/api/sales/:id/cancel", async (req, res) => {
    const saleId = Number(req.params.id);

    if (!validId(saleId)) {
        return res.status(400).json({
            message: "Invalid sale ID."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [sales] = await connection.execute(`
            SELECT sale_id, receipt_number, status
            FROM sales
            WHERE sale_id = ?
            FOR UPDATE
        `, [saleId]);

        if (!sales.length) {
            const error = new Error("Sale not found.");
            error.statusCode = 404;
            throw error;
        }

        if (sales[0].status === "Cancelled") {
            const error = new Error("This sale is already cancelled.");
            error.statusCode = 400;
            throw error;
        }

        const [items] = await connection.execute(
            `SELECT product_id, quantity
             FROM sale_items
             WHERE sale_id = ?`,
            [saleId]
        );

        for (const item of items) {
            const [inventory] = await connection.execute(
                `SELECT inventory_id FROM inventory
                 WHERE product_id = ? FOR UPDATE`,
                [item.product_id]
            );

            if (!inventory.length) {
                const error = new Error("Inventory record not found.");
                error.statusCode = 409;
                throw error;
            }

            await connection.execute(`
                UPDATE inventory
                SET quantity = quantity + ?
                WHERE product_id = ?
            `, [item.quantity, item.product_id]);

            await connection.execute(`
                INSERT INTO stock_movements
                (
                    product_id, movement_type, quantity,
                    reference_type, reference_id, remarks
                )
                VALUES (?, 'Adjustment', ?, 'Sale Cancellation', ?, ?)
            `, [
                item.product_id,
                item.quantity,
                saleId,
                `Stock restored from cancelled receipt ${sales[0].receipt_number}`
            ]);
        }

        await connection.execute(
            `UPDATE sales SET status = 'Cancelled'
             WHERE sale_id = ?`,
            [saleId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Sale cancelled and inventory restored successfully."
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Cancel sale error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to cancel sale."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =====================================
// GET ALL PURCHASES
// =====================================

app.get("/api/purchases", async (req, res) => {
    try {
        const [purchases] = await db.execute(`
            SELECT
                p.purchase_id,
                p.supplier_id,
                s.supplier_name,
                p.reference_number,
                p.purchase_date,
                p.total_amount,
                p.status,
                p.notes,
                p.created_by,
                u.full_name AS created_by_name,
                COUNT(pi.purchase_item_id) AS item_count
            FROM purchases p
            LEFT JOIN suppliers s
                ON p.supplier_id = s.supplier_id
            LEFT JOIN users u
                ON p.created_by = u.user_id
            LEFT JOIN purchase_items pi
                ON p.purchase_id = pi.purchase_id
            GROUP BY
                p.purchase_id,
                p.supplier_id,
                s.supplier_name,
                p.reference_number,
                p.purchase_date,
                p.total_amount,
                p.status,
                p.notes,
                p.created_by,
                u.full_name
            ORDER BY p.purchase_id DESC
        `);

        res.json({
            success: true,
            purchases
        });

    } catch (error) {
        console.error("Get purchases error:", error);

        res.status(500).json({
            success: false,
            message: error.message || "Failed to load purchases."
        });
    }
});
// CREATE PURCHASE
app.post("/api/purchases", async (req, res) => {
    const {
        supplier_id,
        reference_number,
        notes,
        created_by,
        items
    } = req.body;

    if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({
            message: "Please add at least one product."
        });
    }

    if (
        supplier_id !== undefined &&
        supplier_id !== null &&
        supplier_id !== "" &&
        !validId(supplier_id)
    ) {
        return res.status(400).json({
            message: "Invalid supplier ID."
        });
    }

    if (
        created_by !== undefined &&
        created_by !== null &&
        created_by !== "" &&
        !validId(created_by)
    ) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    for (const item of items) {
        const productId = Number(item.product_id);
        const quantity = Number(item.quantity);
        const unitCost = Number(item.unit_cost);

        if (
            !validId(productId) ||
            !Number.isInteger(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitCost) ||
            unitCost < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Each item needs a valid product, quantity, and unit cost."
            });
        }

        // EXPIRY DATE IS OPTIONAL
        // Validate only if the user provided a date.
        if (item.expiry_date && !validDate(item.expiry_date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid expiry date. Use YYYY-MM-DD."
            });
        }
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        if (supplier_id) {
            const [suppliers] = await connection.execute(`
                SELECT supplier_id
                FROM suppliers
                WHERE supplier_id = ?
                AND status = 'Active'
                FOR UPDATE
            `, [Number(supplier_id)]);

            if (!suppliers.length) {
                const error = new Error(
                    "Supplier not found or inactive."
                );
                error.statusCode = 404;
                throw error;
            }
        }

        let totalAmount = 0;
        const purchaseItems = [];

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);
            const unitCost = Number(item.unit_cost);

            const [products] = await connection.execute(`
                SELECT product_id
                FROM products
                WHERE product_id = ?
                AND is_active = 1
                FOR UPDATE
            `, [productId]);

            if (!products.length) {
                const error = new Error(
                    `Product ${productId} not found or inactive.`
                );
                error.statusCode = 404;
                throw error;
            }

            const subtotal = Number(
                (quantity * unitCost).toFixed(2)
            );

            totalAmount += subtotal;

            purchaseItems.push({
                product_id: productId,
                quantity,
                unit_cost: unitCost,
                subtotal,
                expiry_date: item.expiry_date || null
            });
        }

        totalAmount = Number(totalAmount.toFixed(2));

        const [purchaseResult] = await connection.execute(`
            INSERT INTO purchases
            (
                supplier_id,
                reference_number,
                total_amount,
                status,
                notes,
                created_by
            )
            VALUES (?, ?, ?, 'Pending', ?, ?)
        `, [
            supplier_id ? Number(supplier_id) : null,
            reference_number ? String(reference_number).trim() : null,
            totalAmount,
            notes || null,
            created_by ? Number(created_by) : null
        ]);

        const purchaseId = purchaseResult.insertId;

        for (const item of purchaseItems) {
            await connection.execute(`
                INSERT INTO purchase_items
                (
                    purchase_id,
                    product_id,
                    quantity,
                    unit_cost,
                    subtotal,
                    expiry_date
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                purchaseId,
                item.product_id,
                item.quantity,
                item.unit_cost,
                item.subtotal,
                item.expiry_date
            ]);
        }

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Purchase created successfully. Status: Pending.",
            purchase_id: purchaseId,
            total_amount: totalAmount,
            status: "Pending"
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Create purchase error:", error);

        res.status(
            error.code === "ER_DUP_ENTRY"
                ? 409
                : error.statusCode || 500
        ).json({
            success: false,
            message: error.code === "ER_DUP_ENTRY"
                ? "Reference number already exists."
                : error.message || "Failed to create purchase."
        });

    } finally {
        if (connection) connection.release();
    }
});

// RECEIVE PURCHASE
app.put("/api/purchases/:id/receive", async (req, res) => {
    const purchaseId = Number(req.params.id);
    const createdBy = req.body.created_by;

    if (!validId(purchaseId)) {
        return res.status(400).json({
            message: "Invalid purchase ID."
        });
    }

    if (
        createdBy !== undefined &&
        createdBy !== null &&
        !validId(createdBy)
    ) {
        return res.status(400).json({
            message: "Invalid user ID."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [purchases] = await connection.execute(`
            SELECT purchase_id, status
            FROM purchases
            WHERE purchase_id = ?
            FOR UPDATE
        `, [purchaseId]);

        if (!purchases.length) {
            const error = new Error("Purchase not found.");
            error.statusCode = 404;
            throw error;
        }

        if (purchases[0].status !== "Pending") {
            const error = new Error(
                `Cannot receive purchase with status ${purchases[0].status}.`
            );
            error.statusCode = 409;
            throw error;
        }

        const [items] = await connection.execute(`
            SELECT
                purchase_item_id,
                product_id,
                quantity,
                expiry_date
            FROM purchase_items
            WHERE purchase_id = ?
            ORDER BY product_id ASC
        `, [purchaseId]);

        if (!items.length) {
            const error = new Error("This purchase has no items.");
            error.statusCode = 400;
            throw error;
        }

        // Lock inventory rows before updating them.
        const productIds = [...new Set(
            items.map(item => Number(item.product_id))
        )].sort((a, b) => a - b);

        for (const productId of productIds) {
            const [inventory] = await connection.execute(`
                SELECT inventory_id
                FROM inventory
                WHERE product_id = ?
                FOR UPDATE
            `, [productId]);

            if (!inventory.length) {
                const error = new Error(
                    `Inventory record for product ${productId} not found.`
                );
                error.statusCode = 409;
                throw error;
            }
        }

        for (const item of items) {
            const quantity = Number(item.quantity);

            await connection.execute(`
                UPDATE inventory
                SET quantity = quantity + ?
                WHERE product_id = ?
            `, [quantity, item.product_id]);

            const batchCode =
                `PUR-${purchaseId}-ITEM-${item.purchase_item_id}`;

            await connection.execute(`
                INSERT INTO batches
                (
                    product_id,
                    purchase_item_id,
                    batch_code,
                    quantity_received,
                    quantity_remaining,
                    received_date,
                    expiry_date
                )
                VALUES (?, ?, ?, ?, ?, CURRENT_DATE(), ?)
            `, [
                item.product_id,
                item.purchase_item_id,
                batchCode,
                quantity,
                quantity,
                item.expiry_date
            ]);

            await connection.execute(`
                INSERT INTO stock_movements
                (
                    product_id,
                    movement_type,
                    quantity,
                    reference_type,
                    reference_id,
                    remarks,
                    created_by
                )
                VALUES (?, 'Purchase', ?, 'Purchase', ?, ?, ?)
            `, [
                item.product_id,
                quantity,
                purchaseId,
                `Stock received from purchase ${purchaseId}`,
                createdBy ? Number(createdBy) : null
            ]);
        }

        await connection.execute(`
            UPDATE purchases
            SET status = 'Received'
            WHERE purchase_id = ?
        `, [purchaseId]);

        await connection.commit();

        res.json({
            success: true,
            message: "Purchase received successfully. Inventory and batches updated.",
            purchase_id: purchaseId,
            status: "Received"
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Receive purchase error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to receive purchase."
        });

    } finally {
        if (connection) connection.release();
    }
});

// CANCEL PENDING PURCHASE
app.put("/api/purchases/:id/cancel", async (req, res) => {
    const purchaseId = Number(req.params.id);

    if (!validId(purchaseId)) {
        return res.status(400).json({
            message: "Invalid purchase ID."
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [purchases] = await connection.execute(`
            SELECT purchase_id, status
            FROM purchases
            WHERE purchase_id = ?
            FOR UPDATE
        `, [purchaseId]);

        if (!purchases.length) {
            const error = new Error("Purchase not found.");
            error.statusCode = 404;
            throw error;
        }

        if (purchases[0].status !== "Pending") {
            const error = new Error(
                "Only pending purchases can be cancelled."
            );
            error.statusCode = 409;
            throw error;
        }

        await connection.execute(`
            UPDATE purchases
            SET status = 'Cancelled'
            WHERE purchase_id = ?
        `, [purchaseId]);

        await connection.commit();

        res.json({
            success: true,
            message: "Purchase cancelled successfully."
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Cancel purchase error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to cancel purchase."
        });

    } finally {
        if (connection) connection.release();
    }
});

// =====================================
// START SERVER
// =====================================

app.listen(PORT, () => {
    console.log(
        `StockSense server running at http://localhost:${PORT}`
    );
});
