// Catalogo base da loja exibido para todos os visitantes.
const defaultProducts = [];

const whatsappNumber = "5527997934983";
const adminCredentials = { username: "admin@essencesam.com", password: "essence2026" };
const storageKeys = {
    products: "essenceSamCustomProducts",
    auth: "essenceSamAdminAuthenticated",
    authToken: "essenceSamAdminToken",
    catalogState: "essenceSamCatalogState",
    catalogReset: "essenceSamCatalogResetV1",
    favorites: "essenceSamFavorites",
    cart: "essenceSamCart",
    guestSession: "essenceSamGuestSession"
};

const productGrid = document.getElementById("productGrid");
const toast = document.getElementById("toast");
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const loginCloseButton = document.getElementById("loginCloseButton");
const closeLoginModal = document.getElementById("closeLoginModal");
const openAdminAccess = document.getElementById("openAdminAccess");
const openAdminPanel = document.getElementById("openAdminPanel");
const adminPanel = document.getElementById("adminPanel");
const logoutAdmin = document.getElementById("logoutAdmin");
const productForm = document.getElementById("productForm");
const adminProductList = document.getElementById("adminProductList");
const categoryFilters = document.getElementById("categoryFilters");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");
const favoritesCount = document.getElementById("favoritesCount");
const cartCount = document.getElementById("cartCount");
const productFormTitle = document.getElementById("productFormTitle");
const productFormDescription = document.getElementById("productFormDescription");
const editingProductId = document.getElementById("editingProductId");
const cancelEditButton = document.getElementById("cancelEditButton");
const productSubmitButton = document.getElementById("productSubmitButton");
const imageViewer = document.getElementById("imageViewer");
const closeImageViewer = document.getElementById("closeImageViewer");
const closeImageViewerButton = document.getElementById("closeImageViewerButton");
const imageViewerTitle = document.getElementById("imageViewerTitle");
const imageViewerImage = document.getElementById("imageViewerImage");
const imageViewerFrame = imageViewer.querySelector(".image-viewer-frame");
const openCartButton = document.getElementById("openCartButton");
const cartFabCount = document.getElementById("cartFabCount");
const cartDrawer = document.getElementById("cartDrawer");
const closeCartDrawer = document.getElementById("closeCartDrawer");
const closeCartButton = document.getElementById("closeCartButton");
const clearCartButton = document.getElementById("clearCartButton");
const cartItems = document.getElementById("cartItems");
const cartSummaryText = document.getElementById("cartSummaryText");
const cartSummaryTotal = document.getElementById("cartSummaryTotal");
const cartWhatsappButton = document.getElementById("cartWhatsappButton");
const cartCustomerName = document.getElementById("cartCustomerName");
const cartCustomerPhone = document.getElementById("cartCustomerPhone");
const cartCustomerNotes = document.getElementById("cartCustomerNotes");
const adminOrdersSection = document.getElementById("adminOrdersSection");
const adminOrdersList = document.getElementById("adminOrdersList");
const zoomOutButton = document.getElementById("zoomOutButton");
const zoomInButton = document.getElementById("zoomInButton");
const zoomValue = document.getElementById("zoomValue");

let toastTimer;
let revealObserver;
let customProducts = loadCustomProducts();
let isAdminAuthenticated = loadAdminSession();
let adminAuthToken = loadAdminToken();
let catalogState = loadCatalogState();
let favoriteIds = loadFavorites();
let cartItemsState = loadCart();
let guestSessionId = loadGuestSessionId();
let activeCategory = catalogState.category;
let searchTerm = catalogState.search;
let sortMode = catalogState.sort;
let currentZoom = 1;
let translateX = 0;
let translateY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let initialDistance = null;
let initialZoom = 1;
let apiBaseUrl = "";
let persistenceMode = "local";
let remoteProducts = [];
let adminOrders = [];

function resetInitialCatalogState() {
    if (window.localStorage.getItem(storageKeys.catalogReset) === "true") {
        return;
    }

    customProducts = [];
    favoriteIds = [];
    cartItemsState = [];
    window.localStorage.removeItem(storageKeys.products);
    window.localStorage.removeItem(storageKeys.favorites);
    window.localStorage.removeItem(storageKeys.cart);
    window.localStorage.setItem(storageKeys.catalogReset, "true");
}

function createId(prefix = "custom") {
    if (window.crypto?.randomUUID) {
        return `${prefix}-${window.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
}

function normalizeProduct(product, index = 0) {
    return {
        id: product.id || `${createId("custom")}-${index}`,
        name: String(product.name || "").trim(),
        category: String(product.category || "Outros").trim(),
        price: Number(product.price || 0),
        description: String(product.description || "").trim(),
        image: String(product.image || "").trim(),
        is_active: product.is_active !== false
    };
}

// Le os produtos extras gravados no navegador.
function loadCustomProducts() {
    try {
        const savedProducts = JSON.parse(window.localStorage.getItem(storageKeys.products) || "[]");
        return Array.isArray(savedProducts) ? savedProducts.map(normalizeProduct) : [];
    } catch {
        return [];
    }
}

function loadAdminSession() {
    return window.localStorage.getItem(storageKeys.auth) === "true";
}

function loadAdminToken() {
    return window.localStorage.getItem(storageKeys.authToken) || "";
}

function loadCatalogState() {
    try {
        const savedState = JSON.parse(window.localStorage.getItem(storageKeys.catalogState) || "{}");
        return {
            category: typeof savedState.category === "string" ? savedState.category : "Todos",
            search: typeof savedState.search === "string" ? savedState.search : "",
            sort: typeof savedState.sort === "string" ? savedState.sort : "featured"
        };
    } catch {
        return { category: "Todos", search: "", sort: "featured" };
    }
}

function loadFavorites() {
    try {
        const savedFavorites = JSON.parse(window.localStorage.getItem(storageKeys.favorites) || "[]");
        return Array.isArray(savedFavorites) ? savedFavorites : [];
    } catch {
        return [];
    }
}

function loadCart() {
    try {
        const savedCart = JSON.parse(window.localStorage.getItem(storageKeys.cart) || "[]");
        return Array.isArray(savedCart) ? savedCart : [];
    } catch {
        return [];
    }
}

function loadGuestSessionId() {
    const savedSessionId = window.localStorage.getItem(storageKeys.guestSession);
    if (savedSessionId) {
        return savedSessionId;
    }

    const generatedId = createId("guest");
    window.localStorage.setItem(storageKeys.guestSession, generatedId);
    return generatedId;
}

function saveCustomProducts() {
    window.localStorage.setItem(storageKeys.products, JSON.stringify(customProducts));
}

function saveAdminSession() {
    window.localStorage.setItem(storageKeys.auth, String(isAdminAuthenticated));
}

function saveAdminToken() {
    if (adminAuthToken) {
        window.localStorage.setItem(storageKeys.authToken, adminAuthToken);
        return;
    }

    window.localStorage.removeItem(storageKeys.authToken);
}

function saveCatalogState() {
    window.localStorage.setItem(storageKeys.catalogState, JSON.stringify({
        category: activeCategory,
        search: searchTerm,
        sort: sortMode
    }));
}

function saveFavorites() {
    window.localStorage.setItem(storageKeys.favorites, JSON.stringify(favoriteIds));
    if (isRemotePersistenceEnabled()) {
        void persistRemoteFavorites();
    }
}

function saveCart() {
    window.localStorage.setItem(storageKeys.cart, JSON.stringify(cartItemsState));
    if (isRemotePersistenceEnabled()) {
        void persistRemoteCart();
    }
}

function getAllProducts() {
    if (isRemotePersistenceEnabled()) {
        return remoteProducts.map(normalizeProduct);
    }

    return [...defaultProducts, ...customProducts].map(normalizeProduct);
}

function getEditableProducts() {
    return isRemotePersistenceEnabled() ? getAllProducts() : customProducts;
}

function isRemotePersistenceEnabled() {
    return persistenceMode === "api" && Boolean(apiBaseUrl);
}

function hasApiConfiguration() {
    const config = window.ESSENCE_SAM_API;

    return Boolean(
        config
        && config.enabled
        && typeof config.baseUrl === "string"
        && config.baseUrl.trim()
    );
}

async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    if (adminAuthToken) {
        headers.set("Authorization", `Bearer ${adminAuthToken}`);
    }

    const response = await window.fetch(`${apiBaseUrl}${path}`, {
        ...options,
        headers
    });

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(data?.message || "Falha na comunicação com a API.");
    }

    return data;
}

async function initializePersistence() {
    if (!hasApiConfiguration()) {
        persistenceMode = "local";
        return;
    }

    apiBaseUrl = window.ESSENCE_SAM_API.baseUrl.replace(/\/$/, "");

    try {
        await apiRequest("/health", { method: "GET" });
        persistenceMode = "api";
        isAdminAuthenticated = Boolean(adminAuthToken);
        saveAdminSession();
        await synchronizeRemoteCatalog();
        await synchronizeRemoteCustomerData();
    } catch (error) {
        console.error("Falha ao conectar com a API:", error);
        apiBaseUrl = "";
        persistenceMode = "local";
        isAdminAuthenticated = false;
        adminAuthToken = "";
        saveAdminSession();
        saveAdminToken();
    }
}

async function synchronizeRemoteCatalog() {
    if (!isRemotePersistenceEnabled()) {
        return;
    }

    remoteProducts = await fetchRemoteProducts();

    if (!remoteProducts.length) {
        await upsertRemoteProducts([...defaultProducts, ...customProducts]);
        remoteProducts = await fetchRemoteProducts();
        customProducts = [];
        window.localStorage.removeItem(storageKeys.products);
        return;
    }

    if (customProducts.length) {
        await upsertRemoteProducts(customProducts);
        remoteProducts = await fetchRemoteProducts();
        customProducts = [];
        window.localStorage.removeItem(storageKeys.products);
    }
}

async function synchronizeRemoteCustomerData() {
    if (!isRemotePersistenceEnabled()) {
        return;
    }

    const [remoteFavorites, remoteCart] = await Promise.all([
        fetchRemoteFavorites(),
        fetchRemoteCart()
    ]);

    if (remoteFavorites.length) {
        favoriteIds = remoteFavorites;
        saveFavorites();
    } else if (favoriteIds.length) {
        await persistRemoteFavorites();
    }

    if (remoteCart.length) {
        cartItemsState = remoteCart;
        window.localStorage.setItem(storageKeys.cart, JSON.stringify(cartItemsState));
    } else if (cartItemsState.length) {
        await persistRemoteCart();
    }
}

async function fetchRemoteProducts() {
    const data = await apiRequest("/products", { method: "GET" });
    return Array.isArray(data) ? data.map(normalizeProduct) : [];
}

async function upsertRemoteProducts(products) {
    for (const product of products) {
        const normalizedProduct = normalizeProduct(product);
        const method = normalizedProduct.id && remoteProducts.some((item) => item.id === normalizedProduct.id) ? "PUT" : "POST";
        const path = method === "PUT" ? `/products/${normalizedProduct.id}` : "/products";
        await apiRequest(path, {
            method,
            body: JSON.stringify(normalizedProduct)
        });
    }
}

async function deleteRemoteProduct(productId) {
    await apiRequest(`/products/${productId}`, { method: "DELETE" });
}

async function fetchRemoteFavorites() {
    const data = await apiRequest(`/customer/${guestSessionId}/favorites`, { method: "GET" });
    return Array.isArray(data) ? data : [];
}

async function persistRemoteFavorites() {
    if (!isRemotePersistenceEnabled()) {
        return;
    }

    try {
        await apiRequest(`/customer/${guestSessionId}/favorites`, {
            method: "PUT",
            body: JSON.stringify({ productIds: favoriteIds })
        });
    } catch (error) {
        console.error("Falha ao salvar favoritos remotos:", error);
    }
}

async function fetchRemoteCart() {
    const data = await apiRequest(`/customer/${guestSessionId}/cart`, { method: "GET" });
    return Array.isArray(data) ? data.filter((item) => Number(item.quantity || 0) > 0) : [];
}

async function fetchAdminOrders() {
    const data = await apiRequest("/orders", { method: "GET" });
    return Array.isArray(data) ? data : [];
}

async function updateRemoteOrderStatus(orderId, status) {
    return apiRequest(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
    });
}

async function createRemoteOrder(orderPayload) {
    return apiRequest("/orders", {
        method: "POST",
        body: JSON.stringify(orderPayload)
    });
}

async function persistRemoteCart() {
    if (!isRemotePersistenceEnabled()) {
        return;
    }

    try {
        await apiRequest(`/customer/${guestSessionId}/cart`, {
            method: "PUT",
            body: JSON.stringify({ items: cartItemsState })
        });
    } catch (error) {
        console.error("Falha ao salvar carrinho remoto:", error);
    }
}

function formatPrice(price) {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(price);
}

function groupProductsByCategory(products) {
    return products.reduce((groups, product) => {
        const category = product.category || "Outros";
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(product);
        return groups;
    }, {});
}

function sortProducts(products) {
    const sortable = [...products];

    if (sortMode === "price-asc") {
        return sortable.sort((first, second) => first.price - second.price);
    }

    if (sortMode === "price-desc") {
        return sortable.sort((first, second) => second.price - first.price);
    }

    if (sortMode === "name-asc") {
        return sortable.sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));
    }

    return sortable;
}

function isFavorite(productId) {
    return favoriteIds.includes(productId);
}

function getCartCountValue() {
    return cartItemsState.reduce((total, item) => total + item.quantity, 0);
}

function getCartDetailedItems() {
    return cartItemsState.map((item) => {
        const product = getAllProducts().find((entry) => entry.id === item.productId);
        return product ? { ...product, quantity: item.quantity } : null;
    }).filter(Boolean);
}

function getCartTotal() {
    return getCartDetailedItems().reduce((total, item) => total + (item.price * item.quantity), 0);
}

function updateWishlistAndCartStatus() {
    favoritesCount.textContent = `${favoriteIds.length} ${favoriteIds.length === 1 ? "favorito" : "favoritos"}`;
    const cartCountValue = getCartCountValue();
    cartCount.textContent = `${cartCountValue} ${cartCountValue === 1 ? "no carrinho" : "no carrinho"}`;
    cartFabCount.textContent = String(cartCountValue);
}

function buildCartWhatsappUrl() {
    const items = getCartDetailedItems();
    const messageLines = ["Olá! Tenho interesse nestes produtos da Essence Sam:", ""];

    items.forEach((item) => {
        messageLines.push(`- ${item.name} | ${item.quantity}x | ${formatPrice(item.price)}`);
    });

    messageLines.push("");
    messageLines.push(`Total estimado: ${formatPrice(getCartTotal())}`);

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageLines.join("\n"))}`;
}

function buildOrderWhatsappUrl(orderId, items, customer) {
    const messageLines = ["Olá! Quero finalizar este pedido da Essence Sam:", ""];

    if (orderId) {
        messageLines.push(`Pedido: #${orderId}`);
    }

    if (customer.name) {
        messageLines.push(`Cliente: ${customer.name}`);
    }

    if (customer.phone) {
        messageLines.push(`WhatsApp: ${customer.phone}`);
    }

    messageLines.push("");

    items.forEach((item) => {
        messageLines.push(`- ${item.name} | ${item.quantity}x | ${formatPrice(item.price)}`);
    });

    if (customer.notes) {
        messageLines.push("");
        messageLines.push(`Observações: ${customer.notes}`);
    }

    messageLines.push("");
    messageLines.push(`Total estimado: ${formatPrice(items.reduce((total, item) => total + (item.price * item.quantity), 0))}`);

    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(messageLines.join("\n"))}`;
}

function renderCart() {
    const items = getCartDetailedItems();
    const count = getCartCountValue();
    cartSummaryText.textContent = `${count} ${count === 1 ? "item selecionado" : "itens selecionados"}`;
    cartSummaryTotal.textContent = formatPrice(getCartTotal());

    if (!items.length) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <p>Seu carrinho está vazio. Adicione produtos para acompanhar suas escolhas e enviar tudo junto no WhatsApp.</p>
            </div>
        `;
        cartWhatsappButton.setAttribute("href", `https://wa.me/${whatsappNumber}?text=Olá!%20Quero%20conhecer%20mais%20produtos%20da%20Essence%20Sam`);
        updateWishlistAndCartStatus();
        return;
    }

    cartItems.innerHTML = items.map((item) => `
        <article class="cart-item">
            <img src="${item.image}" alt="${item.name}">
            <div>
                <h4>${item.name}</h4>
                <div class="cart-item-meta">
                    <span>${item.quantity}x ${formatPrice(item.price)}</span>
                    <strong>${formatPrice(item.price * item.quantity)}</strong>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-button" type="button" data-cart-action="decrease" data-product-id="${item.id}">-</button>
                    <span>${item.quantity}</span>
                    <button class="qty-button" type="button" data-cart-action="increase" data-product-id="${item.id}">+</button>
                    <button class="remove-cart-button" type="button" data-cart-action="remove" data-product-id="${item.id}">Remover</button>
                </div>
            </div>
        </article>
    `).join("");

    cartItems.querySelectorAll("[data-cart-action]").forEach((button) => {
        button.addEventListener("click", () => {
            updateCartItem(button.dataset.productId, button.dataset.cartAction);
        });
    });

    cartWhatsappButton.setAttribute("href", buildCartWhatsappUrl());
    updateWishlistAndCartStatus();
}

function renderAdminOrders() {
    if (!isAdminAuthenticated) {
        adminOrdersSection.classList.add("hidden");
        return;
    }

    adminOrdersSection.classList.remove("hidden");

    if (!adminOrders.length) {
        adminOrdersList.innerHTML = `
            <div class="order-empty">
                <p>Nenhum pedido registrado ainda. Quando clientes enviarem o carrinho pelo WhatsApp, os pedidos aparecerão aqui.</p>
            </div>
        `;
        return;
    }

    adminOrdersList.innerHTML = adminOrders.map((order) => `
        <article class="order-card">
            <div class="order-card-header">
                <div class="order-card-title">
                    <h3>Pedido #${order.id}</h3>
                    <p>${order.customerName || "Cliente não identificado"}</p>
                </div>
                <select class="order-status-select" data-order-id="${order.id}">
                    <option value="pending" ${order.status === "pending" ? "selected" : ""}>Pendente</option>
                    <option value="whatsapp-contacted" ${order.status === "whatsapp-contacted" ? "selected" : ""}>WhatsApp iniciado</option>
                    <option value="confirmed" ${order.status === "confirmed" ? "selected" : ""}>Confirmado</option>
                    <option value="delivered" ${order.status === "delivered" ? "selected" : ""}>Entregue</option>
                    <option value="canceled" ${order.status === "canceled" ? "selected" : ""}>Cancelado</option>
                </select>
            </div>
            <div class="order-meta">
                <span>Total ${formatPrice(order.total)}</span>
                <span>${new Date(order.createdAt).toLocaleString("pt-BR")}</span>
                <span>${order.customerPhone || "Sem WhatsApp informado"}</span>
            </div>
            <ul class="order-item-list">
                ${order.items.map((item) => `<li>${item.productName} | ${item.quantity}x | ${formatPrice(item.unitPrice)}</li>`).join("")}
            </ul>
            ${order.notes ? `<p class="order-notes">Observações: ${order.notes}</p>` : ""}
        </article>
    `).join("");

    adminOrdersList.querySelectorAll("[data-order-id]").forEach((select) => {
        select.addEventListener("change", async () => {
            try {
                await updateRemoteOrderStatus(select.dataset.orderId, select.value);
                adminOrders = adminOrders.map((order) => (
                    String(order.id) === String(select.dataset.orderId)
                        ? { ...order, status: select.value }
                        : order
                ));
                showToast("Status do pedido atualizado.");
            } catch (error) {
                console.error("Falha ao atualizar status do pedido:", error);
                showToast("Não foi possível atualizar o status agora.");
                renderAdminOrders();
            }
        });
    });
}

async function refreshAdminOrders() {
    if (!isRemotePersistenceEnabled() || !isAdminAuthenticated) {
        adminOrders = [];
        renderAdminOrders();
        return;
    }

    try {
        adminOrders = await fetchAdminOrders();
        renderAdminOrders();
    } catch (error) {
        console.error("Falha ao carregar pedidos:", error);
        adminOrders = [];
        renderAdminOrders();
    }
}

async function handleCartCheckout(event) {
    event.preventDefault();

    const items = getCartDetailedItems();
    if (!items.length) {
        showToast("Adicione produtos ao carrinho antes de enviar.");
        return;
    }

    const customer = {
        name: cartCustomerName.value.trim(),
        phone: cartCustomerPhone.value.trim(),
        notes: cartCustomerNotes.value.trim()
    };

    const orderPayload = {
        sessionId: guestSessionId,
        customerName: customer.name,
        customerPhone: customer.phone,
        notes: customer.notes,
        items: items.map((item) => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            unitPrice: item.price
        }))
    };

    let createdOrderId = null;

    if (isRemotePersistenceEnabled()) {
        try {
            const createdOrder = await createRemoteOrder(orderPayload);
            createdOrderId = createdOrder?.id || null;
            if (isAdminAuthenticated) {
                await refreshAdminOrders();
            }
        } catch (error) {
            console.error("Falha ao registrar pedido:", error);
            showToast("O pedido não foi salvo no sistema, mas o WhatsApp será aberto.");
        }
    }

    const whatsappUrl = buildOrderWhatsappUrl(createdOrderId, items, customer);

    cartItemsState = [];
    saveCart();
    renderCart();
    closeCartDrawerPanel();
    showToast(createdOrderId ? `Pedido #${createdOrderId} enviado para atendimento.` : "Carrinho enviado para atendimento.");

    window.open(whatsappUrl, "_blank", "noopener");
}

function toggleFavorite(productId) {
    if (isFavorite(productId)) {
        favoriteIds = favoriteIds.filter((id) => id !== productId);
        showToast("Produto removido dos favoritos.");
    } else {
        favoriteIds.unshift(productId);
        showToast("Produto salvo nos favoritos.");
    }

    saveFavorites();
    renderProducts();
    updateWishlistAndCartStatus();
}

function addToCart(productId) {
    const existingItem = cartItemsState.find((item) => item.productId === productId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cartItemsState.unshift({ productId, quantity: 1 });
    }

    saveCart();
    renderCart();
    showToast("Produto adicionado ao carrinho.");
}

function updateCartItem(productId, action) {
    const item = cartItemsState.find((entry) => entry.productId === productId);
    if (!item) {
        return;
    }

    if (action === "increase") {
        item.quantity += 1;
    }

    if (action === "decrease") {
        item.quantity -= 1;
    }

    if (action === "remove" || item.quantity <= 0) {
        cartItemsState = cartItemsState.filter((entry) => entry.productId !== productId);
    }

    saveCart();
    renderCart();
}

function openCartDrawerPanel() {
    cartDrawer.classList.remove("hidden");
    cartDrawer.setAttribute("aria-hidden", "false");
}

function closeCartDrawerPanel() {
    cartDrawer.classList.add("hidden");
    cartDrawer.setAttribute("aria-hidden", "true");
}

function openImageModal(product) {
    currentZoom = 1;
    translateX = 0;
    translateY = 0;
    imageViewerTitle.textContent = product.name;
    imageViewerImage.src = product.image;
    imageViewerImage.alt = product.name;
    applyZoom();
    imageViewer.classList.remove("hidden");
    imageViewer.setAttribute("aria-hidden", "false");
}

function closeImageModal() {
    imageViewer.classList.add("hidden");
    imageViewer.setAttribute("aria-hidden", "true");
    imageViewerImage.src = "";
    imageViewerFrame.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

function applyZoom() {
    imageViewerImage.style.transform = `translate(${translateX}px, ${translateY}px) scale(${currentZoom})`;
    zoomValue.textContent = `${Math.round(currentZoom * 100)}%`;
}

function updateZoom(delta) {
    currentZoom = Math.min(3, Math.max(1, currentZoom + delta));
    if (currentZoom === 1) {
        translateX = 0;
        translateY = 0;
    }
    applyZoom();
}

function getDistance(touchA, touchB) {
    return Math.hypot(touchB.clientX - touchA.clientX, touchB.clientY - touchA.clientY);
}

function renderCategoryFilters() {
    const categories = ["Todos", ...Object.keys(groupProductsByCategory(getAllProducts()))];
    categoryFilters.innerHTML = "";

    categories.forEach((category) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `filter-chip${category === activeCategory ? " is-active" : ""}`;
        button.textContent = category;
        button.addEventListener("click", () => {
            activeCategory = category;
            saveCatalogState();
            renderCategoryFilters();
            renderProducts();
        });
        categoryFilters.appendChild(button);
    });
}

// Monta cada card e conecta as acoes de visualizacao e compra.
function createProductCard(product) {
    const card = document.createElement("article");
    card.className = "product-card reveal";

    card.innerHTML = `
        <div class="image-wrap">
            <img src="${product.image}" alt="${product.name}" loading="lazy">
            <span class="product-tag">Essence Sam</span>
            <button class="favorite-button${isFavorite(product.id) ? " is-active" : ""}" type="button" aria-label="Favoritar produto">❤</button>
            <button class="image-view-button" type="button">Ampliar</button>
        </div>
        <div class="product-body">
            <div class="product-meta">
                <span class="product-chip">${product.category}</span>
                <strong class="product-price">${formatPrice(product.price)}</strong>
            </div>
            <div>
                <h3>${product.name}</h3>
                <p class="product-description">${product.description}</p>
            </div>
            <div class="card-actions">
                <button class="buy-button" type="button">Comprar</button>
                <button class="add-cart-button" type="button">Adicionar ao carrinho</button>
            </div>
        </div>
    `;

    const buyButton = card.querySelector(".buy-button");
    const addCartButton = card.querySelector(".add-cart-button");
    const imageWrap = card.querySelector(".image-wrap");
    const imageViewButton = card.querySelector(".image-view-button");
    const favoriteButton = card.querySelector(".favorite-button");

    buyButton.addEventListener("click", () => handleBuy(product.name));
    addCartButton.addEventListener("click", () => addToCart(product.id));
    imageWrap.addEventListener("click", () => openImageModal(product));
    imageViewButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openImageModal(product);
    });
    favoriteButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleFavorite(product.id);
    });

    return card;
}

function createCategorySection(categoryName, products) {
    const section = document.createElement("section");
    section.className = "category-section reveal";

    const header = document.createElement("div");
    header.className = "category-header";
    header.innerHTML = `
        <h3>${categoryName}</h3>
        <span class="category-count">${products.length} ${products.length === 1 ? "produto" : "produtos"}</span>
    `;

    const grid = document.createElement("div");
    grid.className = "product-grid";

    products.forEach((product) => {
        grid.appendChild(createProductCard(product));
    });

    section.append(header, grid);
    return section;
}

// Renderiza a vitrine separada por categorias.
function renderProducts() {
    const allProducts = getAllProducts();
    const filteredByCategory = activeCategory === "Todos"
        ? allProducts
        : allProducts.filter((product) => product.category === activeCategory);
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("pt-BR");
    const visibleProducts = normalizedSearch
        ? filteredByCategory.filter((product) => product.name.toLocaleLowerCase("pt-BR").includes(normalizedSearch))
        : filteredByCategory;
    const grouped = groupProductsByCategory(sortProducts(visibleProducts));

    productGrid.innerHTML = "";

    Object.entries(grouped).forEach(([category, products]) => {
        productGrid.appendChild(createCategorySection(category, products));
    });

    if (!Object.keys(grouped).length) {
        productGrid.innerHTML = `
            <section class="category-section reveal">
                <div class="category-header">
                    <h3>Catálogo em atualização</h3>
                    <span class="category-count">0 produtos</span>
                </div>
                <p class="product-description">Os produtos da Essence Sam aparecerão aqui assim que a administradora cadastrar as primeiras peças na vitrine.</p>
            </section>
        `;
    }

    activateReveal(productGrid.querySelectorAll(".reveal"));
}

function createAdminListCard(product) {
    return `
        <article class="admin-list-card">
            <img class="admin-list-image" src="${product.image}" alt="${product.name}">
            <div>
                <div class="admin-list-meta">
                    <span>${product.category}</span>
                    <span>${formatPrice(product.price)}</span>
                </div>
                <h4>${product.name}</h4>
                <p>${product.description}</p>
            </div>
            <div class="admin-card-actions">
                <button class="edit-button" type="button" data-edit-id="${product.id}">Editar</button>
                <button class="danger-button" type="button" data-remove-id="${product.id}">Remover</button>
            </div>
        </article>
    `;
}

function renderAdminProducts() {
    const products = getEditableProducts();

    if (!products.length) {
        adminProductList.innerHTML = `
            <div class="admin-list-empty">
                <p>Nenhum produto cadastrado ainda. Os novos itens adicionados aqui aparecem automaticamente no catálogo.</p>
            </div>
        `;
        return;
    }

    adminProductList.innerHTML = products.map(createAdminListCard).join("");
    adminProductList.querySelectorAll("[data-remove-id]").forEach((button) => {
        button.addEventListener("click", () => removeProduct(button.dataset.removeId));
    });
    adminProductList.querySelectorAll("[data-edit-id]").forEach((button) => {
        button.addEventListener("click", () => startEditingProduct(button.dataset.editId));
    });
}

function resetProductForm() {
    productForm.reset();
    editingProductId.value = "";
    productFormTitle.textContent = "Novo produto";
    productFormDescription.textContent = "Preencha os dados abaixo para publicar um novo item no catálogo.";
    productSubmitButton.textContent = "Cadastrar produto";
    cancelEditButton.classList.add("hidden");
}

function startEditingProduct(productId) {
    const product = getEditableProducts().find((item) => item.id === productId);
    if (!product) {
        return;
    }

    editingProductId.value = product.id;
    productFormTitle.textContent = "Editar produto";
    productFormDescription.textContent = "Atualize os dados abaixo e salve as alterações no catálogo.";
    productSubmitButton.textContent = "Salvar alterações";
    cancelEditButton.classList.remove("hidden");

    document.getElementById("productName").value = product.name;
    document.getElementById("productCategory").value = product.category;
    document.getElementById("productPrice").value = product.price;
    document.getElementById("productDescription").value = product.description;
    document.getElementById("productImage").value = product.image;

    productForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 2200);
}

function handleBuy(productName) {
    const message = `Olá! Tenho interesse no produto ${productName} da Essence Sam`;
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    showToast("Redirecionando para o WhatsApp...");

    window.setTimeout(() => {
        window.open(whatsappUrl, "_blank", "noopener");
    }, 450);
}

function openLogin() {
    loginModal.classList.remove("hidden");
    loginModal.setAttribute("aria-hidden", "false");
}

function closeLogin() {
    loginModal.classList.add("hidden");
    loginModal.setAttribute("aria-hidden", "true");
    loginForm.reset();
}

function updateAdminUI() {
    adminPanel.classList.toggle("hidden", !isAdminAuthenticated);
    openAdminPanel.textContent = isAdminAuthenticated ? "Abrir painel da administradora" : "Entrar como administradora";
    renderAdminProducts();
    renderAdminOrders();
}

async function handleAdminLogin(event) {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const username = String(formData.get("adminUser") || "").trim();
    const password = String(formData.get("adminPassword") || "").trim();

    if (isRemotePersistenceEnabled()) {
        try {
            const data = await apiRequest("/auth/login", {
                method: "POST",
                body: JSON.stringify({ email: username, password })
            });

            adminAuthToken = String(data?.token || "");
            saveAdminToken();
            isAdminAuthenticated = Boolean(adminAuthToken);
            saveAdminSession();
            await synchronizeRemoteCatalog();
            renderCategoryFilters();
            renderProducts();
            updateAdminUI();
            await refreshAdminOrders();
            closeLogin();
            showToast("Login realizado com sucesso.");
            adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        } catch (_error) {
            showToast("E-mail ou senha inválidos.");
            return;
        }
    }

    if (username === adminCredentials.username && password === adminCredentials.password) {
        isAdminAuthenticated = true;
        saveAdminSession();
        updateAdminUI();
        closeLogin();
        showToast("Login realizado com sucesso.");
        adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
    }

    showToast("E-mail ou senha inválidos.");
}

async function handleLogout() {
    if (isRemotePersistenceEnabled()) {
        adminAuthToken = "";
        saveAdminToken();
    }

    isAdminAuthenticated = false;
    adminOrders = [];
    saveAdminSession();
    updateAdminUI();
    showToast("Sessão administrativa encerrada.");
}

async function handleProductSubmit(event) {
    event.preventDefault();
    const formData = new FormData(productForm);
    const productId = String(formData.get("editingProductId") || "").trim();

    const product = normalizeProduct({
        id: productId || createId("custom"),
        name: formData.get("productName"),
        category: formData.get("productCategory"),
        price: formData.get("productPrice"),
        description: formData.get("productDescription"),
        image: formData.get("productImage")
    });

    if (!product.name || !product.category || !product.description || !product.image || product.price <= 0) {
        showToast("Preencha nome, categoria, preço, descrição e imagem corretamente.");
        return;
    }

    if (isRemotePersistenceEnabled()) {
        try {
            await upsertRemoteProducts([product]);
            remoteProducts = await fetchRemoteProducts();
            renderCategoryFilters();
            renderProducts();
            renderAdminProducts();
            renderCart();
            resetProductForm();
            showToast(productId ? "Produto atualizado com sucesso." : "Produto cadastrado com sucesso.");
        } catch (error) {
            console.error("Falha ao salvar produto na API:", error);
            showToast("Não foi possível salvar o produto agora.");
        }
        return;
    }

    if (productId) {
        customProducts = customProducts.map((item) => (item.id === productId ? product : item));
        showToast("Produto atualizado com sucesso.");
    } else {
        customProducts.unshift(product);
        showToast("Produto cadastrado com sucesso.");
    }

    saveCustomProducts();
    renderCategoryFilters();
    renderProducts();
    renderAdminProducts();
    resetProductForm();
}

async function removeProduct(productId) {
    if (isRemotePersistenceEnabled()) {
        try {
            await deleteRemoteProduct(productId);
            remoteProducts = await fetchRemoteProducts();
        } catch (error) {
            console.error("Falha ao remover produto na API:", error);
            showToast("Não foi possível remover o produto agora.");
            return;
        }
    } else {
        customProducts = customProducts.filter((product) => product.id !== productId);
        saveCustomProducts();
    }

    favoriteIds = favoriteIds.filter((id) => id !== productId);
    cartItemsState = cartItemsState.filter((item) => item.productId !== productId);
    saveFavorites();
    saveCart();

    if (editingProductId.value === productId) {
        resetProductForm();
    }

    renderCategoryFilters();
    renderProducts();
    renderAdminProducts();
    renderCart();
    showToast("Produto removido do catálogo.");
}

function activateReveal(elements) {
    if (!revealObserver) {
        revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
        );
    }

    elements.forEach((element) => {
        if (!element.classList.contains("is-visible")) {
            revealObserver.observe(element);
        }
    });
}

function setupEvents() {
    openAdminAccess.addEventListener("click", () => {
        if (isAdminAuthenticated) {
            adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        openLogin();
    });

    openAdminPanel.addEventListener("click", () => {
        if (isAdminAuthenticated) {
            adminPanel.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }
        openLogin();
    });

    loginForm.addEventListener("submit", handleAdminLogin);
    productForm.addEventListener("submit", handleProductSubmit);
    searchInput.addEventListener("input", () => {
        searchTerm = searchInput.value.trim();
        saveCatalogState();
        renderProducts();
    });
    sortSelect.addEventListener("change", () => {
        sortMode = sortSelect.value;
        saveCatalogState();
        renderProducts();
    });
    logoutAdmin.addEventListener("click", handleLogout);
    loginCloseButton.addEventListener("click", closeLogin);
    closeLoginModal.addEventListener("click", closeLogin);
    closeImageViewer.addEventListener("click", closeImageModal);
    closeImageViewerButton.addEventListener("click", closeImageModal);
    openCartButton.addEventListener("click", openCartDrawerPanel);
    closeCartDrawer.addEventListener("click", closeCartDrawerPanel);
    closeCartButton.addEventListener("click", closeCartDrawerPanel);
    clearCartButton.addEventListener("click", () => {
        cartItemsState = [];
        saveCart();
        renderCart();
        showToast("Carrinho limpo.");
    });
    cartWhatsappButton.addEventListener("click", handleCartCheckout);
    zoomInButton.addEventListener("click", () => updateZoom(0.25));
    zoomOutButton.addEventListener("click", () => updateZoom(-0.25));
    cancelEditButton.addEventListener("click", resetProductForm);

    imageViewerImage.addEventListener("wheel", (event) => {
        event.preventDefault();
        updateZoom(event.deltaY < 0 ? 0.1 : -0.1);
    });

    imageViewerFrame.addEventListener("pointerdown", (event) => {
        if (currentZoom <= 1) {
            return;
        }

        isDragging = true;
        dragStartX = event.clientX - translateX;
        dragStartY = event.clientY - translateY;
        imageViewerFrame.classList.add("is-dragging");
    });

    imageViewerFrame.addEventListener("pointermove", (event) => {
        if (!isDragging || currentZoom <= 1) {
            return;
        }

        translateX = event.clientX - dragStartX;
        translateY = event.clientY - dragStartY;
        applyZoom();
    });

    const endDrag = () => {
        isDragging = false;
        imageViewerFrame.classList.remove("is-dragging");
    };

    imageViewerFrame.addEventListener("pointerup", endDrag);
    imageViewerFrame.addEventListener("pointerleave", endDrag);
    imageViewerFrame.addEventListener("pointercancel", endDrag);

    imageViewerFrame.addEventListener("touchstart", (event) => {
        if (event.touches.length === 2) {
            initialDistance = getDistance(event.touches[0], event.touches[1]);
            initialZoom = currentZoom;
        }

        if (event.touches.length === 1 && currentZoom > 1) {
            dragStartX = event.touches[0].clientX - translateX;
            dragStartY = event.touches[0].clientY - translateY;
        }
    }, { passive: false });

    imageViewerFrame.addEventListener("touchmove", (event) => {
        if (event.touches.length === 2 && initialDistance) {
            event.preventDefault();
            const newDistance = getDistance(event.touches[0], event.touches[1]);
            currentZoom = Math.min(3, Math.max(1, initialZoom * (newDistance / initialDistance)));
            if (currentZoom === 1) {
                translateX = 0;
                translateY = 0;
            }
            applyZoom();
            return;
        }

        if (event.touches.length === 1 && currentZoom > 1) {
            event.preventDefault();
            translateX = event.touches[0].clientX - dragStartX;
            translateY = event.touches[0].clientY - dragStartY;
            applyZoom();
        }
    }, { passive: false });

    imageViewerFrame.addEventListener("touchend", () => {
        if (!imageViewer.classList.contains("hidden")) {
            initialDistance = null;
            initialZoom = currentZoom;
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !loginModal.classList.contains("hidden")) {
            closeLogin();
        }

        if (event.key === "Escape" && !imageViewer.classList.contains("hidden")) {
            closeImageModal();
        }

        if (event.key === "Escape" && !cartDrawer.classList.contains("hidden")) {
            closeCartDrawerPanel();
        }
    });
}

async function init() {
    resetInitialCatalogState();
    await initializePersistence();
    searchInput.value = searchTerm;
    sortSelect.value = sortMode;
    renderCategoryFilters();
    renderProducts();
    renderCart();
    updateAdminUI();
    await refreshAdminOrders();
    resetProductForm();
    updateWishlistAndCartStatus();
    activateReveal(document.querySelectorAll(".reveal"));
    setupEvents();
}

void init();