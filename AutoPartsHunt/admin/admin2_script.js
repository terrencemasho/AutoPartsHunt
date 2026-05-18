/* ═══════════════════════════════════════════════
   ADMIN SCRIPT — Auto Parts Hunt (Supabase)
═══════════════════════════════════════════════ */

let session = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = APP.requireAuth('admin');
  if (!session) return;
  startClock();
  // Load overview stats first (fast), then shops and users
  // Orders and payments are heavy — load only when navigated to
  await Promise.all([renderShops(), renderUsers(), updateOverview()]);
});

function g(id)      { return document.getElementById(id); }
function set(id, v) { const el = g(id); if (el) el.textContent = v; }

function startClock() {
  const tick = () => set('clock', new Date().toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit', second:'2-digit' }));
  tick(); setInterval(tick, 1000);
}

async function showSec(id, el) {
  document.querySelectorAll('.sec').forEach(s => s.classList.remove('active'));
  g('sec-' + id).classList.add('active');
  if (el) { document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); el.classList.add('active'); }
  const titles = { shops:'Shops Management', users:'User Management', parts:'All Parts', orders:'All Orders', reviews:'Reviews', payments:'Payments', overview:'System Overview' };
  set('tbTitle', titles[id] || '');
  if (id === 'shops')    await renderShops();
  if (id === 'users')    await renderUsers();
  if (id === 'parts')    await renderParts();
  if (id === 'orders')   await renderOrders();
  if (id === 'reviews')  await renderReviews();
  if (id === 'payments') await renderPayments();
  if (id === 'overview') await updateOverview();
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 900) closeSidebar();
}

/* ── OVERVIEW ── */
async function updateOverview() {
  const [shops, users, parts, orders, payments] = await Promise.all([
    APP.getShops(), APP.getUsers(), APP.getParts(), APP.getOrders(), APP.getAllPayments()
  ]);
  const nonAdmin = users.filter(u => u.role !== 'admin');
  const revenue  = orders.reduce((s, o) => s + Number(o.total), 0);

  // Nav badges
  set('nb-shops',    shops.length);
  set('nb-users',    nonAdmin.length);
  set('nb-parts',    parts.length);
  set('nb-orders',   orders.length);
  set('nb-payments', payments.length);

  // Shop stats panel
  set('sv-total',    shops.length);
  set('sv-verified', shops.filter(s => s.verified).length);
  set('sv-pending',  shops.filter(s => !s.verified).length);
  set('sv-active',   shops.filter(s => s.active).length);

  // Overview cards
  set('ov-shops',   shops.length);
  set('ov-users',   nonAdmin.length);
  set('ov-parts',   parts.length);
  set('ov-orders',  orders.length);
  set('ov-revenue', 'PKR ' + revenue.toLocaleString());
}

/* ── SHOPS ── */
async function renderShops() {
  const tbody  = g('shopsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  try {
  const shops  = await APP.getShops();
  const q      = (g('shopQ')?.value || '').toLowerCase();
  const filter = g('shopFilter')?.value || '';

  // Update stats
  set('sv-total',    shops.length);
  set('sv-verified', shops.filter(s => s.verified).length);
  set('sv-pending',  shops.filter(s => !s.verified).length);
  set('sv-active',   shops.filter(s => s.active).length);
  set('nb-shops',    shops.length);

  const filtered = shops.filter(s => {
    const mq = !q || s.name.toLowerCase().includes(q) || s.owner.toLowerCase().includes(q) || (s.city||'').toLowerCase().includes(q);
    const mf = !filter || (filter==='verified' && s.verified) || (filter==='pending' && !s.verified);
    return mq && mf;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">🏪</div><div style="font-weight:700;font-size:15px;">No shops registered yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(s => `
    <tr>
      <td><span class="idbadge">${s.id}</span></td>
      <td><div style="font-weight:700;">${s.name}</div><div style="font-size:11px;color:#aaa;">${s.joined||''}</div></td>
      <td>${s.owner}</td>
      <td>${s.city||'—'}</td>
      <td>${s.phone||'—'}</td>
      <td>${s.verified ? '<span class="pill active-p">✓ Verified</span>' : '<span class="pill transit">⏳ Pending</span>'}</td>
      <td>${s.active  ? '<span class="pill delivered">Active</span>'    : '<span class="pill inactive-p">Inactive</span>'}</td>
      <td><div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${!s.verified ? `<button class="verify-btn" onclick="verifyShop('${s.id}')">✓ Verify</button>` : ''}
        <button class="toggle-active-btn ${s.active?'deactivate':''}" onclick="toggleShopActive('${s.id}')">${s.active?'Deactivate':'Activate'}</button>
      </div></td>
    </tr>`).join('');
  } catch (e) {
    console.error('renderShops error:', e);
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#c93d00;">⚠️ Failed to load shops. Please try again.</td></tr>`;
  }
}

async function verifyShop(id) {
  await APP.updateShop(id, { verified: true });
  await renderShops(); await updateOverview();
  showToast('✓ Shop verified');
}

async function toggleShopActive(id) {
  const shops = await APP.getShops();
  const shop  = shops.find(s => s.id === id);
  if (shop) await APP.updateShop(id, { active: !shop.active });
  await renderShops();
  showToast('✓ Shop status updated');
}

/* ── USERS ── */
async function renderUsers() {
  const tbody = g('usersBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  const allUsers = await APP.getUsers();
  const nonAdmin = allUsers.filter(u => u.role !== 'admin');
  const q        = (g('userQ')?.value || '').toLowerCase();
  const filter   = g('userFilter')?.value || '';
  set('nb-users', nonAdmin.length);

  const filtered = nonAdmin.filter(u => {
    const mq = !q || (u.fname+' '+u.lname).toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const mf = !filter || u.role === filter;
    return mq && mf;
  });

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">👥</div><div style="font-weight:700;font-size:15px;">No users yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td><span class="idbadge">${u.id}</span></td>
      <td><div style="font-weight:700;">${u.fname} ${u.lname}</div></td>
      <td style="color:#888;">${u.email}</td>
      <td><span class="pill ${u.role==='shopkeeper'?'transit':'processing'}">${u.role}</span></td>
      <td>${u.city||'—'}</td>
      <td style="color:#888;">${u.joined||'—'}</td>
      <td>${u.active ? '<span class="pill active-p">Active</span>' : '<span class="pill inactive-p">Inactive</span>'}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="toggle-active-btn ${u.active?'deactivate':''}" onclick="toggleUser('${u.id}')">${u.active?'Deactivate':'Activate'}</button>
          <button class="del-btn-sm" onclick="adminDeleteUser('${u.id}','${u.fname} ${u.lname}','${u.role}')">🗑️ Delete</button>
        </div>
      </td>
    </tr>`).join('');
}

async function adminDeleteUser(id, name, role) {
  const msg = role === 'shopkeeper'
    ? `Delete ${name}? This will also delete their shop and all listed parts.`
    : `Delete ${name}? This will permanently remove their account.`;
  showConfirm('🗑️', 'Delete User?', msg, async () => {
    await APP.deleteUserAccount(id);
    await renderUsers();
    await updateOverview();
    showToast('🗑️ User deleted');
  });
}

async function toggleUser(id) {
  const users = await APP.getUsers();
  const user  = users.find(u => u.id === id);
  if (user) await APP.updateUser(id, { active: !user.active });
  await renderUsers();
  showToast('✓ User status updated');
}

/* ── PARTS ── */
async function renderParts() {
  const tbody = g('partsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  const allParts = await APP.getParts();
  const q        = (g('partsQ')?.value || '').toLowerCase();
  const filtered = !q ? allParts : allParts.filter(p => p.name.toLowerCase().includes(q) || (p.shop_name||'').toLowerCase().includes(q) || (p.make||'').toLowerCase().includes(q));
  set('nb-parts', allParts.length);
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">⚙️</div><div style="font-weight:700;font-size:15px;">No parts listed yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><span class="idbadge">${p.id}</span></td>
      <td><div style="font-weight:700;">${p.name}</div><div style="font-size:11px;color:#aaa;">${p.no||'—'}</div></td>
      <td>${p.shop_name||'—'}</td>
      <td>${p.make||'—'}</td>
      <td>${p.cat||'—'}</td>
      <td class="orange" style="font-weight:700;">PKR ${Number(p.price).toLocaleString()}</td>
      <td>${p.stock}</td>
      <td>${p.active ? '<span class="pill active-p">Active</span>' : '<span class="pill inactive-p">Inactive</span>'}</td>
      <td><button class="del-btn-sm" onclick="removePart('${p.id}')">🗑️ Remove</button></td>
    </tr>`).join('');
}

async function removePart(id) {
  showConfirm('🗑️','Remove Part?','This will permanently delete this part.', async () => {
    await APP.deletePart(id);
    await renderParts(); await updateOverview();
    showToast('🗑️ Part removed');
  });
}

/* ── ORDERS ── */
async function renderOrders() {
  const tbody = g('adminOrdersBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  try {
    const orders = await APP.getOrders();
    set('nb-orders', orders.length);
    if (!orders.length) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">📦</div><div style="font-weight:700;font-size:15px;">No orders yet</div></td></tr>`;
      return;
    }

    // Fetch payments individually per order to avoid IN filter issues
    const payMap = {};
    const payments = await APP.getAllPayments();
    payments.forEach(p => { payMap[p.order_id] = p; });

    const sc = { Processing:'processing', 'In Transit':'transit', Delivered:'delivered', Cancelled:'inactive-p' };
    const ps = { Completed:'pay-completed', Pending:'pay-pending', Failed:'pay-failed' };

    tbody.innerHTML = orders.map(o => {
      const pay     = payMap[o.id];
      const method  = pay && pay.payment_method ? pay.payment_method.toUpperCase() : '—';
      const pStatus = pay && pay.payment_status ? pay.payment_status : '—';
      const psClass = ps[pStatus] || 'pay-pending';
      return `
      <tr>
        <td><span class="idbadge">${o.id}</span></td>
        <td style="font-weight:600;">${o.customer_name}</td>
        <td>${o.part_name}</td>
        <td style="color:#888;">${o.shop_name}</td>
        <td>${o.qty}</td>
        <td class="orange" style="font-weight:700;">PKR ${Number(o.total).toLocaleString()}</td>
        <td><span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;background:#f0f0f0;color:#333;">${method}</span></td>
        <td><span class="pay-status-pill ${psClass}">${pStatus}</span></td>
        <td><span class="pill ${sc[o.status]||'processing'}">${o.status}</span></td>
        <td style="color:#888;">${o.date}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('renderOrders error:', e);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#c93d00;">⚠️ Failed to load orders. Please try again.</td></tr>`;
  }
}

/* ── PAYMENTS ── */
async function renderPayments() {
  const tbody = g('paymentsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;

  try {
  const allPayments = await APP.getAllPayments();
  const q           = (g('payQ')?.value      || '').toLowerCase();
  const statusF     = g('payFilter')?.value  || '';
  const methodF     = (g('payMethodFilter')?.value || '').toLowerCase();

  // Stats
  const completed = allPayments.filter(p => p.payment_status === 'Completed');
  const pending   = allPayments.filter(p => p.payment_status === 'Pending');
  const revenue   = completed.reduce((s, p) => s + Number(p.amount), 0);
  set('pay-total-count',     allPayments.length);
  set('pay-completed-count', completed.length);
  set('pay-pending-count',   pending.length);
  set('pay-revenue',         'PKR ' + revenue.toLocaleString());
  set('nb-payments',         allPayments.length);

  const filtered = allPayments.filter(p => {
    const pm = (p.payment_method || '').toLowerCase();
    const ps_ = p.payment_status || '';
    const mq = !q      || (p.id||'').toLowerCase().includes(q) || (p.order_id||'').toLowerCase().includes(q) || pm.includes(q);
    const ms = !statusF || ps_ === statusF;
    const mm = !methodF || pm === methodF;
    return mq && ms && mm;
  });

  set('payCount', filtered.length + ' payment' + (filtered.length !== 1 ? 's' : ''));

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">💳</div><div style="font-weight:700;font-size:15px;">No payments found</div></td></tr>`;
    return;
  }

  const ps = { Completed:'pay-completed', Pending:'pay-pending', Failed:'pay-failed' };
  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td><span class="idbadge">${p.id}</span></td>
      <td><span class="idbadge" style="background:#333;">${p.order_id}</span></td>
      <td class="orange" style="font-weight:700;">PKR ${Number(p.amount).toLocaleString()}</td>
      <td><span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;background:#f0f0f0;color:#333;">${(p.payment_method || '—').toUpperCase()}</span></td>
      <td><span class="pay-status-pill ${ps[p.payment_status]||'pay-pending'}">${p.payment_status || '—'}</span></td>
      <td style="color:#888;">${p.payment_date}</td>
      <td>
        ${p.payment_status === 'Pending'
          ? `<button class="verify-btn" onclick="markPaymentComplete('${p.id}')">✓ Mark Paid</button>`
          : '<span style="color:#aaa;font-size:12px;">—</span>'}
      </td>
    </tr>`).join('');
  } catch (e) {
    console.error('renderPayments error:', e);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#c93d00;">⚠️ Failed to load payments. Please try again.</td></tr>`;
  }
}

async function markPaymentComplete(payId) {
  await APP.updatePaymentStatus(payId, 'Completed');
  await renderPayments();
  showToast('✓ Payment marked as Completed');
}

/* ── REVIEWS ── */
async function renderReviews() {
  const tbody = g('reviewsBody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  const reviews = await APP.getReviews();
  if (!reviews.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">⭐</div><div style="font-weight:700;font-size:15px;">No reviews yet</div></td></tr>`;
    return;
  }
  tbody.innerHTML = reviews.map(r => `
    <tr>
      <td><span class="idbadge">${r.id}</span></td>
      <td style="font-weight:600;">${r.customer_name}</td>
      <td>${r.part_name}</td>
      <td>
        <span style="color:#E84800;font-size:15px;">${'⭐'.repeat(r.rating)}</span>
        <span style="font-size:11px;font-weight:700;color:#888;margin-left:4px;">${r.rating}/5</span>
      </td>
      <td style="color:#555;font-style:italic;max-width:200px;">${r.comment || '<span style="color:#ccc;">No comment</span>'}</td>
      <td style="color:#888;">${r.date}</td>
      <td><button class="del-btn-sm" onclick="deleteReview('${r.id}')">🗑️ Remove</button></td>
    </tr>`).join('');
}

async function deleteReview(id) {
  showConfirm('🗑️','Remove Review?','This will permanently delete this review.', async () => {
    await APP.deleteReview(id);
    await renderReviews();
    showToast('🗑️ Review removed');
  });
}

/* ── CONFIRM MODAL ── */
function showConfirm(icon, title, desc, onConfirm) {
  set('mIcon', icon); set('mTitle', title); set('mDesc', desc);
  g('mConfirmBtn').onclick = () => { closeModal(); onConfirm(); };
  g('confirmModal').style.display = 'flex';
}

function confirmLogout() { g('logoutModal').style.display = 'flex'; }
function doLogout()      { closeModal(); APP.clearSession(); setTimeout(() => location.href = '/Login/login.HTML', 400); }
function closeModal()    { document.querySelectorAll('.modal-ov').forEach(m => m.style.display = 'none'); }
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

let _tt;
function showToast(msg) {
  const t = g('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3000);
}
