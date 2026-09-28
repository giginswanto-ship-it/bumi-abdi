/**
 * Sales Reports, Analytics & Transaction History Controller
 */

class ReportsController {
  constructor() {
    this.salesChart = null;
    this.dateFilter = 'today'; // 'today', '7days', 'month', 'all'
    this.init();
  }

  init() {
    this.initEventListeners();
    this.renderReports();

    store.subscribe((type) => {
      if (type === 'ORDERS_UPDATED') {
        this.renderReports();
      }
    });
  }

  initEventListeners() {
    const filterSelect = document.getElementById('report-date-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.dateFilter = e.target.value;
        this.renderReports();
      });
    }
  }

  getFilteredOrders() {
    const orders = store.getOrders();
    const now = new Date();

    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      if (this.dateFilter === 'today') {
        return orderDate.toDateString() === now.toDateString();
      } else if (this.dateFilter === '7days') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      } else if (this.dateFilter === 'month') {
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }

  renderReports() {
    const orders = this.getFilteredOrders();
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled');

    // KPI Calculations
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalTransactions = paidOrders.length;
    const totalItemsSold = paidOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);
    const aov = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    // Update KPI Elements
    document.getElementById('kpi-total-revenue').innerText = Utils.formatRupiah(totalRevenue);
    document.getElementById('kpi-total-tx').innerText = `${totalTransactions} Transaksi`;
    document.getElementById('kpi-total-items').innerText = `${totalItemsSold} Porsi`;
    document.getElementById('kpi-aov').innerText = Utils.formatRupiah(aov);

    this.renderTransactionsTable(orders);
    this.renderSalesChart(paidOrders);
    this.renderTopSellingItems(paidOrders);
  }

  renderTransactionsTable(orders) {
    const tableBody = document.getElementById('report-transactions-table-body');
    if (!tableBody) return;

    if (orders.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400">Tidak ada riwayat transaksi pada periode ini.</td></tr>`;
      return;
    }

    tableBody.innerHTML = orders.map(order => `
      <tr class="hover:bg-gray-50 border-b border-gray-100 text-xs">
        <td class="px-4 py-3 font-mono font-bold text-gray-800">${order.id}</td>
        <td class="px-4 py-3 text-gray-500">${Utils.formatDateTime(order.createdAt)}</td>
        <td class="px-4 py-3 font-semibold text-gray-800">${order.tableNumber} <span class="text-gray-400">(${order.customerName})</span></td>
        <td class="px-4 py-3">${Utils.getStatusBadge(order.status)}</td>
        <td class="px-4 py-3">${Utils.getPaymentBadge(order.paymentStatus, order.paymentMethod)}</td>
        <td class="px-4 py-3 font-extrabold text-emerald-800 text-right">${Utils.formatRupiah(order.total)}</td>
        <td class="px-4 py-3 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="pos.showReceiptModal(store.getOrders().find(o => o.id === '${order.id}'))" class="p-1.5 text-gray-600 hover:text-emerald-800 hover:bg-emerald-50 rounded" title="Lihat Struk">
              <i class="fa-solid fa-receipt"></i>
            </button>
            ${order.paymentStatus === 'unpaid' ? `
              <button onclick="reports.markPaidModal('${order.id}')" class="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold">
                Lunasi
              </button>
            ` : ''}
            ${order.status !== 'cancelled' ? `
              <button onclick="reports.voidOrder('${order.id}')" class="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded" title="Batalkan / Void Transaksi">
                <i class="fa-solid fa-ban"></i>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  }

  voidOrder(orderId) {
    if (confirm(`Apakah Anda yakin ingin membatalkan (VOID) nota ${orderId}? Data omset akan otomatis disesuaikan.`)) {
      store.updateOrderStatus(orderId, 'cancelled');
      pos.showToast(`Nota ${orderId} telah dibatalkan (VOID)`, 'default');
      this.renderReports();
    }
  }

  renderTopSellingItems(paidOrders) {
    const container = document.getElementById('top-selling-items-container');
    if (!container) return;

    const itemCounts = {};
    paidOrders.forEach(o => {
      o.items.forEach(item => {
        if (!itemCounts[item.name]) {
          itemCounts[item.name] = { qty: 0, revenue: 0, image: item.image };
        }
        itemCounts[item.name].qty += item.qty;
        itemCounts[item.name].revenue += item.price * item.qty;
      });
    });

    const sorted = Object.entries(itemCounts)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 5);

    if (sorted.length === 0) {
      container.innerHTML = '<p class="text-xs text-gray-400 py-4 text-center">Belum ada penjualan tercatat</p>';
      return;
    }

    container.innerHTML = sorted.map(([name, data], idx) => `
      <div class="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
        <div class="flex items-center gap-3">
          <span class="w-6 h-6 rounded-full ${idx === 0 ? 'bg-amber-400 text-emerald-950' : 'bg-gray-200 text-gray-700'} font-black text-xs flex items-center justify-center">
            ${idx + 1}
          </span>
          <div>
            <p class="font-bold text-gray-800 text-xs">${name}</p>
            <p class="text-[10px] text-gray-500">${data.qty} Porsi terjual</p>
          </div>
        </div>
        <span class="font-bold text-xs text-emerald-800">${Utils.formatRupiah(data.revenue)}</span>
      </div>
    `).join('');
  }

  renderSalesChart(paidOrders) {
    const canvas = document.getElementById('sales-chart-canvas');
    if (!canvas || !window.Chart) return;

    // Group by hour or day
    const labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
    const dataPoints = [0, 0, 0, 0, 0, 0, 0, 0];

    paidOrders.forEach(order => {
      const h = new Date(order.createdAt).getHours();
      if (h < 10) dataPoints[0] += order.total;
      else if (h < 12) dataPoints[1] += order.total;
      else if (h < 14) dataPoints[2] += order.total;
      else if (h < 16) dataPoints[3] += order.total;
      else if (h < 18) dataPoints[4] += order.total;
      else if (h < 20) dataPoints[5] += order.total;
      else if (h < 22) dataPoints[6] += order.total;
      else dataPoints[7] += order.total;
    });

    if (this.salesChart) {
      this.salesChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Omset Penjualan (Rp)',
          data: dataPoints,
          borderColor: '#2C4E1A',
          backgroundColor: 'rgba(44, 78, 26, 0.12)',
          fill: true,
          tension: 0.35,
          pointBackgroundColor: '#C5882B',
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => 'Rp ' + (value >= 1000 ? (value/1000) + 'k' : value)
            }
          }
        }
      }
    });
  }

  markPaidModal(orderId) {
    const orders = store.getOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirm(`Pelunasan untuk ${order.tableNumber} senilai ${Utils.formatRupiah(order.total)}?`)) {
      store.updateOrderPayment(orderId, 'cash', order.total, 0);
      pos.showToast(`Pesanan ${order.id} berhasil dilunasi!`, 'success');
      this.renderReports();
    }
  }

  exportCSV() {
    const orders = this.getFilteredOrders();
    if (orders.length === 0) {
      alert('Tidak ada data untuk diekspor.');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'ID Transaksi,Waktu,Meja,Pelanggan,Tipe,Status,Metode Bayar,Subtotal,Diskon,Pajak,Total\n';

    orders.forEach(o => {
      const row = [
        o.id,
        Utils.formatDateTime(o.createdAt),
        `"${o.tableNumber}"`,
        `"${o.customerName}"`,
        o.orderType,
        o.status,
        o.paymentMethod,
        o.subtotal,
        o.discount,
        o.tax,
        o.total
      ];
      csvContent += row.join(',') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Penjualan_Bumi_Abdi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  printDailyClosingReport() {
    const orders = this.getFilteredOrders();
    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const settings = store.getSettings();

    const totalCash = paidOrders.filter(o => o.paymentMethod === 'cash').reduce((s, o) => s + o.total, 0);
    const totalQRIS = paidOrders.filter(o => o.paymentMethod === 'qris').reduce((s, o) => s + o.total, 0);
    const totalDebit = paidOrders.filter(o => o.paymentMethod === 'debit' || o.paymentMethod === 'transfer').reduce((s, o) => s + o.total, 0);
    const grandTotal = paidOrders.reduce((s, o) => s + o.total, 0);

    const reportHtml = `
      <div id="receipt-container" class="receipt-80mm">
        <div class="text-center pb-2">
          <h3 class="font-extrabold text-base uppercase">${settings.restoName}</h3>
          <p class="text-xs font-bold">LAPORAN REKAP TUTUP KASIR (Z-REPORT)</p>
          <p class="text-[10px] text-gray-500">Tanggal: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
          <p class="text-[10px] text-gray-500">Waktu Cetak: ${new Date().toLocaleTimeString('id-ID')}</p>
        </div>

        <div class="receipt-double-divider"></div>

        <div class="text-xs space-y-1.5">
          <div class="flex justify-between"><span>Total Transaksi:</span><strong>${paidOrders.length} Nota</strong></div>
          <div class="flex justify-between"><span>Kas Masuk (Cash):</span><span>${Utils.formatRupiah(totalCash)}</span></div>
          <div class="flex justify-between"><span>Non-Tunai QRIS:</span><span>${Utils.formatRupiah(totalQRIS)}</span></div>
          <div class="flex justify-between"><span>Debit / Transfer:</span><span>${Utils.formatRupiah(totalDebit)}</span></div>
          
          <div class="receipt-divider"></div>
          <div class="flex justify-between font-extrabold text-sm">
            <span>TOTAL OMSET:</span>
            <span>${Utils.formatRupiah(grandTotal)}</span>
          </div>
        </div>

        <div class="receipt-divider"></div>
        <div class="text-center text-[10px] text-gray-500 pt-3">
          <p>Tanda Tangan Kasir / Supervisor</p>
          <br><br>
          <p>( _______________________ )</p>
        </div>
      </div>
    `;

    const printArea = document.getElementById('printable-receipt-area');
    if (printArea) {
      printArea.innerHTML = reportHtml;
      document.body.classList.add('printing-receipt');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-receipt');
      }, 1000);
    }
  }
}

window.reports = new ReportsController();
