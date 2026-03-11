/* ═══════════════════════════════════════════════════════
   APP_STATE.JS — Auto Parts Hunt
   Supabase backend — shared data across all users/devices
═══════════════════════════════════════════════════════ */

const SUPA_URL = 'https://vfvouexomhdwvmyleqgt.supabase.co';
const SUPA_KEY = 'sb_publishable_m7w-T-6qNdJilO0iQ5k1jQ_s0oodZQh';

const DB = {
  async query(table, options = {}) {
    let url = `${SUPA_URL}/rest/v1/${table}`;
    const params = [];
    if (options.select) params.push(`select=${options.select}`);
    if (options.filter) params.push(options.filter);
    if (options.order)  params.push(`order=${options.order}`);
    if (params.length)  url += '?' + params.join('&');
    const res = await fetch(url, {
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    if (!res.ok) { console.error('DB query error', await res.text()); return []; }
    return res.json();
  },

  async insert(table, data) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) { console.error('DB insert error', await res.text()); return null; }
    const result = await res.json();
    return Array.isArray(result) ? result[0] : result;
  },

  async update(table, filter, data) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY,
        'Content-Type': 'application/json', 'Prefer': 'return=representation'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) { console.error('DB update error', await res.text()); return null; }
    return res.json();
  },

  async delete(table, filter) {
    const res = await fetch(`${SUPA_URL}/rest/v1/${table}?${filter}`, {
      method: 'DELETE',
      headers: { 'apikey': SUPA_KEY, 'Authorization': 'Bearer ' + SUPA_KEY }
    });
    return res.ok;
  }
};

const APP = {

  /* ── SESSION (per device) ── */
  getSession()     { const s = localStorage.getItem('aph_session'); return s ? JSON.parse(s) : null; },
  setSession(u)    { localStorage.setItem('aph_session', JSON.stringify(u)); },
  clearSession()   { localStorage.removeItem('aph_session'); },
  _loginPath()     { return '/Login/login.HTML'; },

  /* ── INIT: seed admin ── */
  async init() {
    const admins = await DB.query('users', { filter: 'email=eq.admin@autopartlogin' });
    if (!admins.length) {
      await DB.insert('users', {
        id: 'USR-ADMIN', fname: 'Admin', lname: 'System',
        email: 'admin@autopartlogin', password: 'admin@auto',
        role: 'admin', city: 'Karachi', phone: '+92 300 0000000',
        joined: new Date().toLocaleDateString('en-PK'), active: true
      });
    }
  },

  /* ── AUTH ── */
  async login(email, password) {
    const emailFilter = 'email=eq.' + encodeURIComponent(email.toLowerCase().trim());
    const users = await DB.query('users', { filter: emailFilter });
    console.log('Login attempt:', email, '| Users found:', users.length, '| Data:', users);
    const user  = users.find(u => u.password === password);
    if (!user)        return { ok: false, msg: 'Invalid email or password.' };
    if (!user.active) return { ok: false, msg: 'Account deactivated. Contact admin.' };
    this.setSession(user);
    return { ok: true, user };
  },

  async register(data) {
    const existFilter = 'email=eq.' + encodeURIComponent(data.email.toLowerCase().trim());
    const existing = await DB.query('users', { filter: existFilter });
    if (existing.length) return { ok: false, msg: 'An account with this email already exists.' };
    const id     = 'USR-' + Date.now();
    const joined = new Date().toLocaleDateString('en-PK');
    const { shopName: _sn, ...userData } = data;
    const newUser = { id, ...userData, email: data.email.toLowerCase().trim(), joined, active: true };
    await DB.insert('users', newUser);
    if (data.role === 'shopkeeper') {
      await DB.insert('shops', {
        id: 'SHP-' + Date.now(), user_id: id,
        name: data.shopName, owner: data.fname + ' ' + data.lname,
        city: data.city, phone: data.phone,
        address: '', description: '', verified: false, active: true, joined
      });
    }
    return { ok: true, user: newUser };
  },

  requireAuth(expectedRole) {
    const session = this.getSession();
    if (!session) { window.location.href = this._loginPath(); return null; }
    if (expectedRole && session.role !== expectedRole && session.role !== 'admin') {
      window.location.href = this._loginPath(); return null;
    }
    return session;
  },

  /* ── USERS ── */
  async getUsers()         { return DB.query('users'); },
  async updateUser(id, d)  { return DB.update('users', `id=eq.${id}`, d); },

  /* ── SHOPS ── */
  async getShops()         { return DB.query('shops'); },
  async updateShop(id, d)  { return DB.update('shops', `id=eq.${id}`, d); },
  async getShopByUserId(userId) {
    const r = await DB.query('shops', { filter: `user_id=eq.${userId}` });
    return r[0] || null;
  },

  /* ── PARTS ── */
  async getParts()           { return DB.query('parts', { order: 'id.desc' }); },
  async getActiveParts()     { return DB.query('parts', { filter: 'active=eq.true', order: 'id.desc' }); },
  async getShopParts(shopId) { return DB.query('parts', { filter: `shop_id=eq.${shopId}` }); },
  async updatePart(id, d)    { return DB.update('parts', `id=eq.${id}`, d); },
  async deletePart(id)       { return DB.delete('parts', `id=eq.${id}`); },

  async addPart(data) {
    return DB.insert('parts', {
      id:          'PRT-' + Date.now(),
      shop_id:     data.shopId,
      shop_name:   data.shopName,
      name:        data.name,
      no:          data.no          || '',
      make:        data.make        || '',
      model:       data.model       || '',
      year:        data.year        || '',
      cat:         data.cat         || '',
      cond:        data.cond        || '',
      price:       Number(data.price),
      stock:       Number(data.stock),
      description: data.description || '',
      img:         data.img         || '',
      active:      true
    });
  },

  /* ── ORDERS ── */
  async getOrders()              { return DB.query('orders', { order: 'timestamp.desc' }); },
  async getCustomerOrders(cId)   { return DB.query('orders', { filter: `customer_id=eq.${cId}`,  order: 'timestamp.desc' }); },
  async getShopOrders(shopId)    { return DB.query('orders', { filter: `shop_id=eq.${shopId}`,   order: 'timestamp.desc' }); },

  async placeOrder(data) {
    return DB.insert('orders', {
      id:             'ORD-' + Date.now(),
      customer_id:    data.customerId,
      customer_name:  data.customerName,
      customer_phone: data.customerPhone || '',
      part_id:        data.partId,
      part_name:      data.partName,
      shop_id:        data.shopId,
      shop_name:      data.shopName,
      qty:            data.qty,
      total:          data.total,
      unit_price:     data.unitPrice,
      status:         'Processing',
      reviewed:       false,
      date:           new Date().toLocaleDateString('en-PK'),
      timestamp:      Date.now()
    });
  },

  async updateOrderStatus(orderId, status) { return DB.update('orders', `id=eq.${orderId}`, { status }); },
  async markOrderReviewed(orderId)         { return DB.update('orders', `id=eq.${orderId}`, { reviewed: true }); },

  /* ── REVIEWS ── */
  async getReviews()              { return DB.query('reviews', { order: 'timestamp.desc' }); },
  async getCustomerReviews(cId)   { return DB.query('reviews', { filter: `customer_id=eq.${cId}`, order: 'timestamp.desc' }); },
  async getPartReviews(partId)    { return DB.query('reviews', { filter: `part_id=eq.${partId}` }); },
  async deleteReview(id)          { return DB.delete('reviews', `id=eq.${id}`); },

  async addReview(data) {
    const existing = await DB.query('reviews', { filter: `order_id=eq.${data.orderId}` });
    if (existing.length) return { ok: false, msg: 'Already reviewed' };
    const review = {
      id:            'REV-' + Date.now(),
      order_id:      data.orderId,
      part_id:       data.partId,
      part_name:     data.partName,
      shop_id:       data.shopId,
      shop_name:     data.shopName,
      customer_id:   data.customerId,
      customer_name: data.customerName,
      rating:        data.rating,
      comment:       data.comment || '',
      date:          new Date().toLocaleDateString('en-PK'),
      timestamp:     Date.now()
    };
    const result = await DB.insert('reviews', review);
    await this.markOrderReviewed(data.orderId);
    return { ok: true, review: result };
  }
};

// Init on load
APP.init();
