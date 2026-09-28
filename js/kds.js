/**
 * Kitchen Display System (KDS) & Order Tracker for BUMI ABDI RESTO
 */

class KDSController {
  constructor() {
    this.filterStatus = 'active'; // 'active', 'all', 'kitchen', 'ready', 'completed'
    this.timerInterval = null;
    this.init();
  }

  init() {
    this.renderKDSOrders();
    this.startTimerUpdater();

    // Listen to store updates
    store.subscribe((type, payload) => {
      if (type === 'ORDERS_UPDATED') {
        this.renderKDSOrders();
        this.updateHeaderBadge();
      }
    });

    this.updateHeaderBadge();
  }

  setFilter(status) {
    this.filterStatus = status;
    document.querySelectorAll('.kds-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.status === status);
      btn.classList.toggle('bg-emerald-800', btn.dataset.status === status);
      btn.classList.toggle('text-white', btn.dataset.status === status);
      btn.classList.toggle('bg-gray-100', btn.dataset.status !== status);
      btn.classList.toggle('text-gray-700', btn.dataset.status !== status);
    });
    this.renderKDSOrders();
  }

  updateHeaderBadge() {
    const orders = store.getOrders();
    const activeCount = orders.filter(o => o.status === 'kitchen' || o.status === 'pending').length;
    const badge = document.getElementById('kds-active-badge');
    if (badge) {
      badge.innerText = `${activeCount} Aktif`;
      badge.classList.toggle('hidden', activeCount === 0);
    }
  }

  startTimerUpdater() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      document.querySelectorAll('.order-duration-timer').forEach(el => {
        const timeStr = el.dataset.time;
        if (timeStr) {
          const elapsed = Math.floor((Date.now() - new Date(timeStr).getTime()) / 1000);
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          el.innerText = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
          
          if (mins >= 15) {
            el.classList.add('text-rose-600', 'animate-pulse');
          }
        }
      });
    }, 1000);
  }

  renderKDSOrders() {
    const container = document.getElementById('kds-orders-grid');
    if (!container) return;

    const orders = store.getOrders();
    let filtered = orders.filter(o => {
      if (this.filterStatus === 'active') return o.status === 'pending' || o.status === 'kitchen' || o.status === 'ready';
      if (this.filterStatus === 'all') return true;
      return o.status === this.filterStatus;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-gray-400">
          <i class="fa-solid fa-utensils text-5xl mb-3 text-emerald-800/20"></i>
          <h4 class="font-bold text-gray-600 text-base">Tidak ada antrian pesanan dapur</h4>
          <p class="text-xs text-gray-400 mt-1">Pesanan baru dari Kasir atau Scan Barcode Meja akan otomatis muncul di sini</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(order => {
      const elapsedMins = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
      const isLate = elapsedMins >= 15 && order.status !== 'completed';

      let borderClass = 'border-gray-200';
      let headerBg = 'bg-gray-100 text-gray-800';

      if (order.status === 'kitchen') {
        borderClass = isLate ? 'border-rose-500 ring-2 ring-rose-400' : 'border-amber-500';
        headerBg = isLate ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white';
      } else if (order.status === 'ready') {
        borderClass = 'border-blue-500';
        headerBg = 'bg-blue-600 text-white';
      } else if (order.status === 'completed') {
        borderClass = 'border-emerald-300 opacity-75';
        headerBg = 'bg-emerald-700 text-white';
      }

      return `
        <div class="bg-white rounded-2xl border-2 ${borderClass} shadow-md overflow-hidden flex flex-col justify-between transition-all">
          <div>
            <!-- Card Header -->
            <div class="${headerBg} px-4 py-2.5 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="font-extrabold text-base tracking-wide">${order.tableNumber}</span>
                ${order.origin === 'customer_qr' ? `
                  <span class="bg-white/20 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">QR Order</span>
                ` : ''}
              </div>
              <div class="flex items-center gap-1.5 font-mono text-xs font-bold bg-black/20 px-2 py-0.5 rounded">
                <i class="fa-regular fa-clock text-[10px]"></i>
                <span class="order-duration-timer" data-time="${order.createdAt}">00:00</span>
              </div>
            </div>

            <!-- Customer & Order meta -->
            <div class="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-600">
              <span class="font-medium truncate max-w-[140px]"><i class="fa-regular fa-user mr-1 text-gray-400"></i>${order.customerName}</span>
              <span class="font-mono text-[11px] text-gray-400">${order.id}</span>
            </div>

            <!-- Order Items List -->
            <div class="p-4 space-y-2.5 max-h-72 overflow-y-auto">
              ${order.items.map(item => `
                <div class="flex items-start justify-between gap-2 border-b border-dashed border-gray-100 pb-2">
                  <div class="flex-1">
                    <div class="flex items-baseline gap-2">
                      <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-extrabold text-xs flex items-center justify-center flex-shrink-0">
                        ${item.qty}
                      </span>
                      <span class="font-bold text-gray-800 text-sm leading-snug">${item.name}</span>
                    </div>
                    ${item.variant ? `<p class="text-xs font-medium text-emerald-800 pl-7">Varian: ${item.variant}</p>` : ''}
                    ${item.notes ? `<p class="text-xs font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-1 ml-7 inline-block"><i class="fa-solid fa-pencil text-[9px] mr-1"></i>${item.notes}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Bottom Action Buttons -->
          <div class="p-3 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
            ${order.status === 'kitchen' ? `
              <button onclick="kds.markReady('${order.id}')" 
                class="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 active:scale-95">
                <i class="fa-solid fa-bell-concierge"></i> Siap Saji
              </button>
            ` : order.status === 'ready' ? `
              <button onclick="kds.markCompleted('${order.id}')" 
                class="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 active:scale-95">
                <i class="fa-solid fa-check-double"></i> Selesai Saji
              </button>
            ` : order.status === 'pending' ? `
              <button onclick="kds.markKitchen('${order.id}')" 
                class="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-1.5 active:scale-95">
                <i class="fa-solid fa-fire"></i> Masak Sekarang
              </button>
            ` : `
              <span class="text-xs text-emerald-700 font-bold mx-auto py-1"><i class="fa-solid fa-circle-check mr-1"></i>Pesanan Selesai</span>
            `}

            <button onclick="kds.printKitchenTicket('${order.id}')" 
              class="w-9 h-9 bg-white border border-gray-300 text-gray-600 hover:text-emerald-800 rounded-xl flex items-center justify-center text-xs shadow-sm hover:bg-gray-50" title="Cetak Tiket Dapur (KOT)">
              <i class="fa-solid fa-print"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  printKitchenTicket(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const printArea = document.getElementById('printable-receipt-area');
    if (!printArea) return;

    printArea.innerHTML = `
      <div id="receipt-container" class="receipt-80mm" style="font-family: monospace; font-size: 13px;">
        <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 8px;">
          <h2 style="margin: 0; font-size: 16px; font-weight: 900;">TIKET DAPUR / KOKI</h2>
          <h3 style="margin: 3px 0 0 0; font-size: 18px; font-weight: 900; background: #000; color: #fff; padding: 2px;">${order.tableNumber}</h3>
        </div>
        <div style="font-size: 11px; margin-bottom: 6px;">
          <div>No. Order: <strong>${order.id}</strong></div>
          <div>Waktu: ${Utils.formatDateTime(order.createdAt)}</div>
          <div>Pemesan: ${order.customerName || '-'}</div>
        </div>
        <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>
        <div style="font-size: 14px; font-weight: bold;">
          ${order.items.map(item => `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span>[ ${item.qty}X ] ${item.name}</span>
              </div>
              ${item.variant ? `<div style="font-size: 12px; padding-left: 20px;">* Varian: ${item.variant}</div>` : ''}
              ${item.notes ? `<div style="font-size: 12px; padding-left: 20px; font-weight: 900; text-decoration: underline;">! Ket: ${item.notes}</div>` : ''}
            </div>
          `).join('')}
        </div>
        <div style="border-top: 2px dashed #000; margin-top: 10px; padding-top: 5px; text-align: center; font-size: 11px;">
          === HARAP DISAJIKAN HANGAT & CEPAT ===
        </div>
      </div>
    `;

    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-receipt');
    }, 1000);
  }

  markKitchen(orderId) {
    store.updateOrderStatus(orderId, 'kitchen');
    this.renderKDSOrders();
  }

  markReady(orderId) {
    store.updateOrderStatus(orderId, 'ready');
    store.playNotificationSound('chime');
    this.renderKDSOrders();
  }

  markCompleted(orderId) {
    store.updateOrderStatus(orderId, 'completed');
    this.renderKDSOrders();
  }
}

window.kds = new KDSController();
