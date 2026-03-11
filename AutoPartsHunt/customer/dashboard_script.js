/* ═══════════════════════════════════════════════
   CUSTOMER DASHBOARD — Auto Parts Hunt (Supabase)
═══════════════════════════════════════════════ */

let session  = null;
let cart     = [];
let wishlist = [];

document.addEventListener('DOMContentLoaded', async () => {
  session = APP.requireAuth('customer');
  if (!session) return;

  const initials = (session.fname[0] + session.lname[0]).toUpperCase();
  const fullName  = session.fname + ' ' + session.lname;
  g('sidebarAv').textContent   = initials;
  g('sidebarName').textContent = fullName;
  g('topbarAv').textContent    = initials;
  g('profileAv').textContent   = initials;

  wishlist = JSON.parse(localStorage.getItem('wishlist_' + session.id) || '[]');

  showLoading('partsGrid');
  const parts = await APP.getActiveParts();
  renderParts(parts);
  await updateStats();
  updateCartBadge();
  updateWishBadge();
});

/* ── HELPERS ── */
function g(id) { return document.getElementById(id); }
function showLoading(id) {
  const el = g(id);
  if (el) el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:#aaa;"><div style="font-size:36px;margin-bottom:12px;">⏳</div><div style="font-weight:700;">Loading...</div></div>`;
}

/* ── NAVIGATION ── */
function showSection(id, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  g('sec-' + id).classList.add('active');
  if (el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');
  }
  const titles = { browse:'Browse Parts', cart:'Cart', orders:'My Orders', wishlist:'Wishlist', track:'Track Order', reviews:'My Reviews', profile:'Profile' };
  g('topbarTitle').textContent = titles[id] || '';
  if (id === 'orders')   renderOrders();
  if (id === 'wishlist') renderWishlist();
  if (id === 'cart')     renderCart();
  if (id === 'profile')  prefillProfile();
  if (id === 'reviews')  renderMyReviews();
}

/* ── STATS ── */
async function updateStats() {
  const myOrders = await APP.getCustomerOrders(session.id);
  const active   = myOrders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
  const spent    = myOrders.reduce((s, o) => s + Number(o.total), 0);
  g('stat-orders').textContent = myOrders.length;
  g('stat-active').textContent = active;
  g('stat-spent').textContent  = 'PKR ' + spent.toLocaleString();
  g('stat-wish').textContent   = wishlist.length;
}

/* ══════════════════════════════
   BROWSE PARTS
══════════════════════════════ */
function renderParts(parts) {
  const grid  = g('partsGrid');
  const empty = g('emptyState');
  const count = g('resultCount');
  if (!parts || !parts.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    count.textContent   = 'No parts found';
    return;
  }
  empty.style.display = 'none';
  count.textContent   = `Showing ${parts.length} part${parts.length !== 1 ? 's' : ''}`;
  grid.innerHTML = parts.map(p => `
    <div class="part-card" id="card-${p.id}">
      ${p.img
        ? `<img class="part-card-img" src="${p.img}" alt="${p.name}" onerror="this.style.background='#f5f5f5'"/>`
        : `<div class="part-card-img" style="display:flex;align-items:center;justify-content:center;font-size:36px;background:#f5f5f5;">⚙️</div>`}
      <div class="part-card-body">
        <div class="part-name">${p.name}</div>
        <div class="part-meta">${p.make || ''}${p.cat ? ' · ' + p.cat : ''}</div>
        <div class="part-meta" style="color:#E84800;font-weight:600;">${p.shop_name || ''}</div>
        ${p.cond ? `<div class="part-meta" style="color:#888;">${p.cond}</div>` : ''}
        <div class="part-price">PKR ${Number(p.price).toLocaleString()}</div>
        ${p.stock <= 0 ? `<div style="font-size:11px;color:#c93d00;font-weight:700;margin-top:4px;">Out of Stock</div>` : ''}
      </div>
      <div class="part-card-footer">
        <button class="add-cart-btn" onclick="addToCart('${p.id}')" ${p.stock <= 0 ? 'disabled style="opacity:0.4;"' : ''}>
          ${p.stock <= 0 ? 'Out of Stock' : '+ Add to Cart'}
        </button>
        <button class="wish-btn ${wishlist.includes(p.id) ? 'active' : ''}" id="wish-${p.id}" onclick="toggleWish('${p.id}')">
          ${wishlist.includes(p.id) ? '❤️' : '🤍'}
        </button>
      </div>
    </div>`).join('');
}

async function filterParts() {
  const q    = (g('searchInput').value || '').toLowerCase().trim();
  const make = g('filterMake').value;
  const cat  = g('filterCat').value;
  const sort = g('sortBy').value;
  let parts  = await APP.getActiveParts();
  if (q)    parts = parts.filter(p => p.name.toLowerCase().includes(q) || (p.shop_name||'').toLowerCase().includes(q) || (p.make||'').toLowerCase().includes(q));
  if (make) parts = parts.filter(p => p.make === make);
  if (cat)  parts = parts.filter(p => p.cat  === cat);
  if (sort === 'price-asc')  parts.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') parts.sort((a,b) => b.price - a.price);
  if (sort === 'name')       parts.sort((a,b) => a.name.localeCompare(b.name));
  renderParts(parts);
}

/* ══════════════════════════════
   CART
══════════════════════════════ */
async function addToCart(partId) {
  const parts = await APP.getActiveParts();
  const part  = parts.find(p => p.id === partId);
  if (!part)           { showToast('⚠️ Part not found'); return; }
  if (part.stock <= 0) { showToast('⚠️ Out of stock'); return; }
  const existing = cart.find(c => c.partId === partId);
  if (existing) {
    if (existing.qty >= part.stock) { showToast('⚠️ Max stock reached'); return; }
    existing.qty++;
  } else {
    cart.push({ partId, qty: 1 });
  }
  updateCartBadge();
  showToast(`🛒 ${part.name} added to cart`);
}

function removeFromCart(partId) { cart = cart.filter(c => c.partId !== partId); updateCartBadge(); renderCart(); }
function clearCart()            { cart = []; updateCartBadge(); renderCart(); }

function changeQty(partId, delta) {
  const item = cart.find(c => c.partId === partId);
  if (item) { item.qty = Math.max(1, item.qty + delta); renderCart(); updateCartBadge(); }
}

function updateCartBadge() {
  const total = cart.reduce((s,c) => s + c.qty, 0);
  document.querySelectorAll('.cart-count, #cartCount').forEach(el => el.textContent = total);
}

async function renderCart() {
  const cartItems   = g('cartItems');
  const cartSummary = g('cartSummary');
  if (!cart.length) {
    cartItems.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#aaa;"><div style="font-size:56px;margin-bottom:20px;">🛒</div><h3 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">Your cart is empty</h3><p style="font-size:14px;margin-bottom:24px;">Browse parts and add them to your cart</p><button class="orange-btn" onclick="showSection('browse',null)">Browse Parts →</button></div>`;
    cartSummary.style.display = 'none';
    return;
  }
  cartSummary.style.display = 'block';
  const parts = await APP.getActiveParts();
  let subtotal = 0;
  cartItems.innerHTML = cart.map(item => {
    const p = parts.find(x => x.id === item.partId);
    if (!p) return '';
    const lineTotal = p.price * item.qty;
    subtotal += lineTotal;
    return `<div style="display:flex;align-items:center;gap:16px;padding:20px;background:#fff;border:1px solid #eee;border-radius:10px;margin-bottom:12px;">
      ${p.img ? `<img src="${p.img}" style="width:70px;height:70px;object-fit:cover;border-radius:8px;flex-shrink:0;"/>` : `<div style="width:70px;height:70px;background:#f5f5f5;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">⚙️</div>`}
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:14px;margin-bottom:4px;">${p.name}</div>
        <div style="font-size:12px;color:#888;margin-bottom:10px;">${p.shop_name||''} · PKR ${Number(p.price).toLocaleString()} each</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <button onclick="changeQty('${p.id}',-1)" style="width:30px;height:30px;border:1.5px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:18px;font-weight:700;">−</button>
          <span style="font-weight:800;font-size:15px;min-width:20px;text-align:center;">${item.qty}</span>
          <button onclick="changeQty('${p.id}',1)"  style="width:30px;height:30px;border:1.5px solid #ddd;background:#fff;border-radius:6px;cursor:pointer;font-size:18px;font-weight:700;">+</button>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <div style="font-weight:800;color:#E84800;font-size:16px;margin-bottom:8px;">PKR ${lineTotal.toLocaleString()}</div>
        <button onclick="removeFromCart('${p.id}')" style="font-size:12px;color:#E84800;background:none;border:none;cursor:pointer;font-weight:700;font-family:Poppins,sans-serif;">Remove</button>
      </div>
    </div>`;
  }).join('');
  g('subtotal').textContent   = 'PKR ' + subtotal.toLocaleString();
  g('totalPrice').textContent = 'PKR ' + (subtotal + 200).toLocaleString();
}

async function placeOrder() {
  if (!cart.length) { showToast('⚠️ Your cart is empty'); return; }
  const parts = await APP.getActiveParts();
  const btn   = document.querySelector('.orange-btn.full-btn');
  if (btn) { btn.textContent = '⏳ Placing order...'; btn.disabled = true; }

  let placedCount = 0;
  let lastOrder   = null;

  for (const item of cart) {
    const p = parts.find(x => x.id === item.partId);
    if (!p) continue;
    lastOrder = await APP.placeOrder({
      customerId:    session.id,
      customerName:  session.fname + ' ' + session.lname,
      customerPhone: session.phone || '',
      partId:        p.id,
      partName:      p.name,
      shopId:        p.shop_id,
      shopName:      p.shop_name || '',
      qty:           item.qty,
      total:         p.price * item.qty,
      unitPrice:     p.price
    });
    // Deduct stock
    await APP.updatePart(p.id, { stock: Math.max(0, p.stock - item.qty) });
    placedCount++;
  }

  cart = [];
  updateCartBadge();
  await updateStats();
  if (btn) { btn.textContent = 'Place Order →'; btn.disabled = false; }
  showToast(`✅ ${placedCount} order${placedCount !== 1 ? 's' : ''} placed!`);

  if (lastOrder) {
    setTimeout(() => promptReview(lastOrder), 1200);
  } else {
    setTimeout(() => showSection('orders', null), 900);
  }
}

/* ══════════════════════════════
   ORDERS
══════════════════════════════ */
async function renderOrders() {
  const container = g('ordersList');
  container.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;">⏳ Loading orders...</div>`;
  const orders = await APP.getCustomerOrders(session.id);
  if (!orders.length) {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#aaa;"><div style="font-size:56px;margin-bottom:20px;">📦</div><h3 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">No orders yet</h3><p style="font-size:14px;margin-bottom:24px;">Browse parts and place your first order</p><button class="orange-btn" onclick="showSection('browse',null)">Browse Parts →</button></div>`;
    return;
  }
  const sc = { Processing:'processing', 'In Transit':'transit', Delivered:'delivered', Cancelled:'processing' };
  container.innerHTML = `
    <div class="orders-table-wrap">
      <table class="orders-table">
        <thead><tr><th>ORDER ID</th><th>PART</th><th>SHOP</th><th>QTY</th><th>DATE</th><th>AMOUNT</th><th>STATUS</th><th>ACTION</th></tr></thead>
        <tbody>
          ${orders.map(o => `<tr>
            <td><span class="id-badge">${o.id}</span></td>
            <td style="font-weight:600;">${o.part_name}</td>
            <td style="color:#888;">${o.shop_name}</td>
            <td>${o.qty}</td>
            <td style="color:#888;">${o.date}</td>
            <td class="orange" style="font-weight:700;">PKR ${Number(o.total).toLocaleString()}</td>
            <td><span class="pill ${sc[o.status]||'processing'}">${o.status}</span></td>
            <td style="display:flex;gap:6px;flex-wrap:wrap;">
              <button class="tbl-btn" onclick="quickTrack('${o.id}')">Track</button>
              ${o.status === 'Delivered' && !o.reviewed
                ? `<button class="tbl-btn" style="background:#E84800;" onclick="promptReview(${JSON.stringify(o).replace(/"/g,'&quot;')})">⭐ Review</button>`
                : o.reviewed ? '<span style="font-size:11px;color:#1a7a3c;font-weight:700;padding-top:4px;">✓ Reviewed</span>' : ''}
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

/* ══════════════════════════════
   WISHLIST
══════════════════════════════ */
function toggleWish(partId) {
  if (wishlist.includes(partId)) { wishlist = wishlist.filter(id => id !== partId); showToast('Removed from wishlist'); }
  else { wishlist.push(partId); showToast('❤️ Added to wishlist'); }
  localStorage.setItem('wishlist_' + session.id, JSON.stringify(wishlist));
  updateWishBadge();
  const btn = g('wish-' + partId);
  if (btn) { btn.className = 'wish-btn ' + (wishlist.includes(partId) ? 'active' : ''); btn.textContent = wishlist.includes(partId) ? '❤️' : '🤍'; }
}

function updateWishBadge() {
  document.querySelectorAll('#wishBadge').forEach(el => el.textContent = wishlist.length);
  g('stat-wish') && (g('stat-wish').textContent = wishlist.length);
}

async function renderWishlist() {
  const container = g('wishlistGrid');
  const all   = await APP.getActiveParts();
  const saved = all.filter(p => wishlist.includes(p.id));
  if (!saved.length) {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#aaa;grid-column:1/-1;"><div style="font-size:56px;margin-bottom:20px;">❤️</div><h3 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">No saved items</h3><p>Tap the 🤍 on any part to save it here</p></div>`;
    return;
  }
  container.innerHTML = saved.map(p => `
    <div class="part-card">
      ${p.img ? `<img class="part-card-img" src="${p.img}" alt="${p.name}"/>` : `<div class="part-card-img" style="display:flex;align-items:center;justify-content:center;font-size:36px;background:#f5f5f5;">⚙️</div>`}
      <div class="part-card-body">
        <div class="part-name">${p.name}</div>
        <div class="part-meta">${p.make||''} · ${p.cat||''}</div>
        <div class="part-meta" style="color:#E84800;font-weight:600;">${p.shop_name||''}</div>
        <div class="part-price">PKR ${Number(p.price).toLocaleString()}</div>
      </div>
      <div class="part-card-footer">
        <button class="add-cart-btn" onclick="addToCart('${p.id}')">+ Add to Cart</button>
        <button class="wish-btn active" onclick="toggleWish('${p.id}')">❤️</button>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════
   TRACK ORDER
══════════════════════════════ */
function doTrack() {
  const input = (g('trackInput').value || '').trim();
  if (!input) { showToast('⚠️ Enter an Order ID'); return; }
  quickTrack(input);
}

async function quickTrack(orderId) {
  showSection('track', null);
  if (g('trackInput')) g('trackInput').value = orderId;
  const orders = await APP.getCustomerOrders(session.id);
  const order  = orders.find(o => o.id.toLowerCase() === orderId.toLowerCase());
  const result = g('trackResult');
  if (!order) {
    result.innerHTML = `<div style="background:#fff0ec;border:1px solid #ffd4c2;border-radius:10px;padding:24px;color:#c93d00;font-weight:600;">❌ Order "${orderId}" not found.</div>`;
    return;
  }
  const steps = ['Processing','In Transit','Delivered'];
  const cur   = steps.indexOf(order.status);
  result.innerHTML = `
    <div class="timeline-wrapper">
      <div class="order-card-sm">
        <div class="order-meta-row">
          <span class="id-badge">${order.id}</span>
          <span class="pill ${order.status==='Delivered'?'delivered':order.status==='In Transit'?'transit':'processing'}">${order.status}</span>
        </div>
        <div class="order-part-name">${order.part_name}</div>
        <div class="order-sub">${order.shop_name} &nbsp;·&nbsp; PKR ${Number(order.total).toLocaleString()} &nbsp;·&nbsp; ${order.date}</div>
      </div>
      <div class="timeline">
        ${[{l:'ORDER PLACED',d:'Order confirmed & received'},{l:'IN TRANSIT',d:'Your order is on the way'},{l:'DELIVERED',d:'Successfully delivered!'}]
          .map((s,i) => `<div class="t-step ${i<=cur?'done':''} ${i===2?'last':''}">
            <div class="t-icon-wrap"><div class="t-dot">${i<=cur?'✓':i+1}</div>${i<2?'<div class="t-line"></div>':''}</div>
            <div class="t-body"><h4>${s.l}</h4><p>${s.d}</p></div>
          </div>`).join('')}
      </div>
    </div>`;
}

/* ══════════════════════════════
   REVIEWS
══════════════════════════════ */
let _reviewOrder = null;
let _rating      = 0;

function promptReview(order) {
  _reviewOrder = order;
  _rating      = 0;
  document.querySelectorAll('.rv-star').forEach(s => s.textContent = '☆');
  g('rv-comment').value          = '';
  g('rv-ratingLabel').textContent = '';
  g('rv-partLabel').textContent  = `${order.part_name || order.partName} — ${order.shop_name || order.shopName}`;
  g('reviewModal').style.display = 'flex';
}

function setRating(val) {
  _rating = val;
  const labels = ['','Poor 😕','Fair 🙁','Good 😊','Great 😄','Excellent! 🤩'];
  g('rv-ratingLabel').textContent = labels[val];
  document.querySelectorAll('.rv-star').forEach(s => {
    s.textContent = Number(s.dataset.v) <= val ? '⭐' : '☆';
    s.style.transform = Number(s.dataset.v) === val ? 'scale(1.3)' : 'scale(1)';
  });
}

async function submitReview() {
  if (!_rating) { showToast('⭐ Please select a star rating'); return; }
  const o = _reviewOrder;
  const result = await APP.addReview({
    orderId:      o.id,
    partId:       o.part_id   || o.partId,
    partName:     o.part_name || o.partName,
    shopId:       o.shop_id   || o.shopId,
    shopName:     o.shop_name || o.shopName,
    customerId:   session.id,
    customerName: session.fname + ' ' + session.lname,
    rating:       _rating,
    comment:      g('rv-comment').value.trim()
  });
  if (!result.ok) { showToast('⚠️ ' + result.msg); return; }
  g('reviewModal').style.display = 'none';
  showToast('✅ Review submitted! Thank you.');
  setTimeout(() => showSection('orders', null), 600);
}

function skipReview() {
  g('reviewModal').style.display = 'none';
  showSection('orders', null);
}

async function renderMyReviews() {
  const container = g('myReviewsList');
  container.innerHTML = `<div style="text-align:center;padding:40px;color:#aaa;">⏳ Loading...</div>`;
  const reviews = await APP.getCustomerReviews(session.id);
  if (!reviews.length) {
    container.innerHTML = `<div style="text-align:center;padding:80px 20px;color:#aaa;"><div style="font-size:56px;margin-bottom:20px;">⭐</div><h3 style="font-size:18px;font-weight:700;color:#333;margin-bottom:8px;">No reviews yet</h3><p>After your orders are delivered, you can leave reviews.</p></div>`;
    return;
  }
  container.innerHTML = reviews.map(r => `
    <div style="background:#fff;border:1px solid #eee;border-radius:10px;padding:24px 28px;margin-bottom:14px;display:flex;gap:20px;align-items:flex-start;">
      <div style="font-size:28px;flex-shrink:0;">⚙️</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:15px;margin-bottom:4px;">${r.part_name}</div>
        <div style="font-size:12px;color:#888;margin-bottom:10px;">${r.shop_name} &nbsp;·&nbsp; ${r.date}</div>
        <div style="margin-bottom:8px;">${'⭐'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
        ${r.comment ? `<div style="font-size:14px;color:#555;font-style:italic;">"${r.comment}"</div>` : ''}
      </div>
    </div>`).join('');
}

/* ══════════════════════════════
   PROFILE
══════════════════════════════ */
function prefillProfile() {
  g('pf-name').value    = session.fname + ' ' + session.lname;
  g('pf-email').value   = session.email;
  g('pf-phone').value   = session.phone   || '';
  g('pf-city').value    = session.city    || '';
  g('pf-address').value = session.address || '';
  g('profileAv').textContent = (session.fname[0] + session.lname[0]).toUpperCase();
}

async function saveProfile() {
  const updates = { phone: g('pf-phone').value.trim(), address: g('pf-address').value.trim() };
  await APP.updateUser(session.id, updates);
  session = { ...session, ...updates };
  APP.setSession(session);
  showToast('✓ Profile saved');
}

/* ── LOGOUT ── */
function confirmLogout() { g('logoutModal').style.display = 'flex'; }
function closeModal()    { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }
function doLogout()      { closeModal(); APP.clearSession(); setTimeout(() => location.href = '/Login/login.HTML', 400); }
function toggleSidebar() { g('sidebar').classList.toggle('open'); }

let _tt;
function showToast(msg) {
  const t = g('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3000);
}
