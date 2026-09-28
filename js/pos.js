/**
 * POS (Point of Sale) Logic for Kasir BUMI ABDI RESTO
 */

class POSController {
  constructor() {
    this.cart = [];
    this.selectedCategory = 'all';
    this.searchQuery = '';
    this.orderType = 'dine_in'; // dine_in, take_away, delivery
    this.tableNumber = 'Meja 01';
    this.customerName = '';
    this.orderNotes = '';
    this.discountType = 'fixed'; // 'fixed' or 'percent'
    this.discountValue = 0;
    this.selectedItemForVariant = null;

    this.init();
    this.updateOpenBillsCount();

    // Listen to store updates for live open bills badge
    store.subscribe((type) => {
      if (type === 'ORDERS_UPDATED' || type === 'DATABASE_SYNCED') {
        this.updateOpenBillsCount();
      }
    });
  }

  setCustomDiscount(val) {
    this.discountValue = parseInt(val, 10) || 0;
    this.renderCart();
  }

  updateOpenBillsCount() {
    const orders = store.getOrders();
    const openOrders = orders.filter(o => o.paymentStatus === 'unpaid' && o.status !== 'cancelled');
    const badge = document.getElementById('pos-open-bills-count');
    if (badge) {
      badge.innerText = openOrders.length;
    }
  }

  openActiveBillsModal() {
    const modal = document.getElementById('open-bills-modal');
    const container = document.getElementById('open-bills-list-container');
    if (!modal || !container) return;

    const orders = store.getOrders();
    const openOrders = orders.filter(o => o.paymentStatus === 'unpaid' && o.status !== 'cancelled');

    if (openOrders.length === 0) {
      container.innerHTML = `
        <div class="py-12 text-center text-gray-400">
          <i class="fa-solid fa-chair text-4xl mb-2 text-gray-300"></i>
          <p class="font-bold text-gray-600">Tidak ada tagihan meja yang terbuka</p>
          <p class="text-xs text-gray-400 mt-1">Semua pesanan aktif telah lunas atau belum ada tamu.</p>
        </div>
      `;
    } else {
      container.innerHTML = openOrders.map(order => `
        <div class="p-4 bg-gray-50 hover:bg-emerald-50/50 rounded-2xl border border-gray-200 hover:border-emerald-500 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-900 text-amber-300 font-extrabold flex flex-col items-center justify-center text-xs shadow">
              <i class="fa-solid fa-chair text-[11px] mb-0.5"></i>
              <span>${order.tableNumber.replace('Meja ', '')}</span>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h5 class="font-extrabold text-sm text-gray-900">${order.tableNumber} - ${order.customerName}</h5>
                ${order.origin === 'customer_qr' ? '<span class="bg-amber-100 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded">Scan QR</span>' : ''}
              </div>
              <p class="text-xs text-gray-500 mt-0.5">${order.items.length} Menu: ${order.items.map(i => `${i.qty}x ${i.name}`).slice(0, 2).join(', ')}${order.items.length > 2 ? '...' : ''}</p>
              <span class="text-[11px] font-mono text-gray-400">${Utils.formatDateTime(order.createdAt)}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span class="font-extrabold text-base text-emerald-800">${Utils.formatRupiah(order.total)}</span>
            <div class="flex gap-1.5">
              <button onclick="pos.loadBillIntoCart('${order.id}')" class="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow active:scale-95 transition-all flex items-center gap-1">
                <i class="fa-solid fa-file-invoice-dollar"></i> Buka Bill
              </button>
            </div>
          </div>
        </div>
      `).join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeActiveBillsModal() {
    const modal = document.getElementById('open-bills-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  loadBillIntoCart(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    this.activeOrderId = order.id;
    this.cart = [...order.items];
    this.tableNumber = order.tableNumber;
    this.customerName = order.customerName;
    this.orderType = order.orderType || 'dine_in';
    this.discountValue = order.discount || 0;

    const custInput = document.getElementById('customer-name-input');
    if (custInput) custInput.value = this.customerName;

    const tableSelect = document.getElementById('table-select');
    if (tableSelect) tableSelect.value = this.tableNumber;

    const discInput = document.getElementById('discount-input');
    if (discInput) discInput.value = this.discountValue;

    this.renderCart();
    this.closeActiveBillsModal();
    this.showToast(`Tagihan ${order.tableNumber} dimuat ke Kasir`, 'success');
  }

  init() {
    this.renderCategories();
    this.renderMenuItems();
    this.renderCart();
    this.initEventListeners();
    this.initTableOptions();
  }

  initEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-menu-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase();
        this.renderMenuItems();
      });
    }

    // Order type selector
    const typeButtons = document.querySelectorAll('.order-type-btn');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        typeButtons.forEach(b => b.classList.remove('active', 'bg-emerald-800', 'text-white'));
        typeButtons.forEach(b => b.classList.add('bg-gray-100', 'text-gray-700'));
        
        btn.classList.add('active', 'bg-emerald-800', 'text-white');
        btn.classList.remove('bg-gray-100', 'text-gray-700');
        
        this.orderType = btn.dataset.type;
        const tableContainer = document.getElementById('table-select-container');
        if (tableContainer) {
          tableContainer.style.display = this.orderType === 'dine_in' ? 'block' : 'none';
        }
      });
    });

    // Customer info inputs
    const customerInput = document.getElementById('customer-name-input');
    if (customerInput) {
      customerInput.addEventListener('input', (e) => {
        this.customerName = e.target.value;
      });
    }

    const tableSelect = document.getElementById('table-select');
    if (tableSelect) {
      tableSelect.addEventListener('change', (e) => {
        this.tableNumber = e.target.value;
      });
    }

    // Quick discount buttons
    document.querySelectorAll('.discount-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.discountValue = parseInt(btn.dataset.amount, 10) || 0;
        const discInput = document.getElementById('discount-input');
        if (discInput) discInput.value = this.discountValue;
        this.renderCart();
      });
    });
  }

  initTableOptions() {
    const tableSelect = document.getElementById('table-select');
    if (!tableSelect) return;

    const settings = store.getSettings();
    const totalTables = settings.totalTables || 20;

    let html = '';
    for (let i = 1; i <= totalTables; i++) {
      const num = String(i).padStart(2, '0');
      html += `<option value="Meja ${num}">Meja ${num}</option>`;
    }
    html += '<option value="VIP 01">VIP 01 (AC)</option>';
    html += '<option value="VIP 02">VIP 02 (AC)</option>';
    html += '<option value="Lesehan 01">Lesehan 01</option>';
    html += '<option value="Lesehan 02">Lesehan 02</option>';
    html += '<option value="Lesehan 03">Lesehan 03</option>';
    tableSelect.innerHTML = html;
  }

  renderCategories() {
    const container = document.getElementById('pos-category-container');
    if (!container) return;

    const categories = window.DEFAULT_CATEGORIES || [];
    container.innerHTML = categories.map(cat => `
      <button class="cat-pill px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-all duration-150 ${this.selectedCategory === cat.id ? 'active bg-emerald-800 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}"
        onclick="pos.selectCategory('${cat.id}')">
        <i class="fa-solid ${cat.icon} text-xs"></i>
        <span>${cat.name}</span>
      </button>
    `).join('');
  }

  selectCategory(catId) {
    this.selectedCategory = catId;
    this.renderCategories();
    this.renderMenuItems();
  }

  renderMenuItems() {
    const container = document.getElementById('pos-menu-grid');
    if (!container) return;

    const menu = store.getMenu();
    let filtered = menu.filter(item => {
      const matchCat = this.selectedCategory === 'all' || item.category === this.selectedCategory;
      const matchQuery = !this.searchQuery || 
        item.name.toLowerCase().includes(this.searchQuery) || 
        (item.description && item.description.toLowerCase().includes(this.searchQuery)) ||
        (item.code && item.code.toLowerCase().includes(this.searchQuery));
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-12 text-center text-gray-400">
          <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
          <p class="font-medium text-gray-500">Tidak ada menu yang sesuai</p>
          <p class="text-xs text-gray-400 mt-1">Coba gunakan kata kunci pencarian lain</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(item => {
      const isAvailable = item.status !== 'out_of_stock';
      return `
        <div class="menu-card bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm flex flex-col justify-between relative group ${!isAvailable ? 'opacity-60 grayscale' : ''}">
          <div class="relative h-36 w-full overflow-hidden bg-gray-100">
            <img src="${item.image || 'assets/logo.png'}" 
                 alt="${item.name}" 
                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                 onerror="this.src='assets/logo.png'">
            
            ${item.isBestSeller ? `
              <span class="absolute top-2 left-2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shadow flex items-center gap-1">
                <i class="fa-solid fa-star text-[9px]"></i> Favorit
              </span>
            ` : ''}

            ${!isAvailable ? `
              <div class="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span class="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Habis</span>
              </div>
            ` : ''}

            <span class="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white font-mono text-xs px-2 py-0.5 rounded-md">
              ${item.code || 'MNU'}
            </span>
          </div>

          <div class="p-3.5 flex-1 flex flex-col justify-between">
            <div>
              <h4 class="font-bold text-gray-800 text-sm line-clamp-1 group-hover:text-emerald-800 transition-colors">${item.name}</h4>
              <p class="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed">${item.description || ''}</p>
            </div>

            <div class="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
              <div>
                <span class="text-xs text-gray-400 block -mb-0.5">Harga</span>
                <span class="font-extrabold text-emerald-800 text-sm sm:text-base">${Utils.formatRupiah(item.price)}</span>
              </div>

              ${isAvailable ? `
                <button onclick="pos.handleAddToCart('${item.id}')" 
                  class="w-9 h-9 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-all">
                  <i class="fa-solid fa-plus text-sm"></i>
                </button>
              ` : `
                <button disabled class="w-9 h-9 rounded-xl bg-gray-200 text-gray-400 flex items-center justify-center cursor-not-allowed">
                  <i class="fa-solid fa-ban text-sm"></i>
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  handleAddToCart(itemId) {
    const menu = store.getMenu();
    const item = menu.find(m => m.id === itemId);
    if (!item) return;

    if (item.variants && item.variants.length > 0) {
      this.openVariantModal(item);
    } else {
      this.addToCart(item, '', '');
    }
  }

  openVariantModal(item) {
    this.selectedItemForVariant = item;
    const modal = document.getElementById('variant-modal');
    if (!modal) return;

    document.getElementById('modal-item-name').innerText = item.name;
    document.getElementById('modal-item-price').innerText = Utils.formatRupiah(item.price);
    
    const optionsContainer = document.getElementById('modal-variant-options');
    optionsContainer.innerHTML = item.variants.map((v, i) => `
      <label class="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-emerald-50/50 hover:border-emerald-600 transition-colors">
        <input type="radio" name="variant-option" value="${v}" ${i === 0 ? 'checked' : ''} class="text-emerald-700 focus:ring-emerald-700 w-4 h-4">
        <span class="font-medium text-gray-800 text-sm">${v}</span>
      </label>
    `).join('');

    document.getElementById('modal-item-notes').value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeVariantModal() {
    const modal = document.getElementById('variant-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.selectedItemForVariant = null;
  }

  submitVariantModal() {
    if (!this.selectedItemForVariant) return;
    const checkedRadio = document.querySelector('input[name="variant-option"]:checked');
    const variant = checkedRadio ? checkedRadio.value : '';
    const notes = document.getElementById('modal-item-notes').value.trim();

    this.addToCart(this.selectedItemForVariant, variant, notes);
    this.closeVariantModal();
  }

  addToCart(item, variant = '', notes = '') {
    const cartKey = `${item.id}_${variant}_${notes}`;
    const existingIndex = this.cart.findIndex(c => `${c.id}_${c.variant}_${c.notes}` === cartKey);

    if (existingIndex > -1) {
      this.cart[existingIndex].qty += 1;
    } else {
      this.cart.push({
        id: item.id,
        code: item.code,
        name: item.name,
        price: item.price,
        qty: 1,
        variant: variant,
        notes: notes,
        image: item.image
      });
    }

    this.renderCart();
    this.showToast(`Ditambahkan: ${item.name}`);
  }

  updateQty(index, delta) {
    if (this.cart[index]) {
      this.cart[index].qty += delta;
      if (this.cart[index].qty <= 0) {
        this.cart.splice(index, 1);
      }
      this.renderCart();
    }
  }

  editItemNotes(index) {
    const current = this.cart[index];
    const newNotes = prompt(`Catatan khusus untuk ${current.name}:`, current.notes || '');
    if (newNotes !== null) {
      current.notes = newNotes.trim();
      this.renderCart();
    }
  }

  removeFromCart(index) {
    this.cart.splice(index, 1);
    this.renderCart();
  }

  clearCart() {
    if (this.cart.length === 0) return;
    if (confirm('Kosongkan semua pesanan di keranjang?')) {
      this.cart = [];
      this.discountValue = 0;
      const discInput = document.getElementById('discount-input');
      if (discInput) discInput.value = '';
      this.renderCart();
    }
  }

  calculateTotals() {
    const subtotal = this.cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
    const settings = store.getSettings();
    
    let discount = this.discountValue || 0;
    if (this.discountType === 'percent') {
      discount = Math.round((subtotal * this.discountValue) / 100);
    }
    if (discount > subtotal) discount = subtotal;

    const afterDiscount = subtotal - discount;
    const tax = settings.taxRate ? Math.round((afterDiscount * settings.taxRate) / 100) : 0;
    const service = settings.serviceRate ? Math.round((afterDiscount * settings.serviceRate) / 100) : 0;
    const total = Math.max(0, afterDiscount + tax + service);

    return { subtotal, discount, tax, service, total };
  }

  renderCart() {
    const container = document.getElementById('cart-items-container');
    const badge = document.getElementById('cart-badge-count');
    const emptyState = document.getElementById('cart-empty-state');
    const checkoutArea = document.getElementById('cart-checkout-area');

    const totalQty = this.cart.reduce((acc, i) => acc + i.qty, 0);
    if (badge) badge.innerText = `${totalQty} Item`;

    if (!container) return;

    if (this.cart.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (checkoutArea) checkoutArea.classList.add('hidden');
      container.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (checkoutArea) checkoutArea.classList.remove('hidden');

    container.innerHTML = this.cart.map((item, idx) => `
      <div class="p-3 bg-gray-50/70 hover:bg-gray-50 rounded-xl border border-gray-200/70 transition-all flex flex-col gap-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <h5 class="font-bold text-gray-800 text-sm">${item.name}</h5>
            ${item.variant ? `<span class="inline-block text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5">${item.variant}</span>` : ''}
            ${item.notes ? `<p class="text-xs text-amber-700 italic mt-0.5"><i class="fa-solid fa-pencil text-[10px] mr-1"></i>${item.notes}</p>` : ''}
          </div>
          <button onclick="pos.removeFromCart(${idx})" class="text-gray-400 hover:text-red-500 text-xs p-1">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>

        <div class="flex items-center justify-between pt-1 border-t border-gray-200/50">
          <div class="flex items-center gap-1.5">
            <button onclick="pos.updateQty(${idx}, -1)" class="w-6 h-6 rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center justify-center font-bold text-xs active:scale-95">
              -
            </button>
            <span class="w-6 text-center font-bold text-sm text-gray-800">${item.qty}</span>
            <button onclick="pos.updateQty(${idx}, 1)" class="w-6 h-6 rounded-md bg-emerald-800 text-white hover:bg-emerald-700 flex items-center justify-center font-bold text-xs active:scale-95">
              +
            </button>
            <button onclick="pos.editItemNotes(${idx})" title="Tambah catatan" class="text-gray-400 hover:text-gray-600 ml-1.5 text-xs">
              <i class="fa-regular fa-note-sticky"></i>
            </button>
          </div>

          <div class="text-right">
            <span class="font-bold text-gray-900 text-sm">${Utils.formatRupiah(item.price * item.qty)}</span>
          </div>
        </div>
      </div>
    `).join('');

    const totals = this.calculateTotals();
    const subtotalEl = document.getElementById('bill-subtotal');
    const discountEl = document.getElementById('bill-discount');
    const taxEl = document.getElementById('bill-tax');
    const totalEl = document.getElementById('bill-total');
    const payButtonTotalEl = document.getElementById('btn-pay-total-text');

    if (subtotalEl) subtotalEl.innerText = Utils.formatRupiah(totals.subtotal);
    if (discountEl) discountEl.innerText = totals.discount > 0 ? `-${Utils.formatRupiah(totals.discount)}` : 'Rp 0';
    if (taxEl) taxEl.innerText = Utils.formatRupiah(totals.tax);
    if (totalEl) totalEl.innerText = Utils.formatRupiah(totals.total);
    if (payButtonTotalEl) payButtonTotalEl.innerText = `Bayar ${Utils.formatRupiah(totals.total)}`;
  }

  // --- PAYMENT MODAL FLOW ---
  openPaymentModal() {
    if (this.cart.length === 0) {
      alert('Keranjang belanja masih kosong.');
      return;
    }

    const totals = this.calculateTotals();
    const modal = document.getElementById('payment-modal');
    if (!modal) return;

    document.getElementById('modal-pay-grand-total').innerText = Utils.formatRupiah(totals.total);
    document.getElementById('modal-pay-customer-name').innerText = this.customerName || (this.orderType === 'dine_in' ? this.tableNumber : 'Take Away');
    document.getElementById('modal-pay-item-count').innerText = `${this.cart.reduce((a, b) => a + b.qty, 0)} Porsi`;

    // Setup Cash Quick Amounts
    const cashInput = document.getElementById('modal-cash-received-input');
    if (cashInput) {
      cashInput.value = '';
      cashInput.dataset.total = totals.total;
    }

    const quickCashContainer = document.getElementById('quick-cash-buttons');
    if (quickCashContainer) {
      const roundedCeil50k = Math.ceil(totals.total / 50000) * 50000;
      const roundedCeil100k = Math.ceil(totals.total / 100000) * 100000;
      const amounts = Array.from(new Set([totals.total, roundedCeil50k, roundedCeil100k, totals.total + 50000, 100000, 200000]))
        .filter(amt => amt >= totals.total)
        .sort((a, b) => a - b)
        .slice(0, 4);

      quickCashContainer.innerHTML = amounts.map(amt => `
        <button type="button" onclick="pos.setCashReceived(${amt})" class="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-xl text-xs transition-colors">
          ${amt === totals.total ? 'Uang Pas: ' : ''}${Utils.formatRupiah(amt)}
        </button>
      `).join('');
    }

    // Default to Cash tab
    this.switchPaymentTab('cash');
    this.calculateChange();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closePaymentModal() {
    const modal = document.getElementById('payment-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  switchPaymentTab(method) {
    this.selectedPaymentMethod = method;
    document.querySelectorAll('.pay-method-tab').forEach(t => {
      t.classList.remove('active', 'border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      t.classList.add('border-gray-200', 'text-gray-600');
    });

    const activeTab = document.getElementById(`tab-pay-${method}`);
    if (activeTab) {
      activeTab.classList.add('active', 'border-emerald-700', 'bg-emerald-50', 'text-emerald-900');
      activeTab.classList.remove('border-gray-200', 'text-gray-600');
    }

    // Toggle panels
    document.getElementById('pay-panel-cash').classList.toggle('hidden', method !== 'cash');
    document.getElementById('pay-panel-qris').classList.toggle('hidden', method !== 'qris');
    document.getElementById('pay-panel-debit').classList.toggle('hidden', method !== 'debit' && method !== 'transfer');
  }

  setCashReceived(amount) {
    const input = document.getElementById('modal-cash-received-input');
    if (input) {
      input.value = amount;
      this.calculateChange();
    }
  }

  calculateChange() {
    const totals = this.calculateTotals();
    const input = document.getElementById('modal-cash-received-input');
    const received = input ? (parseInt(input.value, 10) || 0) : 0;
    const change = received - totals.total;

    const changeEl = document.getElementById('modal-cash-change');
    const submitBtn = document.getElementById('btn-confirm-payment');

    if (changeEl) {
      if (received >= totals.total) {
        changeEl.innerText = Utils.formatRupiah(change);
        changeEl.className = 'font-bold text-lg text-emerald-700';
      } else {
        changeEl.innerText = `Kurang ${Utils.formatRupiah(Math.abs(change))}`;
        changeEl.className = 'font-bold text-base text-rose-600';
      }
    }

    if (submitBtn) {
      submitBtn.disabled = this.selectedPaymentMethod === 'cash' && received < totals.total;
    }
  }

  processPayment() {
    const totals = this.calculateTotals();
    let paidAmount = totals.total;
    let changeAmount = 0;

    if (this.selectedPaymentMethod === 'cash') {
      const input = document.getElementById('modal-cash-received-input');
      paidAmount = input ? (parseInt(input.value, 10) || totals.total) : totals.total;
      changeAmount = Math.max(0, paidAmount - totals.total);
    }

    const orderData = {
      customerName: this.customerName || (this.orderType === 'dine_in' ? `Tamu ${this.tableNumber}` : 'Pelanggan Takeaway'),
      orderType: this.orderType,
      tableNumber: this.orderType === 'dine_in' ? this.tableNumber : 'Takeaway',
      status: 'kitchen',
      paymentStatus: 'paid',
      paymentMethod: this.selectedPaymentMethod || 'cash',
      items: [...this.cart],
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      service: totals.service,
      total: totals.total,
      paidAmount: paidAmount,
      changeAmount: changeAmount,
      cashier: 'Kasir Utama',
      notes: this.orderNotes,
      origin: 'kasir'
    };

    let finalOrder;
    if (this.activeOrderId) {
      const orders = store.getOrders();
      const existing = orders.find(o => o.id === this.activeOrderId);
      if (existing) {
        existing.customerName = orderData.customerName;
        existing.items = orderData.items;
        existing.subtotal = orderData.subtotal;
        existing.discount = orderData.discount;
        existing.tax = orderData.tax;
        existing.service = orderData.service;
        existing.total = orderData.total;
        existing.paidAmount = orderData.paidAmount;
        existing.changeAmount = orderData.changeAmount;
        existing.paymentStatus = 'paid';
        existing.paymentMethod = orderData.paymentMethod;
        existing.status = existing.status === 'pending' ? 'kitchen' : existing.status;
        store.saveOrders(orders);
        finalOrder = existing;
      } else {
        finalOrder = store.createOrder(orderData);
      }
    } else {
      finalOrder = store.createOrder(orderData);
    }

    this.activeOrderId = null;
    this.closePaymentModal();
    this.cart = [];
    this.customerName = '';
    const custInput = document.getElementById('customer-name-input');
    if (custInput) custInput.value = '';
    this.renderCart();

    // Show receipt modal
    this.showReceiptModal(finalOrder);
  }

  // --- SAVE ORDER / HOLD TO TABLE (BAYAR NANTI) ---
  saveOrderToTable() {
    if (this.cart.length === 0) {
      alert('Pilih menu terlebih dahulu!');
      return;
    }

    const totals = this.calculateTotals();
    const orderData = {
      customerName: this.customerName || `Tamu ${this.tableNumber}`,
      orderType: this.orderType,
      tableNumber: this.orderType === 'dine_in' ? this.tableNumber : 'Takeaway',
      status: 'kitchen',
      paymentStatus: 'unpaid', // Unpaid (Pay Later)
      paymentMethod: '-',
      items: [...this.cart],
      subtotal: totals.subtotal,
      discount: totals.discount,
      tax: totals.tax,
      service: totals.service,
      total: totals.total,
      paidAmount: 0,
      changeAmount: 0,
      cashier: 'Kasir Utama',
      notes: this.orderNotes,
      origin: 'kasir'
    };

    let savedOrder;
    if (this.activeOrderId) {
      const orders = store.getOrders();
      const existing = orders.find(o => o.id === this.activeOrderId);
      if (existing) {
        existing.items = orderData.items;
        existing.subtotal = orderData.subtotal;
        existing.discount = orderData.discount;
        existing.total = orderData.total;
        store.saveOrders(orders);
        savedOrder = existing;
      } else {
        savedOrder = store.createOrder(orderData);
      }
    } else {
      savedOrder = store.createOrder(orderData);
    }

    this.activeOrderId = null;
    this.cart = [];
    this.customerName = '';
    const custInput = document.getElementById('customer-name-input');
    if (custInput) custInput.value = '';
    this.renderCart();

    this.showToast(`Pesanan ${savedOrder.tableNumber} dikirim ke dapur (Belum Bayar)`, 'success');
  }

  // --- RECEIPT MODAL & PRINT ---
  showReceiptModal(order) {
    const modal = document.getElementById('receipt-modal');
    if (!modal) return;

    this.currentReceiptOrder = order;
    this.renderReceiptHTML(order);

    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    this.currentReceiptOrder = null;
  }

  renderReceiptHTML(order) {
    const container = document.getElementById('receipt-content-target');
    if (!container) return;

    const settings = store.getSettings();

    container.innerHTML = `
      <div class="text-center pb-2">
        <img src="assets/logo.png" alt="Logo" class="w-16 h-16 mx-auto mb-1 rounded-full border border-gray-300">
        <h3 class="font-extrabold text-sm uppercase tracking-wide">${settings.restoName || 'BUMI ABDI'}</h3>
        <p class="text-[10px] text-gray-600">${settings.tagline || 'Asli. Gurih. Berkah.'}</p>
        <p class="text-[10px] text-gray-500">${settings.address || ''}</p>
        <p class="text-[10px] text-gray-500">Telp: ${settings.phone || '-'}</p>
      </div>

      <div class="receipt-divider"></div>

      <div class="text-[10px] flex justify-between">
        <span>No: <strong>${order.id}</strong></span>
        <span>${order.tableNumber}</span>
      </div>
      <div class="text-[10px] flex justify-between">
        <span>Tgl: ${Utils.formatDateTime(order.createdAt)}</span>
        <span>Kasir: ${order.cashier || 'Kasir'}</span>
      </div>
      <div class="text-[10px] flex justify-between">
        <span>Pelanggan: ${order.customerName || '-'}</span>
        <span>(${order.orderType === 'dine_in' ? 'Dine In' : 'Take Away'})</span>
      </div>

      <div class="receipt-divider"></div>

      <table class="w-full text-[11px]">
        <tbody>
          ${order.items.map(item => `
            <tr>
              <td colspan="3" class="font-bold pt-1">${item.name}</td>
            </tr>
            ${item.variant ? `<tr><td colspan="3" class="text-[9px] text-gray-500 pl-2">Varian: ${item.variant}</td></tr>` : ''}
            ${item.notes ? `<tr><td colspan="3" class="text-[9px] text-gray-500 pl-2">Ket: ${item.notes}</td></tr>` : ''}
            <tr class="pb-1 text-gray-700">
              <td class="w-1/2 pl-2">${item.qty} x ${Utils.formatRupiah(item.price)}</td>
              <td class="text-right font-semibold">${Utils.formatRupiah(item.price * item.qty)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="receipt-divider"></div>

      <div class="text-[11px] space-y-1">
        <div class="flex justify-between">
          <span>Subtotal:</span>
          <span>${Utils.formatRupiah(order.subtotal)}</span>
        </div>
        ${order.discount > 0 ? `
          <div class="flex justify-between text-red-600">
            <span>Diskon:</span>
            <span>-${Utils.formatRupiah(order.discount)}</span>
          </div>
        ` : ''}
        ${order.tax > 0 ? `
          <div class="flex justify-between">
            <span>PB1 (Pajak):</span>
            <span>${Utils.formatRupiah(order.tax)}</span>
          </div>
        ` : ''}
        ${order.service > 0 ? `
          <div class="flex justify-between">
            <span>Service:</span>
            <span>${Utils.formatRupiah(order.service)}</span>
          </div>
        ` : ''}
        <div class="receipt-double-divider"></div>
        <div class="flex justify-between font-extrabold text-xs">
          <span>TOTAL:</span>
          <span>${Utils.formatRupiah(order.total)}</span>
        </div>
        <div class="flex justify-between text-[10px]">
          <span>Metode: ${order.paymentMethod ? order.paymentMethod.toUpperCase() : 'CASH'}</span>
          <span>Bayar: ${Utils.formatRupiah(order.paidAmount || order.total)}</span>
        </div>
        <div class="flex justify-between text-[10px]">
          <span>Kembalian:</span>
          <span>${Utils.formatRupiah(order.changeAmount || 0)}</span>
        </div>
      </div>

      <div class="receipt-divider"></div>

      <div class="text-center text-[10px] text-gray-600 pt-1 space-y-1">
        <p class="font-medium whitespace-pre-line">${settings.footerReceipt || 'Terima kasih atas kunjungan Anda!'}</p>
        <p class="text-[9px] text-gray-400">Powered by BUMI ABDI POS</p>
      </div>
    `;
  }

  printThermalReceipt() {
    if (!this.currentReceiptOrder) return;
    
    // Set class to body to trigger CSS @media print visibility
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1000);
  }

  shareWhatsAppReceipt() {
    if (!this.currentReceiptOrder) return;
    const order = this.currentReceiptOrder;
    const settings = store.getSettings();

    let text = `*STRUK PEMBELIAN - ${settings.restoName}*\n`;
    text += `Tagline: ${settings.tagline}\n`;
    text += `No. Nota: ${order.id}\n`;
    text += `Waktu: ${Utils.formatDateTime(order.createdAt)}\n`;
    text += `Meja / Order: ${order.tableNumber} (${order.customerName})\n`;
    text += `----------------------------------------\n`;
    
    order.items.forEach(i => {
      text += `*${i.name}* ${i.variant ? '('+i.variant+')' : ''}\n`;
      text += `  ${i.qty} x ${Utils.formatRupiah(i.price)} = ${Utils.formatRupiah(i.price * i.qty)}\n`;
      if (i.notes) text += `  _Catatan: ${i.notes}_\n`;
    });

    text += `----------------------------------------\n`;
    text += `Subtotal: ${Utils.formatRupiah(order.subtotal)}\n`;
    if (order.discount > 0) text += `Diskon: -${Utils.formatRupiah(order.discount)}\n`;
    text += `*TOTAL: ${Utils.formatRupiah(order.total)}*\n`;
    text += `Status: ${order.paymentStatus === 'paid' ? 'LUNAS ('+order.paymentMethod.toUpperCase()+')' : 'BELUM LUNAS'}\n\n`;
    text += `${settings.footerReceipt}`;

    const phone = prompt('Masukkan Nomor WhatsApp Pelanggan (contoh: 081234567890):');
    if (phone) {
      let cleanPhone = phone.replace(/[^0-9]/g, '');
      if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
      const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  }

  showToast(message, type = 'default') {
    const toast = document.createElement('div');
    toast.className = `fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-xl font-semibold text-sm flex items-center gap-2 animate-toast ${type === 'success' ? 'bg-emerald-800 text-white' : 'bg-gray-900 text-white'}`;
    toast.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
}

window.pos = new POSController();
