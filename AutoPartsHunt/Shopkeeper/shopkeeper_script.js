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
  try {
    shop = await APP.getShopByUserId(session.id);
    if (!shop) { showToast('⚠️ Shop not found. Please contact admin.'); return; }

    fillIdentity();
    await loadParts();
    await renderOrders();
    updateStats();

    // ── Check if shop address is set; prompt if missing ──
    if (!shop.address || !shop.address.trim()) {
      setTimeout(() => openAddressPromptModal(), 600);
    }
  } catch (e) {
    console.error('Dashboard init error:', e);
    showToast('⚠️ Error loading dashboard. Please refresh.');
  } finally {
    hideLoading();
  }
});

function g(id)  { return document.getElementById(id); }
function showLoading() {
  const ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'flex';
}
function hideLoading() {
  const ov = document.getElementById('loadingOverlay');
  if (ov) ov.style.display = 'none';
}

/* ── IDENTITY ── */
function fillIdentity() {
  const initials = (session.fname[0] + session.lname[0]).toUpperCase();
  const fullName  = session.fname + ' ' + session.lname;
  ['sidebarAv','topbarAv','profileAv'].forEach(id => { const el = g(id); if (el) el.textContent = initials; });
  g('sidebarName') && (g('sidebarName').textContent = fullName);
  g('shopChipName') && (g('shopChipName').textContent = shop.name);
  updateVerificationUI();
  prefillProfile();
}

/* ── VERIFICATION STATUS UI ── */
function updateVerificationUI() {
  const badge  = g('verifyBadge');
  const status = g('verifyStatus');
  const verifyBtn = g('verifyNowBtn');

  if (shop.verified) {
    if (badge)  { badge.textContent = '✓ Verified'; badge.className = 'verify-badge verified'; }
    if (status) { status.innerHTML  = '<span class="verify-status-pill verified">✓ Verified</span>'; }
    if (verifyBtn) verifyBtn.style.display = 'none';
  } else {
    if (badge)  { badge.textContent = '⏳ Pending'; badge.className = 'verify-badge'; }
    if (status) { status.innerHTML  = '<span class="verify-status-pill pending">Pending Verification</span>'; }
    if (verifyBtn) verifyBtn.style.display = 'inline-flex';
  }
}

/* ── NAVIGATION ── */
function showSec(id, el) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  g('sec-' + id).classList.add('active');
  if (el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
  const titles = { inventory:'My Inventory', addpart:'Add New Part', orders:'Shop Orders', profile:'My Profile', ai:'AI Assistant' };
  g('topbarTitle') && (g('topbarTitle').textContent = titles[id] || '');
  if (id === 'orders') renderOrders();
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 900) closeSidebar();
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
  if(g('st-val'))    g('st-val').textContent    = 'PKR ' + totalValue.toLocaleString();
  // Nav badges
  if(g('nb-parts'))  g('nb-parts').textContent  = parts.length;
}

function renderList() {
  const q   = (g('listQ')?.value || g('searchParts')?.value || '').toLowerCase();
  const cat = g('listCat')?.value || g('filterCat')?.value || '';
  let list  = parts.filter(p => {
    const mq  = !q   || p.name.toLowerCase().includes(q);
    const mc  = !cat || p.cat === cat;
    return mq && mc;
  });
  const tbody = g('partsBody');
  if (!tbody) return;
  if(g('listCount')) g('listCount').textContent = list.length + ' part' + (list.length !== 1 ? 's' : '');
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
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

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
  showToast('Part deleted');
}

/* ══════════════════════════════
   ORDERS
══════════════════════════════ */
let _allOrders = [];   // cached for client-side filtering
let _payMap    = {};   // cached payment map

async function renderOrders() {
  const tbody = g('ordersBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  try {
    _allOrders = await APP.getShopOrders(shop.id);
    if (g('nb-orders')) g('nb-orders').textContent = _allOrders.length;

    const allPay = await APP.getAllPayments();
    _payMap = {};
    allPay.forEach(p => { _payMap[p.order_id] = p; });

    renderOrderRows(_allOrders);
  } catch (e) {
    console.error('renderOrders error:', e);
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#c93d00;">⚠️ Failed to load orders. Please refresh.</td></tr>`;
  }
}

function filterOrders() {
  const q          = (g('orderSearchInput')?.value  || '').toLowerCase().trim();
  const statusVal  = g('orderStatusFilter')?.value  || '';
  const payVal     = g('orderPayFilter')?.value     || '';

  let filtered = _allOrders.filter(o => {
    const pay = _payMap[o.id];
    const payStatus = pay?.payment_status || '';
    if (q && !o.id.toLowerCase().includes(q) && !(o.customer_name||'').toLowerCase().includes(q) && !(o.part_name||'').toLowerCase().includes(q)) return false;
    if (statusVal && o.status !== statusVal) return false;
    if (payVal    && payStatus !== payVal)   return false;
    return true;
  });

  renderOrderRows(filtered);
}

function clearOrderFilters() {
  if (g('orderSearchInput'))  g('orderSearchInput').value  = '';
  if (g('orderStatusFilter')) g('orderStatusFilter').value = '';
  if (g('orderPayFilter'))    g('orderPayFilter').value    = '';
  renderOrderRows(_allOrders);
}

function renderOrderRows(orders) {
  const tbody = g('ordersBody');
  if (!tbody) return;

  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">📦</div><div style="font-weight:700;">${_allOrders.length ? 'No orders match your filters' : 'No orders yet'}</div><div style="font-size:13px;margin-top:6px;">${_allOrders.length ? 'Try adjusting the search or filters above' : 'Orders appear here when customers purchase your parts'}</div></td></tr>`;
    return;
  }

  const sc = { Processing:'processing', 'In Transit':'transit', Delivered:'delivered' };
  const ps = { Completed:'pay-completed', Pending:'pay-pending', Failed:'pay-failed' };

  tbody.innerHTML = orders.map(o => {
    const pay     = _payMap[o.id];
    const method  = pay?.payment_method ? pay.payment_method.toUpperCase() : '—';
    const status  = pay?.payment_status || '—';
    const psClass = ps[status] || 'pay-pending';
    return `
    <tr>
      <td><span style="background:#111;color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:4px;">${o.id}</span></td>
      <td style="font-weight:600;">${o.customer_name}</td>
      <td>${o.part_name}</td>
      <td>${o.qty}</td>
      <td style="font-weight:700;color:#E84800;">PKR ${Number(o.total).toLocaleString()}</td>
      <td><span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;background:#f0f0f0;color:#333;">${method}</span></td>
      <td><span class="pay-status-pill ${psClass}">${status}</span></td>
      <td><span style="font-size:10px;font-weight:700;letter-spacing:0.06em;padding:4px 10px;border-radius:20px;text-transform:uppercase;" class="pill ${sc[o.status]||'processing'}">${o.status}</span></td>
      <td>
        <select onchange="updateOrderStatus('${o.id}', this.value)" style="padding:6px 10px;border:1.5px solid #e5e5e5;border-radius:6px;font-family:Poppins,sans-serif;font-size:12px;">
          <option ${o.status==='Processing'?'selected':''}>Processing</option>
          <option ${o.status==='In Transit'?'selected':''}>In Transit</option>
          <option ${o.status==='Delivered' ?'selected':''}>Delivered</option>
          <option ${o.status==='Cancelled' ?'selected':''}>Cancelled</option>
        </select>
      </td>
    </tr>`;
  }).join('');
}

async function updateOrderStatus(orderId, status) {
  await APP.updateOrderStatus(orderId, status);
  showToast('✓ Status updated to: ' + status);

  // ── Fix 1: update local cache and re-render immediately (no round-trip flicker) ──
  const idx = _allOrders.findIndex(o => o.id === orderId);
  if (idx !== -1) {
    _allOrders[idx] = { ..._allOrders[idx], status };
  }
  renderOrderRows(_allOrders);

  // Send delivery confirmation email via NotificationService
  if (status === 'Delivered') {
    try {
      const orders = await APP.getShopOrders(shop.id);
      const order  = orders.find(o => o.id === orderId);
      if (order) {
        const users = await DB.query('users', { filter: `id=eq.${order.customer_id}` });
        const customerEmail = users[0] ? users[0].email : null;
        // ── Fix 2: pass shopPhone so it appears in the delivery email ──
        await window.Notify.sendDeliveryConfirmation({
          toEmail:  customerEmail,
          toName:   order.customer_name,
          orderId:  order.id,
          partName: order.part_name,
          shopName: order.shop_name,
          shopPhone: shop.phone || session.phone || '',
          total:    order.total
        });
      }
    } catch(e) { console.error('[NotificationService] Delivery email failed:', e); }
  }
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

/* ── DELETE ACCOUNT ── */
function confirmDeleteAccount() {
  g('deleteAccountModal') && (g('deleteAccountModal').style.display = 'flex');
}

async function doDeleteAccount() {
  closeModal();
  showToast('⏳ Deleting account, shop and parts...');
  await APP.deleteUserAccount(session.id);
  APP.clearSession();
  setTimeout(() => location.href = '/Login/login.HTML', 1400);
}

/* ── LOGOUT & MODALS ── */
function confirmLogout() { g('logoutModal') && (g('logoutModal').style.display = 'flex'); }
function closeModal(id)  { 
  if (id) { 
    const el = g(id); if (el) el.style.display = 'none'; 
  } else { 
    document.querySelectorAll('.modal-ov').forEach(m => m.style.display='none'); 
  } 
}
function doLogout()      { APP.clearSession(); setTimeout(() => location.href = '/Login/login.HTML', 400); }
function toggleSidebar() {
  const isOpen = g('sidebar')?.classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  g('sidebar')?.classList.add('open');
  g('sidebarOverlay')?.classList.add('active');
  const btn = g('sidebarToggleBtn');
  if (btn) btn.innerHTML = '&#x2715;';
}
function closeSidebar() {
  g('sidebar')?.classList.remove('open');
  g('sidebarOverlay')?.classList.remove('active');
  const btn = g('sidebarToggleBtn');
  if (btn) btn.innerHTML = '&#9776;';
}

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

/* ══════════════════════════════════════════════
   VERIFICATION PAYMENT MODAL
══════════════════════════════════════════════ */
let selectedVerifyMethod = null;

function openVerifyModal() {
  selectedVerifyMethod = null;
  g('verifyModal') && (g('verifyModal').style.display = 'flex');
  document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('selected'));
  g('verifyPayFields') && (g('verifyPayFields').innerHTML = '');
  g('verifySubmitBtn') && (g('verifySubmitBtn').style.display = 'none');
}

function closeVerifyModal() {
  g('verifyModal') && (g('verifyModal').style.display = 'none');
}

function selectVerifyMethod(method) {
  selectedVerifyMethod = method;
  document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.pay-opt[data-method="${method}"]`) && document.querySelector(`.pay-opt[data-method="${method}"]`).classList.add('selected');

  const fields = g('verifyPayFields');
  if (!fields) return;

  if (method === 'card') {
    fields.innerHTML = `
      <div class="pfg full"><label>CARDHOLDER NAME</label><input type="text" id="vf-name" placeholder="As on card"/></div>
      <div class="pfg full"><label>CARD NUMBER</label><input type="text" id="vf-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="fmtCard(this)"/></div>
      <div class="pfg"><label>EXPIRY</label><input type="text" id="vf-exp" placeholder="MM/YY" maxlength="5"/></div>
      <div class="pfg"><label>CVV</label><input type="text" id="vf-cvv" placeholder="•••" maxlength="3"/></div>
      <div class="pfg full" style="background:#fff8e1;border-radius:8px;padding:10px 14px;font-size:12px;color:#888;border:1px solid #ffe082;">
        💳 Verification fee: <strong style="color:#E84800;">PKR 500</strong> (one-time)
      </div>`;
  } else if (method === 'easypaisa') {
    fields.innerHTML = `
      <div class="pfg full"><label>EASYPAISA MOBILE NUMBER</label><input type="text" id="vf-ep" placeholder="03XX-XXXXXXX"/></div>
      <div class="pfg full" style="background:#e8f5e9;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #a5d6a7;">
        📱 A payment request of <strong style="color:#2e7d32;">PKR 500</strong> will be sent to your Easypaisa number.
      </div>`;
  } else if (method === 'jazzcash') {
    fields.innerHTML = `
      <div class="pfg full"><label>JAZZCASH MOBILE NUMBER</label><input type="text" id="vf-jc" placeholder="03XX-XXXXXXX"/></div>
      <div class="pfg full" style="background:#fce4ec;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #f48fb1;">
        📱 A payment request of <strong style="color:#c62828;">PKR 500</strong> will be sent to your JazzCash number.
      </div>`;
  }

  g('verifySubmitBtn') && (g('verifySubmitBtn').style.display = 'inline-flex');
}

function fmtCard(el) {
  let v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
}

async function submitVerifyPayment() {
  if (!selectedVerifyMethod) { showToast('⚠️ Please select a payment method'); return; }

  const btn = g('verifySubmitBtn');
  if (btn) { btn.textContent = 'Processing...'; btn.disabled = true; }

  // Simulate payment processing (2 seconds)
  await new Promise(r => setTimeout(r, 2000));

  // Mark shop as verified (payment confirmed) and record payment_submitted flag
  await APP.updateShop(shop.id, { verified: true, payment_submitted: true });
  shop.verified          = true;
  shop.payment_submitted = true;

  // Insert verification payment record into payments table
  await APP.insertPayment({
    orderId:       'VERIFY-' + shop.id,
    amount:        500,
    paymentMethod: selectedVerifyMethod,
    paymentStatus: 'Pending'
  });

  if (btn) { btn.textContent = '✅ Submit Payment'; btn.disabled = false; }
  closeVerifyModal();
  updateVerificationUI();
  showToast('Shop verified! Your shop is now active.');

  // Send notification email
  await sendNotification({
    type: 'verification_payment',
    shopName: shop.name,
    method: selectedVerifyMethod,
    email: session.email,
    phone: session.phone
  });
}

/* ══════════════════════════════════════════════
   ORDER PAYMENT MODAL
══════════════════════════════════════════════ */
let pendingOrderData  = null;
let selectedPayMethod = null;

function openPaymentModal(orderData) {
  pendingOrderData   = orderData;
  selectedPayMethod  = null;
  document.querySelectorAll('.pay-opt').forEach(b => b.classList.remove('selected'));
  const total = g('payModalTotal');
  if (total) total.textContent = 'PKR ' + Number(orderData.total + 200).toLocaleString();
  g('payFields')     && (g('payFields').innerHTML = '');
  g('paySubmitBtn')  && (g('paySubmitBtn').style.display = 'none');
  g('paymentModal')  && (g('paymentModal').style.display = 'flex');
}

function closePaymentModal() {
  g('paymentModal') && (g('paymentModal').style.display = 'none');
  pendingOrderData = null;
}

function selectPayMethod(method) {
  selectedPayMethod = method;
  document.querySelectorAll('.order-pay-opt').forEach(b => b.classList.remove('selected'));
  document.querySelector(`.order-pay-opt[data-method="${method}"]`) && document.querySelector(`.order-pay-opt[data-method="${method}"]`).classList.add('selected');

  const fields = g('payFields');
  if (!fields) return;

  if (method === 'cod') {
    fields.innerHTML = `<div style="background:#fff8e1;border-radius:8px;padding:12px 16px;font-size:13px;color:#555;border:1px solid #ffe082;text-align:center;">🏠 Pay with cash when your order arrives. No extra charges.</div>`;
  } else if (method === 'card') {
    fields.innerHTML = `
      <div class="pfg full"><label>CARDHOLDER NAME</label><input type="text" id="of-name" placeholder="As on card"/></div>
      <div class="pfg full"><label>CARD NUMBER</label><input type="text" id="of-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="fmtCard(this)"/></div>
      <div class="pfg"><label>EXPIRY</label><input type="text" id="of-exp" placeholder="MM/YY" maxlength="5"/></div>
      <div class="pfg"><label>CVV</label><input type="text" id="of-cvv" placeholder="•••" maxlength="3"/></div>`;
  } else if (method === 'easypaisa') {
    fields.innerHTML = `
      <div class="pfg full"><label>EASYPAISA MOBILE NUMBER</label><input type="text" id="of-ep" placeholder="03XX-XXXXXXX"/></div>
      <div style="background:#e8f5e9;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #a5d6a7;margin-top:8px;">
        📱 A payment request will be sent to your Easypaisa number.
      </div>`;
  } else if (method === 'jazzcash') {
    fields.innerHTML = `
      <div class="pfg full"><label>JAZZCASH MOBILE NUMBER</label><input type="text" id="of-jc" placeholder="03XX-XXXXXXX"/></div>
      <div style="background:#fce4ec;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #f48fb1;margin-top:8px;">
        📱 A payment request will be sent to your JazzCash number.
      </div>`;
  }

  g('paySubmitBtn') && (g('paySubmitBtn').style.display = 'inline-flex');
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS (SMTP Email + SMS)
══════════════════════════════════════════════ */

/* ══════════════════════════════════════════════
   AI ASSISTANT
══════════════════════════════════════════════ */
let skAiMode = 'inventory';
const skAiModes = {
  inventory: {
    desc: 'Ask for advice on managing your inventory, what parts to stock, or how to improve your listings.',
    placeholder: 'e.g. Which parts are most in demand in Lahore for Toyota vehicles?'
  },
  pricing: {
    desc: 'Get help with competitive pricing strategies for your auto parts business.',
    placeholder: 'e.g. How should I price used brake pads compared to new ones?'
  },
  customer: {
    desc: 'Tips and strategies to attract more customers and grow your shop.',
    placeholder: 'e.g. How can I improve my shop listing to get more orders?'
  }
};

function setAiMode(mode, el) {
  skAiMode = mode;
  document.querySelectorAll('.sk-ai-mode-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  const cfg = skAiModes[mode] || skAiModes.inventory;
  const desc = g('aiModeDesc');
  const inp  = g('sk-ai-input');
  if (desc) desc.textContent = cfg.desc;
  if (inp)  inp.placeholder  = cfg.placeholder;
  const res = g('skAiResult');
  if (res) res.style.display = 'none';
}

const SK_GEMINI_KEY = 'AIzaSyDwqJKWYiQ7YP7iXs3Sc-mV-Jvu9YQh4GA';
const SK_GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + SK_GEMINI_KEY;

/* ── Lightweight markdown → HTML renderer for AI responses ── */
function renderMarkdown(md) {
  // Escape raw HTML to prevent injection
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headings: ### ## #
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin:14px 0 4px;font-size:13px;font-weight:700;color:#111;">$1</h4>');
  html = html.replace(/^## (.+)$/gm,  '<h3 style="margin:16px 0 6px;font-size:14px;font-weight:700;color:#111;">$1</h3>');
  html = html.replace(/^# (.+)$/gm,   '<h2 style="margin:16px 0 6px;font-size:15px;font-weight:700;color:#111;">$1</h2>');

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic: *text* (single, not preceded/followed by another *)
  html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

  // Bullet lists: lines starting with * or - (after headings are handled)
  // Group consecutive list items into a <ul>
  html = html.replace(/^[*\-] (.+)$/gm, '<li style="margin:3px 0;">$1</li>');
  html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>)(\n<li)/g, '$1<li');
  html = html.replace(/(<li[\s\S]+?<\/li>)/g, '<ul style="padding-left:20px;margin:8px 0;">$1</ul>');

  // Numbered lists: lines starting with "1. "
  html = html.replace(/^\d+\. (.+)$/gm, '<oli>$1</oli>');
  html = html.replace(/(<oli>[\s\S]*?<\/oli>)/g, (match) => {
    const items = match.replace(/<\/?oli>/g, '').trim().split('\n').map(i => `<li style="margin:3px 0;">${i}</li>`).join('');
    return `<ol style="padding-left:20px;margin:8px 0;">${items}</ol>`;
  });

  // Paragraphs: double newlines → <p>
  html = html.replace(/\n{2,}/g, '</p><p style="margin:8px 0;">');
  html = '<p style="margin:0 0 8px;">' + html + '</p>';

  // Single newlines inside paragraphs → <br>
  html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');

  // Clean up empty paragraphs
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');

  return html;
}

async function runShopkeeperAI() {
  const inp = g('sk-ai-input');
  const question = inp ? inp.value.trim() : '';
  if (!question) {
    if (inp) inp.style.borderColor = '#E84800';
    showToast('⚠️ Please enter a question');
    return;
  }

  const btn = g('skAiRunBtn');
  const txt = g('skAiBtnTxt');
  if (btn) btn.disabled = true;
  if (txt) txt.textContent = 'Thinking...';

  const modePrompts = {
    inventory: 'You are an expert auto parts business advisor for Pakistani shopkeepers. Give practical, concise inventory and stock advice.',
    pricing:   'You are an expert auto parts pricing consultant familiar with Pakistani market rates. Give specific, actionable pricing advice.',
    customer:  'You are a business growth expert for auto parts shops in Pakistan. Give practical tips to attract and retain more customers.'
  };
  const systemCtx = modePrompts[skAiMode] || modePrompts.inventory;

  const resultBox = g('skAiResult');
  const resultTxt = g('skAiResultText');

  try {
    const res = await fetch(SK_GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemCtx + '\n\nShopkeeper question: ' + question }] }]
      })
    });
    if (!res.ok) throw new Error('API error ' + res.status);
    const data = await res.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received.';
    if (resultBox) resultBox.style.display = 'block';
    if (resultTxt) resultTxt.innerHTML      = renderMarkdown(answer);
  } catch(e) {
    if (resultBox) resultBox.style.display = 'block';
    if (resultTxt) resultTxt.innerHTML      = '⚠️ Could not get a response. Please try again in a moment.';
  } finally {
    if (btn) btn.disabled = false;
    if (txt) txt.textContent = '🤖 Ask AI';
  }
}

/* ══════════════════════════════════════════════
   ADDRESS PROMPT MODAL
   Shown on first load when shop.address is empty
══════════════════════════════════════════════ */
function openAddressPromptModal() {
  const modal = g('addressPromptModal');
  if (modal) modal.style.display = 'flex';
}

function closeAddressPromptModal() {
  const modal = g('addressPromptModal');
  if (modal) modal.style.display = 'none';
}

async function saveAddressFromPrompt() {
  const input = g('prompt-address');
  if (!input || !input.value.trim()) {
    input && (input.style.borderColor = '#E84800');
    showToast('⚠️ Please enter your shop address'); return;
  }
  const btn = g('promptAddressSaveBtn');
  if (btn) { btn.textContent = 'Saving...'; btn.disabled = true; }

  const address = input.value.trim();
  await APP.updateShop(shop.id, { address });
  shop.address = address;

  // Also update the profile form field if visible
  g('pf-address') && (g('pf-address').value = address);

  if (btn) { btn.textContent = '✅ Save Address'; btn.disabled = false; }
  closeAddressPromptModal();
  showToast('Shop address saved! Customers can now find you.');
}

async function sendNotification({ type, shopName, customerName, customerEmail, email, phone, method }) {
  if (type === 'verification_payment') {
    await window.Notify.sendVerificationSubmitted({
      toEmail:  email || customerEmail || '',
      toName:   customerName || shopName || '',
      shopName: shopName,
      method:   method
    });
  }
}
