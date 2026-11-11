
// =====================================
// STOCKSENSE - MAIN JAVASCRIPT
// =====================================

// SAMPLE INVENTORY DATA

let inventory = [
    { id: 1, name: "Chicken Breast", category: "Meat", qty: 18, unit: "kg", minimum: 5, expiry: "2026-11-15" },
    { id: 2, name: "Rice", category: "Dry Goods", qty: 42, unit: "kg", minimum: 10, expiry: "2027-02-10" },
    { id: 3, name: "Fresh Milk", category: "Dairy", qty: 3, unit: "L", minimum: 4, expiry: "2026-11-12" },
    { id: 4, name: "Cooking Oil", category: "Pantry", qty: 7, unit: "L", minimum: 3, expiry: "2027-01-20" },
    { id: 5, name: "Coffee Beans", category: "Beverage", qty: 2, unit: "packs", minimum: 3, expiry: "2027-01-05" },
    { id: 6, name: "Lettuce", category: "Produce", qty: 3, unit: "kg", minimum: 3, expiry: "2026-11-11" },
    { id: 7, name: "Cheese", category: "Dairy", qty: 8, unit: "kg", minimum: 4, expiry: "2026-11-20" },
    { id: 8, name: "Peanuts", category: "Allergen", qty: 1, unit: "kg", minimum: 2, expiry: "2027-03-01" }
];

// SAMPLE PRODUCTS

const products = [
    { id: "P001", name: "Chicken Rice Bowl", price: 145, allergy: "None listed" },
    { id: "P002", name: "Beef Tapa Bowl", price: 165, allergy: "Soy" },
    { id: "P003", name: "Creamy Pasta", price: 135, allergy: "Milk, Wheat" },
    { id: "P004", name: "Fresh Garden Salad", price: 110, allergy: "None listed" },
    { id: "P005", name: "Satay Bowl", price: 155, allergy: "Peanuts" },
    { id: "P006", name: "Iced Coffee", price: 85, allergy: "Milk" }
];

// SAMPLE PURCHASES

const purchases = [
    { id: "PO-001", supplier: "FreshFarm Trading", date: "2026-11-08", items: "Lettuce, Tomatoes", status: "Received" },
    { id: "PO-002", supplier: "Daily Dairy Co.", date: "2026-11-09", items: "Milk, Cheese", status: "Pending" }
];

// SAMPLE SUPPLIERS

const suppliers = [
    { id: "SUP-001", name: "FreshFarm Trading", contact: "09171234567", items: "Vegetables" },
    { id: "SUP-002", name: "Daily Dairy Co.", contact: "09182345678", items: "Milk and Cheese" },
    { id: "SUP-003", name: "Prime Meats", contact: "09193456789", items: "Meat Products" }
];

// LOGIN

function safeParseJson(value, fallback) {
    if (!value) return fallback;

    try {
        return JSON.parse(value);
    } catch (error) {
        console.error("Could not parse saved data:", error);
        return fallback;
    }
}

function getStoredValue(key, fallback) {
    try {
        return safeParseJson(localStorage.getItem(key), fallback);
    } catch (error) {
        console.error("Could not read storage:", error);
        return fallback;
    }
}

let currentUser = getStoredValue("stocksense_user", null);

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const nameInput = document.getElementById("loginName");
        const roleInput = document.getElementById("loginRole");

        if (!nameInput || !roleInput) return;

        const name = nameInput.value.trim();
        const role = roleInput.value;

        if (!name) return;

        currentUser = {
            name: name,
            role: role
        };

        try {
            localStorage.setItem("stocksense_user", JSON.stringify(currentUser));
        } catch (error) {
            console.error("Could not save user session:", error);
        }

        showApp();
    });
}

function showApp() {
    const loginScreen = document.getElementById("loginScreen");
    const app = document.getElementById("app");
    const userNameLabel = document.getElementById("userNameLabel");
    const userRoleLabel = document.getElementById("userRoleLabel");

    if (!currentUser || !loginScreen || !app || !userNameLabel || !userRoleLabel) return;

    loginScreen.classList.add("hidden");
    app.classList.remove("hidden");

    userNameLabel.textContent = currentUser.name;
    userRoleLabel.textContent = currentUser.role;

    showPage("dashboard");
}

// LOGOUT

const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        try {
            localStorage.removeItem("stocksense_user");
        } catch (error) {
            console.error("Could not clear user session:", error);
        }
        currentUser = null;

        const app = document.getElementById("app");
        const loginScreen = document.getElementById("loginScreen");

        if (app) app.classList.add("hidden");
        if (loginScreen) loginScreen.classList.remove("hidden");
    });
}

// NAVIGATION

const navigation = document.getElementById("navigation");

if (navigation) {
    navigation.addEventListener("click", function(event) {
        const button = event.target.closest("button[data-page]");

        if (button) {
            showPage(button.dataset.page);
        }
    });
}

function showPage(page) {
    const navButtons = document.querySelectorAll(".nav-link");
    const pageContent = document.getElementById("pageContent");

    if (pageContent) {
        document.querySelectorAll(".nav-link").forEach(button => {
            button.classList.toggle("active", button.dataset.page === page);
        });
    }

    const titles = {
        dashboard: "Dashboard",
        inventory: "Inventory",
        products: "Sales & Products",
        purchases: "Purchases",
        suppliers: "Suppliers",
        batches: "Batch & Expiry",
        reports: "Reports",
        notifications: "Notifications",
        settings: "Settings"
    };

    document.getElementById("pageTitle").textContent = titles[page];

    const pages = {
        dashboard: dashboardPage,
        inventory: inventoryPage,
        products: productsPage,
        purchases: purchasesPage,
        suppliers: suppliersPage,
        batches: batchesPage,
        reports: reportsPage,
        notifications: notificationsPage,
        settings: settingsPage
    };

    document.getElementById("pageContent").innerHTML = pages[page]();

    attachEvents(page);
}

// HELPER FUNCTIONS

function money(amount) {
    return "₱" + Number(amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2
    });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function stockStatus(item) {
    if (item.qty <= 0) return ["Out of Stock", "danger"];
    if (item.qty <= item.minimum) return ["Low Stock", "warning"];
    return ["In Stock", ""];
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

// DASHBOARD

function dashboardPage() {

    const lowStock = inventory.filter(item =>
        item.qty <= item.minimum
    ).length;

    return `
        <div class="welcome">
            <h2>Welcome, ${escapeHTML(currentUser.name)}!</h2>
            <p>Here's what's happening across your food shop today.</p>
        </div>

        <div class="stats-grid">

            <div class="stat-card">
                <p>Active Orders</p>
                <h2>12</h2>
                <small>Pickup and shop orders</small>
            </div>

            <div class="stat-card">
                <p>Inventory Items</p>
                <h2>${inventory.length}</h2>
                <small>Ingredients tracked</small>
            </div>

            <div class="stat-card">
                <p>Low Stock Alerts</p>
                <h2>${lowStock}</h2>
                <small>Needs restocking</small>
            </div>

            <div class="stat-card">
                <p>Today's Sales</p>
                <h2>${money(8450)}</h2>
                <small>Sample figure</small>
            </div>

        </div>

        <div class="dashboard-grid">

            <div class="panel">
                <h3>📦 Inventory Watchlist</h3>

                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Ingredient</th>
                                <th>Quantity</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${inventory.slice(0, 5).map(item => `
                                <tr>
                                    <td>${escapeHTML(item.name)}</td>
                                    <td>${item.qty} ${escapeHTML(item.unit)}</td>
                                    <td>
                                        <span class="badge ${stockStatus(item)[1]}">
                                            ${stockStatus(item)[0]}
                                        </span>
                                    </td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>

            </div>

            <div class="panel">
                <h3>🔔 Alerts & Notifications</h3>

                <div class="alert">
                    <strong>⚠ Low Stock Alert</strong>
                    Fresh milk is below its minimum stock level.
                </div>

                <div class="alert">
                    <strong>◷ Expiry Reminder</strong>
                    Lettuce is nearing its expiry date.
                </div>

                <div class="alert">
                    <strong>📦 Purchase Reminder</strong>
                    One purchase order is still pending.
                </div>

            </div>

        </div>

        <h2 class="section-title">Main Features</h2>

        <div class="feature-grid">

            ${feature("📦", "Inventory", "Manage ingredients.", "inventory")}
            ${feature("🛒", "Sales & Products", "Manage menu products.", "products")}
            ${feature("🧾", "Purchases", "Create purchase orders.", "purchases")}
            ${feature("🚚", "Suppliers", "Manage suppliers.", "suppliers")}
            ${feature("◷", "Batch & Expiry", "Track expiration dates.", "batches")}
            ${feature("📊", "Reports", "View business reports.", "reports")}
            ${feature("🔔", "Notifications", "Check system alerts.", "notifications")}
            ${feature("⚙", "Settings", "Manage account settings.", "settings")}

        </div>
    `;
}

function feature(icon, title, description, page) {
    return `
        <button class="feature-card" data-go="${page}">
            <div>${icon}</div>
            <h3>${title}</h3>
            <p>${description}</p>
        </button>
    `;
}

// INVENTORY

function inventoryPage() {
    return `
        <div class="toolbar">
            <input type="text" id="searchInventory"
                placeholder="Search ingredients...">

            <button class="primary-btn" id="addInventory">
                + Add Ingredient
            </button>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Ingredient</th>
                        <th>Category</th>
                        <th>Quantity</th>
                        <th>Minimum Stock</th>
                        <th>Status</th>
                        <th>Expiry Date</th>
                    </tr>
                </thead>

                <tbody id="inventoryRows">
                    ${inventoryRows(inventory)}
                </tbody>
            </table>
        </div>
    `;
}

function inventoryRows(items) {
    return items.map(item => `
        <tr>
            <td>${escapeHTML(item.name)}</td>
            <td>${escapeHTML(item.category)}</td>
            <td>${item.qty} ${escapeHTML(item.unit)}</td>
            <td>${item.minimum} ${escapeHTML(item.unit)}</td>
            <td>
                <span class="badge ${stockStatus(item)[1]}">
                    ${stockStatus(item)[0]}
                </span>
            </td>
            <td>${item.expiry}</td>
        </tr>
    `).join("") || `
        <tr><td colspan="6">No ingredients found.</td></tr>
    `;
}

// SALES AND PRODUCTS

function productsPage() {
    return `
        <div class="panel">
            <h3>Menu Products</h3>
            <p>Available food products and their allergy information.</p>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Product ID</th>
                        <th>Product Name</th>
                        <th>Price</th>
                        <th>Allergy Information</th>
                    </tr>
                </thead>

                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>${product.id}</td>
                            <td>${product.name}</td>
                            <td>${money(product.price)}</td>
                            <td>${product.allergy}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// PURCHASES

function purchasesPage() {
    return `
        <div class="toolbar">
            <h3>Purchase Orders</h3>
            <button class="primary-btn" id="newPurchase">
                + New Purchase
            </button>
        </div>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Order ID</th>
                        <th>Supplier</th>
                        <th>Date</th>
                        <th>Items</th>
                        <th>Status</th>
                    </tr>
                </thead>

                <tbody>
                    ${purchases.map(p => `
                        <tr>
                            <td>${p.id}</td>
                            <td>${p.supplier}</td>
                            <td>${p.date}</td>
                            <td>${p.items}</td>
                            <td>
                                <span class="badge ${p.status === "Pending" ? "warning" : ""}">
                                    ${p.status}
                                </span>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// SUPPLIERS

function suppliersPage() {
    return `
        <h3 class="section-title">Supplier Directory</h3>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Supplier ID</th>
                        <th>Supplier Name</th>
                        <th>Contact</th>
                        <th>Supplied Items</th>
                    </tr>
                </thead>

                <tbody>
                    ${suppliers.map(s => `
                        <tr>
                            <td>${s.id}</td>
                            <td>${s.name}</td>
                            <td>${s.contact}</td>
                            <td>${s.items}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// BATCH AND EXPIRY

function batchesPage() {
    return `
        <h3 class="section-title">Batch and Expiry Monitoring</h3>

        <div class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Batch ID</th>
                        <th>Ingredient</th>
                        <th>Quantity</th>
                        <th>Expiry Date</th>
                    </tr>
                </thead>

                <tbody>
                    ${inventory.map((item, index) => `
                        <tr>
                            <td>BAT-${1001 + index}</td>
                            <td>${escapeHTML(item.name)}</td>
                            <td>${item.qty} ${escapeHTML(item.unit)}</td>
                            <td>${item.expiry}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

// REPORTS

function reportsPage() {
    return `
        <div class="stats-grid">

            <div class="stat-card">
                <p>Today's Sales</p>
                <h2>${money(8450)}</h2>
            </div>

            <div class="stat-card">
                <p>Orders</p>
                <h2>12</h2>
            </div>

            <div class="stat-card">
                <p>Inventory Items</p>
                <h2>${inventory.length}</h2>
            </div>

            <div class="stat-card">
                <p>Low Stock</p>
                <h2>${inventory.filter(i => i.qty <= i.minimum).length}</h2>
            </div>

        </div>

        <div class="panel">
            <h3>Business Reports</h3>
            <p>Download your current inventory report.</p>
            <br>
            <button class="primary-btn" id="exportCSV">
                Download Inventory CSV
            </button>
        </div>
    `;
}

// NOTIFICATIONS

function notificationsPage() {
    return `
        <h3 class="section-title">System Notifications</h3>

        <div class="alert">
            <strong>⚠ Low Stock Alert</strong>
            Fresh milk needs restocking.
        </div>

        <div class="alert">
            <strong>◷ Expiry Alert</strong>
            Lettuce is nearing its expiry date.
        </div>

        <div class="alert">
            <strong>📦 Purchase Notification</strong>
            Purchase order PO-002 is pending.
        </div>
    `;
}

// SETTINGS

function settingsPage() {
    return `
        <div class="panel">
            <h3>Account Settings</h3>

            <p>Account Name: ${escapeHTML(currentUser.name)}</p>
            <br>
            <p>Account Role: ${escapeHTML(currentUser.role)}</p>
            <br>
            <p>System: StockSense</p>
            <br>
            <p>Shop: Main Food Shop</p>
        </div>
    `;
}

// PAGE EVENTS

function attachEvents(page) {

    // Navigation from dashboard feature cards
    document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            showPage(button.dataset.go);
        });
    });

    // Search Inventory
    if (page === "inventory") {

        document.getElementById("searchInventory")
            .addEventListener("input", function() {

                const search = this.value.toLowerCase();

                const filtered = inventory.filter(item =>
                    item.name.toLowerCase().includes(search) ||
                    item.category.toLowerCase().includes(search)
                );

                document.getElementById("inventoryRows").innerHTML =
                    inventoryRows(filtered);
            });

        // Add Ingredient
        document.getElementById("addInventory")
            .addEventListener("click", function() {

                const name = prompt("Enter ingredient name:");

                if (!name || !name.trim()) return;

                const qty = Number(prompt("Enter quantity:", "1"));

                if (!Number.isFinite(qty) || qty < 0) {
                    showToast("Invalid quantity.");
                    return;
                }

                const unit = prompt("Enter unit (kg, L, pcs):", "kg");

                if (!unit) return;

                inventory.push({
                    id: Date.now(),
                    name: name.trim(),
                    category: "Other",
                    qty: qty,
                    unit: unit,
                    minimum: 2,
                    expiry: "2027-01-01"
                });

                localStorage.setItem(
                    "stocksense_inventory",
                    JSON.stringify(inventory)
                );

                showPage("inventory");
                showToast("Ingredient added successfully!");
            });
    }

    // New Purchase
    if (page === "purchases") {
        document.getElementById("newPurchase")
            .addEventListener("click", function() {
                showToast("Purchase order feature is a prototype.");
            });
    }

    // Export CSV
    if (page === "reports") {
        document.getElementById("exportCSV")
            .addEventListener("click", exportCSV);
    }
}

// EXPORT INVENTORY REPORT

function exportCSV() {

    const header = [
        "Ingredient",
        "Category",
        "Quantity",
        "Unit",
        "Minimum Stock",
        "Expiry"
    ];

    const rows = inventory.map(item => [
        item.name,
        item.category,
        item.qty,
        item.unit,
        item.minimum,
        item.expiry
    ]);

    const csv = [header, ...rows]
        .map(row => row.map(value =>
            `"${String(value).replace(/"/g, '""')}"`
        ).join(","))
        .join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "StockSense_Inventory_Report.csv";
    link.click();

    URL.revokeObjectURL(url);

    showToast("Inventory report downloaded!");
}

// RESTORE SAVED INVENTORY

const savedInventory = getStoredValue("stocksense_inventory", null);

if (savedInventory) {
    if (Array.isArray(savedInventory)) {
        inventory = savedInventory;
    } else {
        console.error("Saved inventory is not a valid array.");
    }
}

// START APPLICATION

if (currentUser) {
    showApp();
}
