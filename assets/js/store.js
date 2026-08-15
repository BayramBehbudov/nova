/* NOVA — client-side commerce engine.
 * Cart, wishlist, promo codes, shipping, totals, checkout and a small event bus.
 * Data only: this file never touches the DOM. Requires data.js to be loaded first.
 */
window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  /* == 1. Constants and helpers ======================================= */

  var TAG = '[NOVA.store]';
  var KEYS = {
    cart: 'nova.cart.v1', wish: 'nova.wish.v1', promo: 'nova.promo.v1',
    shipping: 'nova.shipping.v1', recent: 'nova.recent.v1', order: 'nova.order.v1'
  };
  var ORDER_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 chars, no 0/1/I/O
  var PAY_METHODS = ['card', 'paypal', 'cod'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var RECENT_MAX = 12;

  var DATA = window.NOVA.data;
  if (!DATA || !Array.isArray(DATA.products)) {
    console.error(TAG + ' NOVA.data missing or malformed — data.js must load before store.js');
    DATA = { products: [], promos: [], shipping: { methods: [], freeThreshold: 0 }, taxRate: 0 };
  }

  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
  function isStr(v) { return typeof v === 'string' && v.trim().length > 0; }
  function trim(v) { return typeof v === 'string' ? v.trim() : ''; }
  function keyOf(id, color) { return id + '::' + (color || 'default'); }
  function productById(id) {
    var list = DATA.products;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function methodById(id) {
    var list = DATA.shipping.methods;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return null;
  }
  function promoByCode(code) {
    var want = trim(code).toUpperCase(), list = DATA.promos || [];
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].code).toUpperCase() === want) { return list[i]; }
    }
    return null;
  }

  /* == 2. Persistence — localStorage with in-memory fallback ========== */

  var memory = {};
  var backing = (function probeStorage() {
    try {
      window.localStorage.setItem('__nova_probe__', '1');
      window.localStorage.removeItem('__nova_probe__');
      return window.localStorage;
    } catch (err) {
      console.warn(TAG + ' localStorage unavailable — using in-memory session state', err);
      return null;
    }
  })();

  function readRaw(key) {
    try {
      if (backing) { return backing.getItem(key); }
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    } catch (err) { console.warn(TAG + ' read failed at %s', key, err); return null; }
  }
  function writeRaw(key, raw) {
    try { if (backing) { backing.setItem(key, raw); } else { memory[key] = raw; } }
    catch (err) { console.warn(TAG + ' write failed at %s', key, err); }
  }
  function dropRaw(key) {
    try { if (backing) { backing.removeItem(key); } else { delete memory[key]; } }
    catch (err) { console.warn(TAG + ' reset failed at %s', key, err); }
  }
  /* validate() returns the cleaned value, or null when the stored shape is unusable. */
  function load(key, validate, fallback) {
    var raw = readRaw(key);
    if (raw === null || raw === undefined) { return fallback; }
    try {
      var clean = validate(JSON.parse(raw));
      if (clean === null) { throw new Error('shape validation failed'); }
      return clean;
    } catch (err) {
      console.warn(TAG + ' corrupt state at %s — resetting', key, err);
      dropRaw(key);
      return fallback;
    }
  }
  function save(key, value) {
    try { writeRaw(key, JSON.stringify(value)); }
    catch (err) { console.warn(TAG + ' could not serialise state at %s', key, err); }
  }

  /* == 3. Shape validators ============================================ */

  function validCart(v) {
    if (!Array.isArray(v)) { return null; }
    var out = [], dropped = 0;
    for (var i = 0; i < v.length; i++) {
      var l = v[i] && typeof v[i] === 'object' ? v[i] : null;
      var p = l ? productById(l.id) : null;
      var qty = l && typeof l.qty === 'number' && isFinite(l.qty) ? Math.floor(l.qty) : 0;
      var color = l && typeof l.color === 'string' ? l.color : null;
      if (!p || qty < 1 || p.stock < 1) { dropped++; continue; }
      out.push({ key: keyOf(p.id, color), id: p.id, qty: Math.min(qty, p.stock), color: color });
    }
    if (dropped > 0) { console.warn(TAG + ' dropped %d unusable cart line(s) while restoring', dropped); }
    return out;
  }
  function validIdList(v) {
    if (!Array.isArray(v)) { return null; }
    var out = [];
    for (var i = 0; i < v.length; i++) {
      if (isStr(v[i]) && productById(v[i]) && out.indexOf(v[i]) === -1) { out.push(v[i]); }
    }
    return out;
  }
  function validPromoCode(v) {
    var promo = isStr(v) ? promoByCode(v) : null;
    return promo ? promo.code : null;
  }
  function validShippingId(v) { return isStr(v) && methodById(v) ? v : null; }
  function validOrder(v) {
    var ok = v && typeof v === 'object' && isStr(v.orderNo) && v.totals && typeof v.totals === 'object';
    return ok ? v : null;
  }

  /* == 4. Event bus =================================================== */

  var listeners = {};
  function on(evt, fn) {
    if (!isStr(evt) || typeof fn !== 'function') {
      console.warn(TAG + ' on() ignored — expected (eventName, function), got %s', typeof fn);
      return;
    }
    if (!listeners[evt]) { listeners[evt] = []; }
    listeners[evt].push(fn);
  }
  function off(evt, fn) {
    var list = listeners[evt];
    if (!list) { return; }
    var i = list.indexOf(fn);
    if (i !== -1) { list.splice(i, 1); }
  }
  function emit(evt, payload) {
    if (!listeners[evt]) { return; }
    var snapshot = listeners[evt].slice(); // a listener may unsubscribe mid-dispatch
    for (var i = 0; i < snapshot.length; i++) {
      try { snapshot[i](payload); }
      catch (err) { console.error(TAG + ' listener failed for %s', evt, err); }
    }
  }

  /* == 5. Restored state ============================================== */

  var firstMethod = DATA.shipping.methods[0] ? DATA.shipping.methods[0].id : 'standard';
  var state = {
    cart: load(KEYS.cart, validCart, []),
    wish: load(KEYS.wish, validIdList, []),
    promoCode: load(KEYS.promo, validPromoCode, null),
    shippingId: load(KEYS.shipping, validShippingId, null) || firstMethod,
    recent: load(KEYS.recent, validIdList, [])
  };

  /* == 6. Cart ======================================================== */

  function getCart() {
    return state.cart.map(function (l) {
      return { key: l.key, id: l.id, qty: l.qty, color: l.color };
    });
  }
  function getDetailedCart() {
    var out = [];
    for (var i = 0; i < state.cart.length; i++) {
      var l = state.cart[i], p = productById(l.id);
      if (!p) { console.warn(TAG + ' cart line references unknown product %s — skipped', l.id); continue; }
      out.push({
        key: l.key, id: l.id, qty: l.qty, color: l.color, product: p,
        unitPrice: round2(p.price), lineTotal: round2(p.price * l.qty)
      });
    }
    return out;
  }
  function commitCart() { save(KEYS.cart, state.cart); emit('cart:change', getCart()); }
  function lineIndex(key) {
    for (var i = 0; i < state.cart.length; i++) { if (state.cart[i].key === key) { return i; } }
    return -1;
  }
  function normalizeColor(product, color) {
    if (color === null || color === undefined || color === '') { return null; }
    if (typeof color !== 'string') { console.warn(TAG + ' non-string color ignored for %s', product.id); return null; }
    var names = (product.colors || []).map(function (c) { return c.name; });
    if (names.indexOf(color) === -1) {
      console.warn(TAG + ' unknown color "%s" for %s — using default', color, product.id);
      return null;
    }
    return color;
  }

  function add(id, qty, color) {
    var p = isStr(id) ? productById(id) : null;
    if (!p) {
      console.warn(TAG + ' add() called with unknown product id %s', String(id));
      return { ok: false, message: 'That product is not available.' };
    }
    var want = qty === undefined || qty === null ? 1 : Math.floor(Number(qty));
    if (!isFinite(want) || want < 1) {
      console.warn(TAG + ' add() called with an invalid quantity for %s', p.id);
      return { ok: false, message: 'Please choose a quantity of at least 1.' };
    }
    if (p.stock <= 0) { return { ok: false, message: 'This item is out of stock.' }; }

    var safeColor = normalizeColor(p, color);
    var key = keyOf(p.id, safeColor);
    var idx = lineIndex(key);
    var current = idx === -1 ? 0 : state.cart[idx].qty;
    var next = Math.min(current + want, p.stock);
    if (idx === -1) { state.cart.push({ key: key, id: p.id, qty: next, color: safeColor }); }
    else { state.cart[idx].qty = next; }
    commitCart();

    if (current + want > p.stock) { return { ok: false, message: 'Only ' + p.stock + ' left in stock' }; }
    return { ok: true, message: p.name + ' added to your cart.' };
  }

  function setQty(key, qty) {
    var idx = isStr(key) ? lineIndex(key) : -1;
    if (idx === -1) {
      console.warn(TAG + ' setQty() called for a missing cart line: %s', String(key));
      return { ok: false, message: 'That item is no longer in your cart.' };
    }
    var want = Math.floor(Number(qty));
    if (!isFinite(want)) {
      console.warn(TAG + ' setQty() called with a non-numeric quantity for %s', key);
      return { ok: false, message: 'Please enter a valid quantity.' };
    }
    if (want <= 0) { return remove(key); }
    var p = productById(state.cart[idx].id);
    if (!p) {
      console.warn(TAG + ' setQty() line references unknown product %s — removing', state.cart[idx].id);
      return remove(key);
    }
    state.cart[idx].qty = Math.min(want, p.stock);
    commitCart();
    if (want > p.stock) { return { ok: false, message: 'Only ' + p.stock + ' left in stock' }; }
    return { ok: true, message: 'Quantity updated.' };
  }

  function remove(key) {
    var idx = isStr(key) ? lineIndex(key) : -1;
    if (idx === -1) {
      console.warn(TAG + ' remove() called for a missing cart line: %s', String(key));
      return { ok: false, message: 'That item is no longer in your cart.' };
    }
    state.cart.splice(idx, 1);
    commitCart();
    return { ok: true, message: 'Removed from your cart.' };
  }
  function clear() { state.cart = []; commitCart(); }
  function count() { return state.cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function has(id) { return state.cart.some(function (l) { return l.id === id; }); }
  function subtotalOf(lines) {
    return round2(lines.reduce(function (s, l) { return s + l.lineTotal; }, 0));
  }

  /* == 7. Promo codes ================================================= */

  function getPromo() { return state.promoCode ? promoByCode(state.promoCode) : null; }
  function applyPromo(code) {
    if (!isStr(code)) { return { ok: false, message: 'Enter a promo code first.', promo: null }; }
    var clean = trim(code), promo = promoByCode(clean);
    if (!promo) {
      console.warn(TAG + ' rejected an unknown promo code (length %d)', clean.length);
      return { ok: false, message: '"' + clean + '" is not a valid promo code.', promo: null };
    }
    if (subtotalOf(getDetailedCart()) < promo.minSubtotal) {
      return { ok: false, message: 'This code needs a subtotal of at least $' + promo.minSubtotal + '.', promo: null };
    }
    state.promoCode = promo.code;
    save(KEYS.promo, promo.code);
    emit('promo:change', promo);
    return { ok: true, message: promo.label + ' applied.', promo: promo };
  }
  function clearPromo() { state.promoCode = null; dropRaw(KEYS.promo); emit('promo:change', null); }

  /* == 8. Shipping ==================================================== */

  function getShipping() { return state.shippingId; }
  function setShipping(methodId) {
    if (!isStr(methodId) || !methodById(methodId)) {
      console.warn(TAG + ' setShipping() rejected unknown method %s', String(methodId));
      return { ok: false, message: 'Please choose an available delivery option.' };
    }
    state.shippingId = methodId;
    save(KEYS.shipping, methodId);
    emit('shipping:change', methodId);
    return { ok: true, message: 'Delivery option updated.' };
  }

  /* == 9. Totals ====================================================== */

  function totals() {
    var lines = getDetailedCart();
    var itemCount = lines.reduce(function (n, l) { return n + l.qty; }, 0);
    var subtotal = subtotalOf(lines);
    var promo = getPromo();
    var discount = 0;
    if (promo && promo.type === 'percent') { discount = subtotal * (promo.value / 100); }
    else if (promo && promo.type === 'fixed') { discount = Math.min(promo.value, subtotal); }
    discount = round2(discount);

    var net = round2(subtotal - discount);
    var threshold = DATA.shipping.freeThreshold;
    var method = methodById(state.shippingId);
    var freeShipping = itemCount > 0 && (net >= threshold || (promo !== null && promo.type === 'shipping'));
    var shippingCost = itemCount === 0 || freeShipping ? 0 : round2(method ? method.price : 0);
    var tax = round2(net * DATA.taxRate);
    var progress = freeShipping ? 1 : (threshold > 0 ? Math.min(1, Math.max(0, net / threshold)) : 1);

    return {
      itemCount: itemCount, subtotal: subtotal, discount: discount, shippingCost: shippingCost,
      tax: tax, total: round2(net + shippingCost + tax), freeShipping: freeShipping,
      freeShipProgress: Math.round(progress * 10000) / 10000,
      amountToFreeShip: freeShipping ? 0 : Math.max(0, round2(threshold - net))
    };
  }

  /* == 10. Wishlist and recently viewed =============================== */

  function getWish() { return state.wish.slice(); }
  function isWished(id) { return state.wish.indexOf(id) !== -1; }
  function wishCount() { return state.wish.length; }
  function toggleWish(id) {
    if (!isStr(id) || !productById(id)) {
      console.warn(TAG + ' toggleWish() called with unknown product id %s', String(id));
      return { ok: false, wished: false, message: 'That product is not available.' };
    }
    var i = state.wish.indexOf(id);
    if (i === -1) { state.wish.push(id); } else { state.wish.splice(i, 1); }
    save(KEYS.wish, state.wish);
    emit('wish:change', getWish());
    return {
      ok: true, wished: i === -1,
      message: i === -1 ? 'Saved to your wishlist.' : 'Removed from your wishlist.'
    };
  }
  function pushRecent(id) {
    if (!isStr(id) || !productById(id)) {
      console.warn(TAG + ' pushRecent() called with unknown product id %s', String(id));
      return;
    }
    var i = state.recent.indexOf(id);
    if (i !== -1) { state.recent.splice(i, 1); }
    state.recent.unshift(id);
    state.recent = state.recent.slice(0, RECENT_MAX);
    save(KEYS.recent, state.recent);
  }
  function getRecent(limit) {
    var max = typeof limit === 'number' && isFinite(limit) && limit > 0 ? Math.floor(limit) : 4;
    var out = [];
    for (var i = 0; i < state.recent.length && out.length < max; i++) {
      var p = productById(state.recent[i]);
      if (p) { out.push(p); }
    }
    return out;
  }

  /* == 11. Checkout =================================================== */

  function validateOrder(payload) {
    var p = payload && typeof payload === 'object' ? payload : {};
    var errors = {};
    if (state.cart.length === 0) { errors._cart = 'Your cart is empty'; }
    if (trim(p.fullName).length < 2) { errors.fullName = 'Please enter your full name.'; }
    if (!EMAIL_RE.test(trim(p.email))) { errors.email = 'Please enter a valid email address.'; }
    if (trim(p.phone).replace(/\D/g, '').length < 7) { errors.phone = 'Please enter a phone number with at least 7 digits.'; }
    if (!isStr(p.country)) { errors.country = 'Please choose your country.'; }
    if (!isStr(p.city)) { errors.city = 'Please enter your city.'; }
    if (trim(p.address).length < 5) { errors.address = 'Please enter a full street address.'; }
    if (!isStr(p.zip)) { errors.zip = 'Please enter your postal code.'; }
    if (PAY_METHODS.indexOf(p.method) === -1) { errors.method = 'Please choose a payment method.'; }
    if (p.terms !== true) { errors.terms = 'Please accept the terms to continue.'; }

    var fields = Object.keys(errors); // field names only — never log the payload itself
    if (fields.length > 0) { console.warn(TAG + ' order validation failed for: %s', fields.join(', ')); }
    return { ok: fields.length === 0, errors: errors };
  }

  function makeOrderNo() {
    var c = window.crypto;
    if (!c || typeof c.getRandomValues !== 'function') {
      throw new Error('crypto.getRandomValues unavailable — refusing to generate an order number insecurely');
    }
    var bytes = new Uint8Array(6), out = '';
    c.getRandomValues(bytes);
    for (var i = 0; i < bytes.length; i++) { out += ORDER_ALPHABET.charAt(bytes[i] % ORDER_ALPHABET.length); }
    return 'NV-' + out;
  }
  function etaFor(method) {
    var match = /(\d+)\s*-\s*(\d+)/.exec(method ? method.days : '');
    var d = new Date();
    d.setDate(d.getDate() + (match ? parseInt(match[2], 10) : 6));
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function placeOrder(payload) {
    var check = validateOrder(payload);
    if (!check.ok) { return { ok: false, order: null, errors: check.errors }; }
    var orderNo;
    try { orderNo = makeOrderNo(); }
    catch (err) {
      console.error(TAG + ' cannot place order — no secure random source', err);
      return {
        ok: false, order: null,
        errors: { _secure: 'We cannot process orders in this browser session. Please update your browser and try again.' }
      };
    }
    var method = methodById(state.shippingId);
    var order = {
      orderNo: orderNo,
      placedAt: new Date().toISOString(),
      items: getDetailedCart().map(function (l) {
        return { id: l.id, name: l.product.name, price: l.unitPrice, qty: l.qty, color: l.color, lineTotal: l.lineTotal };
      }),
      totals: totals(),
      customer: {
        fullName: trim(payload.fullName), email: trim(payload.email), phone: trim(payload.phone),
        country: trim(payload.country), city: trim(payload.city), address: trim(payload.address),
        zip: trim(payload.zip), method: payload.method, note: trim(payload.note)
      },
      shippingMethod: method ? { id: method.id, label: method.label, days: method.days, price: method.price } : null,
      eta: etaFor(method)
    };
    save(KEYS.order, order);
    emit('order:placed', order);
    clear();
    clearPromo();
    return { ok: true, order: order, errors: null };
  }
  function getLastOrder() { return load(KEYS.order, validOrder, null); }

  /* == 12. Public API ================================================= */

  window.NOVA.store = {
    getCart: getCart, getDetailedCart: getDetailedCart, add: add, setQty: setQty,
    remove: remove, clear: clear, count: count, has: has,
    applyPromo: applyPromo, clearPromo: clearPromo, getPromo: getPromo,
    setShipping: setShipping, getShipping: getShipping, totals: totals,
    toggleWish: toggleWish, isWished: isWished, getWish: getWish, wishCount: wishCount,
    pushRecent: pushRecent, getRecent: getRecent,
    validateOrder: validateOrder, placeOrder: placeOrder, getLastOrder: getLastOrder,
    on: on, off: off
  };
})();
