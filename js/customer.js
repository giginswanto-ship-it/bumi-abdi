/**
 * Customer Self-Order Logic for BUMI ABDI RESTO
 */

class CustomerOrderApp {
  constructor() {
    this.table = 'Meja 01';
    this.cart = [];
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.currentActiveOrder = null;
    this.selectedItemForModal = null;

    this.init();
  }

  init() {
    this.extractTableParam();
    this.renderHeader();
    this.renderCategories();
    this.renderMenuItems();
    this.renderCartUI();
    this.initEventListeners();
    this.checkExistingOrder();

    // Listen to real-time status updates
    store.subscribe((type, payload) => {
      if (type === 'ORDERS_UPDATED' && this.currentActiveOrder) {
        const orders = store.getOrders();
        const updated = orders.find(o => o.id === this.currentActiveOrder.id);
        if (updated) {
          this.currentActiveOrder = updated;
          this.renderLiveTracking();
        }
      }
    });
  }

  extractTableParam() {
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get('table');
    if (tableParam) {
      this.table = decodeURIComponent(tableParam);
    }
  }

  renderHeader() {
    const tableEl = document.getElementById('customer-table-badge');
    if (tableEl) {
      tableEl.innerText = this.table;
    }
  }

  initEventListeners() {
    const search = document.getElementById('customer-search-input');
    if (search) {
      search.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderMenuItems();
      });
    }
  }

  renderCategories() {
    const container = document.getElementById('customer-categories');
    if (!container) return;

    const categories = window.DEFAULT_CATEGORIES || [];
    container.innerHTML = categories.map(cat => `
      <button onclick="custApp.selectCategory('${cat.id}')" 
        class="px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1.5 transition-all shadow-sm ${this.selectedCategory === cat.id ? 'bg-emerald-800 text-white shadow-emerald-900/30' : 'bg-white text-gray-700 border border-gray-200'}">
        <i class="fa-solid ${cat.icon} text-[10px]"></i>
        <span>${cat.name}</span>
      </button>
    `).join('');
  }

  selectCategory(id) {
    this.selectedCategory = id;
    this.renderCategories();
    this.renderMenuItems();
  }

  renderMenuItems() {
    const container = document.getElementById('customer-menu-grid');
    if (!container) return;

    const menu = store.getMenu();
    let filtered = menu.filter(item => {
      const matchCat = this.selectedCategory === 'all' || item.category === this.selectedCategory;
      const matchQuery = !this.searchQuery || 
        item.name.toLowerCase().includes(this.searchQuery) ||
        (item.description && item.description.toLowerCase().includes(this.searchQuery));
      return matchCat && matchQuery && item.status !== 'out_of_stock';
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400">
          <i class="fa-solid fa-utensils text-4xl mb-2 text-gray-300"></i>
          <p class="font-bold text-gray-600">Menu tidak ditemukan</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => `
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-row p-3 gap-3">
        <img src="${item.image || 'assets/logo.png'}" 
             alt="${item.name}" 
             class="w-24 h-24 rounded-xl object-cover flex-shrink-0 bg-gray-100"
             onerror="this.src='assets/logo.png'">

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <div class="flex items-start justify-between gap-1">
              <h4 class="font-bold text-gray-800 text-sm leading-tight">${item.name}</h4>
              ${item.isBestSeller ? '<span class="bg-amber-400 text-emerald-950 font-extrabold text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"><i class="fa-solid fa-star text-[8px]"></i> Favorit</span>' : ''}
            </div>
            <p class="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">${item.description || ''}</p>
          </div>

          <div class="flex items-center justify-between mt-2 pt-1 border-t border-gray-50">
            <span class="font-extrabold text-emerald-800 text-sm">${Utils.formatRupiah(item.price)}</span>
            <button onclick="custApp.openItemModal('${item.id}')" 
              class="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow active:scale-95 transition-all flex items-center gap-1">
              <i class="fa-solid fa-plus text-[10px]"></i> Tambah
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  openItemModal(itemId) {
    const menu = store.getMenu();
    const item = menu.find(m => m.id === itemId);
    if (!item) return;

    this.selectedItemForModal = item;
    const modal = document.getElementById('cust-item-modal');
    
    document.getElementById('cust-modal-img').src = item.image || 'assets/logo.png';
    document.getElementById('cust-modal-title').innerText = item.name;
    document.getElementById('cust-modal-price').innerText = Utils.formatRupiah(item.price);
    document.getElementById('cust-modal-desc').innerText = item.description || '';

    const variantContainer = document.getElementById('cust-modal-variants');
    if (item.variants && item.variants.length > 0) {
      variantContainer.parentElement.classList.remove('hidden');
      variantContainer.innerHTML = item.variants.map((v, i) => `
        <label class="flex items-center gap-2.5 p-2.5 border rounded-xl cursor-pointer hover:bg-emerald-50">
          <input type="radio" name="cust-variant" value="${v}" ${i === 0 ? 'checked' : ''} class="text-emerald-800 focus:ring-emerald-700">
          <span class="text-xs font-semibold text-gray-800">${v}</span>
        </label>
      `).join('');
    } else {
      variantContainer.parentElement.classList.add('hidden');
      variantContainer.innerHTML = '';
    }

    document.getElementById('cust-modal-notes').value = '';
    document.getElementById('cust-modal-qty').innerText = '1';

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeItemModal() {
    const modal = document.getElementById('cust-item-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.selectedItemForModal = null;
  }

  adjustModalQty(delta) {
    const qtyEl = document.getElementById('cust-modal-qty');
    let qty = parseInt(qtyEl.innerText, 10) || 1;
    qty = Math.max(1, qty + delta);
    qtyEl.innerText = qty;
  }

  confirmAddToCart() {
    if (!this.selectedItemForModal) return;
    const item = this.selectedItemForModal;
    const qty = parseInt(document.getElementById('cust-modal-qty').innerText, 10) || 1;
    const checkedRadio = document.querySelector('input[name="cust-variant"]:checked');
    const variant = checkedRadio ? checkedRadio.value : '';
    const notes = document.getElementById('cust-modal-notes').value.trim();

    const key = `${item.id}_${variant}_${notes}`;
    const exist = this.cart.find(c => `${c.id}_${c.variant}_${c.notes}` === key);

    if (exist) {
      exist.qty += qty;
    } else {
      this.cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: qty,
        variant: variant,
        notes: notes,
        image: item.image
      });
    }

    this.closeItemModal();
    this.renderCartUI();
  }

  renderCartUI() {
    const bar = document.getElementById('floating-cart-bar');
    const countEl = document.getElementById('floating-cart-count');
    const totalEl = document.getElementById('floating-cart-total');

    const totalQty = this.cart.reduce((a, b) => a + b.qty, 0);
    const totalPrice = this.cart.reduce((a, b) => a + (b.price * b.qty), 0);

    if (totalQty > 0) {
      bar.classList.remove('translate-y-32');
      countEl.innerText = `${totalQty} Menu`;
      totalEl.innerText = Utils.formatRupiah(totalPrice);
    } else {
      bar.classList.add('translate-y-32');
    }
  }

  openCartDrawer() {
    const drawer = document.getElementById('cust-cart-drawer');
    const itemsList = document.getElementById('cust-drawer-items');
    const totalEl = document.getElementById('cust-drawer-total');

    const totalPrice = this.cart.reduce((a, b) => a + (b.price * b.qty), 0);
    totalEl.innerText = Utils.formatRupiah(totalPrice);

    itemsList.innerHTML = this.cart.map((item, idx) => `
      <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
        <div class="flex-1 pr-2">
          <h5 class="font-bold text-gray-800 text-sm">${item.name}</h5>
          ${item.variant ? `<p class="text-xs text-emerald-800 font-semibold">${item.variant}</p>` : ''}
          ${item.notes ? `<p class="text-xs text-amber-700 italic">${item.notes}</p>` : ''}
          <span class="text-xs font-bold text-gray-900 mt-1 block">${Utils.formatRupiah(item.price * item.qty)}</span>
        </div>

        <div class="flex items-center gap-2">
          <button onclick="custApp.updateCartQty(${idx}, -1)" class="w-6 h-6 rounded-md bg-white border border-gray-300 text-gray-700 font-bold flex items-center justify-center text-xs">-</button>
          <span class="font-bold text-xs text-gray-800">${item.qty}</span>
          <button onclick="custApp.updateCartQty(${idx}, 1)" class="w-6 h-6 rounded-md bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">+</button>
        </div>
      </div>
    `).join('');

    drawer.classList.remove('hidden');
    drawer.classList.add('flex');
  }

  closeCartDrawer() {
    const drawer = document.getElementById('cust-cart-drawer');
    if (drawer) {
      drawer.classList.add('hidden');
      drawer.classList.remove('flex');
    }
  }

  updateCartQty(idx, delta) {
    if (this.cart[idx]) {
      this.cart[idx].qty += delta;
      if (this.cart[idx].qty <= 0) {
        this.cart.splice(idx, 1);
      }
      this.renderCartUI();
      if (this.cart.length === 0) {
        this.closeCartDrawer();
      } else {
        this.openCartDrawer();
      }
    }
  }

  submitOrder() {
    if (this.cart.length === 0) return;

    const customerName = document.getElementById('cust-name-input').value.trim() || 'Tamu Meja';
    const subtotal = this.cart.reduce((a, b) => a + (b.price * b.qty), 0);

    const orderPayload = {
      customerName: customerName,
      orderType: 'dine_in',
      tableNumber: this.table,
      status: 'kitchen',
      paymentStatus: 'unpaid',
      paymentMethod: 'kasir_qris',
      items: [...this.cart],
      subtotal: subtotal,
      discount: 0,
      tax: 0,
      service: 0,
      total: subtotal,
      cashier: 'QR Self-Order',
      origin: 'customer_qr'
    };

    const newOrder = store.createOrder(orderPayload);
    this.currentActiveOrder = newOrder;
    localStorage.setItem(`active_order_${this.table}`, JSON.stringify(newOrder));

    // Dynamic Server Push to all screens (Kasir & Dapur)
    try {
      fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder)
      }).catch(() => {});
    } catch (e) {}

    this.cart = [];
    this.closeCartDrawer();
    this.renderCartUI();
    this.renderLiveTracking();
  }

  checkExistingOrder() {
    const saved = localStorage.getItem(`active_order_${this.table}`);
    if (saved) {
      try {
        const order = JSON.parse(saved);
        const orders = store.getOrders();
        const found = orders.find(o => o.id === order.id);
        if (found && found.status !== 'completed' && found.status !== 'cancelled') {
          this.currentActiveOrder = found;
          this.renderLiveTracking();
        }
      } catch (e) {
        console.error(e);
      }
    }
  }

  renderLiveTracking() {
    const trackingScreen = document.getElementById('cust-tracking-screen');
    if (!this.currentActiveOrder || !trackingScreen) return;

    const order = this.currentActiveOrder;
    trackingScreen.classList.remove('hidden');

    document.getElementById('track-order-id').innerText = order.id;
    document.getElementById('track-order-table').innerText = order.tableNumber;
    document.getElementById('track-order-total').innerText = Utils.formatRupiah(order.total);
    document.getElementById('track-order-pay-status').innerHTML = Utils.getPaymentBadge(order.paymentStatus);

    // Step state
    const step1 = document.getElementById('step-received');
    const step2 = document.getElementById('step-cooking');
    const step3 = document.getElementById('step-ready');

    [step1, step2, step3].forEach(s => s.className = 'w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-xs');

    step1.className = 'w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs';

    if (order.status === 'kitchen') {
      step2.className = 'w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs animate-pulse';
    } else if (order.status === 'ready' || order.status === 'completed') {
      step2.className = 'w-8 h-8 rounded-full bg-emerald-800 text-white flex items-center justify-center font-bold text-xs';
      step3.className = 'w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs';
    }

    // Items list
    document.getElementById('track-order-items').innerHTML = order.items.map(i => `
      <li class="flex justify-between text-xs py-1 border-b border-gray-100">
        <span>${i.qty}x ${i.name} ${i.variant ? '('+i.variant+')' : ''}</span>
        <span class="font-bold">${Utils.formatRupiah(i.price * i.qty)}</span>
      </li>
    `).join('');
  }

  callWaiter() {
    alert(`🛎️ Panggilan telah dikirim ke Kasir & Waiter untuk ${this.table}. Waiter kami akan segera menghampiri meja Anda!`);
    store.playNotificationSound('bell');
    
    // Dynamic Server Push for Waiter Call
    try {
      fetch('/api/call-waiter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table: this.table, time: new Date().toISOString() })
      }).catch(() => {});
    } catch (e) {}
  }

  closeTrackingScreen() {
    const trackingScreen = document.getElementById('cust-tracking-screen');
    if (trackingScreen) trackingScreen.classList.add('hidden');
  }
}

window.custApp = new CustomerOrderApp();
