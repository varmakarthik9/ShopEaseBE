// DOM Elements
const usersTableBody = document.getElementById('usersTableBody');
const productsTableBody = document.getElementById('productsTableBody');
const addUserBtn = document.getElementById('addUserBtn');
const addProductBtn = document.getElementById('addProductBtn');
const saveUserBtn = document.getElementById('saveUserBtn');
const saveProductBtn = document.getElementById('saveProductBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const userForm = document.getElementById('userForm');
const productForm = document.getElementById('productForm');
const deleteItemType = document.getElementById('deleteItemType');
const emailForm = document.getElementById('emailForm');
const sendEmailBtn = document.getElementById('sendEmailBtn');

// Modal instances
const userModal = new bootstrap.Modal(document.getElementById('userModal'));
const productModal = new bootstrap.Modal(document.getElementById('productModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
const userOrdersModal = new bootstrap.Modal(document.getElementById('userOrdersModal'));
const orderModal = new bootstrap.Modal(document.getElementById('orderModal'));
const emailModal = new bootstrap.Modal(document.getElementById('emailModal'));
const smsModal = new bootstrap.Modal(document.getElementById('smsModal'));

// State
let currentUserId = null;
let currentProductId = null;
let currentOrderId = null;
let users = [];
let products = [];
let orders = [];
let currentSection = 'users';

// Initialize charts
let topProductsChart = null;
let categorySalesChart = null;
let monthlySalesChart = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadProducts();
    setupEventListeners();
    setupNavigation();
});

// Event Listeners
function setupEventListeners() {
    addUserBtn.addEventListener('click', () => {
        currentUserId = null;
        userForm.reset();
        document.getElementById('modalTitle').textContent = 'Add New User';
        document.getElementById('password').required = true;
        userModal.show();
    });

    addProductBtn.addEventListener('click', () => {
        currentProductId = null;
        productForm.reset();
        document.getElementById('productModalTitle').textContent = 'Add New Product';
        productModal.show();
    });

    saveUserBtn.addEventListener('click', saveUser);
    saveProductBtn.addEventListener('click', saveProduct);
    confirmDeleteBtn.addEventListener('click', deleteItem);
    sendEmailBtn.addEventListener('click', sendEmail);
}

// Navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.closest('.nav-link').dataset.section;
            
            // Hide all sections
            document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
            
            // Show selected section
            document.getElementById(`${section}Section`).style.display = 'block';
            
            // Update active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.target.closest('.nav-link').classList.add('active');
            
            // Load analytics data if analytics section is selected
            if (section === 'analytics') {
                loadAnalytics();
            }
        });
    });
}

// Load Users
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        users = await response.json();
        renderUsersTable();
    } catch (error) {
        showAlert('Error loading users: ' + error.message, 'danger');
    }
}

// Load Products
async function loadProducts() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch('/products', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load products');
        }

        products = await response.json();
        renderProductsTable();
    } catch (error) {
        showAlert('Error loading products: ' + error.message, 'danger');
    }
}

// Render Users Table
function renderUsersTable() {
    usersTableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.age}</td>
            <td>${user.phone || '-'}</td>
            <td>
                <span class="badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}">
                    ${user.role}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-info me-1" onclick="viewUserCart('${user._id}')">
                    <i class="bi bi-cart"></i> View Cart
                </button>
                <button class="btn btn-sm btn-success me-1" onclick="viewUserOrders('${user._id}')">
                    <i class="bi bi-receipt"></i> View Orders
                </button>
                <button class="btn btn-sm btn-warning me-1" onclick="composeEmail('${user._id}', '${user.email}')">
                    <i class="bi bi-envelope"></i> Email
                </button>
                ${user.phone ? `
                    <button class="btn btn-sm btn-primary me-1" onclick="composeSMS('${user._id}', '${user.phone}')">
                        <i class="bi bi-chat-dots"></i> SMS
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-primary me-1" onclick="editUser('${user._id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('user', '${user._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        usersTableBody.appendChild(row);
    });
}

// View User Cart
async function viewUserCart(userId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch(`/cart/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load user cart');
        }

        const cartData = await response.json();
        if (!cartData) {
            throw new Error('No cart data received');
        }

        renderCartModal(cartData);
        cartModal.show();
    } catch (error) {
        console.error('Error loading cart:', error);
        showAlert('Error loading cart: ' + error.message, 'danger');
    }
}

// Render Cart Modal
function renderCartModal(cartData) {
    const cartTableBody = document.getElementById('cartTableBody');
    const cartGrandTotal = document.getElementById('cartGrandTotal');
    let grandTotal = 0;

    cartTableBody.innerHTML = '';
    
    if (cartData.items && cartData.items.length > 0) {
        cartData.items.forEach((item, index) => {
            if (!item.product) {
                console.error('Invalid product data:', item);
                return;
            }

            const itemTotal = item.product.price * item.quantity;
            grandTotal += itemTotal;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div class="cart-item-carousel" id="cart-carousel-${index}">
                        <div class="cart-carousel-images">
                            ${item.product.images && item.product.images.length > 0 ? 
                                item.product.images.map((image, imgIndex) => `
                                    <img src="${image}" alt="${item.product.title}" 
                                         class="cart-carousel-image" 
                                         onerror="this.src='https://plus.unsplash.com/premium_photo-1666739388590-72762edf76ac?q=80&w=1953&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'">
                                `).join('') : 
                                `<img src="https://plus.unsplash.com/premium_photo-1666739388590-72762edf76ac?q=80&w=1953&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" 
                                     alt="${item.product.title}" class="cart-carousel-image">`
                            }
                        </div>
                        ${item.product.images && item.product.images.length > 1 ? `
                            <button class="cart-carousel-button cart-carousel-prev" onclick="prevCartSlide('${index}')">❮</button>
                            <button class="cart-carousel-button cart-carousel-next" onclick="nextCartSlide('${index}')">❯</button>
                        ` : ''}
                    </div>
                    <div class="mt-2">
                        <strong>${item.product.title}</strong>
                    </div>
                </td>
                <td>$${item.product.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>$${itemTotal.toFixed(2)}</td>
            `;
            cartTableBody.appendChild(row);
        });
    } else {
        cartTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center">No items in cart</td>
            </tr>
        `;
    }

    cartGrandTotal.textContent = `$${grandTotal.toFixed(2)}`;
}

// Cart Carousel Functions
function prevCartSlide(carouselId) {
    const carousel = document.getElementById(`cart-carousel-${carouselId}`);
    const images = carousel.querySelector('.cart-carousel-images');
    const currentTransform = images.style.transform || 'translateX(0)';
    const currentPosition = parseInt(currentTransform.replace('translateX(', '').replace('px)', ''));
    const newPosition = Math.min(currentPosition + 100, 0);
    images.style.transform = `translateX(${newPosition}%)`;
}

function nextCartSlide(carouselId) {
    const carousel = document.getElementById(`cart-carousel-${carouselId}`);
    const images = carousel.querySelector('.cart-carousel-images');
    const currentTransform = images.style.transform || 'translateX(0)';
    const currentPosition = parseInt(currentTransform.replace('translateX(', '').replace('px)', ''));
    const imageCount = images.children.length;
    const maxPosition = -100 * (imageCount - 1);
    const newPosition = Math.max(currentPosition - 100, maxPosition);
    images.style.transform = `translateX(${newPosition}%)`;
}

// Render Products Table
function renderProductsTable() {
    productsTableBody.innerHTML = '';
    
    products.forEach(product => {
        const row = document.createElement('tr');
        const firstImage = product.images && product.images.length > 0 ? product.images[0] : '/images/no-image.png';
        row.innerHTML = `
            <td>
                <img src="${firstImage}" alt="${product.title}" class="product-thumbnail" 
                     style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
            </td>
            <td>${product.title}</td>
            <td>${product.category}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${product.description.substring(0, 50)}${product.description.length > 50 ? '...' : ''}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="editProduct('${product._id}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('product', '${product._id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        productsTableBody.appendChild(row);
    });
}

// Edit User
function editUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;

    currentUserId = userId;
    document.getElementById('modalTitle').textContent = 'Edit User';
    document.getElementById('userId').value = userId;
    document.getElementById('name').value = user.name;
    document.getElementById('email').value = user.email;
    document.getElementById('age').value = user.age;
    document.getElementById('phone').value = user.phone || '';
    document.getElementById('role').value = user.role;
    document.getElementById('password').required = false;
    userModal.show();
}

// Edit Product
function editProduct(productId) {
    const product = products.find(p => p._id === productId);
    if (!product) return;

    currentProductId = productId;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('productId').value = productId;
    document.getElementById('title').value = product.title;
    document.getElementById('category').value = product.category;
    document.getElementById('price').value = product.price;
    document.getElementById('description').value = product.description;
    document.getElementById('images').value = product.images.join('\n');

    // Clear previous images from carousel
    const carouselInner = document.getElementById('productImagesCarouselInner');
    carouselInner.innerHTML = '';

    // Add images to carousel
    if (product.images && product.images.length > 0) {
        product.images.forEach((image, index) => {
            const carouselItem = document.createElement('div');
            carouselItem.className = `carousel-item ${index === 0 ? 'active' : ''}`;
            carouselItem.innerHTML = `
                <img src="${image}" class="d-block w-100" alt="Product image ${index + 1}" 
                     style="max-height: 300px; object-fit: contain; background-color: #f8f9fa;">
            `;
            carouselInner.appendChild(carouselItem);
        });
    } else {
        carouselInner.innerHTML = `
            <div class="carousel-item active">
                <div class="d-flex justify-content-center align-items-center" style="height: 300px; background-color: #f8f9fa;">
                    <p class="text-muted">No images available</p>
                </div>
            </div>
        `;
    }

    productModal.show();
}

// Save User
async function saveUser() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const age = document.getElementById('age').value;
        const phone = document.getElementById('phone').value;
        const role = document.getElementById('role').value;
        const password = document.getElementById('password').value;

        // Basic validation
        if (!name || !email || !age) {
            throw new Error('Name, email, and age are required');
        }

        // Phone number validation (optional but must be valid if provided)
        if (phone && !/^\+?[1-9]\d{1,14}$/.test(phone)) {
            throw new Error('Please enter a valid phone number in international format (e.g., +1234567890)');
        }

        const formData = {
            name,
            email,
            age,
            phone,
            role
        };

        if (password) {
            formData.password = password;
        }

        const url = currentUserId ? `/users/${currentUserId}` : '/users/register';
        const method = currentUserId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save user');
        }

        userModal.hide();
        loadUsers();
        showAlert('User saved successfully', 'success');
    } catch (error) {
        showAlert('Error saving user: ' + error.message, 'danger');
    }
}

// Save Product
async function saveProduct() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const formData = {
            title: document.getElementById('title').value,
            category: document.getElementById('category').value,
            price: parseFloat(document.getElementById('price').value),
            description: document.getElementById('description').value,
            images: document.getElementById('images').value.split('\n').filter(url => url.trim())
        };

        const url = currentProductId ? `/products/${currentProductId}` : '/products';
        const method = currentProductId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save product');
        }

        productModal.hide();
        loadProducts();
        showAlert('Product saved successfully', 'success');
    } catch (error) {
        showAlert('Error saving product: ' + error.message, 'danger');
    }
}

// Confirm Delete
function confirmDelete(type, id) {
    deleteItemType.textContent = type;
    if (type === 'user') {
        currentUserId = id;
        currentProductId = null;
    } else {
        currentProductId = id;
        currentUserId = null;
    }
    deleteModal.show();
}

// Delete Item
async function deleteItem() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const id = currentUserId || currentProductId;
        const type = currentUserId ? 'user' : 'product';
        const url = `/${type}s/${id}`;

        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to delete ' + type);
        }

        deleteModal.hide();
        if (type === 'user') {
            loadUsers();
        } else {
            loadProducts();
        }
        showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully`, 'success');
    } catch (error) {
        showAlert('Error deleting item: ' + error.message, 'danger');
    }
}

// Show Alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = 'alert';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const container = document.querySelector('.main-content');
    container.insertBefore(alertDiv, container.firstChild);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// View User Orders
async function viewUserOrders(userId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch(`/orders?user=${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load user orders');
        }

        const orders = await response.json();
        if (!orders) {
            throw new Error('No orders data received');
        }

        // Store orders in global state
        window.orders = orders;
        
        renderUserOrdersModal(orders);
        userOrdersModal.show();
    } catch (error) {
        console.error('Error loading orders:', error);
        showAlert('Error loading orders: ' + error.message, 'danger');
    }
}

// Render User Orders Modal
function renderUserOrdersModal(orders) {
    const ordersTableBody = document.getElementById('userOrdersTableBody');
    ordersTableBody.innerHTML = '';
    
    if (orders && orders.length > 0) {
        orders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleDateString();
            const statusBadge = getStatusBadge(order.status);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${order._id}</td>
                <td>${order.items.length} items</td>
                <td>$${order.totalPrice.toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="viewOrderDetails('${order._id}')">
                        <i class="bi bi-eye"></i> Details
                    </button>
                </td>
            `;
            ordersTableBody.appendChild(row);
        });
    } else {
        ordersTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No orders found</td>
            </tr>
        `;
    }
}

// Get Status Badge
function getStatusBadge(status) {
    const badges = {
        pending: 'bg-warning',
        processing: 'bg-info',
        shipped: 'bg-primary',
        delivered: 'bg-success',
        cancelled: 'bg-danger'
    };
    
    return `<span class="badge ${badges[status]}">${status}</span>`;
}

// View Order Details
async function viewOrderDetails(orderId) {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const response = await fetch(`/orders/${orderId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to load order details');
        }

        const order = await response.json();
        if (!order) {
            throw new Error('No order data received');
        }

        // Store current order ID for status updates
        window.currentOrderId = order._id;

        // Set customer information with fallback for missing data
        const userName = order.user?.name || 'N/A';
        const userEmail = order.user?.email || 'N/A';
        const shippingAddress = order.shippingAddress || 'N/A';

        document.getElementById('orderCustomerInfo').innerHTML = `
            <strong>Name:</strong> ${userName}<br>
            <strong>Email:</strong> ${userEmail}<br>
            <strong>Shipping Address:</strong> ${shippingAddress}
        `;

        // Set order information
        document.getElementById('orderInfo').innerHTML = `
            <strong>Order ID:</strong> ${order._id}<br>
            <strong>Status:</strong> ${getStatusBadge(order.status)}<br>
            <strong>Payment Method:</strong> ${order.paymentMethod}<br>
            <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}
        `;

        // Set the current status in the dropdown
        document.getElementById('orderStatus').value = order.status;

        // Set order items
        const orderItemsTableBody = document.getElementById('orderItemsTableBody');
        orderItemsTableBody.innerHTML = '';
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                const row = document.createElement('tr');
                const itemTotal = item.price * item.quantity;
                const productTitle = item.product?.title || 'Product not found';
                
                row.innerHTML = `
                    <td>${productTitle}</td>
                    <td>$${item.price.toFixed(2)}</td>
                    <td>${item.quantity}</td>
                    <td>$${itemTotal.toFixed(2)}</td>
                `;
                orderItemsTableBody.appendChild(row);
            });
        } else {
            orderItemsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center">No items found</td>
                </tr>
            `;
        }

        // Set grand total
        document.getElementById('orderGrandTotal').textContent = `$${order.totalPrice.toFixed(2)}`;

        // Show modal
        orderModal.show();
    } catch (error) {
        console.error('Error loading order details:', error);
        showAlert('Error loading order details: ' + error.message, 'danger');
    }
}

// Update Order Status
async function updateOrderStatus() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const newStatus = document.getElementById('orderStatus').value;
        const orderId = window.currentOrderId;

        if (!orderId) {
            throw new Error('No order selected');
        }

        const response = await fetch(`/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update order status');
        }

        // Update the status badge in the order info
        document.getElementById('orderInfo').innerHTML = document.getElementById('orderInfo').innerHTML.replace(
            /<strong>Status:<\/strong>.*?<br>/,
            `<strong>Status:</strong> ${getStatusBadge(newStatus)}<br>`
        );

        showAlert('Order status updated successfully', 'success');
    } catch (error) {
        console.error('Error updating order status:', error);
        showAlert('Error updating order status: ' + error.message, 'danger');
    }
}

// Compose Email
function composeEmail(userId, userEmail) {
    document.getElementById('emailUserId').value = userId;
    document.getElementById('emailSubject').value = '';
    document.getElementById('emailMessage').value = '';
    emailModal.show();
}

// Send Email
async function sendEmail() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const userId = document.getElementById('emailUserId').value;
        const subject = document.getElementById('emailSubject').value;
        const message = document.getElementById('emailMessage').value;

        if (!subject || !message) {
            throw new Error('Subject and message are required');
        }

        const response = await fetch(`/users/${userId}/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ subject, message })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send email');
        }

        emailModal.hide();
        showAlert('Email sent successfully', 'success');
    } catch (error) {
        console.error('Error sending email:', error);
        showAlert('Error sending email: ' + error.message, 'danger');
    }
}

// Compose SMS
function composeSMS(userId, phoneNumber) {
    document.getElementById('smsUserId').value = userId;
    document.getElementById('smsPhoneNumber').value = phoneNumber;
    document.getElementById('smsMessage').value = '';
    document.getElementById('smsCharCount').textContent = '0';
    smsModal.show();
}

// Send SMS
async function sendSMS() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login';
            return;
        }

        const userId = document.getElementById('smsUserId').value;
        const phoneNumber = document.getElementById('smsPhoneNumber').value;
        const message = document.getElementById('smsMessage').value;

        if (!message) {
            throw new Error('Message is required');
        }

        const response = await fetch(`/users/${userId}/send-sms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ phoneNumber, message })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to send SMS');
        }

        smsModal.hide();
        showAlert('SMS sent successfully', 'success');
    } catch (error) {
        showAlert('Error sending SMS: ' + error.message, 'danger');
    }
}

// Add character counter for SMS message
document.getElementById('smsMessage').addEventListener('input', function() {
    const charCount = this.value.length;
    document.getElementById('smsCharCount').textContent = charCount;
    
    // Optional: Add warning when approaching limit
    if (charCount > 140) {
        document.getElementById('smsCharCount').classList.add('text-warning');
    } else {
        document.getElementById('smsCharCount').classList.remove('text-warning');
    }
});

// Load Analytics Data
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/admin/login.html';
            return;
        }

        console.log('Loading analytics data...');
        const response = await fetch('/orders/analytics', {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            window.location.href = '/admin/login.html';
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Analytics error:', errorData);
            throw new Error(errorData.message || 'Failed to load analytics');
        }

        const data = await response.json();
        console.log('Analytics data received:', data);

        // Check if we have data to display
        if (!data || (!data.topProducts && !data.categorySales && !data.monthlySales)) {
            console.warn('No analytics data available');
            throw new Error('No analytics data available');
        }

        // Update top products chart
        const topProductsCtx = document.getElementById('topProductsChart');
        if (!topProductsCtx) {
            throw new Error('Top products chart element not found');
        }

        // Destroy existing chart if it exists
        if (topProductsChart instanceof Chart) {
            topProductsChart.destroy();
        }

        topProductsChart = new Chart(topProductsCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: data.topProducts.map(p => p.title),
                datasets: [{
                    label: 'Units Sold',
                    data: data.topProducts.map(p => p.quantity),
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });

        // Update category sales chart
        const categorySalesCtx = document.getElementById('categorySalesChart');
        if (!categorySalesCtx) {
            throw new Error('Category sales chart element not found');
        }

        // Destroy existing chart if it exists
        if (categorySalesChart instanceof Chart) {
            categorySalesChart.destroy();
        }

        categorySalesChart = new Chart(categorySalesCtx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: data.categorySales.map(c => c.category),
                datasets: [{
                    data: data.categorySales.map(c => c.total),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.5)',
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)',
                        'rgba(153, 102, 255, 0.5)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        // Update monthly sales chart
        const monthlySalesCtx = document.getElementById('monthlySalesChart');
        if (!monthlySalesCtx) {
            throw new Error('Monthly sales chart element not found');
        }

        // Destroy existing chart if it exists
        if (monthlySalesChart instanceof Chart) {
            monthlySalesChart.destroy();
        }

        monthlySalesChart = new Chart(monthlySalesCtx.getContext('2d'), {
            type: 'line',
            data: {
                labels: data.monthlySales.map(m => m.month),
                datasets: [{
                    label: 'Sales ($)',
                    data: data.monthlySales.map(m => m.total),
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value;
                            }
                        }
                    }
                }
            }
        });

        console.log('Analytics charts updated successfully');
    } catch (error) {
        console.error('Error loading analytics:', error);
        showAlert(error.message || 'Failed to load analytics. Please try again.', 'danger');
    }
}

// Render Analytics Charts
function renderAnalyticsCharts(data) {
    // Destroy existing charts if they exist
    if (topProductsChart) topProductsChart.destroy();
    if (categorySalesChart) categorySalesChart.destroy();
    if (monthlySalesChart) monthlySalesChart.destroy();

    // Top Products Chart
    const topProductsCtx = document.getElementById('topProductsChart').getContext('2d');
    topProductsChart = new Chart(topProductsCtx, {
        type: 'bar',
        data: {
            labels: data.topProducts.map(p => p.title),
            datasets: [{
                label: 'Units Sold',
                data: data.topProducts.map(p => p.quantity),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Units Sold'
                    }
                }
            }
        }
    });

    // Category Sales Chart
    const categorySalesCtx = document.getElementById('categorySalesChart').getContext('2d');
    categorySalesChart = new Chart(categorySalesCtx, {
        type: 'doughnut',
        data: {
            labels: data.categorySales.map(c => c.category),
            datasets: [{
                data: data.categorySales.map(c => c.total),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });

    // Monthly Sales Chart
    const monthlySalesCtx = document.getElementById('monthlySalesChart').getContext('2d');
    monthlySalesChart = new Chart(monthlySalesCtx, {
        type: 'line',
        data: {
            labels: data.monthlySales.map(m => m.month),
            datasets: [{
                label: 'Sales ($)',
                data: data.monthlySales.map(m => m.total),
                fill: false,
                borderColor: 'rgba(75, 192, 192, 1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Sales ($)'
                    }
                }
            }
        }
    });
}