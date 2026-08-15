/* NOVA — cart and checkout page.
 * Three steps on one page (cart -> details -> confirmation) tracked in the URL hash.
 * Every money value on this page is read from NOVA.store.totals(); nothing is recomputed here.
 */
window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  var TAG = '[NOVA.cart]';
  var STEPS = ['cart', 'details', 'done'];
  var FIELD_ORDER = ['fullName', 'email', 'phone', 'country', 'city', 'address', 'zip', 'method', 'terms'];
  var PAY_NOTES = {
    card: 'This is a demo store, so no card details are collected on this page at any point. On a live NOVA order the payment provider would take the card securely on the next screen.',
    paypal: 'You would be sent to PayPal to approve the payment once the order is placed. Nothing is charged in this demo.',
    cod: 'Pay the courier in cash when the parcel arrives. Please have the exact amount ready if you can.'
  };
  var SUBMIT_DELAY = 620;
  var DESKTOP_QUERY = '(min-width: 1000px)';

  var refs = {};
  var view = { step: 'cart', order: null, patchKey: null, recoSig: '', busy: false, motionReady: false };

  /* == small DOM and motion helpers ==================================== */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(v) { return NOVA.ui.esc(v === null || v === undefined ? '' : String(v)); }
  function money(n) { return NOVA.ui.money(n); }

  function reduced() { return !!NOVA.motion.reduced; }
  function animated() { return !!window.gsap && !reduced(); }
  /* Both are no-ops until motion.init() has run, so nothing is scanned twice on first paint. */
  function scan(scope) {
    if (view.motionReady) { NOVA.motion.scanAll(scope || document); }
  }
  function refreshMotion() {
    if (view.motionReady) { NOVA.motion.refresh(); }
  }
  function toast(message, kind) {
    NOVA.ui.toast(message, kind);
  }

  /* Writes a money value, counting up from the previous one when motion is on. */
  function writeMoney(el, value, prefix) {
    var lead = prefix || '';
    var target = lead + money(value);
    var prev = parseFloat(el.getAttribute('data-value'));
    el.setAttribute('data-value', String(value));
    if (el._novaCount && window.gsap) { window.gsap.killTweensOf(el._novaCount); }
    if (!animated() || !isFinite(prev) || prev === value) { el.textContent = target; return; }
    var proxy = { v: prev };
    el._novaCount = proxy;
    window.gsap.to(proxy, {
      v: value, duration: 0.45, ease: 'power2.out',
      onUpdate: function () { el.textContent = lead + money(proxy.v); },
      onComplete: function () { el.textContent = target; }
    });
  }

  /* == step 1 — cart lines ============================================= */

  function colorHex(product, name) {
    var list = product.colors || [];
    for (var i = 0; i < list.length; i++) { if (list[i].name === name) { return list[i].hex; } }
    return '';
  }

  function lineHTML(line) {
    var p = line.product;
    var href = 'product.html?id=' + encodeURIComponent(p.id);
    var hex = line.color ? colorHex(p, line.color) : '';
    var colorRow = line.color
      ? '<p class="cart-line__color">' +
          (hex ? '<span class="cart-line__swatch" style="background:' + esc(hex) + '"></span>' : '') +
          esc(line.color) + '</p>'
      : '';
    return '' +
      '<article class="cart-line" data-key="' + esc(line.key) + '" data-id="' + esc(line.id) + '">' +
        '<a class="cart-line__art" href="' + href + '" tabindex="-1" aria-hidden="true">' +
          NOVA.ui.productArt(p.art, p.hue) +
        '</a>' +
        '<div class="cart-line__body">' +
          '<p class="cart-line__brand">' + esc(p.brand) + '</p>' +
          '<h3 class="cart-line__name"><a href="' + href + '">' + esc(p.name) + '</a></h3>' +
          colorRow +
          '<p class="cart-line__unit u-muted">' + money(line.unitPrice) + ' each</p>' +
          '<div class="cart-line__acts">' +
            '<button class="cart-line__act" type="button" data-act="save">Save for later</button>' +
            '<button class="cart-line__act cart-line__act--danger" type="button" data-act="remove">Remove</button>' +
          '</div>' +
        '</div>' +
        '<div class="cart-line__qty">' +
          '<div class="qty">' +
            '<button class="qty__btn" type="button" data-act="dec" aria-label="Decrease quantity of ' + esc(p.name) + '">&minus;</button>' +
            '<input class="qty__input" type="text" inputmode="numeric" pattern="[0-9]*" value="' + line.qty +
              '" data-act="qty" aria-label="Quantity of ' + esc(p.name) + '">' +
            '<button class="qty__btn" type="button" data-act="inc" aria-label="Increase quantity of ' + esc(p.name) + '">+</button>' +
          '</div>' +
          '<p class="cart-line__stock u-dim">' + p.stock + ' in stock</p>' +
        '</div>' +
        '<p class="cart-line__total" data-line-total="1">' + money(line.lineTotal) + '</p>' +
      '</article>';
  }

  function emptyHTML() {
    return '' +
      '<div class="empty-state">' +
        '<div class="empty-state__icon" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M3 4h2.2l2.3 11.2a1.6 1.6 0 0 0 1.6 1.3h8.1a1.6 1.6 0 0 0 1.6-1.2L21 8H6.4"></path>' +
            '<circle cx="10" cy="20" r="1.3"></circle><circle cx="17.5" cy="20" r="1.3"></circle>' +
          '</svg>' +
        '</div>' +
        '<h3>Your cart is empty</h3>' +
        '<p class="u-muted">Nothing in here yet. Twenty-four products are waiting, from desk monitors to a valve amplifier you can hear across the house.</p>' +
        '<a class="btn btn--primary" href="shop.html">Browse the shop</a>' +
      '</div>';
  }

  function renderLines() {
    var lines = NOVA.store.getDetailedCart();
    if (lines.length === 0) {
      refs.lines.innerHTML = emptyHTML();
      refs.lines.classList.add('cart-lines--empty');
      return;
    }
    refs.lines.classList.remove('cart-lines--empty');
    refs.lines.innerHTML = '<h3 class="sr-only">Items in your cart</h3>' +
      lines.map(lineHTML).join('');
    scan(refs.lines);
  }

  function rowFor(key) {
    var rows = $$('.cart-line', refs.lines);
    for (var i = 0; i < rows.length; i++) {
      if (rows[i].getAttribute('data-key') === key) { return rows[i]; }
    }
    return null;
  }

  function patchLine(key) {
    var row = rowFor(key);
    if (!row) { renderLines(); return; }
    var lines = NOVA.store.getDetailedCart();
    var found = null;
    for (var i = 0; i < lines.length; i++) { if (lines[i].key === key) { found = lines[i]; } }
    if (!found) { renderLines(); return; }
    var input = $('.qty__input', row);
    var total = $('[data-line-total]', row);
    if (input) { input.value = String(found.qty); }
    if (total) { total.textContent = money(found.lineTotal); }
  }

  function onLinesClick(e) {
    var btn = e.target.closest('[data-act]');
    if (!btn || btn.tagName !== 'BUTTON') { return; }
    var row = btn.closest('.cart-line');
    if (!row) { return; }
    var key = row.getAttribute('data-key');
    var act = btn.getAttribute('data-act');
    var input = $('.qty__input', row);
    var current = input ? parseInt(input.value, 10) : 0;
    if (!isFinite(current)) { current = 1; }

    if (act === 'inc' || act === 'dec') {
      view.patchKey = key;
      var res = NOVA.store.setQty(key, act === 'inc' ? current + 1 : current - 1);
      view.patchKey = null;
      if (!res.ok) { toast(res.message, 'error'); }
      return;
    }
    if (act === 'remove') { removeLine(row, key, 'Removed from your cart.'); return; }
    if (act === 'save') {
      var id = row.getAttribute('data-id');
      if (!NOVA.store.isWished(id)) {
        var wish = NOVA.store.toggleWish(id);
        if (!wish.ok) { toast(wish.message, 'error'); return; }
      }
      removeLine(row, key, 'Saved to your wishlist for later.');
    }
  }

  function removeLine(row, key, message) {
    function finish() {
      var res = NOVA.store.remove(key);
      if (!res.ok) { console.warn(TAG + ' remove rejected for cart line %s: %s', key, res.message); }
      toast(res.ok ? message : res.message, res.ok ? 'success' : 'error');
    }
    NOVA.motion.animateOut(row, finish);
  }

  function onLinesChange(e) {
    var input = e.target.closest('.qty__input');
    if (!input) { return; }
    var row = input.closest('.cart-line');
    if (!row) { return; }
    var key = row.getAttribute('data-key');
    var want = parseInt(input.value, 10);
    if (!isFinite(want)) {
      console.warn(TAG + ' quantity input for %s was not a number — restoring the stored value', key);
      toast('Please enter a whole number.', 'error');
      patchLine(key);
      return;
    }
    view.patchKey = key;
    var res = NOVA.store.setQty(key, want);
    view.patchKey = null;
    if (!res.ok) { toast(res.message, 'error'); }
    patchLine(key);
  }

  /* == step 1 — promo ================================================== */

  function renderPromo() {
    var promo = NOVA.store.getPromo();
    if (promo) {
      refs.promoApplied.hidden = false;
      refs.promoApplied.innerHTML =
        '<span class="chip">' +
          '<span class="u-mono">' + esc(promo.code) + '</span> &middot; ' + esc(promo.label) +
          '<button class="chip__x" type="button" id="promo-remove" aria-label="Remove promo code ' + esc(promo.code) + '">&times;</button>' +
        '</span>';
      refs.promoForm.hidden = true;
      refs.promoHints.hidden = true;
      refs.promoHintLabel.hidden = true;
    } else {
      refs.promoApplied.hidden = true;
      refs.promoApplied.innerHTML = '';
      refs.promoForm.hidden = false;
      refs.promoHints.hidden = false;
      refs.promoHintLabel.hidden = false;
    }
  }

  function renderPromoHints() {
    refs.promoHints.innerHTML = (NOVA.data.promos || []).map(function (p) {
      return '<button class="pill cart-promo__hint" type="button" data-code="' + esc(p.code) + '">' +
        '<span class="u-mono">' + esc(p.code) + '</span> &middot; ' + esc(p.label) + '</button>';
    }).join('');
  }

  function setPromoError(message) {
    refs.promoError.textContent = message || '';
    refs.promoField.classList.toggle('is-invalid', !!message);
  }

  function applyPromo(code) {
    var res = NOVA.store.applyPromo(code);
    if (!res.ok) {
      setPromoError(res.message);
      toast(res.message, 'error');
      return;
    }
    setPromoError('');
    refs.promoInput.value = '';
    toast(res.message, 'success');
  }

  /* == step 1 — shipping and free-shipping progress ==================== */

  function renderShipping() {
    var t = NOVA.store.totals();
    var current = NOVA.store.getShipping();
    refs.shipList.innerHTML = (NOVA.data.shipping.methods || []).map(function (m) {
      var active = m.id === current;
      var cost = t.freeShipping
        ? '<s class="cart-ship__was">' + money(m.price) + '</s><span class="cart-ship__free">FREE</span>'
        : money(m.price);
      return '<label class="radio-card' + (active ? ' is-active' : '') + '">' +
        '<input type="radio" name="ship" value="' + esc(m.id) + '"' + (active ? ' checked' : '') + '>' +
        '<span class="radio-card__title">' + esc(m.label) + '</span>' +
        '<span class="radio-card__meta">' + esc(m.days) + '</span>' +
        '<span class="cart-ship__cost">' + cost + '</span>' +
        '</label>';
    }).join('');
  }

  function onShippingChange(e) {
    var input = e.target.closest('input[name="ship"]');
    if (!input) { return; }
    var res = NOVA.store.setShipping(input.value);
    if (!res || res.ok === false) {
      toast(res && res.message ? res.message : 'Please choose an available delivery option.', 'error');
    }
  }

  function renderFreeShipping(t) {
    var pct = Math.round(t.freeShipProgress * 100);
    refs.freeTrack.setAttribute('aria-valuenow', String(pct));
    refs.free.classList.toggle('cart-free--done', t.freeShipping);
    refs.freeLabel.innerHTML = t.freeShipping
      ? '<span class="cart-free__tick" aria-hidden="true">&#10003;</span> Free shipping unlocked on this order.'
      : 'Add <strong>' + money(t.amountToFreeShip) + '</strong> more for free shipping.';
    /* .progress__bar already carries a width transition in components.css —
       setting the width is the animation, and a GSAP tween would fight it. */
    refs.freeBar.style.width = pct + '%';
  }

  /* == summary card (shared by step 1 and step 2) ====================== */

  function summaryRow(label, key, extra) {
    return '<div class="cart-summary__row" data-row="' + key + '">' +
      '<dt>' + label + (extra || '') + '</dt>' +
      '<dd data-total="' + key + '">&mdash;</dd></div>';
  }

  function summaryHTML(withActions) {
    var actions = withActions
      ? '<div class="cart-summary__actions">' +
          '<button class="btn btn--primary btn--block btn--lg" type="button" id="to-details">Continue to details</button>' +
          '<a class="btn btn--ghost btn--block" href="shop.html">Continue shopping</a>' +
        '</div>'
      : '';
    return '' +
      '<h3 class="cart-summary__title">Order summary</h3>' +
      '<dl class="cart-summary__rows">' +
        summaryRow('Subtotal', 'subtotal', ' <span class="u-dim" data-total-count></span>') +
        summaryRow('Discount', 'discount', ' <span class="u-dim u-mono" data-total-promo></span>') +
        summaryRow('Shipping', 'shippingCost', '') +
        summaryRow('Estimated tax', 'tax', ' <span class="u-dim">(8%)</span>') +
      '</dl>' +
      '<p class="cart-summary__ship u-dim" data-ship-label></p>' +
      '<div class="divider"></div>' +
      '<dl class="cart-summary__rows cart-summary__rows--total">' +
        '<div class="cart-summary__row cart-summary__row--total"><dt>Total</dt><dd data-total="total">&mdash;</dd></div>' +
      '</dl>' +
      actions +
      '<ul class="trust">' +
        '<li class="trust__item">Free shipping over ' +
          esc(money(NOVA.data.shipping.freeThreshold)) + ', any speed</li>' +
        '<li class="trust__item">30-day returns, listening included</li>' +
        '<li class="trust__item">2 to 5 year warranty on every product</li>' +
      '</ul>';
  }

  function updateSummary(root, t) {
    $$('[data-total]', root).forEach(function (el) {
      var key = el.getAttribute('data-total');
      if (key === 'shippingCost' && t.freeShipping) {
        el.removeAttribute('data-value');
        el.textContent = 'FREE';
        return;
      }
      writeMoney(el, t[key], key === 'discount' && t.discount > 0 ? '-' : '');
    });

    var countEl = $('[data-total-count]', root);
    if (countEl) { countEl.textContent = '(' + t.itemCount + (t.itemCount === 1 ? ' item)' : ' items)'); }

    var promo = NOVA.store.getPromo();
    var promoEl = $('[data-total-promo]', root);
    if (promoEl) { promoEl.textContent = promo ? promo.code : ''; }

    var discountRow = $('[data-row="discount"]', root);
    if (discountRow) { discountRow.hidden = t.discount <= 0; }

    var shipEl = $('[data-ship-label]', root);
    if (shipEl) {
      var method = null;
      var methods = NOVA.data.shipping.methods || [];
      for (var i = 0; i < methods.length; i++) { if (methods[i].id === NOVA.store.getShipping()) { method = methods[i]; } }
      shipEl.textContent = method ? method.label + ' delivery — ' + method.days : '';
    }
  }

  /* == step 1 — recommendations ======================================== */

  function renderReco() {
    var lines = NOVA.store.getDetailedCart();
    var inCart = {}, cats = {};
    lines.forEach(function (l) { inCart[l.id] = true; cats[l.product.category] = true; });

    var pool = (NOVA.data.products || []).filter(function (p) { return !inCart[p.id] && p.stock > 0; });
    var related = pool.filter(function (p) { return cats[p.category]; });
    var featured = pool.filter(function (p) { return p.featured; });
    var picks = [], seen = {};
    [related, featured, pool].forEach(function (list) {
      list.forEach(function (p) {
        if (!seen[p.id] && picks.length < 4) { seen[p.id] = true; picks.push(p); }
      });
    });

    var sig = picks.map(function (p) { return p.id; }).join(',');
    if (sig === view.recoSig) { return; }
    view.recoSig = sig;

    refs.reco.hidden = picks.length === 0;
    refs.recoGrid.innerHTML = picks.map(function (p) { return NOVA.ui.productCard(p); }).join('');
    /* mountCommon() already delegates add-to-cart and wishlist clicks from
       document, which covers these cards; binding them again would double-fire. */
    scan(refs.reco);
  }

  /* == whole-page refresh on any store change ========================== */

  function refreshAll() {
    var t = NOVA.store.totals();
    var empty = t.itemCount === 0;
    updateSummary(refs.summaryCart, t);
    updateSummary(refs.recapWrap, t);
    renderFreeShipping(t);
    renderShipping();
    renderPromo();
    renderReco();
    /* With nothing in the cart these three panels would only offer choices that do nothing. */
    refs.free.hidden = empty;
    refs.promoPanel.hidden = empty;
    refs.shipPanel.hidden = empty;
    if (refs.toDetails) { refs.toDetails.disabled = empty; }
  }

  function onCartChange() {
    if (view.patchKey) { patchLine(view.patchKey); view.patchKey = null; }
    else { renderLines(); }
    refreshAll();
    if (view.step === 'details' && NOVA.store.count() === 0) { go('cart'); }
  }

  /* == step 2 — form ================================================== */

  function readForm() {
    var f = refs.form.elements;
    return {
      fullName: f.fullName.value,
      email: f.email.value,
      phone: f.phone.value,
      country: f.country.value,
      city: f.city.value,
      address: f.address.value,
      zip: f.zip.value,
      note: f.note.value,
      method: f.method.value,
      terms: f.terms.checked
    };
  }

  function setFieldError(name, message) {
    var wrap = $('[data-field="' + name + '"]', refs.form);
    var slot = $('[data-error-for="' + name + '"]', refs.form);
    if (!wrap || !slot) {
      console.warn(TAG + ' no error slot rendered for field "%s"', name);
      return;
    }
    slot.textContent = message || '';
    wrap.classList.toggle('is-invalid', !!message);
  }

  function clearAllErrors() {
    FIELD_ORDER.forEach(function (name) { setFieldError(name, ''); });
    showAlert('');
  }

  function showAlert(message) {
    refs.alert.textContent = message || '';
    refs.alert.hidden = !message;
  }

  function onFieldBlur(e) {
    var control = e.target;
    var name = control.name;
    if (!name || FIELD_ORDER.indexOf(name) === -1) { return; }
    var errors = NOVA.store.validateOrder(readForm()).errors;
    setFieldError(name, errors[name] || '');
  }

  function focusFirstInvalid(errors) {
    for (var i = 0; i < FIELD_ORDER.length; i++) {
      var name = FIELD_ORDER[i];
      if (!errors[name]) { continue; }
      var wrap = $('[data-field="' + name + '"]', refs.form);
      var control = $('[name="' + name + '"]', refs.form);
      /* motion.scrollTo() takes a POSITIVE offset — the gap left above the target. */
      if (wrap) { NOVA.motion.scrollTo(wrap, 150); }
      if (control) { control.focus({ preventScroll: true }); }
      return;
    }
  }

  function renderErrors(errors) {
    FIELD_ORDER.forEach(function (name) { setFieldError(name, errors[name] || ''); });
  }

  function onPayChange() {
    var method = refs.form.elements.method.value;
    $$('.cart-pay__list .radio-card', refs.form).forEach(function (card) {
      var input = $('input[name="method"]', card);
      card.classList.toggle('is-active', !!input && input.checked);
    });
    refs.payNote.textContent = PAY_NOTES[method] || '';
  }

  function onSubmit(e) {
    e.preventDefault();
    if (view.busy) { return; }
    var payload = readForm();
    var check = NOVA.store.validateOrder(payload);
    renderErrors(check.errors);

    if (check.errors._cart) {
      showAlert(check.errors._cart + ' — add something before checking out.');
      toast(check.errors._cart, 'error');
      go('cart');
      return;
    }
    if (!check.ok) {
      showAlert('Please fix the highlighted fields before placing your order.');
      toast('Please check the highlighted fields.', 'error');
      focusFirstInvalid(check.errors);
      return;
    }
    showAlert('');
    submitOrder(payload);
  }

  function submitOrder(payload) {
    view.busy = true;
    refs.placeBtn.classList.add('is-loading');
    refs.placeBtn.disabled = true;

    window.setTimeout(function () {
      var res = NOVA.store.placeOrder(payload);
      view.busy = false;
      refs.placeBtn.classList.remove('is-loading');
      refs.placeBtn.disabled = false;

      if (!res.ok) {
        var errors = res.errors || {};
        console.warn(TAG + ' placeOrder rejected the submission for: %s', Object.keys(errors).join(', '));
        renderErrors(errors);
        if (errors._secure) { showAlert(errors._secure); toast(errors._secure, 'error'); return; }
        if (errors._cart) { showAlert(errors._cart); toast(errors._cart, 'error'); go('cart'); return; }
        showAlert('Please fix the highlighted fields before placing your order.');
        toast('Please check the highlighted fields.', 'error');
        focusFirstInvalid(errors);
        return;
      }

      view.order = res.order;
      refs.form.reset();
      clearAllErrors();
      onPayChange();
      toast('Order ' + res.order.orderNo + ' is confirmed.', 'success');
      go('done');
    }, SUBMIT_DELAY);
  }

  /* == step 2 — mobile recap ========================================== */

  function setRecapExpanded(open) {
    refs.recapWrap.classList.toggle('is-collapsed', !open);
    refs.recapToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function syncRecapToViewport() {
    if (!window.matchMedia) { setRecapExpanded(true); return; }
    if (window.matchMedia(DESKTOP_QUERY).matches) { setRecapExpanded(true); }
  }

  /* == step 3 — confirmation ========================================== */

  function doneItemsHTML(order) {
    return order.items.map(function (it) {
      return '<li class="cart-done__item">' +
        '<span>' + esc(it.name) +
          (it.color ? ' <span class="u-dim">&middot; ' + esc(it.color) + '</span>' : '') + '</span>' +
        '<span class="cart-done__item-qty u-dim">&times;' + it.qty + '</span>' +
        '<span class="cart-done__item-total">' + money(it.lineTotal) + '</span>' +
        '</li>';
    }).join('');
  }

  function doneTotalsHTML(t) {
    var rows = '<div class="cart-summary__row"><dt>Subtotal</dt><dd>' + money(t.subtotal) + '</dd></div>';
    if (t.discount > 0) {
      rows += '<div class="cart-summary__row"><dt>Discount</dt><dd>-' + money(t.discount) + '</dd></div>';
    }
    rows += '<div class="cart-summary__row"><dt>Shipping</dt><dd>' +
      (t.freeShipping ? 'FREE' : money(t.shippingCost)) + '</dd></div>';
    rows += '<div class="cart-summary__row"><dt>Tax</dt><dd>' + money(t.tax) + '</dd></div>';
    rows += '<div class="cart-summary__row cart-summary__row--total"><dt>Total paid</dt><dd>' + money(t.total) + '</dd></div>';
    return '<dl class="cart-summary__rows">' + rows + '</dl>';
  }

  function renderDone(order) {
    var c = order.customer;
    var firstName = c.fullName.split(' ')[0] || c.fullName;
    var placed = NOVA.ui.formatDate(order.placedAt);
    var ship = order.shippingMethod;

    refs.doneBody.innerHTML = '' +
      '<p class="cart-done__lead">Thank you, ' + esc(firstName) + '. Your order is in and a confirmation is on its way to ' +
        '<strong>' + esc(c.email) + '</strong>.</p>' +
      '<div class="cart-done__meta">' +
        '<div class="cart-done__meta-item"><dt>Order number</dt><dd class="u-mono">' + esc(order.orderNo) + '</dd></div>' +
        '<div class="cart-done__meta-item"><dt>Placed</dt><dd>' + esc(placed) + '</dd></div>' +
        '<div class="cart-done__meta-item"><dt>Delivery</dt><dd>' +
          (ship ? esc(ship.label) + ' &middot; ' + esc(ship.days) : 'Standard') + '</dd></div>' +
        '<div class="cart-done__meta-item"><dt>Estimated arrival</dt><dd>' + esc(order.eta) + '</dd></div>' +
      '</div>' +
      '<div class="cart-done__grid">' +
        '<section class="cart-done__card">' +
          '<h3 class="cart-panel__title">What you ordered</h3>' +
          '<ul class="cart-done__items">' + doneItemsHTML(order) + '</ul>' +
          '<div class="divider"></div>' +
          doneTotalsHTML(order.totals) +
        '</section>' +
        '<section class="cart-done__card">' +
          '<h3 class="cart-panel__title">Delivering to</h3>' +
          '<address class="cart-done__addr">' +
            '<strong>' + esc(c.fullName) + '</strong><br>' +
            esc(c.address) + '<br>' +
            esc(c.zip) + ' ' + esc(c.city) + '<br>' +
            esc(c.country) + '<br>' +
            esc(c.phone) +
          '</address>' +
          '<p class="cart-done__pay"><span class="tag">' + esc(payLabel(c.method)) + '</span></p>' +
          (c.note ? '<h3 class="cart-panel__title">Your note</h3><p class="u-muted">' + esc(c.note) + '</p>' : '') +
        '</section>' +
      '</div>' +
      '<div class="cart-done__actions">' +
        '<a class="btn btn--primary btn--lg" href="shop.html">Continue shopping</a>' +
        '<a class="btn btn--ghost" href="index.html">Back to home</a>' +
      '</div>';
  }

  function payLabel(method) {
    if (method === 'paypal') { return 'Paid with PayPal'; }
    if (method === 'cod') { return 'Cash on delivery'; }
    return 'Card payment';
  }

  function playBurst() {
    refs.burst.innerHTML = '';
    if (!animated()) { return; }
    var count = 18, nodes = [];
    for (var i = 0; i < count; i++) {
      var spark = document.createElement('span');
      spark.className = 'cart-done__spark' + (i % 3 === 0 ? ' cart-done__spark--alt' : '');
      refs.burst.appendChild(spark);
      nodes.push(spark);
    }
    nodes.forEach(function (spark, i) {
      var angle = (i / count) * Math.PI * 2;
      var distance = 96 + (i % 4) * 30;
      window.gsap.fromTo(spark,
        { x: 0, y: 0, scale: 0.2, opacity: 1 },
        {
          x: Math.cos(angle) * distance, y: Math.sin(angle) * distance,
          scale: 1, opacity: 0, duration: 1 + (i % 5) * 0.09,
          delay: 0.14 + (i % 3) * 0.06, ease: 'power2.out'
        });
    });
    window.gsap.fromTo(refs.doneBadge,
      { scale: 0.4, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.2)', clearProps: 'transform' });
  }

  /* == step routing =================================================== */

  function hashName() {
    return (window.location.hash || '').replace(/^#/, '');
  }

  function resolveStep(want) {
    if (want === 'done') { return (view.order || NOVA.store.getLastOrder()) ? 'done' : 'cart'; }
    if (want === 'details') { return NOVA.store.count() > 0 ? 'details' : 'cart'; }
    return 'cart';
  }

  function go(step) {
    var target = resolveStep(step);
    if (hashName() === target) { applyStep(target); return; }
    window.location.hash = target;
  }

  function markIndicator(step) {
    var index = STEPS.indexOf(step);
    $$('.cart-steps__item', refs.stepsList).forEach(function (item) {
      var i = STEPS.indexOf(item.getAttribute('data-step'));
      item.classList.toggle('is-active', i === index);
      item.classList.toggle('is-done', i < index);
      if (i === index) { item.setAttribute('aria-current', 'step'); }
      else { item.removeAttribute('aria-current'); }
    });
  }

  /* Runs `done` once the whole staggered entrance has settled, so the step
     heading only takes focus when there is nothing left moving to announce. */
  function playIn(section, done) {
    if (!animated()) { done(); return; }
    var kids = $$('[data-step-in]', section);
    if (kids.length === 0) { kids = [section]; }
    window.gsap.fromTo(kids,
      { opacity: 0, y: 24 },
      {
        opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: 'power2.out',
        clearProps: 'opacity,transform', onComplete: done
      });
  }

  function applyStep(step) {
    var next = refs.steps[step];
    if (!next) {
      console.error(TAG + ' unknown step "%s" requested — showing the cart step instead', step);
      step = 'cart';
      next = refs.steps.cart;
    }
    var current = $('.cart-step.is-active');
    view.step = step;
    markIndicator(step);

    if (step === 'cart') {
      renderLines();
      refreshAll();
    } else if (step === 'details') {
      updateSummary(refs.recapWrap, NOVA.store.totals());
      syncRecapToViewport();
    } else {
      var order = view.order || NOVA.store.getLastOrder();
      if (!order) {
        console.error(TAG + ' confirmation step requested with no stored order — returning to the cart');
        go('cart');
        return;
      }
      renderDone(order);
    }

    if (current === next) { return; }

    function swap() {
      if (current) {
        current.classList.remove('is-active');
        current.style.opacity = '';
        current.style.transform = '';
      }
      next.classList.add('is-active');
      if (step === 'done') { playBurst(); }
      scan(next);
      refreshMotion();
      NOVA.motion.scrollTo(refs.stepsList, 110);
      playIn(next, function () {
        /* If the visitor already reached a control in the new step while it was
           animating in, their focus wins — never yank it back to the heading. */
        var active = document.activeElement;
        if (active && active !== document.body && next.contains(active)) { return; }
        var heading = $('[id^="step-"][tabindex="-1"]', next);
        if (heading) { heading.focus({ preventScroll: true }); }
      });
    }

    if (current && animated()) {
      window.gsap.to(current, { opacity: 0, y: -16, duration: 0.22, ease: 'power2.in', onComplete: swap });
    } else {
      swap();
    }
  }

  function onHashChange() {
    var name = hashName();
    if (name !== '' && STEPS.indexOf(name) === -1) { return; }
    var want = name || 'cart';
    var resolved = resolveStep(want);
    if (resolved !== want && hashName() !== resolved) { window.location.hash = resolved; return; }
    applyStep(resolved);
  }

  /* == wiring ========================================================= */

  function cacheRefs() {
    refs.steps = {
      cart: $('#step-cart'),
      details: $('#step-details'),
      done: $('#step-done')
    };
    refs.stepsList = $('#cart-steps');
    refs.lines = $('#cart-lines');
    refs.free = $('#cart-free');
    refs.freeLabel = $('#cart-free-label');
    refs.freeTrack = $('#cart-free-track');
    refs.freeBar = $('#cart-free-bar');
    refs.promoForm = $('#promo-form');
    refs.promoInput = $('#promo-input');
    refs.promoField = $('[data-field="promo"]');
    refs.promoError = $('[data-error-for="promo"]');
    refs.promoApplied = $('#promo-applied');
    refs.promoHints = $('#promo-hints');
    refs.promoHintLabel = $('.cart-promo__hint-label');
    refs.promoPanel = $('.cart-promo');
    refs.shipPanel = $('.cart-ship');
    refs.shipList = $('#cart-ship-list');
    refs.summaryCart = $('#summary-cart');
    refs.summaryDetails = $('#summary-details');
    refs.recapWrap = $('#recap-wrap');
    refs.recapToggle = $('#recap-toggle');
    refs.reco = $('#cart-reco');
    refs.recoGrid = $('#cart-reco-grid');
    refs.form = $('#checkout-form');
    refs.alert = $('#cart-alert');
    refs.payNote = $('#pay-note');
    refs.placeBtn = $('#place-order');
    refs.doneBody = $('#done-body');
    refs.doneBadge = $('#done-badge');
    refs.burst = $('#done-burst');
  }

  function wire() {
    refs.lines.addEventListener('click', onLinesClick);
    refs.lines.addEventListener('change', onLinesChange);

    refs.promoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      applyPromo(refs.promoInput.value);
    });
    refs.promoInput.addEventListener('input', function () { setPromoError(''); });
    refs.promoHints.addEventListener('click', function (e) {
      var hint = e.target.closest('[data-code]');
      if (!hint) { return; }
      refs.promoInput.value = hint.getAttribute('data-code');
      applyPromo(refs.promoInput.value);
    });
    refs.promoApplied.addEventListener('click', function (e) {
      if (!e.target.closest('#promo-remove')) { return; }
      NOVA.store.clearPromo();
      toast('Promo code removed.', 'info');
    });

    refs.shipList.addEventListener('change', onShippingChange);

    refs.summaryCart.addEventListener('click', function (e) {
      if (e.target.closest('#to-details')) { go('details'); }
    });

    refs.recapToggle.addEventListener('click', function () {
      setRecapExpanded(refs.recapWrap.classList.contains('is-collapsed'));
    });
    if (window.matchMedia) {
      var mq = window.matchMedia(DESKTOP_QUERY);
      var onViewport = function () { syncRecapToViewport(); };
      if (typeof mq.addEventListener === 'function') { mq.addEventListener('change', onViewport); }
      else if (typeof mq.addListener === 'function') { mq.addListener(onViewport); }
    }

    refs.form.addEventListener('submit', onSubmit);
    refs.form.addEventListener('blur', onFieldBlur, true);
    refs.form.addEventListener('change', function (e) {
      if (e.target.name === 'method') { onPayChange(); }
      if (e.target.name === 'terms' || e.target.name === 'country') { onFieldBlur(e); }
    });
    $('#back-to-cart').addEventListener('click', function () { go('cart'); });

    NOVA.store.on('cart:change', onCartChange);
    NOVA.store.on('promo:change', function () { renderPromo(); refreshAll(); });
    NOVA.store.on('shipping:change', function () { renderShipping(); refreshAll(); });

    window.addEventListener('hashchange', onHashChange);
  }

  function start() {
    if (!NOVA.data || !NOVA.store || !NOVA.ui || !NOVA.motion) {
      console.error(TAG + ' cannot start — data.js, store.js, ui.js or motion.js failed to load before page-cart.js');
      return;
    }
    NOVA.ui.mountCommon('cart');

    cacheRefs();
    refs.summaryCart.innerHTML = summaryHTML(true);
    refs.summaryDetails.innerHTML = summaryHTML(false);
    refs.toDetails = $('#to-details', refs.summaryCart);
    renderPromoHints();
    onPayChange();
    wire();

    var want = hashName();
    if (want !== '' && STEPS.indexOf(want) === -1) { want = 'cart'; }
    var resolved = resolveStep(want || 'cart');
    if (want !== '' && resolved !== want) { window.location.hash = resolved; }
    applyStep(resolved);

    NOVA.motion.init();
    view.motionReady = true;
  }

  document.addEventListener('DOMContentLoaded', start);
})();
