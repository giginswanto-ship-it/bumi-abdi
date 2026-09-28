/**
 * Table QR Code Generator & Tent Card Stand Manager
 * Allows printing individual & batch QR cards for tables with Bumi Abdi branding
 */

class QRGeneratorController {
  constructor() {
    this.selectedTable = 'Meja 01';
    this.customBaseUrl = '';
    this.init();
  }

  init() {
    this.initTableList();
    this.detectBaseUrl();
  }

  detectBaseUrl() {
    const loc = window.location;
    // Build path to order.html
    let path = loc.pathname;
    if (path.endsWith('index.html')) {
      path = path.replace('index.html', 'order.html');
    } else if (path.endsWith('/')) {
      path = path + 'order.html';
    } else {
      const parts = path.split('/');
      parts.pop();
      path = parts.join('/') + '/order.html';
    }
    
    // Default URL
    this.defaultBaseUrl = `${loc.protocol}//${loc.host}${path}`;
    const urlInput = document.getElementById('qr-base-url-input');
    if (urlInput) {
      urlInput.value = this.defaultBaseUrl;
    }
  }

  initTableList() {
    const select = document.getElementById('qr-table-select');
    if (!select) return;

    const settings = store.getSettings();
    const count = settings.totalTables || 20;

    let html = '';
    for (let i = 1; i <= count; i++) {
      const num = String(i).padStart(2, '0');
      html += `<option value="Meja ${num}">Meja ${num}</option>`;
    }
    html += '<option value="VIP 01">VIP 01 (AC)</option>';
    html += '<option value="VIP 02">VIP 02 (AC)</option>';
    html += '<option value="Lesehan 01">Lesehan 01</option>';
    html += '<option value="Lesehan 02">Lesehan 02</option>';
    html += '<option value="Lesehan 03">Lesehan 03</option>';
    html += '<option value="Takeaway / Bungkus">Takeaway / Bungkus</option>';

    select.innerHTML = html;
    select.addEventListener('change', (e) => {
      this.selectedTable = e.target.value;
      this.generateSinglePreview();
    });

    this.generateSinglePreview();
  }

  getQrUrlForTable(table) {
    const customUrl = document.getElementById('qr-base-url-input')?.value.trim();
    const baseUrl = customUrl || this.defaultBaseUrl;
    const cleanTable = encodeURIComponent(table);
    
    if (baseUrl.includes('?')) {
      return `${baseUrl}&table=${cleanTable}`;
    }
    return `${baseUrl}?table=${cleanTable}`;
  }

  generateSinglePreview() {
    const targetUrl = this.getQrUrlForTable(this.selectedTable);
    const container = document.getElementById('single-qr-container');
    const tableBadge = document.getElementById('preview-table-name');
    const targetUrlDisplay = document.getElementById('preview-target-url');

    if (tableBadge) tableBadge.innerText = this.selectedTable;
    if (targetUrlDisplay) targetUrlDisplay.innerText = targetUrl;

    if (container) {
      container.innerHTML = '';
      new QRCode(container, {
        text: targetUrl,
        width: 180,
        height: 180,
        colorDark: "#1E3711",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }

  testCustomerOrderView() {
    const url = this.getQrUrlForTable(this.selectedTable);
    window.open(url, '_blank');
  }

  printSingleTentCard() {
    const previewCard = document.getElementById('single-tent-card-preview');
    const printArea = document.getElementById('printable-qr-area');
    if (!previewCard || !printArea) return;

    printArea.innerHTML = '';
    const clone = previewCard.cloneNode(true);
    clone.style.margin = '0 auto';
    printArea.appendChild(clone);

    document.body.classList.add('printing-qr');
    window.print();
    setTimeout(() => {
      document.body.classList.remove('printing-qr');
    }, 1000);
  }

  printAllTentCards() {
    const printArea = document.getElementById('printable-qr-area');
    if (!printArea) return;

    const settings = store.getSettings();
    const totalTables = settings.totalTables || 20;

    const tablesToGenerate = [];
    for (let i = 1; i <= totalTables; i++) {
      tablesToGenerate.push(`Meja ${String(i).padStart(2, '0')}`);
    }
    tablesToGenerate.push('VIP 01', 'VIP 02', 'Lesehan 01', 'Lesehan 02');

    printArea.innerHTML = '';

    tablesToGenerate.forEach((table, idx) => {
      const targetUrl = this.getQrUrlForTable(table);
      const cardDiv = document.createElement('div');
      cardDiv.className = 'table-tent-card p-6 border-2 border-amber-600 rounded-2xl bg-white shadow-md text-center flex flex-col items-center justify-between';
      cardDiv.style.pageBreakInside = 'avoid';
      cardDiv.style.marginBottom = '20px';

      cardDiv.innerHTML = `
        <div class="flex items-center gap-3 mb-3">
          <img src="assets/logo.png" alt="Logo" class="w-14 h-14 rounded-full border-2 border-emerald-800">
          <div class="text-left">
            <h3 class="font-extrabold text-base text-emerald-950 uppercase tracking-tight">BUMI ABDI</h3>
            <p class="text-[11px] font-semibold text-amber-700">AYAM GORENG KAMPUNG</p>
            <p class="text-[9px] text-gray-500 italic">Asli. Gurih. Berkah.</p>
          </div>
        </div>

        <div class="w-full bg-emerald-900 text-amber-400 py-1.5 px-4 rounded-xl font-extrabold text-lg uppercase tracking-wider mb-3 shadow-inner">
          ${table}
        </div>

        <div class="p-3 bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl mb-3 flex items-center justify-center" id="batch-qr-${idx}">
        </div>

        <div class="space-y-1">
          <p class="font-extrabold text-xs text-emerald-950 uppercase tracking-wide">
            <i class="fa-solid fa-camera mr-1 text-amber-600"></i> SCAN MENU & PESAN DARI MEJA
          </p>
          <p class="text-[10px] text-gray-500 leading-tight">
            Arahkan kamera HP ke QR Code di atas untuk memilih menu & langsung pesan
          </p>
        </div>

        <div class="w-full mt-3 pt-2 border-t border-gray-200 flex justify-between text-[9px] text-gray-400">
          <span>Wi-Fi Resto: BumiAbdi_Free</span>
          <span>Password: berkah88</span>
        </div>
      `;

      printArea.appendChild(cardDiv);

      // Render QR in this div
      setTimeout(() => {
        const qrBox = document.getElementById(`batch-qr-${idx}`);
        if (qrBox) {
          new QRCode(qrBox, {
            text: targetUrl,
            width: 150,
            height: 150,
            colorDark: "#1E3711",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
        }
      }, 50);
    });

    setTimeout(() => {
      document.body.classList.add('printing-qr');
      window.print();
      setTimeout(() => {
        document.body.classList.remove('printing-qr');
      }, 1000);
    }, 400);
  }
}

window.qrGen = new QRGeneratorController();
