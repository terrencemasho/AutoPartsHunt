/* ═══════════════════════════════════════════════
   ADMIN SCRIPT — Auto Parts Hunt (Supabase)
═══════════════════════════════════════════════ */

let session = null;

document.addEventListener('DOMContentLoaded', async () => {
  session = APP.requireAuth('admin');
  if (!session) return;
  startClock();
  await Promise.all([renderShops(), renderUsers(), renderParts(), renderOrders(), renderReviews()]);
  updateOverview();
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
  const titles = { shops:'Shops Management', users:'User Management', parts:'All Parts', orders:'All Orders', reviews:'Reviews', overview:'System Overview' };
  set('tbTitle', titles[id] || '');
  if (id === 'shops')    await renderShops();
  if (id === 'users')    await renderUsers();
  if (id === 'parts')    await renderParts();
  if (id === 'orders')   await renderOrders();
  if (id === 'reviews')  await renderReviews();
  if (id === 'overview') await updateOverview();
}

/* ── OVERVIEW ── */
async function updateOverview() {
  const [shops, users, parts, orders] = await Promise.all([APP.getShops(), APP.getUsers(), APP.getParts(), APP.getOrders()]);
  const nonAdmin = users.filter(u => u.role !== 'admin');
  const revenue  = orders.reduce((s, o) => s + Number(o.total), 0);

  set('nb-pending', shops.filter(s => !s.verified).length);
  set('nb-users',   nonAdmin.length);
  set('nb-parts',   parts.length);
  set('nb-orders',  orders.length);
  set('sv-total',    shops.length);
  set('sv-verified', shops.filter(s => s.verified).length);
  set('sv-pending',  shops.filter(s => !s.verified).length);
  set('sv-active',   shops.filter(s => s.active).length);
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
  const shops  = await APP.getShops();
  const q      = (g('shopQ')?.value || '').toLowerCase();
  const filter = g('shopFilter')?.value || '';

  // Update stats
  set('sv-total',    shops.length);
  set('sv-verified', shops.filter(s => s.verified).length);
  set('sv-pending',  shops.filter(s => !s.verified).length);
  set('sv-active',   shops.filter(s => s.active).length);
  set('nb-pending',  shops.filter(s => !s.verified).length);

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
      <td><button class="toggle-active-btn ${u.active?'deactivate':''}" onclick="toggleUser('${u.id}')">${u.active?'Deactivate':'Activate'}</button></td>
    </tr>`).join('');
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
  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</td></tr>`;
  const orders = await APP.getOrders();
  set('nb-orders', orders.length);
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">📦</div><div style="font-weight:700;font-size:15px;">No orders yet</div></td></tr>`;
    return;
  }
  const sc = { Processing:'processing', 'In Transit':'transit', Delivered:'delivered', Cancelled:'inactive-p' };
  tbody.innerHTML = orders.map(o => `
    <tr>
      <td><span class="idbadge">${o.id}</span></td>
      <td style="font-weight:600;">${o.customer_name}</td>
      <td>${o.part_name}</td>
      <td style="color:#888;">${o.shop_name}</td>
      <td>${o.qty}</td>
      <td class="orange" style="font-weight:700;">PKR ${Number(o.total).toLocaleString()}</td>
      <td><span class="pill ${sc[o.status]||'processing'}">${o.status}</span></td>
      <td style="color:#888;">${o.date}</td>
    </tr>`).join('');
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
function toggleSidebar() { g('sidebar')?.classList.toggle('open'); }

let _tt;
function showToast(msg) {
  const t = g('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3000);
}
