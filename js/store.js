/**
 * Store & Data Management Layer for BUMI ABDI RESTO
 * Handles physical database sync (database/database.json), local persistence, and real-time broadcasting
 */

class AppStore {
  constructor() {
    this.STORAGE_KEYS = {
      MENU: 'bumi_abdi_menu_v1',
      ORDERS: 'bumi_abdi_orders_v1',
      SETTINGS: 'bumi_abdi_settings_v1'
    };

    this.channel = null;
    this.listeners = [];
    this.initBroadcastChannel();
    this.initData();
    this.syncWithServerDatabase();
  }

  initBroadcastChannel() {
    try {
      if ('BroadcastChannel' in window) {
        this.channel = new BroadcastChannel('BUMI_ABDI_CHANNEL');
        this.channel.onmessage = (event) => {
          this.notifyListeners(event.data.type, event.data.payload);
        };
      }
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    // Connect to Dynamic Server-Sent Events (SSE) for multi-device real-time sync
    this.initSSE();

    // Cross-tab fallback listener
    window.addEventListener('storage', (e) => {
      if (e.key === this.STORAGE_KEYS.ORDERS) {
        this.notifyListeners('ORDERS_UPDATED', this.getOrders());
      } else if (e.key === this.STORAGE_KEYS.MENU) {
        this.notifyListeners('MENU_UPDATED', this.getMenu());
      }
    });
  }

  initSSE() {
    try {
      if ('EventSource' in window) {
        const es = new EventSource('/api/events');
        es.addEventListener('ORDER_RECEIVED', (e) => {
          const order = JSON.parse(e.data);
          const orders = this.getOrders();
          const existIdx = orders.findIndex(o => o.id === order.id);
          if (existIdx > -1) {
            orders[existIdx] = order;
          } else {
            orders.unshift(order);
          }
          localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
          this.notifyListeners('ORDERS_UPDATED', orders);
          this.playNotificationSound('bell');
          if (window.pos && window.pos.showToast) {
            window.pos.showToast(`Pesanan Masuk dari ${order.tableNumber}!`, 'success');
          }
        });

        es.addEventListener('WAITER_CALLED', (e) => {
          const data = JSON.parse(e.data);
          this.playNotificationSound('bell');
          if (window.pos && window.pos.showToast) {
            window.pos.showToast(`🛎️ Panggilan Waiter dari ${data.table}!`, 'default');
          }
        });

        es.addEventListener('DATABASE_UPDATED', (e) => {
          const db = JSON.parse(e.data);
          if (db.menu) localStorage.setItem(this.STORAGE_KEYS.MENU, JSON.stringify(db.menu));
          if (db.orders) localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(db.orders));
          if (db.restaurant) localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(db.restaurant));
          this.notifyListeners('DATABASE_SYNCED', db);
        });
      }
    } catch (err) {
      console.log('SSE connection skipped in offline / file mode');
    }
  }

  broadcast(type, payload) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload });
      } catch (e) {
        console.error('Error broadcasting message:', e);
      }
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notifyListeners(type, payload) {
    this.listeners.forEach(cb => {
      try {
        cb(type, payload);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  async syncWithServerDatabase() {
    try {
      const response = await fetch('/api/database');
      if (response.ok) {
        const db = await response.json();
        if (db.menu && db.menu.length > 0) {
          localStorage.setItem(this.STORAGE_KEYS.MENU, JSON.stringify(db.menu));
        }
        if (db.restaurant && Object.keys(db.restaurant).length > 0) {
          localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(db.restaurant));
        }
        if (db.orders && db.orders.length > 0) {
          localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(db.orders));
        }
        this.notifyListeners('DATABASE_SYNCED', db);
      }
    } catch (e) {
      // Offline mode or file protocol
    }
  }

  async persistToServerDatabase() {
    try {
      const payload = {
        restaurant: this.getSettings(),
        categories: window.DEFAULT_CATEGORIES || [],
        menu: this.getMenu(),
        orders: this.getOrders()
      };
      await fetch('/api/save-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // In offline mode, localStorage retains the data safely
    }
  }

  initData() {
    if (!localStorage.getItem(this.STORAGE_KEYS.MENU)) {
      localStorage.setItem(this.STORAGE_KEYS.MENU, JSON.stringify(window.DEFAULT_MENU || []));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(window.DEFAULT_SETTINGS || {}));
    }
    if (!localStorage.getItem(this.STORAGE_KEYS.ORDERS)) {
      const dummyOrders = this.createInitialDummyOrders();
      localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(dummyOrders));
    }
  }

  createInitialDummyOrders() {
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePrefix = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;

    return [
      {
        id: `BA-${datePrefix}-001`,
        createdAt: new Date(today.getTime() - 1000 * 60 * 180).toISOString(),
        customerName: 'Bpk. Hendra',
        orderType: 'dine_in',
        tableNumber: 'Meja 03',
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        items: [
          { id: 'm1', name: 'Ayam Goreng Kampung (Paha/Dada)', price: 28000, qty: 2, variant: 'Paha', notes: 'Garing' },
          { id: 'm17', name: 'Nasi Putih Pulen Bakul', price: 6000, qty: 2, variant: '1 Porsi', notes: '' },
          { id: 'm11', name: 'Sayur Asem Khas Bumi Abdi', price: 12000, qty: 1, variant: '', notes: '' },
          { id: 'm14', name: 'Sambal Terasi Dadak Bumi Abdi', price: 6000, qty: 1, variant: 'Level 2 (Pedas)', notes: '' },
          { id: 'm22', name: 'Es Teh Manis Jumbo / Hangat', price: 5000, qty: 2, variant: 'Es Teh Manis', notes: '' }
        ],
        subtotal: 85000,
        discount: 0,
        tax: 0,
        service: 0,
        total: 85000,
        paidAmount: 100000,
        changeAmount: 15000,
        cashier: 'Kasir Utama',
        origin: 'kasir'
      },
      {
        id: `BA-${datePrefix}-002`,
        createdAt: new Date(today.getTime() - 1000 * 60 * 95).toISOString(),
        customerName: 'Ibu Rina (Online QR)',
        orderType: 'dine_in',
        tableNumber: 'Meja 07',
        status: 'completed',
        paymentStatus: 'paid',
        paymentMethod: 'qris',
        items: [
          { id: 'm7', name: 'Paket Keluarga Berkah (4 Porsi)', price: 155000, qty: 1, variant: 'Goreng Kremes', notes: 'Sambal minta dipisah ya' },
          { id: 'm24', name: 'Es Kelapa Muda Jeruk Gula Aren', price: 16000, qty: 2, variant: 'Gula Aren', notes: '' }
        ],
        subtotal: 187000,
        discount: 10000,
        tax: 0,
        service: 0,
        total: 177000,
        paidAmount: 177000,
        changeAmount: 0,
        cashier: 'Self Order QR',
        origin: 'customer_qr'
      }
    ];
  }

  // --- MENU METHODS ---
  getMenu() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.MENU)) || [];
    } catch {
      return window.DEFAULT_MENU || [];
    }
  }

  saveMenu(menu) {
    localStorage.setItem(this.STORAGE_KEYS.MENU, JSON.stringify(menu));
    this.broadcast('MENU_UPDATED', menu);
    this.notifyListeners('MENU_UPDATED', menu);
    this.persistToServerDatabase();
  }

  addMenuItem(item) {
    const menu = this.getMenu();
    const newItem = {
      ...item,
      id: 'm_' + Date.now(),
      code: item.code || 'MNU-' + Math.floor(100 + Math.random() * 900)
    };
    menu.unshift(newItem);
    this.saveMenu(menu);
    return newItem;
  }

  updateMenuItem(id, updatedFields) {
    const menu = this.getMenu();
    const idx = menu.findIndex(m => m.id === id);
    if (idx !== -1) {
      menu[idx] = { ...menu[idx], ...updatedFields };
      this.saveMenu(menu);
      return menu[idx];
    }
    return null;
  }

  deleteMenuItem(id) {
    let menu = this.getMenu();
    menu = menu.filter(m => m.id !== id);
    this.saveMenu(menu);
  }

  resetMenuToDefault() {
    this.saveMenu(window.DEFAULT_MENU || []);
  }

  // --- ORDERS METHODS ---
  getOrders() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.ORDERS)) || [];
    } catch {
      return [];
    }
  }

  saveOrders(orders) {
    localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    this.broadcast('ORDERS_UPDATED', orders);
    this.notifyListeners('ORDERS_UPDATED', orders);
    this.persistToServerDatabase();
  }

  createOrder(orderData) {
    const orders = this.getOrders();
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const datePrefix = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
    const seq = String(orders.length + 1).padStart(3, '0');

    const newOrder = {
      id: orderData.id || `BA-${datePrefix}-${seq}`,
      createdAt: orderData.createdAt || new Date().toISOString(),
      customerName: orderData.customerName || 'Pelanggan',
      orderType: orderData.orderType || 'dine_in',
      tableNumber: orderData.tableNumber || 'Meja 01',
      status: orderData.status || 'kitchen',
      paymentStatus: orderData.paymentStatus || 'unpaid',
      paymentMethod: orderData.paymentMethod || 'cash',
      items: orderData.items || [],
      subtotal: orderData.subtotal || 0,
      discount: orderData.discount || 0,
      tax: orderData.tax || 0,
      service: orderData.service || 0,
      total: orderData.total || 0,
      paidAmount: orderData.paidAmount || 0,
      changeAmount: orderData.changeAmount || 0,
      cashier: orderData.cashier || 'Kasir 1',
      notes: orderData.notes || '',
      origin: orderData.origin || 'kasir'
    };

    orders.unshift(newOrder);
    this.saveOrders(orders);

    this.playNotificationSound();
    return newOrder;
  }

  updateOrderStatus(orderId, status, paymentStatus = null) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      if (paymentStatus) order.paymentStatus = paymentStatus;
      if (status === 'completed' && !order.completedAt) {
        order.completedAt = new Date().toISOString();
      }
      this.saveOrders(orders);
      return order;
    }
    return null;
  }

  updateOrderPayment(orderId, paymentMethod, paidAmount, changeAmount) {
    const orders = this.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (order) {
      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;
      order.paidAmount = paidAmount;
      order.changeAmount = changeAmount;
      order.status = order.status === 'pending' ? 'kitchen' : order.status;
      this.saveOrders(orders);
      return order;
    }
    return null;
  }

  // --- SETTINGS METHODS ---
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEYS.SETTINGS)) || window.DEFAULT_SETTINGS;
    } catch {
      return window.DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings) {
    localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.broadcast('SETTINGS_UPDATED', settings);
    this.notifyListeners('SETTINGS_UPDATED', settings);
    this.persistToServerDatabase();
  }

  // --- DATABASE EXPORT / IMPORT ---
  exportDatabaseJSON() {
    const db = {
      restaurant: this.getSettings(),
      categories: window.DEFAULT_CATEGORIES || [],
      menu: this.getMenu(),
      orders: this.getOrders(),
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `backup_bumi_abdi_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchorElem.click();
    dlAnchorElem.remove();
  }

  importDatabaseJSON(jsonContent) {
    try {
      const db = JSON.parse(jsonContent);
      if (db.menu) localStorage.setItem(this.STORAGE_KEYS.MENU, JSON.stringify(db.menu));
      if (db.restaurant) localStorage.setItem(this.STORAGE_KEYS.SETTINGS, JSON.stringify(db.restaurant));
      if (db.orders) localStorage.setItem(this.STORAGE_KEYS.ORDERS, JSON.stringify(db.orders));

      this.persistToServerDatabase();
      this.notifyListeners('DATABASE_SYNCED', db);
      return true;
    } catch (e) {
      console.error('Failed to import database:', e);
      return false;
    }
  }

  // --- AUDIO BEEP / CHIME GENERATOR ---
  playNotificationSound(type = 'chime') {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'bell' || type === 'chime') {
        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.6);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(830.61, now + 0.15);
        gain2.gain.setValueAtTime(0.35, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.85);
      }
    } catch (e) {
      // Muted or blocked
    }
  }
}

// Helper formatting utilities
const Utils = {
  formatRupiah(amount) {
    const num = Number(amount) || 0;
    return 'Rp ' + num.toLocaleString('id-ID');
  },

  formatDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  },

  formatTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  },

  getStatusBadge(status) {
    switch (status) {
      case 'pending':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800"><i class="fa-solid fa-clock mr-1"></i>Menunggu</span>';
      case 'kitchen':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 animate-pulse"><i class="fa-solid fa-fire-burner mr-1"></i>Dimasak Dapur</span>';
      case 'ready':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"><i class="fa-solid fa-bell-concierge mr-1"></i>Siap Saji</span>';
      case 'completed':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800"><i class="fa-solid fa-circle-check mr-1"></i>Selesai</span>';
      case 'cancelled':
        return '<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-100 text-rose-800"><i class="fa-solid fa-ban mr-1"></i>Dibatalkan</span>';
      default:
        return `<span class="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">${status}</span>`;
    }
  },

  getPaymentBadge(status, method = '') {
    if (status === 'paid') {
      const methodLabel = method ? ` (${method.toUpperCase()})` : '';
      return `<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800"><i class="fa-solid fa-check mr-1"></i>Lunas${methodLabel}</span>`;
    }
    return '<span class="px-2.5 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-800"><i class="fa-solid fa-circle-exclamation mr-1"></i>Belum Lunas</span>';
  }
};

window.store = new AppStore();
window.Utils = Utils;
