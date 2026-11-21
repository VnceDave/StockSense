
const API_BASE = "https://stocksense-8b0g.onrender.com/api";

let currentUser = null;
let authToken = localStorage.getItem("stocksense_token") || "";

let inventoryData = [];
let productsData = [];
let suppliersData = [];
let salesData = [];
let salesCart = [];
let purchasesData = [];
let purchaseItems = [];

let productSearch = "";
let supplierSearch = "";

try {
    currentUser = JSON.parse(localStorage.getItem("stocksense_user") || "null");
} catch {
    currentUser = null;
}

const authScreen = document.getElementById("authScreen");
const app = document.getElementById("app");
const pageContent = document.getElementById("pageContent");
const pageTitle = document.getElementById("pageTitle");
const navigation = document.getElementById("navigation");
const modalRoot = document.getElementById("modalRoot");
const toastElement = document.getElementById("toast");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// ==============================
// GENERAL HELPERS
// ==============================

function setHidden(element, shouldHide) {
    if (!element) return;

    element.hidden = shouldHide;
    element.classList.toggle("hidden", shouldHide);
}


async function apiRequest(endpoint, options = {}) {
    let response;

    try {
        response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(authToken ? {
                    Authorization: `Bearer ${authToken}`
                } : {}),
                ...options.headers
            }
        });
    } catch (error) {
        console.error("FETCH ERROR:", error);
        throw new Error(
            "Cannot connect to the server. Check if the backend is running."
        );
    }

    const responseText = await response.text();

    let data = {};

    try {
        data = responseText ? JSON.parse(responseText) : {};
    } catch {
        data = { message: responseText };
    }

    if (!response.ok) {
        console.error("API REQUEST FAILED:", {
            endpoint: endpoint,
            status: response.status,
            response: data
        });

        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}

function showToast(message) {
    if (!toastElement) {
        alert(message);
        return;
    }

    toastElement.textContent = message;
    toastElement.classList.add("show");

    setTimeout(() => toastElement.classList.remove("show"), 3000);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

function getCurrentUserId() {
    return currentUser?.user_id ?? currentUser?.id ?? null;
}

function formatCurrency(value) {
    return `₱${Number(value || 0).toFixed(2)}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString();
}

// ==============================
// AUTHENTICATION
// ==============================

function showApp() {
    const publicWebsite = document.getElementById("publicWebsite");
setHidden(publicWebsite, true);
    setHidden(authScreen, true);
    setHidden(app, false);

    const displayName =
        currentUser?.name ||
        currentUser?.full_name ||
        currentUser?.username ||
        "User";

    const nameLabel = document.getElementById("userNameLabel");
    const roleLabel = document.getElementById("userRoleLabel");
    const avatar = document.getElementById("userAvatar");

    if (nameLabel) nameLabel.textContent = displayName;
    if (roleLabel) roleLabel.textContent = currentUser?.role || "User";
    if (avatar) avatar.textContent = displayName.charAt(0).toUpperCase();

    showPage("dashboard");
}


function showAuth(tab = "login") {
    const publicWebsite = document.getElementById("publicWebsite");

    // Keep the public website visible
    setHidden(publicWebsite, false);
    setHidden(authScreen, false);
    setHidden(app, true);

    const selectedTab = tab === "register" ? "register" : "login";

    setHidden(loginForm, selectedTab !== "login");
    setHidden(registerForm, selectedTab !== "register");

    document.querySelectorAll("[data-auth-tab]").forEach(item => {
        item.classList.toggle(
            "active",
            item.dataset.authTab === selectedTab
        );
    });
}

function closeAuth() {
    setHidden(authScreen, true);
    setHidden(publicWebsite, false);
}


function logout() {
    localStorage.removeItem("stocksense_token");
    localStorage.removeItem("stocksense_user");

    authToken = "";
    currentUser = null;

    // Clear previous account data
    inventoryData = [];
    productsData = [];
    suppliersData = [];
    salesData = [];
    salesCart = [];
    purchasesData = [];
    purchaseItems = [];

    productSearch = "";
    supplierSearch = "";

    if (modalRoot) modalRoot.innerHTML = "";

    showAuth();
    showToast("You have logged out.");
}

// LOGIN
if (loginForm) {
    loginForm.addEventListener("submit", async event => {
        event.preventDefault();

        const username = document.getElementById("loginUsername").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!username || !password) {
            showToast("Please enter your username and password.");
            return;
        }

        const button = loginForm.querySelector('button[type="submit"]');

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "Logging in...";
            }

            const result = await apiRequest("/login", {
                method: "POST",
                body: JSON.stringify({ username, password })
            });

            if (!result.token || !result.user) {
                throw new Error("Incomplete login response.");
            }

            authToken = result.token;
            currentUser = result.user;

            localStorage.setItem("stocksense_token", authToken);
            localStorage.setItem("stocksense_user", JSON.stringify(currentUser));

            loginForm.reset();
            showApp();
            showToast("Login successful!");

        } catch (error) {
            showToast(error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Login";
            }
        }
    });
}

// REGISTER

  if (registerForm) {
    registerForm.addEventListener("submit", async event => {
        event.preventDefault();

        const shopName = document.getElementById("registerName").value.trim();
        const username = document.getElementById("registerUsername").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value;

        if (!shopName || !username || !email || !password) {
            showToast("Please complete all required fields.");
            return;
        }

        if (password.length < 8) {
            showToast("Password must have at least 8 characters.");
            return;
        }

        const button = registerForm.querySelector('button[type="submit"]');

        try {
            if (button) {
                button.disabled = true;
                button.textContent = "Creating account...";
            }

            const result = await apiRequest("/register", {
                method: "POST",
                body: JSON.stringify({
                    shop_name: shopName,
                    username,
                    email,
                    password
                })
            });

            showToast(result.message || "Account created successfully!");
            registerForm.reset();

            document.querySelector('[data-auth-tab="login"]')?.click();

        } catch (error) {
            showToast(error.message);
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = "Create account";
            }
        }
    });
}

// AUTH TABS
document.querySelectorAll("[data-auth-tab]").forEach(tab => {
    tab.addEventListener("click", () => {
        const selected = tab.dataset.authTab;

        document.querySelectorAll("[data-auth-tab]").forEach(item => {
            item.classList.toggle("active", item === tab);
        });

        setHidden(loginForm, selected !== "login");
        setHidden(registerForm, selected !== "register");
    });
});

// LOGOUT BUTTONS
document.getElementById("logoutBtn")?.addEventListener("click", logout);
document.getElementById("mobileLogoutBtn")?.addEventListener("click", logout);

// ==============================
// NAVIGATION
// ==============================

if (navigation) {
    navigation.addEventListener("click", event => {
        const link = event.target.closest("[data-page]");
        if (!link) return;

        event.preventDefault();
        showPage(link.dataset.page);
    });
}

const pageNames = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    products: "Products",
    sales: "Sales",
    purchases: "Purchases",
    suppliers: "Suppliers",
    notifications: "Notifications"
};

function showPage(page) {
    if (!pageContent) return;

    document.querySelectorAll("[data-page]").forEach(link => {
        link.classList.toggle("active", link.dataset.page === page);
    });

    if (pageTitle) {
        pageTitle.textContent = pageNames[page] || "Dashboard";
    }

    switch (page) {
        case "dashboard":
            renderDashboard();
            break;

        case "inventory":
            renderInventory();
            break;

        case "products":
            renderProducts();
            break;

        case "sales":
            renderSales();
            break;

        case "purchases":
            renderPurchases();
            break;

        case "suppliers":
            renderSuppliers();
            break;

        case "notifications":
            loadNotifications();
            break;

        default:
            renderComingSoon(page);
    }
}

// ==============================
// DASHBOARD
// ==============================



function renderDashboard() {
    pageContent.innerHTML = `
        <div class="dashboard-heading">
            <div>

                <p>Here's what's happening with your inventory today.</p>
            </div>
        </div>

        <div class="stats-grid dashboard-stats">
            <section class="panel stat-card">
                <div class="stat-icon">📦</div>
                <p>Total Products</p>
                <h2 id="dashboardProducts">0</h2>
                <span>Products in your inventory</span>
            </section>

            <section class="panel stat-card">
                <div class="stat-icon">📊</div>
                <p>Total Stock</p>
                <h2 id="dashboardStock">0</h2>
                <span>Total available quantity</span>
            </section>

            <section class="panel stat-card">
                <div class="stat-icon">⚠️</div>
                <p>Low Stock Items</p>
                <h2 id="dashboardLowStock">0</h2>
                <span>Items needing attention</span>
            </section>
        </div>

        <section class="panel dashboard-welcome" id="dashboardWelcome">
            <div class="welcome-content">
                <span class="dashboard-eyebrow">YOUR INVENTORY, SIMPLIFIED</span>
                <h2>Welcome to StockSense!</h2>
                <p>Your inventory overview is ready. Start managing your products and keep track of your stock in one place.</p>

                <button class="btn btn-primary" id="dashboardInventoryBtn" type="button">
                    Explore Inventory →
                </button>
            </div>

            <div class="welcome-decoration">
                <span>🌿</span>
            </div>
        </section>
    `;

    document.getElementById("dashboardInventoryBtn")
        ?.addEventListener("click", () => showPage("inventory"));

    loadDashboardStats();
}


async function loadDashboardStats() {
    try {
        const result = await apiRequest("/inventory");
        const items = result.inventory || [];

        const productsElement = document.getElementById("dashboardProducts");
        const stockElement = document.getElementById("dashboardStock");
        const lowStockElement = document.getElementById("dashboardLowStock");
        const welcomeElement = document.getElementById("dashboardWelcome");

        if (productsElement) {
            productsElement.textContent = items.length;
        }

        if (stockElement) {
            stockElement.textContent = items.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
            );
        }

        if (lowStockElement) {
            lowStockElement.textContent = items.filter(item =>
                Number(item.quantity || 0) <= Number(item.reorder_level || 0)
            ).length;
        }

        if (welcomeElement && items.length > 0) {
            welcomeElement.innerHTML = `
                <h3>Welcome to StockSense!</h3>
                <p>Your inventory overview is ready. You can manage your products and monitor your stock here.</p>
                <button class="btn btn-primary" id="dashboardInventoryBtn" type="button">
                    View Inventory
                </button>
            `;

            document.getElementById("dashboardInventoryBtn")
                ?.addEventListener("click", () => showPage("inventory"));
        }

    } catch (error) {
        console.error("Dashboard error:", error);
    }
}


// ==============================
// INVENTORY
// ==============================

async function renderInventory() {
    pageContent.innerHTML = `
        <div class="toolbar">
            <div>
                <h3>Inventory List</h3>
                <p>View and manage your available stock.</p>
            </div>

            <button class="btn btn-primary" id="addProductBtn" type="button">
                + Add Product
            </button>
        </div>

        <section class="panel">
            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                            <th>Cost Price</th>
                            <th>Selling Price</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody id="inventoryTableBody">
                        <tr><td colspan="8">Loading inventory...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    document.getElementById("addProductBtn")
        ?.addEventListener("click", openAddProductModal);

    await loadInventory();
}

async function loadInventory() {
    const tableBody = document.getElementById("inventoryTableBody");
    if (!tableBody) return;

    try {
        const result = await apiRequest("/inventory");
        inventoryData = result.inventory || [];

        if (!inventoryData.length) {
            tableBody.innerHTML = `
                <tr><td colspan="8">No products yet. Click Add Product.</td></tr>
            `;
            return;
        }

        tableBody.innerHTML = inventoryData.map(item => {
            const quantity = Number(item.quantity || 0);
            const reorder = Number(item.reorder_level || 0);
            const status = quantity <= reorder ? "Low Stock" : "In Stock";

            return `
                <tr>
                    <td>${escapeHTML(item.sku)}</td>
                    <td>${escapeHTML(item.product_name)}</td>
                    <td>${escapeHTML(item.category || "Uncategorized")}</td>
                    <td>${quantity}</td>
                    <td>${escapeHTML(item.unit || "piece")}</td>
                    <td>${formatCurrency(item.cost_price)}</td>
                    <td>${formatCurrency(item.selling_price)}</td>
                    <td><span class="badge">${status}</span></td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        tableBody.innerHTML = `
            <tr><td colspan="8">${escapeHTML(error.message)}</td></tr>
        `;
    }
}

// ==============================
// PRODUCT MODAL
// ==============================

function openProductModal(product = null) {
    const editing = Boolean(product);

    modalRoot.innerHTML = `
        <div class="modal-backdrop" id="productModalBackdrop">
            <div class="modal">
                <div class="toolbar">
                    <h3>${editing ? "Edit Product" : "Add New Product"}</h3>
                    <button type="button" class="btn btn-secondary" id="closeProductModal">×</button>
                </div>

                <form id="productForm">
                    <div class="form-grid">
                       <div class="field">
    <label>SKU</label>
    <input
        type="text"
        value="${escapeHTML(product?.sku || "Auto-generated after saving")}"
        readonly
    >
</div>

                        <div class="field">
                            <label>Product Name *</label>
                            <input name="product_name" maxlength="150" required
                                value="${escapeHTML(product?.product_name || "")}">
                        </div>

                        <div class="field">
                            <label>Category</label>
                            <input name="category"
                                value="${escapeHTML(product?.category || "")}">
                        </div>

                        <div class="field">
                            <label>Unit</label>
                            <input name="unit"
                                value="${escapeHTML(product?.unit || "piece")}">
                        </div>

                        <div class="field">
                            <label>Cost Price (₱)</label>
                            <input name="cost_price" type="number" min="0" step="0.01"
                                value="${Number(product?.cost_price || 0)}" required>
                        </div>

                        <div class="field">
                            <label>Selling Price (₱)</label>
                            <input name="selling_price" type="number" min="0" step="0.01"
                                value="${Number(product?.selling_price || 0)}" required>
                        </div>

                        ${editing ? "" : `
                            <div class="field">
                                <label>Initial Quantity</label>
                                <input name="quantity" type="number" min="0" step="1" value="0" required>
                            </div>
                        `}

                        <div class="field">
                            <label>Reorder Level</label>
                            <input name="reorder_level" type="number" min="0" step="1"
                                value="${Number(product?.reorder_level ?? 10)}" required>
                        </div>

                        <div class="field">
                            <label>Description</label>
                            <input name="description"
                                value="${escapeHTML(product?.description || "")}">
                        </div>
                    </div>

                    <div class="actions">
                        <button type="button" class="btn btn-secondary" id="cancelProductBtn">
                            Cancel
                        </button>

                        <button type="submit" class="btn btn-primary" id="saveProductBtn">
                            ${editing ? "Update Product" : "Save Product"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById("closeProductModal")
        ?.addEventListener("click", closeProductModal);

    document.getElementById("cancelProductBtn")
        ?.addEventListener("click", closeProductModal);

    document.getElementById("productModalBackdrop")
        ?.addEventListener("click", event => {
            if (event.target.id === "productModalBackdrop") {
                closeProductModal();
            }
        });

    document.getElementById("productForm")
        ?.addEventListener("submit", event => saveProduct(event, product));
}

function openAddProductModal() {
    openProductModal();
}

async function saveProduct(event, existingProduct = null) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const product = {
        product_name: String(formData.get("product_name") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        unit: String(formData.get("unit") || "piece").trim() || "piece",
        cost_price: Number(formData.get("cost_price")),
        selling_price: Number(formData.get("selling_price")),
        reorder_level: Number(formData.get("reorder_level")),
        description: String(formData.get("description") || "").trim()
    };

    if (!existingProduct) {
        product.quantity = Number(formData.get("quantity"));
    }

    const button = document.getElementById("saveProductBtn");

    if (button) {
        button.disabled = true;
        button.textContent = existingProduct ? "Updating..." : "Saving...";
    }

    try {
        const endpoint = existingProduct
            ? `/products/${existingProduct.product_id}`
            : "/products";

        const result = await apiRequest(endpoint, {
            method: existingProduct ? "PUT" : "POST",
            body: JSON.stringify(product)
        });

        closeProductModal();
        showToast(result.message || "Product saved successfully!");

        if (pageTitle?.textContent === "Products") {
            await loadProducts();
        } else {
            await loadInventory();
        }

        loadDashboardStats();

    } catch (error) {
        showToast(error.message);

        if (button) {
            button.disabled = false;
            button.textContent = existingProduct ? "Update Product" : "Save Product";
        }
    }
}

function closeProductModal() {
    if (modalRoot) modalRoot.innerHTML = "";
}

// ==============================
// PRODUCTS PAGE
// ==============================

async function renderProducts() {
    productSearch = "";

    pageContent.innerHTML = `
        <div class="toolbar">
            <div>
                <h3>Product Management</h3>
                <p>Add, search, edit, and manage your products.</p>
            </div>

            <button class="btn btn-primary" id="productsAddBtn" type="button">
                + Add Product
            </button>
        </div>

        <section class="panel">
            <div class="toolbar">
                <input type="search" id="productSearchInput"
                    placeholder="Search by SKU, product name, or category...">
                <span id="productCount">0 products</span>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>SKU</th>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Unit</th>
                            <th>Cost Price</th>
                            <th>Selling Price</th>
                            <th>Reorder Level</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody id="productsTableBody">
                        <tr><td colspan="8">Loading products...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    document.getElementById("productsAddBtn")
        ?.addEventListener("click", openAddProductModal);

    document.getElementById("productSearchInput")
        ?.addEventListener("input", event => {
            productSearch = event.target.value.toLowerCase().trim();
            displayProducts();
        });

    await loadProducts();
}

async function loadProducts() {
    const tableBody = document.getElementById("productsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="8">Loading products...</td></tr>`;

    try {
        const result = await apiRequest("/products");
        productsData = result.products || [];
        displayProducts();

    } catch (error) {
        tableBody.innerHTML = `
            <tr><td colspan="8">${escapeHTML(error.message)}</td></tr>
        `;
    }
}

function displayProducts() {
    const tableBody = document.getElementById("productsTableBody");
    const countElement = document.getElementById("productCount");

    if (!tableBody) return;

    const filteredProducts = productsData.filter(product => {
        const searchableText = [
            product.sku,
            product.product_name,
            product.category,
            product.description
        ].join(" ").toLowerCase();

        return searchableText.includes(productSearch);
    });

    if (countElement) {
        countElement.textContent =
            `${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`;
    }

    if (!filteredProducts.length) {
        tableBody.innerHTML = `<tr><td colspan="8">No matching products found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = filteredProducts.map(product => `
        <tr>
            <td>${escapeHTML(product.sku)}</td>
            <td>${escapeHTML(product.product_name)}</td>
            <td>${escapeHTML(product.category || "Uncategorized")}</td>
            <td>${escapeHTML(product.unit || "piece")}</td>
            <td>${formatCurrency(product.cost_price)}</td>
            <td>${formatCurrency(product.selling_price)}</td>
            <td>${Number(product.reorder_level || 0)}</td>
            <td>
                <button type="button" class="btn btn-secondary"
                    data-edit-product="${Number(product.product_id)}">Edit</button>

                <button type="button" class="btn btn-danger"
                    data-delete-product="${Number(product.product_id)}">Delete</button>
            </td>
        </tr>
    `).join("");

    tableBody.querySelectorAll("[data-edit-product]").forEach(button => {
        button.addEventListener("click", () => {
            const product = productsData.find(
                item => Number(item.product_id) === Number(button.dataset.editProduct)
            );

            if (product) openProductModal(product);
        });
    });

    tableBody.querySelectorAll("[data-delete-product]").forEach(button => {
        button.addEventListener("click", () => {
            deleteProduct(Number(button.dataset.deleteProduct));
        });
    });
}

async function deleteProduct(id) {
    const product = productsData.find(item => Number(item.product_id) === id);
    if (!product) return;

    if (!confirm(`Are you sure you want to delete "${product.product_name}"?`)) {
        return;
    }

    try {
        const result = await apiRequest(`/products/${id}`, {
            method: "DELETE"
        });

        showToast(result.message || "Product deleted successfully!");
        await loadProducts();
        loadDashboardStats();

    } catch (error) {
        showToast(error.message);
    }
}

// ==============================
// SALES PAGE
// ==============================

async function renderSales() {
    salesCart = [];

    pageContent.innerHTML = `
        <div class="toolbar">
            <div>
                <h3>Sales Management</h3>
                <p>Create transactions and view your sales history.</p>
            </div>

            <button class="btn btn-primary" id="refreshSalesBtn" type="button">
                Refresh Sales
            </button>
        </div>

        <section class="panel">
            <h3>New Sale</h3>

            <div class="form-grid">
                <div class="field">
                    <label for="saleProductSelect">Select Product</label>
                    <select id="saleProductSelect">
                        <option value="">Loading products...</option>
                    </select>
                </div>

                <div class="field">
                    <label for="saleQuantity">Quantity</label>
                    <input id="saleQuantity" type="number" min="1" step="1" value="1">
                </div>

                <div class="field">
                    <label>Available Stock</label>
                    <input id="saleAvailableStock" type="text" value="—" readonly>
                </div>

                <div class="field">
                    <label>Unit Price</label>
                    <input id="saleUnitPrice" type="text" value="—" readonly>
                </div>
            </div>

            <div class="actions">
                <button class="btn btn-primary" id="addSaleItemBtn" type="button">
                    + Add to Sale
                </button>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Unit Price</th>
                            <th>Quantity</th>
                            <th>Subtotal</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody id="salesCartBody">
                        <tr><td colspan="5">No items added.</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="toolbar" style="margin-top:20px;">
                <div class="field">
                    <label for="salePaymentMethod">Payment Method</label>
                    <select id="salePaymentMethod">
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="E-Wallet">E-Wallet</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div>
                    <p>Total Amount</p>
                    <h2 id="salesCartTotal">₱0.00</h2>
                </div>
            </div>

            <div class="actions">
                <button class="btn btn-secondary" id="clearSaleBtn" type="button">
                    Clear Sale
                </button>

                <button class="btn btn-primary" id="completeSaleBtn" type="button">
                    Complete Sale
                </button>
            </div>
        </section>

        <section class="panel" style="margin-top:24px;">
            <div class="toolbar">
                <div>
                    <h3>Sales History</h3>
                    <p>Review completed and cancelled transactions.</p>
                </div>

                <span id="salesCount">0 sales</span>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Receipt Number</th>
                            <th>Date</th>
                            <th>Total Amount</th>
                            <th>Payment</th>
                            <th>Cashier</th>
                            <th>Items</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody id="salesHistoryBody">
                        <tr><td colspan="8">Loading sales...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    document.getElementById("refreshSalesBtn")
        ?.addEventListener("click", async () => {
            await loadSalesProducts();
            await loadSalesHistory();
        });

    document.getElementById("saleProductSelect")
        ?.addEventListener("change", updateSelectedSaleProduct);

    document.getElementById("addSaleItemBtn")
        ?.addEventListener("click", addSaleItem);

    document.getElementById("clearSaleBtn")
        ?.addEventListener("click", clearSaleCart);

    document.getElementById("completeSaleBtn")
        ?.addEventListener("click", completeSale);

    await loadSalesProducts();
    await loadSalesHistory();
}

async function loadSalesProducts() {
    const select = document.getElementById("saleProductSelect");
    if (!select) return;

    try {
        const result = await apiRequest("/products");
        productsData = result.products || [];

        const availableProducts = productsData.filter(product =>
            Number(product.quantity || 0) > 0
        );

        if (!availableProducts.length) {
            select.innerHTML = `<option value="">No products with available stock</option>`;
            updateSelectedSaleProduct();
            return;
        }

        select.innerHTML = `
            <option value="">Choose a product...</option>
            ${availableProducts.map(product => `
                <option value="${Number(product.product_id)}">
                    ${escapeHTML(product.product_name)} (${escapeHTML(product.sku)})
                </option>
            `).join("")}
        `;

        updateSelectedSaleProduct();

    } catch (error) {
        select.innerHTML = `<option value="">Unable to load products</option>`;
        showToast(error.message);
    }
}

function updateSelectedSaleProduct() {
    const select = document.getElementById("saleProductSelect");
    const stockInput = document.getElementById("saleAvailableStock");
    const priceInput = document.getElementById("saleUnitPrice");

    if (!select || !stockInput || !priceInput) return;

    const product = productsData.find(
        item => Number(item.product_id) === Number(select.value)
    );

    if (!product) {
        stockInput.value = "—";
        priceInput.value = "—";
        return;
    }

    stockInput.value = Number(product.quantity || 0);
    priceInput.value = formatCurrency(product.selling_price);
}

function addSaleItem() {
    const productId = Number(document.getElementById("saleProductSelect")?.value);
    const quantity = Number(document.getElementById("saleQuantity")?.value);

    if (!productId) {
        showToast("Please select a product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        showToast("Please enter a valid quantity.");
        return;
    }

    const product = productsData.find(
        item => Number(item.product_id) === productId
    );

    if (!product) {
        showToast("Product not found.");
        return;
    }

    const availableStock = Number(product.quantity || 0);

    const existingItem = salesCart.find(
        item => Number(item.product_id) === productId
    );

    const currentCartQuantity = existingItem ? existingItem.quantity : 0;

    if (currentCartQuantity + quantity > availableStock) {
        showToast(`Only ${availableStock} unit(s) available in stock.`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        salesCart.push({
            product_id: productId,
            product_name: product.product_name,
            sku: product.sku,
            unit_price: Number(product.selling_price || 0),
            quantity
        });
    }

    renderSalesCart();

    document.getElementById("saleQuantity").value = 1;
    showToast("Product added to sale.");
}

function renderSalesCart() {
    const tableBody = document.getElementById("salesCartBody");
    const totalElement = document.getElementById("salesCartTotal");

    if (!tableBody || !totalElement) return;

    if (!salesCart.length) {
        tableBody.innerHTML = `<tr><td colspan="5">No items added.</td></tr>`;
        totalElement.textContent = "₱0.00";
        return;
    }

    tableBody.innerHTML = salesCart.map((item, index) => `
        <tr>
            <td>
                ${escapeHTML(item.product_name)}
                <br><small>${escapeHTML(item.sku)}</small>
            </td>

            <td>${formatCurrency(item.unit_price)}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_price * item.quantity)}</td>

            <td>
                <button type="button" class="btn btn-danger"
                    data-remove-sale-item="${index}">Remove</button>
            </td>
        </tr>
    `).join("");

    const total = salesCart.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
    );

    totalElement.textContent = formatCurrency(total);

    tableBody.querySelectorAll("[data-remove-sale-item]").forEach(button => {
        button.addEventListener("click", () => {
            salesCart.splice(Number(button.dataset.removeSaleItem), 1);
            renderSalesCart();
        });
    });
}

function clearSaleCart() {
    salesCart = [];
    renderSalesCart();
    showToast("Sale cleared.");
}

async function completeSale() {
    if (!salesCart.length) {
        showToast("Please add at least one product.");
        return;
    }

    const paymentMethod =
        document.getElementById("salePaymentMethod")?.value || "Cash";

    const total = salesCart.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
    );

    if (!confirm(
        `Complete this sale?\n\nTotal: ${formatCurrency(total)}\nPayment: ${paymentMethod}`
    )) {
        return;
    }

    const button = document.getElementById("completeSaleBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Processing...";
    }

    try {
        const saleData = {
            items: salesCart.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity
            })),
            payment_method: paymentMethod,
            created_by: getCurrentUserId()
        };

        const result = await apiRequest("/sales", {
            method: "POST",
            body: JSON.stringify(saleData)
        });

        salesCart = [];
        renderSalesCart();

        showToast(result.message || "Sale completed successfully!");

        await loadSalesProducts();
        await loadSalesHistory();
        loadDashboardStats();

        if (pageTitle?.textContent === "Inventory") {
            await loadInventory();
        }

    } catch (error) {
        showToast(error.message);
        await loadSalesProducts();

    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = "Complete Sale";
        }
    }
}

async function loadSalesHistory() {
    const tableBody = document.getElementById("salesHistoryBody");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="8">Loading sales...</td></tr>`;

    try {
        const result = await apiRequest("/sales");
        salesData = result.sales || [];
        displaySalesHistory();

    } catch (error) {
        tableBody.innerHTML = `
            <tr><td colspan="8">${escapeHTML(error.message)}</td></tr>
        `;
    }
}

function displaySalesHistory() {
    const tableBody = document.getElementById("salesHistoryBody");
    const countElement = document.getElementById("salesCount");

    if (!tableBody) return;

    if (countElement) {
        countElement.textContent =
            `${salesData.length} sale${salesData.length !== 1 ? "s" : ""}`;
    }

    if (!salesData.length) {
        tableBody.innerHTML = `<tr><td colspan="8">No sales recorded yet.</td></tr>`;
        return;
    }

    tableBody.innerHTML = salesData.map(sale => {
        const status = sale.status || "Completed";
        const cancelled = status === "Cancelled";

        return `
            <tr>
                <td>${escapeHTML(sale.receipt_number || "—")}</td>
                <td>${escapeHTML(formatDate(sale.sale_date))}</td>
                <td>${formatCurrency(sale.total_amount)}</td>
                <td>${escapeHTML(sale.payment_method || "—")}</td>
                <td>${escapeHTML(sale.cashier || sale.created_by_name || "—")}</td>
                <td>${Number(sale.item_count || 0)}</td>
                <td><span class="badge">${escapeHTML(status)}</span></td>

                <td>
                    <button type="button" class="btn btn-secondary"
                        data-view-sale="${Number(sale.sale_id)}">View</button>

                    ${cancelled ? "" : `
                        <button type="button" class="btn btn-danger"
                            data-cancel-sale="${Number(sale.sale_id)}">Cancel</button>
                    `}
                </td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll("[data-view-sale]").forEach(button => {
        button.addEventListener("click", () => {
            viewSale(Number(button.dataset.viewSale));
        });
    });

    tableBody.querySelectorAll("[data-cancel-sale]").forEach(button => {
        button.addEventListener("click", () => {
            cancelSale(Number(button.dataset.cancelSale));
        });
    });
}

async function viewSale(id) {
    try {
        const result = await apiRequest(`/sales/${id}`);
        const sale = result.sale || result;
        const items = result.items || sale.items || sale.sale_items || [];

        const itemRows = items.map(item => `
            <tr>
                <td>${escapeHTML(item.product_name || "Product")}</td>
                <td>${Number(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_price)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
            </tr>
        `).join("");

        modalRoot.innerHTML = `
            <div class="modal-backdrop" id="receiptModalBackdrop">
                <div class="modal">
                    <div class="toolbar">
                        <h3>Sales Receipt</h3>
                        <button type="button" class="btn btn-secondary"
                            id="closeReceiptBtn">×</button>
                    </div>

                    <div id="receiptContent">
                        <h3>StockSense</h3>

                        <p><strong>Receipt:</strong>
                            ${escapeHTML(sale.receipt_number || "—")}</p>

                        <p><strong>Date:</strong>
                            ${escapeHTML(formatDate(sale.sale_date))}</p>

                        <p><strong>Payment:</strong>
                            ${escapeHTML(sale.payment_method || "—")}</p>

                        <p><strong>Status:</strong>
                            ${escapeHTML(sale.status || "Completed")}</p>

                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    ${itemRows || `<tr><td colspan="4">No items found.</td></tr>`}
                                </tbody>
                            </table>
                        </div>

                        <h3 style="text-align:right;">
                            Total: ${formatCurrency(sale.total_amount)}
                        </h3>
                    </div>

                    <div class="actions">
                        <button type="button" class="btn btn-secondary"
                            id="printReceiptBtn">Print Receipt</button>

                        <button type="button" class="btn btn-primary"
                            id="closeReceiptFooterBtn">Close</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById("closeReceiptBtn")
            ?.addEventListener("click", closeSalesModal);

        document.getElementById("closeReceiptFooterBtn")
            ?.addEventListener("click", closeSalesModal);

        document.getElementById("receiptModalBackdrop")
            ?.addEventListener("click", event => {
                if (event.target.id === "receiptModalBackdrop") {
                    closeSalesModal();
                }
            });

        document.getElementById("printReceiptBtn")
            ?.addEventListener("click", () => {
                const content = document.getElementById("receiptContent");
                if (!content) return;

                const printWindow = window.open("", "_blank");

                if (!printWindow) {
                    showToast("Please allow pop-ups to print the receipt.");
                    return;
                }

                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>StockSense Receipt</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 25px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border-bottom: 1px solid #ddd; padding: 10px; text-align: left; }
                        </style>
                    </head>
                    <body>${content.innerHTML}</body>
                    </html>
                `);

                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
            });

    } catch (error) {
        showToast(error.message);
    }
}

function closeSalesModal() {
    if (modalRoot) modalRoot.innerHTML = "";
}

async function cancelSale(id) {
    const sale = salesData.find(item => Number(item.sale_id) === id);
    if (!sale) return;

    if (!confirm(
        `Are you sure you want to cancel receipt ${sale.receipt_number}?\n\nThe sold quantities will be returned to inventory.`
    )) {
        return;
    }

    try {
        const result = await apiRequest(`/sales/${id}/cancel`, {
            method: "PUT"
        });

        showToast(result.message || "Sale cancelled successfully!");

        await loadSalesHistory();
        await loadSalesProducts();
        loadDashboardStats();

    } catch (error) {
        showToast(error.message);
    }
}

// ==============================
// SUPPLIERS PAGE
// ==============================

async function renderSuppliers() {
    supplierSearch = "";

    pageContent.innerHTML = `
        <div class="toolbar">
            <div>
                <h3>Supplier Management</h3>
                <p>Manage your supplier information and contact details.</p>
            </div>

            <button class="btn btn-primary" id="addSupplierBtn" type="button">
                + Add Supplier
            </button>
        </div>

        <section class="panel">
            <div class="toolbar">
                <input type="search" id="supplierSearchInput"
                    placeholder="Search supplier name, contact, email, or phone...">

                <span id="supplierCount">0 suppliers</span>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Supplier Name</th>
                            <th>Contact Person</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Address</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody id="suppliersTableBody">
                        <tr><td colspan="7">Loading suppliers...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    document.getElementById("addSupplierBtn")
        ?.addEventListener("click", () => openSupplierModal());

    document.getElementById("supplierSearchInput")
        ?.addEventListener("input", event => {
            supplierSearch = event.target.value.toLowerCase().trim();
            displaySuppliers();
        });

    await loadSuppliers();
}

async function loadSuppliers() {
    const tableBody = document.getElementById("suppliersTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="7">Loading suppliers...</td></tr>`;

    try {
        const result = await apiRequest("/suppliers");
        suppliersData = result.suppliers || [];
        displaySuppliers();

    } catch (error) {
        tableBody.innerHTML = `
            <tr><td colspan="7">${escapeHTML(error.message)}</td></tr>
        `;
    }
}

function displaySuppliers() {
    const tableBody = document.getElementById("suppliersTableBody");
    const countElement = document.getElementById("supplierCount");

    if (!tableBody) return;

    const filteredSuppliers = suppliersData.filter(supplier => {
        const searchableText = [
            supplier.supplier_name,
            supplier.contact_person,
            supplier.phone,
            supplier.email,
            supplier.address,
            supplier.status
        ].join(" ").toLowerCase();

        return searchableText.includes(supplierSearch);
    });

    if (countElement) {
        countElement.textContent =
            `${filteredSuppliers.length} supplier${filteredSuppliers.length !== 1 ? "s" : ""}`;
    }

    if (!filteredSuppliers.length) {
        tableBody.innerHTML = `
            <tr><td colspan="7">No suppliers found. Click Add Supplier.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredSuppliers.map(supplier => {
        const status = supplier.status || "Active";
        const isActive = status === "Active";

        return `
            <tr>
                <td>${escapeHTML(supplier.supplier_name)}</td>
                <td>${escapeHTML(supplier.contact_person || "—")}</td>
                <td>${escapeHTML(supplier.phone || "—")}</td>
                <td>${escapeHTML(supplier.email || "—")}</td>
                <td>${escapeHTML(supplier.address || "—")}</td>
                <td><span class="badge">${escapeHTML(status)}</span></td>

                <td>
                    <button type="button" class="btn btn-secondary"
                        data-edit-supplier="${Number(supplier.supplier_id)}">Edit</button>

                    ${isActive ? `
                        <button type="button" class="btn btn-danger"
                            data-deactivate-supplier="${Number(supplier.supplier_id)}">
                            Deactivate
                        </button>
                    ` : ""}
                </td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll("[data-edit-supplier]").forEach(button => {
        button.addEventListener("click", () => {
            const supplier = suppliersData.find(
                item => Number(item.supplier_id) === Number(button.dataset.editSupplier)
            );

            if (supplier) openSupplierModal(supplier);
        });
    });

    tableBody.querySelectorAll("[data-deactivate-supplier]").forEach(button => {
        button.addEventListener("click", () => {
            deactivateSupplier(Number(button.dataset.deactivateSupplier));
        });
    });
}

function openSupplierModal(supplier = null) {
    const editing = Boolean(supplier);

    if (!modalRoot) {
        showToast("Modal container was not found.");
        return;
    }

    modalRoot.innerHTML = `
        <div class="modal-backdrop" id="supplierModalBackdrop">
            <div class="modal">
                <div class="toolbar">
                    <h3>${editing ? "Edit Supplier" : "Add New Supplier"}</h3>

                    <button type="button" class="btn btn-secondary"
                        id="closeSupplierModal">×</button>
                </div>

                <form id="supplierForm">
                    <div class="form-grid">
                        <div class="field">
                            <label>Supplier Name *</label>
                            <input name="supplier_name" maxlength="150" required
                                value="${escapeHTML(supplier?.supplier_name || "")}">
                        </div>

                        <div class="field">
                            <label>Contact Person</label>
                            <input name="contact_person" maxlength="120"
                                value="${escapeHTML(supplier?.contact_person || "")}">
                        </div>

                        <div class="field">
                            <label>Phone Number</label>
                            <input name="phone" maxlength="30"
                                value="${escapeHTML(supplier?.phone || "")}">
                        </div>

                        <div class="field">
                            <label>Email Address</label>
                            <input name="email" type="email" maxlength="150"
                                value="${escapeHTML(supplier?.email || "")}">
                        </div>

                        <div class="field">
                            <label>Address</label>
                            <input name="address"
                                value="${escapeHTML(supplier?.address || "")}">
                        </div>

                        <div class="field">
                            <label>Status</label>
                            <select name="status">
                                <option value="Active"
                                    ${supplier?.status !== "Inactive" ? "selected" : ""}>
                                    Active
                                </option>

                                <option value="Inactive"
                                    ${supplier?.status === "Inactive" ? "selected" : ""}>
                                    Inactive
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="actions">
                        <button type="button" class="btn btn-secondary"
                            id="cancelSupplierBtn">Cancel</button>

                        <button type="submit" class="btn btn-primary"
                            id="saveSupplierBtn">
                            ${editing ? "Update Supplier" : "Save Supplier"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById("closeSupplierModal")
        ?.addEventListener("click", closeSupplierModal);

    document.getElementById("cancelSupplierBtn")
        ?.addEventListener("click", closeSupplierModal);

    document.getElementById("supplierModalBackdrop")
        ?.addEventListener("click", event => {
            if (event.target.id === "supplierModalBackdrop") {
                closeSupplierModal();
            }
        });

    document.getElementById("supplierForm")
        ?.addEventListener("submit", event => saveSupplier(event, supplier));
}

async function saveSupplier(event, existingSupplier = null) {
    event.preventDefault();

    const formData = new FormData(event.target);

    const supplier = {
        supplier_name: String(formData.get("supplier_name") || "").trim(),
        contact_person: String(formData.get("contact_person") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        address: String(formData.get("address") || "").trim(),
        status: String(formData.get("status") || "Active")
    };

    if (!supplier.supplier_name) {
        showToast("Supplier name is required.");
        return;
    }

    const button = document.getElementById("saveSupplierBtn");

    if (button) {
        button.disabled = true;
        button.textContent = existingSupplier ? "Updating..." : "Saving...";
    }

    try {
        const endpoint = existingSupplier
            ? `/suppliers/${existingSupplier.supplier_id}`
            : "/suppliers";

        const result = await apiRequest(endpoint, {
            method: existingSupplier ? "PUT" : "POST",
            body: JSON.stringify(supplier)
        });

        closeSupplierModal();

        showToast(result.message || "Supplier saved successfully!");
        await loadSuppliers();

    } catch (error) {
        showToast(error.message);

        if (button) {
            button.disabled = false;
            button.textContent = existingSupplier ? "Update Supplier" : "Save Supplier";
        }
    }
}

async function deactivateSupplier(id) {
    const supplier = suppliersData.find(
        item => Number(item.supplier_id) === id
    );

    if (!supplier) return;

    if (!confirm(`Are you sure you want to deactivate "${supplier.supplier_name}"?`)) {
        return;
    }

    try {
        const result = await apiRequest(`/suppliers/${id}`, {
            method: "DELETE"
        });

        showToast(result.message || "Supplier deactivated successfully!");
        await loadSuppliers();

    } catch (error) {
        showToast(error.message);
    }
}

function closeSupplierModal() {
    if (modalRoot) modalRoot.innerHTML = "";
}

// ==============================
// PURCHASES PAGE
// ==============================

async function renderPurchases() {
    purchaseItems = [];

    pageContent.innerHTML = `
        <div class="toolbar">
            <div>
                <h3>Purchase Management</h3>
                <p>Record purchases from suppliers and receive stock into inventory.</p>
            </div>

            <button class="btn btn-primary" id="newPurchaseBtn" type="button">
                + New Purchase
            </button>
        </div>

        <section class="panel">
            <div class="toolbar">
                <div>
                    <h3>Purchase History</h3>
                    <p>View pending, received, and cancelled purchases.</p>
                </div>

                <button class="btn btn-secondary" id="refreshPurchasesBtn" type="button">
                    Refresh
                </button>
            </div>

            <div class="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Reference Number</th>
                            <th>Supplier</th>
                            <th>Purchase Date</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody id="purchasesTableBody">
                        <tr><td colspan="6">Loading purchases...</td></tr>
                    </tbody>
                </table>
            </div>
        </section>
    `;

    document.getElementById("newPurchaseBtn")
        ?.addEventListener("click", openPurchaseModal);

    document.getElementById("refreshPurchasesBtn")
        ?.addEventListener("click", loadPurchases);

    await loadPurchases();
}

async function loadPurchases() {
    const tableBody = document.getElementById("purchasesTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = `
        <tr><td colspan="6">Loading purchases...</td></tr>
    `;

    try {
        const result = await apiRequest("/purchases");
        purchasesData = result.purchases || [];
        displayPurchases();

    } catch (error) {
        tableBody.innerHTML = `
            <tr><td colspan="6">${escapeHTML(error.message)}</td></tr>
        `;
    }
}

function displayPurchases() {
    const tableBody = document.getElementById("purchasesTableBody");
    if (!tableBody) return;

    if (!purchasesData.length) {
        tableBody.innerHTML = `
            <tr><td colspan="6">No purchases recorded yet. Click New Purchase.</td></tr>
        `;
        return;
    }

    tableBody.innerHTML = purchasesData.map(purchase => {
        const status = purchase.status || "Pending";

        return `
            <tr>
                <td>${escapeHTML(purchase.reference_number || `PUR-${purchase.purchase_id}`)}</td>
                <td>${escapeHTML(purchase.supplier_name || "No supplier")}</td>
                <td>${escapeHTML(formatDate(purchase.purchase_date))}</td>
                <td>${formatCurrency(purchase.total_amount)}</td>
                <td><span class="badge">${escapeHTML(status)}</span></td>

                <td>
                    <button type="button" class="btn btn-secondary"
                        data-view-purchase="${Number(purchase.purchase_id)}">
                        View
                    </button>

                    ${status === "Pending" ? `
                        <button type="button" class="btn btn-primary"
                            data-receive-purchase="${Number(purchase.purchase_id)}">
                            Receive
                        </button>

                        <button type="button" class="btn btn-danger"
                            data-cancel-purchase="${Number(purchase.purchase_id)}">
                            Cancel
                        </button>
                    ` : ""}
                </td>
            </tr>
        `;
    }).join("");

    tableBody.querySelectorAll("[data-view-purchase]").forEach(button => {
        button.addEventListener("click", () => {
            viewPurchase(Number(button.dataset.viewPurchase));
        });
    });

    tableBody.querySelectorAll("[data-receive-purchase]").forEach(button => {
        button.addEventListener("click", () => {
            receivePurchase(Number(button.dataset.receivePurchase));
        });
    });

    tableBody.querySelectorAll("[data-cancel-purchase]").forEach(button => {
        button.addEventListener("click", () => {
            cancelPurchase(Number(button.dataset.cancelPurchase));
        });
    });
}

// ==============================
// CREATE PURCHASE MODAL
// ==============================

async function openPurchaseModal() {
    purchaseItems = [];

    try {
        const [productsResult, suppliersResult] = await Promise.all([
            apiRequest("/products"),
            apiRequest("/suppliers")
        ]);

        productsData = productsResult.products || [];
        suppliersData = suppliersResult.suppliers || [];

        const activeSuppliers = suppliersData.filter(
            supplier => supplier.status !== "Inactive"
        );

        if (!productsData.length) {
            showToast("Add products first before creating a purchase.");
            return;
        }

        if (!activeSuppliers.length) {
            showToast("Add an active supplier first before creating a purchase.");
            return;
        }

        modalRoot.innerHTML = `
            <div class="modal-backdrop" id="purchaseModalBackdrop">
                <div class="modal">
                    <div class="toolbar">
                        <h3>New Purchase</h3>

                        <button type="button" class="btn btn-secondary"
                            id="closePurchaseModal">×</button>
                    </div>

                    <form id="purchaseForm">
                        <div class="form-grid">
                            <div class="field">
                                <label>Supplier *</label>

                                <select name="supplier_id" id="purchaseSupplier" required>
                                    <option value="">Select supplier...</option>

                                    ${activeSuppliers.map(supplier => `
                                        <option value="${Number(supplier.supplier_id)}">
                                            ${escapeHTML(supplier.supplier_name)}
                                        </option>
                                    `).join("")}
                                </select>
                            </div>

                            <div class="field">
                                <label>Reference Number</label>
                                <input name="reference_number" maxlength="80"
                                    placeholder="Optional reference number">
                            </div>

                            <div class="field">
                                <label>Notes</label>
                                <input name="notes" placeholder="Optional notes">
                            </div>
                        </div>

                        <hr>

                        <h4>Add Purchase Items</h4>

                        <div class="form-grid">
                            <div class="field">
                                <label>Product *</label>

                                <select id="purchaseProductSelect">
                                    <option value="">Select product...</option>

                                    ${productsData.map(product => `
                                        <option value="${Number(product.product_id)}">
                                            ${escapeHTML(product.product_name)}
                                            (${escapeHTML(product.sku)})
                                        </option>
                                    `).join("")}
                                </select>
                            </div>

                            <div class="field">
                                <label>Quantity *</label>
                                <input id="purchaseQuantity" type="number"
                                    min="1" step="1" value="1">
                            </div>

                            <div class="field">
                                <label>Unit Cost (₱) *</label>
                                <input id="purchaseUnitCost" type="number"
                                    min="0" step="0.01" value="0">
                            </div>

                            <div class="field">
                                <label>Expiry Date</label>
                                <input id="purchaseExpiryDate" type="date">
                            </div>
                        </div>

                        <div class="actions">
                            <button type="button" class="btn btn-secondary"
                                id="addPurchaseItemBtn">+ Add Item</button>
                        </div>

                        <div class="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Quantity</th>
                                        <th>Unit Cost</th>
                                        <th>Subtotal</th>
                                        <th>Expiry Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>

                                <tbody id="purchaseItemsBody">
                                    <tr><td colspan="6">No items added.</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div style="text-align:right; margin-top:16px;">
                            <h3>Total: <span id="purchaseTotal">₱0.00</span></h3>
                        </div>

                        <div class="actions">
                            <button type="button" class="btn btn-secondary"
                                id="cancelPurchaseFormBtn">Close</button>

                            <button type="submit" class="btn btn-primary"
                                id="savePurchaseBtn">Save Purchase</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.getElementById("closePurchaseModal")
            ?.addEventListener("click", closePurchaseModal);

        document.getElementById("cancelPurchaseFormBtn")
            ?.addEventListener("click", closePurchaseModal);

        document.getElementById("purchaseModalBackdrop")
            ?.addEventListener("click", event => {
                if (event.target.id === "purchaseModalBackdrop") {
                    closePurchaseModal();
                }
            });

        document.getElementById("addPurchaseItemBtn")
            ?.addEventListener("click", addPurchaseItem);

        document.getElementById("purchaseForm")
            ?.addEventListener("submit", savePurchase);

    } catch (error) {
        showToast(error.message);
    }
}

function addPurchaseItem() {
    const productId = Number(
        document.getElementById("purchaseProductSelect")?.value
    );

    const quantity = Number(
        document.getElementById("purchaseQuantity")?.value
    );

    const unitCost = Number(
        document.getElementById("purchaseUnitCost")?.value
    );

    const expiryDate = document.getElementById("purchaseExpiryDate").value;
console.log("Selected Expiry Date:", expiryDate);

    if (!productId) {
        showToast("Please select a product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        showToast("Please enter a valid quantity.");
        return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
        showToast("Please enter a valid unit cost.");
        return;
    }

    const product = productsData.find(
        item => Number(item.product_id) === productId
    );

    if (!product) {
        showToast("Product not found.");
        return;
    }

    const existingItem = purchaseItems.find(
        item => item.product_id === productId &&
            item.expiry_date === expiryDate &&
            item.unit_cost === unitCost
    );

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        purchaseItems.push({
            product_id: productId,
            product_name: product.product_name,
            sku: product.sku,
            quantity,
            unit_cost: unitCost,
            expiry_date: expiryDate
        });
    }

    renderPurchaseItems();

    document.getElementById("purchaseQuantity").value = 1;
    document.getElementById("purchaseUnitCost").value = 0;
    document.getElementById("purchaseExpiryDate").value = "";

    showToast("Purchase item added.");
}

function renderPurchaseItems() {
    const tableBody = document.getElementById("purchaseItemsBody");
    const totalElement = document.getElementById("purchaseTotal");

    if (!tableBody || !totalElement) return;

    if (!purchaseItems.length) {
        tableBody.innerHTML = `
            <tr><td colspan="6">No items added.</td></tr>
        `;

        totalElement.textContent = "₱0.00";
        return;
    }

    tableBody.innerHTML = purchaseItems.map((item, index) => `
        <tr>
            <td>
                ${escapeHTML(item.product_name)}
                <br><small>${escapeHTML(item.sku)}</small>
            </td>

            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unit_cost)}</td>
            <td>${formatCurrency(item.quantity * item.unit_cost)}</td>
            <td>${escapeHTML(item.expiry_date || "—")}</td>

            <td>
                <button type="button" class="btn btn-danger"
                    data-remove-purchase-item="${index}">Remove</button>
            </td>
        </tr>
    `).join("");

    const total = purchaseItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0
    );

    totalElement.textContent = formatCurrency(total);

    tableBody.querySelectorAll("[data-remove-purchase-item]").forEach(button => {
        button.addEventListener("click", () => {
            purchaseItems.splice(Number(button.dataset.removePurchaseItem), 1);
            renderPurchaseItems();
        });
    });
}

// ==============================
// SAVE PURCHASE
// ==============================

async function savePurchase(event) {
    event.preventDefault();

    if (!purchaseItems.length) {
        showToast("Please add at least one purchase item.");
        return;
    }

    const formData = new FormData(event.target);

    const supplierId = Number(formData.get("supplier_id"));

    if (!supplierId) {
        showToast("Please select a supplier.");
        return;
    }

    const purchaseData = {
        supplier_id: supplierId,
        reference_number: String(formData.get("reference_number") || "").trim() || null,
        notes: String(formData.get("notes") || "").trim(),
        created_by: getCurrentUserId(),

        items: purchaseItems.map(item => ({
    product_id: item.product_id,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    expiry_date: item.expiry_date || null
}))
    };

    const total = purchaseItems.reduce(
        (sum, item) => sum + item.quantity * item.unit_cost,
        0
    );

    if (!confirm(
        `Save this purchase?\n\nTotal Amount: ${formatCurrency(total)}`
    )) {
        return;
    }

    const button = document.getElementById("savePurchaseBtn");

    if (button) {
        button.disabled = true;
        button.textContent = "Saving...";
    }

    try {
        const result = await apiRequest("/purchases", {
            method: "POST",
            body: JSON.stringify(purchaseData)
        });

        closePurchaseModal();

        showToast(result.message || "Purchase created successfully!");

        await loadPurchases();

    } catch (error) {
        showToast(error.message);

        if (button) {
            button.disabled = false;
            button.textContent = "Save Purchase";
        }
    }
}

function closePurchaseModal() {
    if (modalRoot) modalRoot.innerHTML = "";
}

// ==============================
// VIEW PURCHASE DETAILS
// ==============================

async function viewPurchase(id) {
    try {
        const result = await apiRequest(`/purchases/${id}`);
        const purchase = result.purchase || result;
        const items = result.items || purchase.items || purchase.purchase_items || [];

        const itemRows = items.map(item => `
            <tr>
                <td>${escapeHTML(item.product_name || "Product")}</td>
                <td>${Number(item.quantity || 0)}</td>
                <td>${formatCurrency(item.unit_cost)}</td>
                <td>${formatCurrency(item.subtotal)}</td>
                <td>${escapeHTML(item.expiry_date || "—")}</td>
            </tr>
        `).join("");

        modalRoot.innerHTML = `
            <div class="modal-backdrop" id="purchaseDetailsBackdrop">
                <div class="modal">
                    <div class="toolbar">
                        <h3>Purchase Details</h3>

                        <button type="button" class="btn btn-secondary"
                            id="closePurchaseDetails">×</button>
                    </div>

                    <div>
                        <p><strong>Reference:</strong>
                            ${escapeHTML(purchase.reference_number || `PUR-${purchase.purchase_id}`)}</p>

                        <p><strong>Supplier:</strong>
                            ${escapeHTML(purchase.supplier_name || "—")}</p>

                        <p><strong>Date:</strong>
                            ${escapeHTML(formatDate(purchase.purchase_date))}</p>

                        <p><strong>Status:</strong>
                            ${escapeHTML(purchase.status || "Pending")}</p>

                        <p><strong>Notes:</strong>
                            ${escapeHTML(purchase.notes || "—")}</p>
                    </div>

                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Unit Cost</th>
                                    <th>Subtotal</th>
                                    <th>Expiry Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                ${itemRows || `<tr><td colspan="5">No items found.</td></tr>`}
                            </tbody>
                        </table>
                    </div>

                    <h3 style="text-align:right;">
                        Total: ${formatCurrency(purchase.total_amount)}
                    </h3>
                </div>
            </div>
        `;

        document.getElementById("closePurchaseDetails")
            ?.addEventListener("click", closePurchaseModal);

        document.getElementById("purchaseDetailsBackdrop")
            ?.addEventListener("click", event => {
                if (event.target.id === "purchaseDetailsBackdrop") {
                    closePurchaseModal();
                }
            });

    } catch (error) {
        showToast(error.message);
    }
}

// ==============================
// RECEIVE PURCHASE
// ==============================

async function receivePurchase(id) {
    const purchase = purchasesData.find(
        item => Number(item.purchase_id) === id
    );

    if (!purchase) return;

    const reference =
        purchase.reference_number || `PUR-${purchase.purchase_id}`;

    if (!confirm(
        `Receive purchase ${reference}?\n\nThe purchased quantities will be added to inventory and batches will be recorded.`
    )) {
        return;
    }

    try {
        const result = await apiRequest(`/purchases/${id}/receive`, {
            method: "PUT"
        });

        showToast(result.message || "Purchase received successfully!");

        await loadPurchases();
        loadDashboardStats();

        if (pageTitle?.textContent === "Inventory") {
            await loadInventory();
        }

    } catch (error) {
        showToast(error.message);
    }
}

// ==============================
// CANCEL PURCHASE
// ==============================

async function cancelPurchase(id) {
    const purchase = purchasesData.find(
        item => Number(item.purchase_id) === id
    );

    if (!purchase) return;

    const reference =
        purchase.reference_number || `PUR-${purchase.purchase_id}`;

    if (!confirm(
        `Are you sure you want to cancel purchase ${reference}?`
    )) {
        return;
    }

    try {
        const result = await apiRequest(`/purchases/${id}/cancel`, {
            method: "PUT"
        });

        showToast(result.message || "Purchase cancelled successfully!");

        await loadPurchases();

    } catch (error) {
        showToast(error.message);
    }
}

// ==============================
// OTHER MODULES
// ==============================

function renderComingSoon(page) {
    pageContent.innerHTML = `
        <section class="panel">
            <h3>${escapeHTML(pageNames[page] || "Module")}</h3>
            <p>This module is not connected yet.</p>
        </section>
    `;
}

async function loadNotifications() {
    pageContent.innerHTML = `
        <section class="panel">
            <h3>Notifications</h3>
            <p>Loading notifications...</p>
        </section>
    `;

    try {
        const data = await apiRequest("/notifications");

        if (!data.success) {
            throw new Error(data.message || "Failed to load notifications.");
        }

        const notifications = data.notifications || [];

        if (notifications.length === 0) {
            pageContent.innerHTML = `
                <section class="panel">
                    <h3>Notifications</h3>
                    <p>No stock alerts at the moment.</p>
                </section>
            `;
            return;
        }

        pageContent.innerHTML = `
            <section class="panel">
                <h3>Notifications (${notifications.length})</h3>

                <div class="notification-list">
                    ${notifications.map(item => `
                        <div class="notification-item">
                            <strong>${escapeHTML(item.title)}</strong>
                            <p>${escapeHTML(item.message)}</p>
                        </div>
                    `).join("")}
                </div>
            </section>
        `;

    } catch (error) {
        console.error("Notifications error:", error);

        pageContent.innerHTML = `
            <section class="panel">
                <h3>Notifications</h3>
                <p>Unable to load notifications. Please try again.</p>
            </section>
        `;
    }
}

// ==============================
// RESTORE SESSION
// ==============================

if (authToken && currentUser) {
    showApp();
} else {
    showPublicWebsite();
}
// Show / Hide Login Password
const loginPassword = document.getElementById("loginPassword");
const toggleLoginPassword = document.getElementById("toggleLoginPassword");

if (loginPassword && toggleLoginPassword) {
    toggleLoginPassword.addEventListener("click", function () {
        const isHidden = loginPassword.type === "password";

        loginPassword.type = isHidden ? "text" : "password";

        toggleLoginPassword.innerHTML = isHidden
            ? '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 002.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0121 12a11 11 0 01-3 4.5"/><path d="M6.2 6.2A11 11 0 003 12a11 11 0 0018 0"/></svg>'
            : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';

        toggleLoginPassword.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });
}

// Show / Hide Register Password
function setupPasswordToggle(inputId, buttonId) {
    const passwordInput = document.getElementById(inputId);
    const toggleButton = document.getElementById(buttonId);

    if (!passwordInput || !toggleButton) return;

    toggleButton.addEventListener("click", function () {
        const isHidden = passwordInput.type === "password";

        passwordInput.type = isHidden ? "text" : "password";

        toggleButton.innerHTML = isHidden
            ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 3l18 18"/>
                <path d="M10.6 10.6a2 2 0 002.8 2.8"/>
                <path d="M9.9 5.2A10.8 10.8 0 0121 12a11 11 0 01-3 4.5"/>
                <path d="M6.2 6.2A11 11 0 003 12a11 11 0 0018 0"/>
               </svg>`
            : `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/>
                <circle cx="12" cy="12" r="3"/>
               </svg>`;

        toggleButton.setAttribute(
            "aria-label",
            isHidden ? "Hide password" : "Show password"
        );
    });
}

setupPasswordToggle("registerPassword", "toggleRegisterPassword");
setupPasswordToggle("confirmPassword", "toggleConfirmPassword");


// Validate Register Password and Confirm Password
if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const registerMessage = document.getElementById("registerMessage");

        if (password !== confirmPassword) {
            event.preventDefault();
            event.stopImmediatePropagation();

            registerMessage.textContent = "Passwords do not match. Please try again.";
            registerMessage.style.color = "#dc2626";

            document.getElementById("confirmPassword").focus();

            return false;
        }

        registerMessage.textContent = "";
    }, true);
}
