const inventory = [
  { name: "Chicken breast", qty: 3, unit: "kg", threshold: 5 },
  { name: "Rice", qty: 18, unit: "kg", threshold: 5 },
  { name: "Fresh milk", qty: 2, unit: "L", threshold: 4 },
  { name: "Tomatoes", qty: 8, unit: "kg", threshold: 3 },
  { name: "Cheese", qty: 2, unit: "packs", threshold: 3 },
  { name: "Cooking oil", qty: 7, unit: "L", threshold: 3 },
  { name: "Flour", qty: 10, unit: "kg", threshold: 4 },
  { name: "Peanuts", qty: 1, unit: "kg", threshold: 2 }
];

const menu = [
  { id: 1, name: "Chicken Rice Bowl", price: 145, icon: "🍗", description: "Grilled chicken served with rice.", allergy: "Contains soy." },
  { id: 2, name: "Beef Tapa Bowl", price: 165, icon: "🥩", description: "Savory beef tapa with rice.", allergy: "May contain soy." },
  { id: 3, name: "Creamy Pasta", price: 135, icon: "🍝", description: "Creamy pasta with cheese.", allergy: "Contains dairy and wheat." },
  { id: 4, name: "Fresh Garden Salad", price: 110, icon: "🥗", description: "Fresh vegetables and dressing.", allergy: "Check dressing ingredients." },
  { id: 5, name: "Satay Bowl", price: 155, icon: "🥜", description: "Rice bowl with satay sauce.", allergy: "⚠ Contains peanuts." },
  { id: 6, name: "Iced Coffee", price: 85, icon: "☕", description: "Chilled coffee drink.", allergy: "Contains dairy unless requested otherwise." }
];

let cart = [];
let orders = [
  { id: "ORD-1001", customer: "Jamie Cruz", pickup: "12:00 PM", items: "2 Chicken Rice Bowl", notes: "No onions", total: 290, status: "Preparing" },
  { id: "ORD-1002", customer: "Alex Reyes", pickup: "12:30 PM", items: "1 Creamy Pasta", notes: "No special notes", total: 135, status: "Ready" },
  { id: "ORD-1003", customer: "Sam Garcia", pickup: "1:00 PM", items: "1 Satay Bowl", notes: "Peanut allergy — confirm before preparation", total: 155, status: "Pending" }
];

let applications = [
  { shop: "Daily Greens", owner: "Mia Santos", category: "Healthy meals", date: "Nov 2, 2026", status: "Pending" },
  { shop: "Brew Corner", owner: "Noah Reyes", category: "Cafe", date: "Nov 4, 2026", status: "Pending" },
  { shop: "Pasta House", owner: "Ella Cruz", category: "Restaurant", date: "Nov 5, 2026", status: "Approved" }
];

function showPage(page) {
  document.querySelectorAll(".page").forEach(section => {
    section.classList.remove("active");
  });

  document.querySelectorAll(".nav button").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  document.getElementById(page).classList.add("active");

  const titles = {
    dashboard: "Dashboard",
    inventory: "Inventory",
    menu: "Menu & Ordering",
    orders: "Orders",
    suppliers: "Suppliers",
    applications: "Shop Applications",
    reports: "Reports"
  };

  document.getElementById("pageTitle").textContent = titles[page];
}

document.getElementById("nav").addEventListener("click", event => {
  const button = event.target.closest("button[data-page]");

  if (button) {
    showPage(button.dataset.page);
  }
});

function getStockStatus(item) {
  if (item.qty <= 0) return "Out of stock";
  if (item.qty <= item.threshold) return "Low stock";
  return "In stock";
}

function getStatusClass(status) {
  if (status === "Out of stock") return "out";
  if (status === "Low stock") return "low";
  if (status === "Pending") return "pending";
  return "";
}

function renderInventory() {
  const rows = document.getElementById("inventoryRows");

  rows.innerHTML = inventory.map((item, index) => {
    const status = getStockStatus(item);

    return `
      <tr>
        <td><b>${item.name}</b></td>
        <td>${item.qty} ${item.unit}</td>
        <td>${item.threshold} ${item.unit}</td>
        <td><span class="status ${getStatusClass(status)}">${status}</span></td>
        <td>
          <button class="secondary small" onclick="editStock(${index})">Edit</button>
        </td>
      </tr>
    `;
  }).join("");

  renderWatchlist();
  renderRestockList();
  updateDashboardStats();
}

function renderWatchlist() {
  const lowItems = inventory.filter(item => item.qty <= item.threshold);

  document.getElementById("watchlist").innerHTML = lowItems.length
    ? lowItems.map(item => `
      <div class="alert">
        <span>⚠</span>
        <div>
          <b>${item.name}</b><br>
          ${item.qty} ${item.unit} remaining
        </div>
        <span class="status low">Low</span>
      </div>
    `).join("")
    : `<p class="muted">All ingredients are sufficiently stocked.</p>`;
}

function renderRestockList() {
  const lowItems = inventory.filter(item => item.qty <= item.threshold);

  document.getElementById("restockList").innerHTML = lowItems.length
    ? lowItems.map(item => `
      <div class="alert">
        <span>＋</span>
        <div>
          <b>${item.name}</b><br>
          Current stock: ${item.qty} ${item.unit}
        </div>
      </div>
    `).join("")
    : `<p class="muted">No ingredients need restocking.</p>`;
}

function updateDashboardStats() {
  document.getElementById("statOrders").textContent =
    orders.filter(order => order.status !== "Completed").length;

  document.getElementById("statItems").textContent = inventory.length;

  document.getElementById("statLow").textContent =
    inventory.filter(item => item.qty <= item.threshold).length;

  document.getElementById("reportOrders").textContent = orders.length;
}

function openStockForm() {
  document.getElementById("stockForm").style.display = "block";
  document.getElementById("ingredientName").value = "";
  document.getElementById("ingredientQty").value = "";
  document.getElementById("ingredientThreshold").value = 5;
  document.getElementById("stockForm").dataset.editIndex = "";
}

function editStock(index) {
  const item = inventory[index];

  document.getElementById("stockForm").style.display = "block";
  document.getElementById("ingredientName").value = item.name;
  document.getElementById("ingredientQty").value = item.qty;
  document.getElementById("ingredientUnit").value = item.unit;
  document.getElementById("ingredientThreshold").value = item.threshold;
  document.getElementById("stockForm").dataset.editIndex = index;

  document.getElementById("stockForm").scrollIntoView({ behavior: "smooth" });
}

function saveStock() {
  const name = document.getElementById("ingredientName").value.trim();
  const qty = Number(document.getElementById("ingredientQty").value);
  const unit = document.getElementById("ingredientUnit").value;
  const threshold = Number(document.getElementById("ingredientThreshold").value);

  if (!name || document.getElementById("ingredientQty").value === "" || qty < 0 || threshold < 0) {
    alert("Please enter valid ingredient details.");
    return;
  }

  const editIndex = document.getElementById("stockForm").dataset.editIndex;

  const item = { name, qty, unit, threshold };

  if (editIndex !== "") {
    inventory[Number(editIndex)] = item;
  } else {
    inventory.push(item);
  }

  document.getElementById("stockForm").style.display = "none";
  renderInventory();
}

function renderMenu() {
  document.getElementById("menuGrid").innerHTML = menu.map(item => `
    <div class="menu-item">
      <div class="food-icon">${item.icon}</div>
      <h3>${item.name}</h3>
      <p>${item.description}</p>
      <span class="allergy">${item.allergy}</span>
      <div class="price">₱${item.price.toFixed(2)}</div>
      <button onclick="addToCart(${item.id})">Add to cart</button>
    </div>
  `).join("");
}

function addToCart(id) {
  const item = menu.find(product => product.id === id);
  const existing = cart.find(product => product.id === id);

  if (existing) {
    existing.quantity++;
  } else {
    cart.push({ ...item, quantity: 1 });
  }

  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  document.getElementById("cartCount").textContent = `${count} items in cart`;
  document.getElementById("cartTotal").textContent = `₱${total.toFixed(2)}`;

  document.getElementById("cartItems").innerHTML = cart.length
    ? cart.map(item => `
      <div style="display:flex;justify-content:space-between;gap:10px;border-bottom:1px solid var(--line);padding:8px 0">
        <span>${item.name} × ${item.quantity}</span>
        <span>₱${(item.price * item.quantity).toFixed(2)}</span>
        <button class="secondary small" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    `).join("")
    : "Your cart is empty. Add something tasty above.";
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  renderCart();
}

function clearCart() {
  cart = [];
  renderCart();
  document.getElementById("checkoutMessage").textContent = "";
}

function placeOrder() {
  const customer = document.getElementById("customerName").value.trim();
  const pickup = document.getElementById("pickupTime").value;
  const notes = document.getElementById("allergyNotes").value.trim();

  if (!cart.length) {
    alert("Your cart is empty.");
    return;
  }

  if (!customer) {
    alert("Please enter the customer name.");
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const items = cart.map(item => `${item.quantity} ${item.name}`).join(", ");

  const newOrder = {
    id: "ORD-" + (1000 + orders.length + 1),
    customer,
    pickup,
    items,
    notes: notes || "No special notes",
    total,
    status: "Pending"
  };

  orders.unshift(newOrder);

  cart = [];
  renderCart();
  renderOrders();
  renderRecentOrders();
  updateDashboardStats();

  document.getElementById("customerName").value = "";
  document.getElementById("allergyNotes").value = "";

  document.getElementById("checkoutMessage").textContent =
    `Order ${newOrder.id} has been added successfully!`;
}

function renderOrders() {
  document.getElementById("orderRows").innerHTML = orders.map((order, index) => `
    <tr>
      <td><b>${order.id}</b></td>
      <td>${order.customer}</td>
      <td>${order.pickup}</td>
      <td>
        ${order.items}<br>
        <span class="muted">${order.notes}</span>
      </td>
      <td>₱${order.total.toFixed(2)}</td>
      <td><span class="status ${getStatusClass(order.status)}">${order.status}</span></td>
      <td>
        <select onchange="updateOrderStatus(${index}, this.value)">
          <option ${order.status === "Pending" ? "selected" : ""}>Pending</option>
          <option ${order.status === "Preparing" ? "selected" : ""}>Preparing</option>
          <option ${order.status === "Ready" ? "selected" : ""}>Ready</option>
          <option ${order.status === "Completed" ? "selected" : ""}>Completed</option>
        </select>
      </td>
    </tr>
  `).join("");
}

function renderRecentOrders() {
  document.getElementById("recentOrders").innerHTML = orders.slice(0, 5).map(order => `
    <tr>
      <td><b>${order.id}</b></td>
      <td>${order.customer}</td>
      <td>${order.pickup}</td>
      <td>₱${order.total.toFixed(2)}</td>
      <td><span class="status ${getStatusClass(order.status)}">${order.status}</span></td>
    </tr>
  `).join("");
}

function updateOrderStatus(index, status) {
  orders[index].status = status;
  renderOrders();
  renderRecentOrders();
  updateDashboardStats();
}

function renderApplications() {
  document.getElementById("applicationRows").innerHTML =
    applications.map((application, index) => `
      <tr>
        <td><b>${application.shop}</b></td>
        <td>${application.owner}</td>
        <td>${application.category}</td>
        <td>${application.date}</td>
        <td><span class="status ${getStatusClass(application.status)}">${application.status}</span></td>
        <td>
          ${application.status === "Pending" ? `
            <button class="small" onclick="updateApplication(${index}, 'Approved')">Approve</button>
            <button class="secondary small" onclick="updateApplication(${index}, 'Declined')">Decline</button>
          ` : "—"}
        </td>
      </tr>
    `).join("");
}

function updateApplication(index, status) {
  applications[index].status = status;
  renderApplications();
}

function exportCSV() {
  const rows = [
    ["Ingredient", "Quantity", "Unit", "Threshold", "Status"],
    ...inventory.map(item => [
      item.name,
      item.qty,
      item.unit,
      item.threshold,
      getStockStatus(item)
    ])
  ];

  downloadCSV(rows, "stocksense-inventory.csv");
}

function exportOrdersCSV() {
  const rows = [
    ["Order ID", "Customer", "Pickup", "Items", "Notes", "Total", "Status"],
    ...orders.map(order => [
      order.id,
      order.customer,
      order.pickup,
      order.items,
      order.notes,
      order.total,
      order.status
    ])
  ];

  downloadCSV(rows, "stocksense-orders.csv");
}

function downloadCSV(rows, filename) {
  const csv = rows.map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function initializeApp() {
  renderInventory();
  renderMenu();
  renderCart();
  renderOrders();
  renderRecentOrders();
  renderApplications();
  updateDashboardStats();
}

initializeApp();