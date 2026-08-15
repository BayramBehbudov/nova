/* NOVA — page-product.js
 * Product detail page. Resolves ?id=, renders the gallery, buy box, feature
 * strip, tabs, reviews, related products and recently viewed, and owns the
 * page interactions: thumbnails, colour swatches, quantity, add to cart,
 * tab switching and the demo review form.
 * Cards, money, escaping, star markup, toasts and cart maths come from
 * NOVA.ui / NOVA.store. Entrance animation comes from NOVA.motion. */
window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  var NOVA = window.NOVA;
  var LOG = '[NOVA.pdp]';

  var VARIANTS = 4;        /* productArt variants 0-3 -> the four thumbnails */
  var RELATED_MAX = 4;
  var RECENT_MAX = 5;
  var LOW_STOCK = 5;       /* at or below this we say "Only N left" */
  var MIN_NAME = 2;
  var MIN_BODY = 20;
  var HUE_STEP = 64;       /* fallback rotation when a swatch hue is too close */
  var HUE_MIN_GAP = 24;    /* degrees a swatch hue must differ by to be used */
  var HUE_MIN_SAT = 0.12;  /* below this a swatch is too grey to read as a hue */

  var ui = null;
  var store = null;
  var data = null;

  var state = {
    product: null,
    colorIndex: 0,
    variant: 0,
    qty: 1,
    layer: 0,        /* which gallery layer is currently in front */
    reviews: [],     /* catalogue reviews + any posted this visit */
    tab: 'description'
  };

  /* ====================================================================
     1. Small utilities
     ==================================================================== */

  function fail(where, err) {
    console.error(LOG + ' ' + where + ' failed', err);
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function reducedMotion() {
    return !!(NOVA.motion && NOVA.motion.reduced);
  }

  function canTween(el) {
    return !!el && !reducedMotion() && typeof window.gsap !== 'undefined';
  }

  function scanMotion(scope) {
    var m = NOVA.motion;
    if (m && typeof m.scanAll === 'function') {
      try { m.scanAll(scope); } catch (err) { fail('motion.scanAll', err); }
    }
  }

  /* ====================================================================
     2. Pure helpers — exported on NOVA.pdp so they can be unit-checked
     ==================================================================== */

  /* Same category first, then the rest of the catalogue, never the product
     being viewed, capped at `limit`. */
  function relatedProducts(products, current, limit) {
    var list = Array.isArray(products) ? products : [];
    var max = typeof limit === 'number' && limit > 0 ? limit : RELATED_MAX;
    var out = [];
    var i;
    for (i = 0; i < list.length && out.length < max; i++) {
      if (list[i].id !== current.id && list[i].category === current.category) { out.push(list[i]); }
    }
    for (i = 0; i < list.length && out.length < max; i++) {
      if (list[i].id !== current.id && out.indexOf(list[i]) === -1) { out.push(list[i]); }
    }
    return out;
  }

  /* counts[0] is the 5-star tally down to counts[4] for 1 star. `total` is the
     sum of counts by construction, so the bars always add up to what is shown. */
  function reviewDistribution(reviews, productId) {
    var list = Array.isArray(reviews) ? reviews : [];
    var counts = [0, 0, 0, 0, 0];
    var sum = 0;
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      if (list[i].productId !== productId) { continue; }
      var stars = Math.round(Number(list[i].rating));
      if (!isFinite(stars) || stars < 1 || stars > 5) {
        console.warn(LOG + ' review %s has an out-of-range rating — left out of the breakdown', String(list[i].id));
        continue;
      }
      counts[5 - stars] += 1;
      sum += stars;
      total += 1;
    }
    return {
      counts: counts,
      total: total,
      average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0
    };
  }

  function discountPercent(price, oldPrice) {
    var now = Number(price);
    var was = Number(oldPrice);
    if (!isFinite(now) || !isFinite(was) || was <= 0 || was <= now) { return 0; }
    return Math.round(((was - now) / was) * 100);
  }

  /* Hue + saturation of a #rrggbb colour, or null when it is not parseable. */
  function hueFromHex(hex) {
    var match = /^#?([0-9a-f]{6})$/i.exec(String(hex));
    if (!match) { return null; }
    var packed = parseInt(match[1], 16);
    var r = ((packed >> 16) & 255) / 255;
    var g = ((packed >> 8) & 255) / 255;
    var b = (packed & 255) / 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var delta = max - min;
    if (delta === 0) { return { hue: 0, sat: 0 }; }
    var h;
    if (max === r) { h = ((g - b) / delta) % 6; }
    else if (max === g) { h = (b - r) / delta + 2; }
    else { h = (r - g) / delta + 4; }
    h = Math.round(h * 60);
    if (h < 0) { h += 360; }
    var light = (max + min) / 2;
    return { hue: h, sat: Math.round((delta / (1 - Math.abs(2 * light - 1))) * 100) / 100 };
  }

  function angleGap(a, b) {
    var d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  }

  /* Index 0 keeps the catalogue hue so the page matches the product cards.
     Later swatches take their own hue when it reads as a colour and is far
     enough from the base to be visible; otherwise they rotate by a fixed step
     so every swatch still changes the artwork. */
  function hueForColor(product, index) {
    var base = Number(product.hue);
    if (!isFinite(base)) { base = 32; }
    if (!(index > 0)) { return base; }
    var color = (product.colors || [])[index];
    var hsl = color ? hueFromHex(color.hex) : null;
    if (hsl && hsl.sat >= HUE_MIN_SAT && angleGap(hsl.hue, base) >= HUE_MIN_GAP) { return hsl.hue; }
    return (base + index * HUE_STEP) % 360;
  }

  /* "4-6 business days" -> [4, 6]; "3 days" -> [3, 3]; 5 -> [5, 5]. */
  function parseDayRange(days) {
    var text = String(days);
    var range = /(\d+)\s*[-–]\s*(\d+)/.exec(text);
    if (range) { return [parseInt(range[1], 10), parseInt(range[2], 10)]; }
    var single = /(\d+)/.exec(text);
    if (single) { return [parseInt(single[1], 10), parseInt(single[1], 10)]; }
    return null;
  }

  function addBusinessDays(from, count) {
    var d = new Date(from.getTime());
    var added = 0;
    while (added < count) {
      d.setDate(d.getDate() + 1);
      var day = d.getDay();
      if (day !== 0 && day !== 6) { added += 1; }
    }
    return d;
  }

  function isoOf(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /* The standard method's window as ISO dates, counted in business days. */
  function deliveryWindow(shipping, from) {
    var methods = (shipping && shipping.methods) || [];
    var method = null;
    for (var i = 0; i < methods.length; i++) {
      if (methods[i].id === 'standard') { method = methods[i]; break; }
    }
    if (!method) { method = methods[0] || null; }
    if (!method) { return null; }
    var range = parseDayRange(method.days);
    if (!range) { return { method: method, from: null, to: null }; }
    return {
      method: method,
      from: isoOf(addBusinessDays(from, range[0])),
      to: isoOf(addBusinessDays(from, range[1]))
    };
  }

  NOVA.pdp = {
    relatedProducts: relatedProducts,
    reviewDistribution: reviewDistribution,
    discountPercent: discountPercent,
    hueFromHex: hueFromHex,
    hueForColor: hueForColor,
    parseDayRange: parseDayRange,
    deliveryWindow: deliveryWindow
  };

  /* ====================================================================
     3. Derived view values
     ==================================================================== */

  var BADGE_CLASS = { sale: 'badge--sale', bestseller: 'badge--best', 'new': 'badge--new' };
  var BADGE_TEXT = { sale: 'Sale', bestseller: 'Bestseller', 'new': 'New' };

  function currentColor() {
    var colors = state.product.colors || [];
    return colors[state.colorIndex] || null;
  }

  function currentColorName() {
    var c = currentColor();
    return c ? c.name : null;
  }

  function currentHue() {
    return hueForColor(state.product, state.colorIndex);
  }

  function artFor(variant, hue, className) {
    return ui.productArt(state.product.art, hue, {
      w: 900,
      h: 900,
      className: className,
      variant: variant
    });
  }

  /* ====================================================================
     4. Gallery
     ==================================================================== */

  function renderGallery() {
    var p = state.product;
    var hue = currentHue();
    var badgeKey = p.stock === 0 ? 'out' : p.badge;
    var badge = '';
    if (badgeKey === 'out') {
      badge = '<span class="badge badge--out pdp-stage__badge">Out of stock</span>';
    } else if (badgeKey && BADGE_CLASS[badgeKey]) {
      badge = '<span class="badge ' + BADGE_CLASS[badgeKey] + ' pdp-stage__badge">' +
        ui.esc(BADGE_TEXT[badgeKey]) + '</span>';
    }

    var thumbs = '';
    for (var v = 0; v < VARIANTS; v++) {
      thumbs +=
        '<li>' +
        '<button type="button" class="pdp-thumb' + (v === state.variant ? ' is-active' : '') + '" ' +
        'data-variant="' + v + '" aria-pressed="' + (v === state.variant ? 'true' : 'false') + '">' +
        '<span class="pdp-thumb__art" aria-hidden="true">' + artFor(v, hue, 'pdp-thumb__svg') + '</span>' +
        '<span class="sr-only">Show view ' + (v + 1) + ' of ' + VARIANTS + '</span>' +
        '</button></li>';
    }

    byId('pdp-gallery').innerHTML =
      '<div class="pdp-stage" id="pdp-stage" data-tilt style="--pdp-hue:' + hue + '" ' +
      'role="img" aria-label="' + ui.esc(p.name + ' in ' + (currentColorName() || 'the standard finish')) + '">' +
      '<span class="pdp-stage__glow" aria-hidden="true"></span>' +
      badge +
      '<div class="pdp-stage__inner" data-parallax="0.05" aria-hidden="true">' +
      '<div class="pdp-stage__lift">' +
      '<div class="pdp-stage__layer is-front">' + artFor(state.variant, hue, 'pdp-art') + '</div>' +
      '<div class="pdp-stage__layer"></div>' +
      '</div></div></div>' +
      '<ul class="pdp-thumbs" id="pdp-thumbs">' + thumbs + '</ul>';

    state.layer = 0;
  }

  /* Cross-fades the two stacked layers so the artwork never blinks. */
  function paintStage() {
    var stage = byId('pdp-stage');
    if (!stage) { return; }
    var layers = stage.querySelectorAll('.pdp-stage__layer');
    if (layers.length < 2) { return; }

    var hue = currentHue();
    var front = layers[state.layer];
    var back = layers[1 - state.layer];

    stage.style.setProperty('--pdp-hue', String(hue));
    stage.setAttribute('aria-label', state.product.name + ' in ' + (currentColorName() || 'the standard finish'));
    back.innerHTML = artFor(state.variant, hue, 'pdp-art');

    if (!canTween(back)) {
      front.classList.remove('is-front');
      back.classList.add('is-front');
      state.layer = 1 - state.layer;
      return;
    }

    var incoming = back.firstElementChild;
    window.gsap.killTweensOf([front, back]);
    back.classList.add('is-front');
    window.gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: 0.42, ease: 'power2.out' });
    window.gsap.to(front, {
      opacity: 0, duration: 0.32, ease: 'power2.out',
      onComplete: function () { front.classList.remove('is-front'); front.style.opacity = ''; }
    });
    if (incoming) {
      window.gsap.fromTo(incoming, { scale: 1.05 }, { scale: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform' });
    }
    state.layer = 1 - state.layer;
  }

  function repaintThumbs() {
    var hue = currentHue();
    var thumbs = byId('pdp-thumbs');
    if (!thumbs) { return; }
    var buttons = thumbs.querySelectorAll('.pdp-thumb');
    for (var i = 0; i < buttons.length; i++) {
      var variant = parseInt(buttons[i].getAttribute('data-variant'), 10);
      var host = buttons[i].querySelector('.pdp-thumb__art');
      if (host) { host.innerHTML = artFor(variant, hue, 'pdp-thumb__svg'); }
      var active = variant === state.variant;
      buttons[i].classList.toggle('is-active', active);
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
  }

  function bindGallery() {
    var thumbs = byId('pdp-thumbs');
    if (!thumbs) { return; }
    thumbs.addEventListener('click', function (evt) {
      var btn = evt.target.closest('.pdp-thumb');
      if (!btn) { return; }
      var variant = parseInt(btn.getAttribute('data-variant'), 10);
      if (!isFinite(variant) || variant === state.variant) { return; }
      state.variant = variant;
      repaintThumbs();
      paintStage();
    });
  }

  /* ====================================================================
     5. Buy box
     ==================================================================== */

  function stockLine(product) {
    if (product.stock === 0) {
      return { cls: 'is-out', text: 'Out of stock' };
    }
    if (product.stock <= LOW_STOCK) {
      return { cls: 'is-low', text: 'Only ' + product.stock + ' left' };
    }
    return { cls: 'is-in', text: 'In stock — ' + product.stock + ' left' };
  }

  function deliveryLine(product) {
    var win = deliveryWindow(data.shipping, new Date());
    if (!win) {
      console.warn(LOG + ' no shipping methods in NOVA.data.shipping — delivery estimate omitted');
      return '';
    }
    var body;
    if (win.from && win.to) {
      body = 'Order today and ' + ui.esc(win.method.label.toLowerCase()) + ' delivery arrives between <strong>' +
        ui.esc(ui.formatDate(win.from)) + '</strong> and <strong>' + ui.esc(ui.formatDate(win.to)) + '</strong>.';
    } else {
      body = ui.esc(win.method.label) + ' delivery takes ' + ui.esc(String(win.method.days)) + '.';
    }
    if (product.stock === 0) {
      body = 'This finish is between production runs. Join the wishlist and we will mail you the moment it is back.';
    }
    return '<p class="pdp-delivery__eta">' + body + '</p>' +
      '<p class="pdp-delivery__free" id="pdp-freeship-line"></p>';
  }

  function renderBuybox() {
    var p = state.product;
    var out = p.stock === 0;
    var save = discountPercent(p.price, p.oldPrice);

    var badge = '';
    if (p.badge && BADGE_CLASS[p.badge]) {
      badge = '<span class="badge ' + BADGE_CLASS[p.badge] + '">' + ui.esc(BADGE_TEXT[p.badge]) + '</span>';
    }

    var priceRow =
      '<span class="pdp-price__now">' + ui.esc(ui.money(p.price)) + '</span>' +
      (save > 0
        ? '<span class="pdp-price__old">' + ui.esc(ui.money(p.oldPrice)) + '</span>' +
          '<span class="pill pdp-price__save">Save ' + ui.esc(ui.money(p.oldPrice - p.price)) + ' (' + save + '%)</span>'
        : '');

    var swatches = '';
    var colors = p.colors || [];
    for (var i = 0; i < colors.length; i++) {
      swatches +=
        '<button type="button" class="swatch pdp-swatch' + (i === state.colorIndex ? ' is-active' : '') + '" ' +
        'style="--swatch:' + ui.esc(colors[i].hex) + '" data-color="' + i + '" ' +
        'aria-pressed="' + (i === state.colorIndex ? 'true' : 'false') + '">' +
        '<span class="sr-only">' + ui.esc(colors[i].name) + '</span></button>';
    }

    var stock = stockLine(p);

    byId('pdp-buybox').innerHTML =
      '<p class="pdp-brand">' + ui.esc(p.brand) + '</p>' +
      '<h1 class="pdp-title" data-split="chars">' + ui.esc(p.name) + '</h1>' +

      '<div class="cluster pdp-meta">' +
      ui.stars(p.rating) +
      '<button type="button" class="pdp-reviewjump" id="pdp-reviewjump">' +
      '<span data-counter="' + p.reviewCount + '">' + p.reviewCount + '</span> reviews</button>' +
      badge +
      '</div>' +

      '<div class="cluster pdp-price">' + priceRow + '</div>' +
      '<p class="pdp-blurb u-dim">' + ui.esc(p.blurb) + '</p>' +

      (colors.length
        ? '<div class="pdp-option">' +
          '<div class="pdp-option__head">' +
          '<h2 class="pdp-option__label">Finish</h2>' +
          '<span class="pdp-option__value" id="pdp-color-name">' + ui.esc(currentColorName() || '') + '</span>' +
          '</div>' +
          '<div class="cluster pdp-swatches" id="pdp-swatches" role="group" aria-label="Finish">' + swatches + '</div>' +
          '</div>'
        : '') +

      '<div class="pdp-buy">' +
      '<div class="qty">' +
      '<button type="button" class="qty__btn" data-step="-1" aria-label="Decrease quantity"' + (out ? ' disabled' : '') + '>−</button>' +
      '<input class="qty__input" id="pdp-qty" type="number" inputmode="numeric" aria-label="Quantity" ' +
      'min="1" max="' + Math.max(p.stock, 1) + '" value="' + state.qty + '"' + (out ? ' disabled' : '') + '>' +
      '<button type="button" class="qty__btn" data-step="1" aria-label="Increase quantity"' + (out ? ' disabled' : '') + '>+</button>' +
      '</div>' +
      /* qty and colour reach NOVA.store.add() through the delegated handler that
         mountCommon() already installed: data-qty resolves the live input and
         data-color is kept in step by selectColor(). */
      '<button type="button" class="btn btn--primary btn--lg pdp-add" id="pdp-add" data-magnetic ' +
      'data-add-to-cart="' + ui.esc(p.id) + '" data-qty="#pdp-qty" data-open-drawer ' +
      'data-color="' + ui.esc(currentColorName() || '') + '"' +
      (out ? ' disabled' : '') + '>' + (out ? 'Out of stock' : 'Add to cart') + '</button>' +
      '<button type="button" class="btn btn--outline btn--lg btn--icon pdp-wish" id="pdp-wish" ' +
      'data-wish="' + ui.esc(p.id) + '" aria-pressed="false" aria-label="Save to wishlist">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 20s-7-4.4-7-9.3A3.7 3.7 0 0 1 12 8a3.7 3.7 0 0 1 7 2.7C19 15.6 12 20 12 20z"></path></svg>' +
      '</button>' +
      '</div>' +

      '<p class="pdp-stock ' + stock.cls + '"><span class="pdp-stock__dot" aria-hidden="true"></span>' +
      ui.esc(stock.text) + '</p>' +

      '<div class="pdp-delivery">' + deliveryLine(p) + '</div>';
  }

  function syncFreeShipping() {
    var line = byId('pdp-freeship-line');
    if (!line) { return; }
    var threshold = data.shipping.freeThreshold;
    var lineTotal = state.product.price * state.qty;
    line.textContent = lineTotal >= threshold
      ? 'This order ships free — you are over the ' + ui.money(threshold) + ' threshold.'
      : 'Free shipping on orders over ' + ui.money(threshold) + '.';
    line.classList.toggle('is-free', lineTotal >= threshold);
  }

  function syncQty() {
    var input = byId('pdp-qty');
    if (!input) { return; }
    var max = Math.max(state.product.stock, 1);
    input.value = String(state.qty);
    var buttons = input.parentNode.querySelectorAll('.qty__btn');
    for (var i = 0; i < buttons.length; i++) {
      var step = parseInt(buttons[i].getAttribute('data-step'), 10);
      var blocked = state.product.stock === 0 ||
        (step < 0 && state.qty <= 1) ||
        (step > 0 && state.qty >= max);
      buttons[i].disabled = blocked;
    }
    syncFreeShipping();
  }

  function clampQty(value) {
    var n = Math.floor(Number(value));
    var max = Math.max(state.product.stock, 1);
    if (!isFinite(n)) { n = 1; }
    return Math.min(Math.max(n, 1), max);
  }

  function syncWish() {
    var btn = byId('pdp-wish');
    if (!btn) { return; }
    /* `is-on` is the class NOVA.ui.syncWishButtons() uses, so both stay in step.
       ui only syncs buttons that exist when it runs, so the first paint is ours. */
    var on = store.isWished(state.product.id);
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Save to wishlist');
  }

  function selectColor(index) {
    var colors = state.product.colors || [];
    if (index === state.colorIndex || !colors[index]) { return; }
    state.colorIndex = index;

    var buttons = byId('pdp-swatches').querySelectorAll('.pdp-swatch');
    for (var i = 0; i < buttons.length; i++) {
      var active = i === index;
      buttons[i].classList.toggle('is-active', active);
      buttons[i].setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    var label = byId('pdp-color-name');
    if (label) { label.textContent = colors[index].name; }

    var add = byId('pdp-add');
    if (add) { add.setAttribute('data-color', colors[index].name); }

    repaintThumbs();
    paintStage();
  }

  function bindBuybox() {
    var swatches = byId('pdp-swatches');
    if (swatches) {
      swatches.addEventListener('click', function (evt) {
        var btn = evt.target.closest('.pdp-swatch');
        if (!btn) { return; }
        selectColor(parseInt(btn.getAttribute('data-color'), 10));
      });
    }

    var input = byId('pdp-qty');
    if (input) {
      input.parentNode.addEventListener('click', function (evt) {
        var btn = evt.target.closest('.qty__btn');
        if (!btn || btn.disabled) { return; }
        state.qty = clampQty(state.qty + parseInt(btn.getAttribute('data-step'), 10));
        syncQty();
      });
      input.addEventListener('input', function () {
        if (input.value === '') { return; }   /* let the field be empty while typing */
        state.qty = clampQty(input.value);
        syncQty();
      });
      input.addEventListener('blur', function () {
        state.qty = clampQty(input.value);
        syncQty();
      });
    }

    var jump = byId('pdp-reviewjump');
    if (jump) {
      jump.addEventListener('click', function () {
        activateTab('reviews', false);
        var target = byId('pdp-detail');
        var m = NOVA.motion;
        if (target && m && typeof m.scrollTo === 'function') { m.scrollTo(target); }
        else if (target) { target.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); }
      });
    }

    store.on('wish:change', syncWish);
    syncWish();
    syncQty();
  }

  /* ====================================================================
     6. Feature strip
     ==================================================================== */

  function renderFeatures() {
    var p = state.product;
    byId('pdp-features-title').textContent = 'What you get with the ' + p.name;
    /* The [data-stagger] parent sequences these, so each item only needs the
       resting state that data-reveal gives it — its own delay would be ignored. */
    byId('pdp-features').innerHTML = (p.features || []).map(function (feature, i) {
      return '<li class="pdp-feature" data-reveal="up">' +
        '<span class="pdp-feature__num u-mono" aria-hidden="true">' + pad2(i + 1) + '</span>' +
        '<p class="pdp-feature__text">' + ui.esc(feature) + '</p>' +
        '</li>';
    }).join('');
  }

  /* ====================================================================
     7. Tabs
     ==================================================================== */

  var TAB_ORDER = ['description', 'specs', 'reviews', 'shipping'];

  function tabButton(name) { return byId('pdp-tab-' + name); }
  function tabPanel(name) { return byId('pdp-panel-' + name); }

  function activateTab(name, moveFocus) {
    if (TAB_ORDER.indexOf(name) === -1 || name === state.tab) {
      if (moveFocus && tabButton(name)) { tabButton(name).focus(); }
      return;
    }
    var prev = tabPanel(state.tab);
    var next = tabPanel(name);

    for (var i = 0; i < TAB_ORDER.length; i++) {
      var btn = tabButton(TAB_ORDER[i]);
      var active = TAB_ORDER[i] === name;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.tabIndex = active ? 0 : -1;
    }
    state.tab = name;
    if (moveFocus) { tabButton(name).focus(); }

    if (!canTween(next)) {
      prev.hidden = true;
      next.hidden = false;
      return;
    }
    window.gsap.killTweensOf([prev, next]);
    window.gsap.to(prev, {
      opacity: 0, duration: 0.14, ease: 'power1.out',
      onComplete: function () {
        prev.hidden = true;
        prev.style.opacity = '';
        next.hidden = false;
        window.gsap.fromTo(next,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.34, ease: 'power2.out', clearProps: 'opacity,transform' });
      }
    });
  }

  function bindTabs() {
    var list = byId('pdp-tablist');
    list.addEventListener('click', function (evt) {
      var btn = evt.target.closest('.tab');
      if (btn) { activateTab(btn.getAttribute('data-tab'), false); }
    });
    list.addEventListener('keydown', function (evt) {
      var current = TAB_ORDER.indexOf(state.tab);
      var next = -1;
      if (evt.key === 'ArrowRight') { next = (current + 1) % TAB_ORDER.length; }
      else if (evt.key === 'ArrowLeft') { next = (current - 1 + TAB_ORDER.length) % TAB_ORDER.length; }
      else if (evt.key === 'Home') { next = 0; }
      else if (evt.key === 'End') { next = TAB_ORDER.length - 1; }
      if (next === -1) { return; }
      evt.preventDefault();
      activateTab(TAB_ORDER[next], true);
    });
  }

  /* ====================================================================
     8. Tab panels — description, specs, shipping
     ==================================================================== */

  function renderDescription() {
    var p = state.product;
    byId('pdp-description').innerHTML =
      '<p>' + ui.esc(p.description) + '</p>' +
      '<ul class="pdp-featurelist">' +
      (p.features || []).map(function (f) {
        return '<li class="pdp-featurelist__item">' + ui.esc(f) + '</li>';
      }).join('') +
      '</ul>';
  }

  function specRow(label, value) {
    return '<div class="pdp-specs__row">' +
      '<dt class="pdp-specs__label">' + ui.esc(label) + '</dt>' +
      '<dd class="pdp-specs__value">' + ui.esc(value) + '</dd>' +
      '</div>';
  }

  function renderSpecs() {
    var p = state.product;
    byId('pdp-specs').innerHTML =
      (p.specs || []).map(function (s) { return specRow(s.label, s.value); }).join('') +
      specRow('SKU', p.sku) +
      specRow('Released', ui.formatDate(p.releasedAt));
  }

  function renderShipping() {
    byId('pdp-methods').innerHTML = (data.shipping.methods || []).map(function (m) {
      return '<li class="pdp-method">' +
        '<span class="pdp-method__label">' + ui.esc(m.label) + '</span>' +
        '<span class="pdp-method__days u-dim">' + ui.esc(String(m.days)) + '</span>' +
        '<span class="pdp-method__price u-mono">' + ui.esc(ui.money(m.price)) + '</span>' +
        '</li>';
    }).join('');
    byId('pdp-freeship').textContent =
      'Every order over ' + ui.money(data.shipping.freeThreshold) +
      ' ships free, on whichever service you pick at checkout.';
  }

  /* ====================================================================
     9. Reviews
     ==================================================================== */

  function reviewMarkup(review) {
    var initial = String(review.author || '?').trim().charAt(0).toUpperCase();
    return '<li class="pdp-review">' +
      '<span class="avatar pdp-review__avatar" aria-hidden="true">' + ui.esc(initial) + '</span>' +
      '<div class="pdp-review__body">' +
      '<div class="pdp-review__head">' +
      '<span class="pdp-review__author">' + ui.esc(review.author) + '</span>' +
      (review.verified ? '<span class="tag pdp-review__verified">Verified purchase</span>' : '') +
      '<time class="pdp-review__date u-muted" datetime="' + ui.esc(review.date) + '">' +
      ui.esc(ui.formatDate(review.date)) + '</time>' +
      '</div>' +
      ui.stars(review.rating) +
      (review.title ? '<h4 class="pdp-review__title">' + ui.esc(review.title) + '</h4>' : '') +
      '<p class="pdp-review__text">' + ui.esc(review.body) + '</p>' +
      '</div></li>';
  }

  function renderReviewSummary() {
    var p = state.product;
    var dist = reviewDistribution(state.reviews, p.id);
    var labels = ['5 star', '4 star', '3 star', '2 star', '1 star'];
    var rows = '';
    for (var i = 0; i < 5; i++) {
      var pct = dist.total > 0 ? Math.round((dist.counts[i] / dist.total) * 100) : 0;
      rows += '<div class="pdp-dist__row">' +
        '<span class="pdp-dist__label">' + labels[i] + '</span>' +
        '<span class="progress pdp-dist__track"><span class="progress__bar" data-pct="' + pct + '"></span></span>' +
        '<span class="pdp-dist__count u-mono">' + dist.counts[i] + '</span>' +
        '</div>';
    }

    byId('pdp-review-summary').innerHTML =
      '<p class="pdp-summary__score">' + ui.esc(String(p.rating)) + '<span class="u-muted">/5</span></p>' +
      ui.stars(p.rating) +
      '<p class="pdp-summary__count u-dim">Across ' + ui.esc(String(p.reviewCount)) + ' owner ratings</p>' +
      '<div class="pdp-dist">' + rows + '</div>' +
      '<p class="pdp-summary__note u-muted">Breakdown of the ' + dist.total +
      ' written review' + (dist.total === 1 ? '' : 's') + ' published here.</p>';

    animateBars();
  }

  function animateBars() {
    var bars = byId('pdp-review-summary').querySelectorAll('.progress__bar');
    for (var i = 0; i < bars.length; i++) {
      var pct = bars[i].getAttribute('data-pct') + '%';
      if (canTween(bars[i])) {
        window.gsap.fromTo(bars[i], { width: '0%' }, { width: pct, duration: 0.7, delay: 0.05 * i, ease: 'power2.out' });
      } else {
        bars[i].style.width = pct;
      }
    }
  }

  function renderReviews() {
    var list = byId('pdp-review-list');
    var mine = state.reviews.filter(function (r) { return r.productId === state.product.id; });
    list.innerHTML = mine.length
      ? mine.map(reviewMarkup).join('')
      : '<li class="pdp-review pdp-review--none u-dim">No written reviews yet for this one. Yours would be the first.</li>';
    renderReviewSummary();
  }

  function setFieldError(fieldId, errorId, message) {
    var field = byId(fieldId);
    var error = byId(errorId);
    if (field) { field.classList.toggle('is-invalid', !!message); }
    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
  }

  function bindReviewForm() {
    var form = byId('pdp-review-form');
    var nameInput = byId('pdp-review-name');
    var titleInput = byId('pdp-review-title');
    var bodyInput = byId('pdp-review-body');

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();

      var checked = form.querySelector('input[name="pdp-rating"]:checked');
      var name = nameInput.value.trim();
      var body = bodyInput.value.trim();
      var firstInvalid = null;

      if (!checked) {
        setFieldError('pdp-rate', 'pdp-err-rating', 'Please pick a star rating.');
        firstInvalid = firstInvalid || byId('pdp-rate-5');
      } else {
        setFieldError('pdp-rate', 'pdp-err-rating', '');
      }

      if (name.length < MIN_NAME) {
        setFieldError('pdp-field-name', 'pdp-err-name', 'Please enter at least ' + MIN_NAME + ' characters.');
        firstInvalid = firstInvalid || nameInput;
      } else {
        setFieldError('pdp-field-name', 'pdp-err-name', '');
      }

      if (body.length < MIN_BODY) {
        setFieldError('pdp-field-body', 'pdp-err-body',
          'Please write at least ' + MIN_BODY + ' characters (' + body.length + ' so far).');
        firstInvalid = firstInvalid || bodyInput;
      } else {
        setFieldError('pdp-field-body', 'pdp-err-body', '');
      }

      if (firstInvalid) {
        firstInvalid.focus();
        ui.toast('Please finish the highlighted fields.', 'error');
        return;
      }

      var review = {
        id: 'rv-local-' + Date.now(),
        productId: state.product.id,
        author: name,
        rating: parseInt(checked.value, 10),
        date: isoOf(new Date()),
        title: titleInput.value.trim(),
        body: body,
        verified: false
      };
      state.reviews.unshift(review);

      var list = byId('pdp-review-list');
      var placeholder = list.querySelector('.pdp-review--none');
      if (placeholder) { list.removeChild(placeholder); }
      list.insertAdjacentHTML('afterbegin', reviewMarkup(review));

      var added = list.firstElementChild;
      if (canTween(added)) {
        window.gsap.fromTo(added,
          { opacity: 0, y: -18, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out', clearProps: 'transform' });
      }
      scanMotion(added);

      renderReviewSummary();
      form.reset();
      setFieldError('pdp-rate', 'pdp-err-rating', '');
      ui.toast('Thanks — your review is showing for this visit only, nothing was saved.', 'success');
    });
  }

  /* ====================================================================
     10. Related and recently viewed
     ==================================================================== */

  function renderRelated() {
    var picks = relatedProducts(data.products, state.product, RELATED_MAX);
    byId('pdp-related').innerHTML = picks.map(function (p) { return ui.productCard(p); }).join('');
  }

  function renderRecent(seen) {
    var section = byId('pdp-recent-section');
    var picks = seen.filter(function (p) { return p.id !== state.product.id; }).slice(0, RECENT_MAX);
    if (!picks.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    byId('pdp-recent').innerHTML = picks.map(function (p) { return ui.productCard(p); }).join('');
  }

  /* ====================================================================
     11. Page composition
     ==================================================================== */

  function findProduct(id) {
    if (!id) { return null; }
    var list = data.products;
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { return list[i]; }
    }
    return null;
  }

  function showMissing(id) {
    document.title = 'Product not found — NOVA';
    setMeta('We could not find that product. Browse the full NOVA range of headphones, earbuds, speakers, turntables, microphones and amplifiers.');
    byId('pdp-product').hidden = true;
    byId('pdp-missing').hidden = false;
    console.warn(LOG + ' no product matches id "%s" — showing the not-found state', String(id));
  }

  function setMeta(text) {
    var tag = document.querySelector('meta[name="description"]');
    if (tag) { tag.setAttribute('content', text); }
  }

  function renderProduct(product) {
    state.product = product;
    state.colorIndex = 0;
    state.variant = 0;
    state.qty = 1;
    state.reviews = (data.reviews || []).slice();

    document.title = product.name + ' — ' + product.brand;
    setMeta(product.blurb + ' ' + ui.money(product.price) + ' — free delivery over ' +
      ui.money(data.shipping.freeThreshold) + ', 30-day returns.');

    var seen = store.getRecent(RECENT_MAX + 1);
    store.pushRecent(product.id);

    byId('pdp-missing').hidden = true;
    byId('pdp-product').hidden = false;

    renderCrumbs(product);
    renderGallery();
    renderBuybox();
    renderFeatures();
    renderDescription();
    renderSpecs();
    renderShipping();
    renderReviews();
    renderRelated();
    renderRecent(seen);

    bindGallery();
    bindBuybox();
    bindTabs();
    bindReviewForm();
  }

  function renderCrumbs(product) {
    var cat = null;
    var list = data.categories || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === product.category) { cat = list[i]; break; }
    }
    var crumbs = byId('pdp-crumbs');
    var middle = cat
      ? '<li class="breadcrumbs__sep" aria-hidden="true">/</li>' +
        '<li><a class="breadcrumbs__link" href="shop.html?cat=' + ui.esc(cat.slug) + '">' + ui.esc(cat.name) + '</a></li>'
      : '';
    crumbs.innerHTML =
      '<li><a class="breadcrumbs__link" href="index.html">Home</a></li>' +
      '<li class="breadcrumbs__sep" aria-hidden="true">/</li>' +
      '<li><a class="breadcrumbs__link" href="shop.html">Shop</a></li>' +
      middle +
      '<li class="breadcrumbs__sep" aria-hidden="true">/</li>' +
      '<li><span aria-current="page">' + ui.esc(product.name) + '</span></li>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    ui = NOVA.ui;
    store = NOVA.store;
    data = NOVA.data;

    if (!ui || !store || !data) {
      console.error(LOG + ' NOVA.ui, NOVA.store or NOVA.data did not load — check the script tags in product.html');
      return;
    }

    ui.mountCommon('product');

    try {
      var id = String(ui.getParam('id') || '').trim();
      var product = findProduct(id);
      if (product) { renderProduct(product); } else { showMissing(id); }
    } catch (err) {
      fail('render', err);
      showMissing('render-error');
    }

    if (NOVA.motion && typeof NOVA.motion.init === 'function') {
      try { NOVA.motion.init(); } catch (err) { fail('motion.init', err); }
    } else {
      console.error(LOG + ' NOVA.motion.init is unavailable — the page renders without entrance animation');
    }
  });
})();
