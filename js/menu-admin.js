/**
 * Menu Management Controller for BUMI ABDI RESTO
 */

class MenuAdminController {
  constructor() {
    this.editingItemId = null;
    this.searchQuery = '';
    this.categoryFilter = 'all';
    this.init();
  }

  setSearchQuery(q) {
    this.searchQuery = (q || '').toLowerCase();
    this.renderAdminTable();
  }

  setCategoryFilter(cat) {
    this.categoryFilter = cat;
    this.renderAdminTable();
  }

  init() {
    this.renderAdminTable();
    this.initCategoryOptions();

    store.subscribe((type) => {
      if (type === 'MENU_UPDATED') {
        this.renderAdminTable();
      }
    });
  }

  initCategoryOptions() {
    const select = document.getElementById('menu-form-category');
    if (!select) return;

    const categories = window.DEFAULT_CATEGORIES.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(c => `
      <option value="${c.id}">${c.name}</option>
    `).join('');
  }

  renderAdminTable() {
    const tableBody = document.getElementById('menu-admin-table-body');
    if (!tableBody) return;

    const menu = store.getMenu();
    let filtered = menu.filter(item => {
      const matchCat = this.categoryFilter === 'all' || item.category === this.categoryFilter;
      const matchQuery = !this.searchQuery || 
        item.name.toLowerCase().includes(this.searchQuery) ||
        (item.code && item.code.toLowerCase().includes(this.searchQuery));
      return matchCat && matchQuery;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="py-8 text-center text-gray-400">Tidak ada menu yang sesuai dengan filter.</td></tr>`;
      return;
    }

    tableBody.innerHTML = filtered.map((item, index) => {
      const categoryObj = window.DEFAULT_CATEGORIES.find(c => c.id === item.category);
      const catName = categoryObj ? categoryObj.name : item.category;
      const isAvailable = item.status !== 'out_of_stock';

      return `
        <tr class="hover:bg-gray-50 border-b border-gray-100 transition-colors">
          <td class="px-4 py-3 text-xs text-gray-400 font-mono text-center">${index + 1}</td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <img src="${item.image || 'assets/logo.png'}" alt="${item.name}" 
                class="w-12 h-12 rounded-xl object-cover border border-gray-200 flex-shrink-0"
                onerror="this.src='assets/logo.png'">
              <div>
                <p class="font-bold text-gray-900 text-sm">${item.name}</p>
                <span class="font-mono text-xs text-gray-400">${item.code || '-'}</span>
                ${item.isBestSeller ? '<span class="ml-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">Favorit</span>' : ''}
              </div>
            </div>
          </td>
          <td class="px-4 py-3">
            <span class="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
              ${catName}
            </span>
          </td>
          <td class="px-4 py-3 font-extrabold text-emerald-800 text-sm">
            ${Utils.formatRupiah(item.price)}
          </td>
          <td class="px-4 py-3 text-center">
            <button onclick="menuAdmin.toggleStock('${item.id}')" 
              class="px-2.5 py-1 rounded-full text-xs font-bold transition-all ${isAvailable ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-red-100 text-red-800 hover:bg-red-200'}">
              <i class="fa-solid ${isAvailable ? 'fa-check' : 'fa-ban'} mr-1"></i>
              ${isAvailable ? 'Tersedia' : 'Habis'}
            </button>
          </td>
          <td class="px-4 py-3 text-right">
            <div class="flex items-center justify-end gap-2">
              <button onclick="menuAdmin.openEditModal('${item.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Menu">
                <i class="fa-regular fa-pen-to-square"></i>
              </button>
              <button onclick="menuAdmin.deleteItem('${item.id}')" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Menu">
                <i class="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  toggleStock(id) {
    const menu = store.getMenu();
    const item = menu.find(m => m.id === id);
    if (item) {
      const newStatus = item.status === 'out_of_stock' ? 'available' : 'out_of_stock';
      store.updateMenuItem(id, { status: newStatus });
      pos.renderMenuItems();
    }
  }

  openAddModal() {
    this.editingItemId = null;
    document.getElementById('menu-modal-title').innerText = 'Tambah Menu Baru';
    document.getElementById('menu-form').reset();
    document.getElementById('menu-form-code').value = 'AGK-' + Math.floor(10 + Math.random() * 90);
    
    const modal = document.getElementById('menu-form-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  openEditModal(id) {
    const menu = store.getMenu();
    const item = menu.find(m => m.id === id);
    if (!item) return;

    this.editingItemId = id;
    document.getElementById('menu-modal-title').innerText = 'Edit Menu';
    document.getElementById('menu-form-name').value = item.name;
    document.getElementById('menu-form-code').value = item.code || '';
    document.getElementById('menu-form-category').value = item.category;
    document.getElementById('menu-form-price').value = item.price;
    document.getElementById('menu-form-cost').value = item.cost || 0;
    document.getElementById('menu-form-desc').value = item.description || '';
    document.getElementById('menu-form-image').value = item.image || '';
    document.getElementById('menu-form-variants').value = (item.variants || []).join(', ');
    document.getElementById('menu-form-bestseller').checked = !!item.isBestSeller;

    const modal = document.getElementById('menu-form-modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }

  closeModal() {
    const modal = document.getElementById('menu-form-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }

  saveMenuItem(e) {
    e.preventDefault();

    const name = document.getElementById('menu-form-name').value.trim();
    const code = document.getElementById('menu-form-code').value.trim();
    const category = document.getElementById('menu-form-category').value;
    const price = parseInt(document.getElementById('menu-form-price').value, 10) || 0;
    const cost = parseInt(document.getElementById('menu-form-cost').value, 10) || 0;
    const description = document.getElementById('menu-form-desc').value.trim();
    const image = document.getElementById('menu-form-image').value.trim() || 'assets/logo.png';
    const variantsRaw = document.getElementById('menu-form-variants').value.trim();
    const variants = variantsRaw ? variantsRaw.split(',').map(v => v.trim()).filter(Boolean) : [];
    const isBestSeller = document.getElementById('menu-form-bestseller').checked;

    if (!name || price <= 0) {
      alert('Mohon isi nama menu dan harga yang valid!');
      return;
    }

    const payload = {
      name,
      code,
      category,
      price,
      cost,
      description,
      image,
      variants,
      isBestSeller,
      status: 'available'
    };

    if (this.editingItemId) {
      store.updateMenuItem(this.editingItemId, payload);
    } else {
      store.addMenuItem(payload);
    }

    this.closeModal();
    pos.renderMenuItems();
    pos.renderCategories();
    pos.showToast('Menu berhasil disimpan!');
  }

  deleteItem(id) {
    if (confirm('Yakin ingin menghapus menu ini?')) {
      store.deleteMenuItem(id);
      pos.renderMenuItems();
      pos.showToast('Menu telah dihapus.');
    }
  }

  resetToDefault() {
    if (confirm('Kembalikan semua menu ke setelan standar Ayam Goreng Kampung BUMI ABDI? Data kustom akan direset.')) {
      store.resetMenuToDefault();
      pos.renderMenuItems();
      pos.renderCategories();
      pos.showToast('Menu telah direset ke default.');
    }
  }
}

window.menuAdmin = new MenuAdminController();
