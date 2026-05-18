/* ═══════════════════════════════════════════════
   CUSTOMER DASHBOARD — Auto Parts Hunt (Supabase)
═══════════════════════════════════════════════ */

let session  = null;
let cart     = [];
let wishlist = [];
let allParts = [];

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
  const titles = { browse:'Browse Parts', cart:'Cart', orders:'My Orders', wishlist:'Wishlist', track:'Track Order', reviews:'My Reviews', profile:'Profile', ai:'AI Diagnostics' };
  g('topbarTitle').textContent = titles[id] || '';
  if (id === 'orders')   renderOrders();
  if (id === 'wishlist') renderWishlist();
  if (id === 'cart')     renderCart();
  if (id === 'profile')  prefillProfile();
  if (id === 'reviews')  renderMyReviews();
  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 900) closeSidebar();
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
  if (q) {
    // Split query into words — match if part name contains ANY full word from the query
    // e.g. "car radiator" → matches parts named "Radiator", "Car AC", etc.
    const words = q.split(/\s+/).filter(w => w.length > 1);
    parts = parts.filter(p => {
      const haystack = [p.name, p.shop_name||'', p.make||'', p.cat||''].join(' ').toLowerCase();
      if (haystack.includes(q)) return true;       // full phrase match first
      return words.some(word => haystack.includes(word)); // then any word match
    });
  }
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
  g('totalPrice').textContent = 'PKR ' + (subtotal + 100).toLocaleString();
}

async function placeOrder(paymentMethod = 'COD', fulfillmentType = 'pickup') {
  if (!cart.length) { showToast('⚠️ Your cart is empty'); return; }
  const parts = await APP.getActiveParts();
  allParts = parts;

  let placedCount = 0;
  let lastOrder   = null;
  const customerName  = session.fname + ' ' + session.lname;
  const customerEmail = session.email  || '';
  const customerPhone = session.phone  || '';

  for (const item of cart) {
    const p = parts.find(x => x.id === item.partId);
    if (!p) continue;
    lastOrder = await APP.placeOrder({
      customerId:    session.id,
      customerName,
      customerPhone,
      partId:        p.id,
      partName:      p.name,
      shopId:        p.shop_id,
      shopName:      p.shop_name || '',
      qty:           item.qty,
      total:         p.price * item.qty + 100,
      unitPrice:     p.price,
      fulfillment:   fulfillmentType
    });

    // Insert payment record into payments table
    if (lastOrder) {
      await APP.insertPayment({
        orderId:       lastOrder.id,
        amount:        p.price * item.qty,
        paymentMethod: paymentMethod,
        paymentStatus: (paymentMethod || '').toLowerCase() === 'cod' ? 'Pending' : 'Completed'
      });
    }

    // Fetch shop owner's phone from users table
    let shopPhone = '';
    try {
      const shop = await APP.getShopById(p.shop_id);
      if (shop?.user_id) {
        const shopOwner = await APP.getUserById(shop.user_id);
        shopPhone = shopOwner?.phone || '';
      }
    } catch(_) {}

    // Send notification for each order item
    await sendOrderNotification({
      orderId:       lastOrder ? lastOrder.id : 'ORD-?',
      partName:      p.name,
      shopName:      p.shop_name || '',
      shopPhone,
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod,
      total:         p.price * item.qty
    });

    // Deduct stock
    await APP.updatePart(p.id, { stock: Math.max(0, p.stock - item.qty) });
    placedCount++;
  }

  cart = [];
  updateCartBadge();
  await updateStats();
  showToast(`✅ ${placedCount} order${placedCount !== 1 ? 's' : ''} placed! ${fulfillmentType === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'} · Payment: ${paymentMethod.toUpperCase()}`);

  return lastOrder; // Return so caller can trigger review
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

/* ── DELETE ACCOUNT ── */
function confirmDeleteAccount() {
  g('deleteAccountModal') && (g('deleteAccountModal').style.display = 'flex');
}

async function doDeleteAccount() {
  closeModal();
  showToast('⏳ Deleting your account...');
  await APP.deleteUserAccount(session.id);
  APP.clearSession();
  setTimeout(() => location.href = '/Login/login.HTML', 1200);
}

/* ── LOGOUT ── */
function confirmLogout() { g('logoutModal').style.display = 'flex'; }
function closeModal()    { document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none'); }
function doLogout()      { closeModal(); APP.clearSession(); setTimeout(() => location.href = '/Login/login.HTML', 400); }
function toggleSidebar() {
  const isOpen = g('sidebar').classList.contains('open');
  isOpen ? closeSidebar() : openSidebar();
}
function openSidebar() {
  g('sidebar').classList.add('open');
  g('sidebarOverlay').classList.add('active');
  g('sidebarToggleBtn').innerHTML = '&#x2715;';
}
function closeSidebar() {
  g('sidebar').classList.remove('open');
  g('sidebarOverlay').classList.remove('active');
  g('sidebarToggleBtn').innerHTML = '&#9776;';
}

let _tt;
function showToast(msg) {
  const t = g('toast');
  t.innerHTML = msg; t.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════
   ORDER PAYMENT MODAL
══════════════════════════════════════════════ */
let selectedOrderPayMethod = null;

async function openOrderPaymentModal() {
  if (!cart.length) { showToast('⚠️ Your cart is empty'); return; }
  selectedOrderPayMethod = null;
  selectedFulfillment    = null;
  document.querySelectorAll('.cust-pay-opt').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.fulfill-opt').forEach(b => b.classList.remove('selected'));
  g('orderPayFields')        && (g('orderPayFields').innerHTML = '');
  g('orderPaySubmitBtn')     && (g('orderPaySubmitBtn').style.display = 'none');
  g('paymentMethodSection')  && (g('paymentMethodSection').style.display = 'none');
  g('pickupAddressInfo')     && (g('pickupAddressInfo').style.display = 'none');

  // Always fetch fresh parts so subtotal is accurate
  if (!allParts || !allParts.length) allParts = await APP.getActiveParts();

  const PLATFORM_FEE = 100;
  const subtotal = cart.reduce((s, item) => {
    const p = allParts.find(x => x.id === item.partId);
    return s + (p ? p.price * item.qty : 0);
  }, 0);
  const total = subtotal + PLATFORM_FEE;
  g('orderPayTotal') && (g('orderPayTotal').textContent = 'PKR ' + total.toLocaleString());
  g('orderPaymentModal') && (g('orderPaymentModal').style.display = 'flex');
}

let selectedFulfillment = null;

async function selectFulfillment(type) {
  selectedFulfillment = type;
  document.querySelectorAll('.fulfill-opt').forEach(b => {
    b.style.borderColor = '#e5e5e5';
    b.style.background  = '#fff';
  });
  const btn = g('fulfill' + type.charAt(0).toUpperCase() + type.slice(1));
  if (btn) { btn.style.borderColor = '#E84800'; btn.style.background = '#fff5f0'; }

  if (type === 'pickup') {
    // Show pickup info with shop addresses from cart items
    const info = g('pickupAddressInfo');
    const text = g('pickupAddressText');
    if (info && text) {
      info.style.display = 'block';
      text.textContent   = 'Loading...';
      // Gather unique shop IDs in cart
      const parts = allParts || await APP.getActiveParts();
      const shops = {};
      for (const item of cart) {
        const p = parts.find(x => x.id === item.partId);
        if (p && p.shop_id && !shops[p.shop_id]) {
          shops[p.shop_id] = { name: p.shop_name || 'Shop', address: null };
        }
      }
      // Fetch shop addresses
      const shopIds = Object.keys(shops);
      let lines = [];
      for (const sid of shopIds) {
        try {
          const shopData = APP.getShopById ? await APP.getShopById(sid) : null;
          const addr = shopData?.address || null;
          lines.push(`<strong>${shops[sid].name}</strong>: ${addr || '<em style="color:#aaa;">Address not set — contact shop</em>'}`);
        } catch(_) {
          lines.push(`<strong>${shops[sid].name}</strong>: <em style="color:#aaa;">Address not available</em>`);
        }
      }
      text.innerHTML = lines.length ? lines.join('<br/>') : 'Contact the shop for pickup location.';
    }
  } else {
    g('pickupAddressInfo') && (g('pickupAddressInfo').style.display = 'none');
  }

  // Show payment method section
  g('paymentMethodSection') && (g('paymentMethodSection').style.display = 'block');
  // Reset payment selection
  selectedOrderPayMethod = null;
  document.querySelectorAll('.cust-pay-opt').forEach(b => b.classList.remove('selected'));
  g('orderPayFields')    && (g('orderPayFields').innerHTML = '');
  g('orderPaySubmitBtn') && (g('orderPaySubmitBtn').style.display = 'none');
}

function closeOrderPaymentModal() {
  g('orderPaymentModal') && (g('orderPaymentModal').style.display = 'none');
  selectedOrderPayMethod = null;
  selectedFulfillment    = null;
}

function selectOrderPayMethod(method) {
  selectedOrderPayMethod = method;
  document.querySelectorAll('.cust-pay-opt').forEach(b => b.classList.remove('selected'));
  const btn = document.querySelector(`.cust-pay-opt[data-method="${method}"]`);
  if (btn) btn.classList.add('selected');

  const fields = g('orderPayFields');
  if (!fields) return;

  if (method === 'cod') {
    fields.innerHTML = `<div style="background:#fff8e1;border-radius:8px;padding:12px 16px;font-size:13px;color:#555;border:1px solid #ffe082;text-align:center;">🏠 Pay with cash when your order arrives. No extra charges.</div>`;
  } else if (method === 'card') {
    fields.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">CARDHOLDER NAME</label>
          <input type="text" id="of-name" placeholder="As on card" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">CARD NUMBER</label>
          <input type="text" id="of-card" placeholder="0000 0000 0000 0000" maxlength="19" oninput="fmtCardNum(this)" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">EXPIRY</label>
            <input type="text" id="of-exp" placeholder="MM/YY" maxlength="5" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">CVV</label>
            <input type="text" id="of-cvv" placeholder="•••" maxlength="3" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
          </div>
        </div>
      </div>`;
  } else if (method === 'easypaisa') {
    fields.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">EASYPAISA MOBILE NUMBER</label>
          <input type="text" id="of-ep" placeholder="03XX-XXXXXXX" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
        </div>
        <div style="background:#e8f5e9;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #a5d6a7;">
          📱 A payment request will be sent to your Easypaisa number.
        </div>
      </div>`;
  } else if (method === 'jazzcash') {
    fields.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;flex-direction:column;gap:4px;">
          <label style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#888;">JAZZCASH MOBILE NUMBER</label>
          <input type="text" id="of-jc" placeholder="03XX-XXXXXXX" style="padding:10px 12px;border:1.5px solid #e5e5e5;border-radius:8px;font-family:Poppins,sans-serif;font-size:13px;outline:none;"/>
        </div>
        <div style="background:#fce4ec;border-radius:8px;padding:10px 14px;font-size:12px;color:#555;border:1px solid #f48fb1;">
          📱 A payment request will be sent to your JazzCash number.
        </div>
      </div>`;
  }

  g('orderPaySubmitBtn') && (g('orderPaySubmitBtn').style.display = 'inline-flex');
}

function fmtCardNum(el) {
  let v = el.value.replace(/\D/g,'').substring(0,16);
  el.value = v.replace(/(.{4})/g,'$1 ').trim();
}

async function confirmOrderPayment() {
  if (!selectedFulfillment)    { showToast('⚠️ Please select Pickup or Delivery'); return; }
  if (!selectedOrderPayMethod) { showToast('⚠️ Please select a payment method'); return; }

  // Capture method BEFORE anything resets it
  const payMethod = selectedOrderPayMethod;

  // Swap modal content to a spinner so user isn't left staring at a blank screen
  const modalInner = g('orderPaymentModal')?.firstElementChild;
  if (modalInner) {
    modalInner.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:56px 24px;gap:20px;">
        <div style="width:54px;height:54px;border:5px solid #f0e0d8;border-top-color:#E84800;border-radius:50%;animation:aph-spin 0.8s linear infinite;"></div>
        <div style="font-weight:800;font-size:16px;color:#111;">Placing your order…</div>
        <div style="font-size:13px;color:#888;text-align:center;">Please wait, do not close this window.</div>
      </div>
      <style>@keyframes aph-spin{to{transform:rotate(360deg)}}</style>`;
  }

  // Place orders (this is where the 4-5s delay actually happens)
  const lastOrder = await placeOrder(payMethod, selectedFulfillment || 'pickup');

  closeOrderPaymentModal();

  // Do NOT prompt review here — reviews are only available after order is Delivered
  // The review button appears in the Orders list once status = 'Delivered'
  setTimeout(() => showSection('orders', null), 900);
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS (SMTP Email + SMS)
══════════════════════════════════════════════ */

async function sendOrderNotification({ orderId, partName, shopName, shopPhone, customerName, customerEmail, paymentMethod, total }) {
  await window.Notify.sendOrderConfirmation({
    toEmail:       customerEmail,
    toName:        customerName,
    orderId,
    partName,
    shopName,
    shopPhone,
    paymentMethod,
    total
  });
}

/* ══════════════════════════════════════════════════════
   AI DIAGNOSTICS
   Two modes:
   1. Part Recognition — image + car name → identify part
                         → populate search filters
   2. Mechanic Mode    — symptoms + car info → diagnosis
                         → suggested parts to search
══════════════════════════════════════════════════════ */

/* ── Gemini API + Rate Limiter ────────────────────────────────────────────────────
   Free tier limits: 15 req/min, 1500 req/day
   We enforce: max 12/min (safety buffer) + 4s cooldown between calls
   ──────────────────────────────────────────────────── */

const GEMINI_API_KEY = 'AIzaSyDwqJKWYiQ7YP7iXs3Sc-mV-Jvu9YQh4GA';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

const aiRateLimit = {
  callTimestamps: [],
  MAX_PER_MIN: 12,
  COOLDOWN_MS: 4000,
  lastCallTime: 0,

  canCall() {
    const now = Date.now();
    this.callTimestamps = this.callTimestamps.filter(t => now - t < 60000);
    const sinceLastCall = now - this.lastCallTime;
    if (sinceLastCall < this.COOLDOWN_MS) {
      const wait = Math.ceil((this.COOLDOWN_MS - sinceLastCall) / 1000);
      throw new Error(`Please wait ${wait}s before trying again.`);
    }
    if (this.callTimestamps.length >= this.MAX_PER_MIN) {
      const oldest = this.callTimestamps[0];
      const wait = Math.ceil((60000 - (now - oldest)) / 1000);
      throw new Error(`Too many requests. Try again in ${wait}s.`);
    }
  },

  record() {
    const now = Date.now();
    this.callTimestamps.push(now);
    this.lastCallTime = now;
  }
};

async function callGemini(prompt) {
  aiRateLimit.canCall();
  aiRateLimit.record();
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error('Gemini rate limit hit. Please wait a minute and try again.');
    throw new Error('API error: ' + (err?.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function callGeminiVision(base64Image, prompt) {
  aiRateLimit.canCall();
  aiRateLimit.record();
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
          { text: prompt }
        ]
      }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 429) throw new Error('Gemini rate limit hit. Please wait a minute and try again.');
    throw new Error('API error: ' + (err?.error?.message || res.statusText));
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
let aiPartImageBase64 = null;   // stores uploaded image
let aiSuggestedParts  = [];     // parts AI wants to search
let mechSuggestedParts = [];    // parts from mechanic mode

/* ── Mode switcher ─────────────────────────────────── */
function switchAIMode(mode) {
  const isPart = mode === 'part';
  g('aiPanelPart').style.display     = isPart ? '' : 'none';
  g('aiPanelMechanic').style.display = isPart ? 'none' : '';
  g('modePartBtn').classList.toggle('active', isPart);
  g('modeMechBtn').classList.toggle('active', !isPart);
}

/* ── Image upload handling ─────────────────────────── */
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    aiPartImageBase64 = ev.target.result.split(',')[1]; // strip data: prefix
    g('uploadPreview').src = ev.target.result;
    g('uploadPreview').style.display = 'block';
    g('uploadPlaceholder').style.display = 'none';
    g('uploadClearBtn').style.display = 'inline-flex';
  };
  reader.readAsDataURL(file);
}

function clearImage() {
  aiPartImageBase64 = null;
  g('partImageInput').value = '';
  g('uploadPreview').style.display = 'none';
  g('uploadPlaceholder').style.display = 'flex';
  g('uploadClearBtn').style.display = 'none';
  g('aiPartResult').style.display = 'none';
}

/* ── Helper: set button loading state ─────────────── */
function setAIBtn(btnId, textId, loading, defaultText) {
  const btn = g(btnId);
  btn.disabled = loading;
  g(textId).innerHTML = loading
    ? '<span class="ai-spinner"></span> Analysing...'
    : defaultText;
}

/* ── Part Recognition ──────────────────────────────── */
async function runPartRecognition() {
  const carName = (g('aiCarName').value || '').trim();
  const notes   = (g('aiNotes').value  || '').trim();

  if (!aiPartImageBase64) {
    return alert('Please upload an image of the part first.');
  }

  setAIBtn('aiPartRunBtn', 'aiPartBtnText', true, '🤖 Identify Part & Search');
  g('aiPartResult').style.display = 'none';

  const prompt = [
    'You are an expert auto parts identifier.',
    carName ? `The car is: ${carName}.` : '',
    notes   ? `User notes: ${notes}.`   : '',
    '',
    'Analyse the image and respond in this EXACT JSON format (no markdown, no backticks):',
    '{',
    '  "identified": true/false,',
    '  "part_name": "exact part name",',
    '  "category": "Engine|Brakes|Electrical|Suspension|Tyres|Body Parts|Cooling|Fuel System|Other",',
    '  "confidence": "High|Medium|Low",',
    '  "description": "2-3 sentence professional description of the part and its function",',
    '  "condition_notes": "brief note on visible condition from the image",',
    '  "search_terms": ["term1", "term2", "term3"],',
    '  "compatible_makes": ["Make1", "Make2"]',
    '}'
  ].filter(Boolean).join('\n');

  try {
    const raw = await callGeminiVision(aiPartImageBase64, prompt);
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { throw new Error('Could not parse AI response.'); }

    renderPartResult(parsed, carName);

  } catch (err) {
    console.error('[AI Part]', err);
    showAIError('aiPartResultContent', 'aiPartResult', err.message);
  } finally {
    setAIBtn('aiPartRunBtn', 'aiPartBtnText', false, '🤖 Identify Part & Search');
  }
}

function renderPartResult(p, carName) {
  const box = g('aiPartResultContent');
  if (!p.identified) {
    box.innerHTML = `<div class="ai-no-result">
      <span>🔍</span>
      <p>Could not identify a car part in this image. Try a clearer photo with better lighting.</p>
    </div>`;
    g('aiPartActions').style.display = 'none';
    g('aiPartResult').style.display = '';
    return;
  }

  const confColor = { High: '#22c55e', Medium: '#f59e0b', Low: '#ef4444' };
  box.innerHTML = `
    <div class="ai-part-card">
      <div class="ai-part-main">
        <div class="ai-part-name">${p.part_name}</div>
        <div class="ai-part-meta">
          <span class="ai-tag cat-tag">${p.category}</span>
          <span class="ai-tag conf-tag" style="background:${confColor[p.confidence]}20;color:${confColor[p.confidence]};border-color:${confColor[p.confidence]}40;">
            ${p.confidence} Confidence
          </span>
        </div>
      </div>
      <p class="ai-desc">${p.description}</p>
      ${p.condition_notes ? `<div class="ai-condition"><span>👁️ Condition:</span> ${p.condition_notes}</div>` : ''}
      ${p.compatible_makes?.length ? `<div class="ai-makes"><span>🚗 Compatible:</span> ${p.compatible_makes.join(', ')}</div>` : ''}
      <div class="ai-search-preview">
        <span>🔍 Will search for:</span>
        <div class="ai-terms">${(p.search_terms || []).map(t => `<span class="ai-term">${t}</span>`).join('')}</div>
      </div>
    </div>`;

  aiSuggestedParts = { terms: p.search_terms, make: carName, category: p.category };
  g('aiPartActions').style.display = '';
  g('aiPartResult').style.display = '';
}

/* ── Mechanic Mode ─────────────────────────────────── */
async function runMechanicMode() {
  const car      = (g('mechCarName').value  || '').trim();
  const symptoms = (g('mechSymptoms').value || '').trim();
  const when     = g('mechWhen').value;
  const lights   = g('mechLights').value;
  const mileage  = (g('mechMileage').value || '').trim();

  if (!car)      return alert('Please enter your car name/model.');
  if (!symptoms) return alert('Please describe the symptoms.');

  setAIBtn('aiMechRunBtn', 'aiMechBtnText', true, '🔧 Diagnose My Car');
  g('aiMechResult').style.display = 'none';

  const prompt = [
    'You are a professional automotive mechanic with 20+ years of experience.',
    `Car: ${car}`,
    mileage ? `Mileage: ${mileage}` : '',
    `Symptoms: ${symptoms}`,
    when    ? `When it happens: ${when}` : '',
    lights !== 'none' ? `Warning lights: ${lights}` : '',
    '',
    'Provide a professional diagnosis. Respond in this EXACT JSON format (no markdown, no backticks):',
    '{',
    '  "probable_cause": "Most likely cause in 1-2 sentences",',
    '  "severity": "Critical|High|Medium|Low",',
    '  "explanation": "Professional 3-4 sentence explanation of whats happening mechanically",',
    '  "immediate_action": "What the driver should do right now",',
    '  "parts_needed": [',
    '    { "name": "Part Name", "reason": "Why this part", "urgency": "Immediate|Soon|Preventive" }',
    '  ],',
    '  "estimated_cost_pkr": "rough estimate range e.g. PKR 2,000-5,000",',
    '  "diy_possible": true/false,',
    '  "mechanic_note": "professional closing advice"',
    '}'
  ].filter(Boolean).join('\n');

  try {
    const raw = await callGemini(prompt);
    let parsed;
    try { parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()); }
    catch { throw new Error('Could not parse AI response.'); }

    renderMechResult(parsed, car);

  } catch (err) {
    console.error('[AI Mech]', err);
    showAIError('aiMechResultContent', 'aiMechResult', err.message);
  } finally {
    setAIBtn('aiMechRunBtn', 'aiMechBtnText', false, '🔧 Diagnose My Car');
  }
}

function renderMechResult(d, car) {
  const sevColor = { Critical:'#ef4444', High:'#f97316', Medium:'#f59e0b', Low:'#22c55e' };
  const sevBg    = { Critical:'#fef2f2', High:'#fff7ed', Medium:'#fffbeb', Low:'#f0fdf4' };
  const col      = sevColor[d.severity] || '#888';
  const bg       = sevBg[d.severity]   || '#f9f9f9';

  const partsHTML = (d.parts_needed || []).map(p => {
    const urg = { Immediate:'#ef4444', Soon:'#f97316', Preventive:'#22c55e' };
    return `<div class="mech-part-row">
      <div class="mech-part-info">
        <span class="mech-part-name">${p.name}</span>
        <span class="mech-urg-badge" style="background:${(urg[p.urgency]||'#888')}20;color:${urg[p.urgency]||'#888'}">${p.urgency}</span>
      </div>
      <p class="mech-part-reason">${p.reason}</p>
    </div>`;
  }).join('');

  g('aiMechResultContent').innerHTML = `
    <div class="mech-diagnosis">
      <div class="mech-severity-banner" style="background:${bg};border-color:${col}40;">
        <div class="mech-sev-label" style="color:${col}">⚠️ ${d.severity} Severity</div>
        <div class="mech-cause">${d.probable_cause}</div>
      </div>

      <div class="mech-section">
        <div class="mech-section-label">🔍 WHAT'S HAPPENING</div>
        <p>${d.explanation}</p>
      </div>

      <div class="mech-section alert-section">
        <div class="mech-section-label">⚡ IMMEDIATE ACTION</div>
        <p>${d.immediate_action}</p>
      </div>

      ${partsHTML ? `<div class="mech-section">
        <div class="mech-section-label">🔩 PARTS NEEDED</div>
        <div class="mech-parts-list">${partsHTML}</div>
      </div>` : ''}

      <div class="mech-footer-row">
        <div class="mech-cost"><span>💰 Est. Cost:</span> ${d.estimated_cost_pkr || 'Varies'}</div>
        <div class="mech-diy"><span>${d.diy_possible ? '🟢 DIY Possible' : '🔴 Professional Required'}</span></div>
      </div>

      ${d.mechanic_note ? `<div class="mech-note">💬 ${d.mechanic_note}</div>` : ''}
    </div>`;

  mechSuggestedParts = (d.parts_needed || []).map(p => cleanPartName(p.name));
  g('aiMechActions').style.display = mechSuggestedParts.length ? '' : 'none';
  g('aiMechResult').style.display = '';
}

/* ── Clean AI-returned part names for search ───────── */
function cleanPartName(name) {
  return name
    .replace(/\(s\)/gi, '')     // "Injector(s)"  → "Injector"
    .replace(/\(es\)/gi, '')    // "Switch(es)"   → "Switch"
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Apply AI search to Browse section ────────────── */
function applyAISearch() {
  if (!aiSuggestedParts?.terms?.length) return;
  g('searchInput').value = aiSuggestedParts.terms[0];
  const makeSelect = g('filterMake');
  if (aiSuggestedParts.make) {
    const makes = ['Toyota','Honda','Suzuki','Hyundai','Kia','Nissan'];
    const match = makes.find(m => aiSuggestedParts.make.toLowerCase().includes(m.toLowerCase()));
    if (match) makeSelect.value = match;
  }
  filterParts();
  showSection('browse', document.querySelector('.nav-item'));
}

function applyMechSearch() {
  if (!mechSuggestedParts.length) return;
  g('searchInput').value = mechSuggestedParts[0];
  filterParts();
  showSection('browse', document.querySelector('.nav-item'));
}

/* ── Error fallback ────────────────────────────────── */
function showAIError(contentId, boxId, message) {
  const msg = message || 'Something went wrong. Please check your connection and try again.';
  g(contentId).innerHTML = `<div class="ai-no-result">
    <span>⚠️</span>
    <p>${msg}</p>
  </div>`;
  g(boxId).style.display = '';
}
