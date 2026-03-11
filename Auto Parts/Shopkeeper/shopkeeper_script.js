/* ═══════════════════════════════════════════════
   SHOPKEEPER DASHBOARD — Auto Parts Hunt (Supabase)
═══════════════════════════════════════════════ */

let session = null;
let shop    = null;
let parts   = [];
let editId  = null;
let deleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = APP.requireAuth('shopkeeper');
  if (!session) return;

  showLoading();
  shop = await APP.getShopByUserId(session.id);
  if (!shop) { showToast('⚠️ Shop not found. Please contact admin.'); return; }

  fillIdentity();
  await loadParts();
  await renderOrders();
  updateStats();
  hideLoading();
});

function g(id)  { return document.getElementById(id); }
function showLoading() { document.body.style.opacity = '0.6'; }
function hideLoading() { document.body.style.opacity = '1'; }

/* ── IDENTITY ── */
function fillIdentity() {
  const initials = (session.fname[0] + session.lname[0]).toUpperCase();
  const fullName  = session.fname + ' ' + session.lname;
  ['sidebarAv','topbarAv','profileAv'].forEach(id => { const el = g(id); if (el) el.textContent = initials; });
  g('sidebarName') && (g('sidebarName').textContent = fullName);
  g('shopChipName') && (g('shopChipName').textContent = shop.name);
  prefillProfile();
}

/* ── NAVIGATION ── */
function showSec(id, el) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  g('sec-' + id).classList.add('active');
  if (el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
  const titles = { inventory:'My Inventory', addpart:'Add New Part', orders:'Shop Orders', profile:'My Profile' };
  g('topbarTitle') && (g('topbarTitle').textContent = titles[id] || '');
  if (id === 'orders') renderOrders();
}
function goToAddPart()   { showSec('addpart',   document.querySelector('.nav-item')); }
function goToInventory() { showSec('inventory', document.querySelector('.nav-item')); }

/* ══════════════════════════════
   PARTS / INVENTORY
══════════════════════════════ */
async function loadParts() {
  parts = await APP.getShopParts(shop.id);
  renderList();
  updateStats();
}

function updateStats() {
  const active = parts.filter(p => p.active);
  const totalStock = parts.reduce((s,p) => s + Number(p.stock), 0);
  const totalValue = parts.reduce((s,p) => s + Number(p.price) * Number(p.stock), 0);
  if(g('st-total'))  g('st-total').textContent  = parts.length;
  if(g('st-active')) g('st-active').textContent = active.length;
  if(g('st-stock'))  g('st-stock').textContent  = totalStock;
  if(g('st-val'))  g('st-val').textContent  = 'PKR ' + totalValue.toLocaleString();
}

function renderList() {
  const q   = (g('searchParts')?.value || '').toLowerCase();
  const cat = g('filterCat')?.value || '';
  let list  = parts.filter(p => {
    const mq  = !q   || p.name.toLowerCase().includes(q);
    const mc  = !cat || p.cat === cat;
    return mq && mc;
  });
  const tbody = g('partsBody');
  if (!tbody) return;
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">📦</div><div style="font-weight:700;">No parts found</div><div style="margin-top:8px;font-size:13px;">Add your first part using the button above</div></td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr>
      <td><span style="background:#111;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;">${p.id}</span></td>
      <td style="font-weight:700;">${p.name}</td>
      <td style="color:#888;">${p.no || '—'}</td>
      <td>${p.make || '—'}</td>
      <td>${p.cat  || '—'}</td>
      <td>${p.cond || '—'}</td>
      <td style="font-weight:700;color:#E84800;">PKR ${Number(p.price).toLocaleString()}</td>
      <td>${p.stock}</td>
      <td>${p.active ? '<span style="background:#e6f9ed;color:#1a7a3c;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;">Active</span>' : '<span style="background:#f5f5f5;color:#aaa;font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;">Inactive</span>'}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button onclick="loadEdit('${p.id}')" style="padding:6px 14px;background:#111;color:#fff;border:none;border-radius:6px;font-family:Poppins,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Edit</button>
          <button onclick="askDelete('${p.id}')" style="padding:6px 14px;background:#fff;color:#E84800;border:1.5px solid #E84800;border-radius:6px;font-family:Poppins,sans-serif;font-size:12px;font-weight:700;cursor:pointer;">Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

/* ── SAVE PART ── */
async function savePart() {
  const name  = g('f-name')?.value.trim();
  const price = g('f-price')?.value.trim();
  const stock = g('f-stock')?.value.trim();
  if (!name)  { shake('p-name');  showToast('⚠️ Part name is required'); return; }
  if (!price) { shake('p-price'); showToast('⚠️ Price is required'); return; }
  if (!stock) { shake('p-stock'); showToast('⚠️ Stock is required'); return; }

  const data = {
    shopId: shop.id, shopName: shop.name,
    name,
    no:          g('f-no')?.value.trim()    || '',
    make:        g('f-make')?.value         || '',
    model:       g('f-model')?.value.trim() || '',
    year:        g('f-year')?.value.trim()  || '',
    cat:         g('f-cat')?.value          || '',
    cond:        g('f-cond')?.value         || '',
    price:       Number(price),
    stock:       Number(stock),
    description: g('f-desc')?.value.trim()  || '',
    img:         g('f-img')?.value.trim()   || '',
    active:      true
  };

  const btn = g('saveBtn');
  if (btn) { btn.textContent = '⏳ Saving...'; btn.disabled = true; }

  if (editId) {
    await APP.updatePart(editId, {
      name: data.name, no: data.no, make: data.make, model: data.model,
      year: data.year, cat: data.cat, cond: data.cond,
      price: data.price, stock: data.stock,
      description: data.description, img: data.img
    });
    editId = null;
    showToast('✓ Part updated successfully');
  } else {
    await APP.addPart(data);
    showToast('✓ Part added successfully');
  }

  if (btn) { btn.textContent = 'Save Part'; btn.disabled = false; }
  clearForm();
  await loadParts();
  showSec('inventory', null);
}

function loadEdit(id) {
  const p = parts.find(x => x.id === id);
  if (!p) return;
  editId = id;
  showSec('addpart', null);
  g('f-name')  && (g('f-name').value  = p.name);
  g('f-no')    && (g('f-no').value    = p.no    || '');
  g('f-make')  && (g('f-make').value  = p.make  || '');
  g('f-model') && (g('f-model').value = p.model || '');
  g('f-year')  && (g('f-year').value  = p.year  || '');
  g('f-cat')   && (g('f-cat').value   = p.cat   || '');
  g('f-cond')  && (g('f-cond').value  = p.cond  || '');
  g('f-price') && (g('f-price').value = p.price);
  g('f-stock') && (g('f-stock').value = p.stock);
  g('f-desc')  && (g('f-desc').value  = p.description || '');
  g('f-img')   && (g('f-img').value   = p.img   || '');
  g('formTitle') && (g('formTitle').textContent = 'Edit Part');
  g('cancelBtn') && (g('cancelBtn').style.display = 'inline-flex');
}

function cancelEdit() { editId = null; clearForm(); showSec('inventory', null); }

function clearForm() {
  ['f-name','f-no','f-model','f-year','f-price','f-stock','f-desc','f-img'].forEach(id => { const el = g(id); if (el) el.value = ''; });
  ['f-make','f-cat','f-cond'].forEach(id => { const el = g(id); if (el) el.value = ''; });
  if(g('formTitle')) g('formTitle').textContent = 'ADD NEW PART';
  if(g('cancelBtn')) g('cancelBtn').style.display = 'none';
  if(g('clearBtn'))  g('clearBtn').style.display  = 'none';
}

/* ── DELETE ── */
function askDelete(id) { deleteId = id; g('delModal') && (g('delModal').style.display = 'flex'); }

async function doDelete() {
  if (!deleteId) return;
  await APP.deletePart(deleteId);
  deleteId = null;
  g('delModal') && (g('delModal').style.display = 'none');
  await loadParts();
  showToast('🗑️ Part deleted');
}

/* ══════════════════════════════
   ORDERS
══════════════════════════════ */
async function renderOrders() {
  const tbody = g('ordersBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  const orders = await APP.getShopOrders(shop.id);
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">📦</div><div style="font-weight:700;">No orders yet</div><div style="font-size:13px;margin-top:6px;">Orders appear here when customers purchase your parts</div></td></tr>`;
    return;
  }
  const sc = { Processing:'processing', 'In Transit':'transit', Delivered:'delivered' };
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span style="background:#111;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;">${o.id}</span></td>
      <td style="font-weight:600;">${o.customer_name}</td>
      <td>${o.part_name}</td>
      <td>${o.qty}</td>
      <td style="font-weight:700;color:#E84800;">PKR ${Number(o.total).toLocaleString()}</td>
      <td><span style="font-size:10px;font-weight:700;letter-spacing:0.06em;padding:4px 10px;border-radius:20px;text-transform:uppercase;" class="pill ${sc[o.status]||'processing'}">${o.status}</span></td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px;border:1.5px solid #e5e5e5;border-radius:6px;font-family:Poppins,sans-serif;font-size:12px;">
          <option ${o.status==='Processing'  ?'selected':''}>Processing</option>
          <option ${o.status==='In Transit'  ?'selected':''}>In Transit</option>
          <option ${o.status==='Delivered'   ?'selected':''}>Delivered</option>
          <option ${o.status==='Cancelled'   ?'selected':''}>Cancelled</option>
        </select>
      </td>
    </tr>`).join('');
}

async function updateOrderStatus(orderId, status) {
  await APP.updateOrderStatus(orderId, status);
  showToast('✓ Status updated to: ' + status);
}

/* ══════════════════════════════
   PROFILE
══════════════════════════════ */
function prefillProfile() {
  g('pf-shopname') && (g('pf-shopname').value = shop.name);
  g('pf-owner')    && (g('pf-owner').value    = session.fname + ' ' + session.lname);
  g('pf-email')    && (g('pf-email').value    = session.email);
  g('pf-phone')    && (g('pf-phone').value    = session.phone || shop.phone || '');
  g('pf-city')     && (g('pf-city').value     = session.city  || shop.city  || '');
  g('pf-cnic')     && (g('pf-cnic').value     = shop.cnic     || '');
  g('pf-address')  && (g('pf-address').value  = shop.address  || '');
  g('pf-desc')     && (g('pf-desc').value     = shop.description || '');
}

async function saveProfile() {
  const shopUpdates = {
    name:        g('pf-shopname')?.value.trim() || shop.name,
    phone:       g('pf-phone')?.value.trim()    || '',
    cnic:        g('pf-cnic')?.value.trim()     || '',
    address:     g('pf-address')?.value.trim()  || '',
    description: g('pf-desc')?.value.trim()     || ''
  };
  await APP.updateShop(shop.id, shopUpdates);
  shop = { ...shop, ...shopUpdates };
  g('shopChipName') && (g('shopChipName').textContent = shop.name);
  showToast('✓ Profile saved');
}

/* ── LOGOUT & MODALS ── */
function confirmLogout() { g('logoutModal') && (g('logoutModal').style.display = 'flex'); }
function closeModal(id)  { const el = id ? g(id) : null; if (el) el.style.display = 'none'; else document.querySelectorAll('.modal-overlay').forEach(m => m.style.display='none'); }
function doLogout()      { APP.clearSession(); setTimeout(() => location.href = '/Login/login.HTML', 400); }
function toggleSidebar() { g('sidebar')?.classList.toggle('open'); }

function shake(id) {
  const el = g(id); if (!el) return;
  el.style.animation = 'none';
  el.style.borderColor = '#E84800';
  setTimeout(() => { el.style.animation = ''; el.style.borderColor = ''; }, 900);
}

let _tt;
function showToast(msg) {
  const t = g('toast');
  if (!t) return;
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3000);
}
