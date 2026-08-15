window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  /* ==================================================================
   * NOVA — assets/js/ui.js
   * Shared rendering layer for the whole site.
   *
   *   §1  Guards, tiny utilities, warn helpers
   *   §2  DOM helpers (qs, qsa, el)
   *   §3  Formatters (esc, money, getParam, formatDate, stars)
   *   §4  PRODUCT ARTWORK — generated inline SVG (large section)
   *   §5  Card renderers (productCard, categoryCard, skeleton)
   *   §6  Header / footer markup
   *   §7  Overlays (mini-cart drawer, search, wishlist, mobile nav)
   *   §8  Toasts
   *   §9  Delegated bindings + badge sync
   *   §10 mountCommon() and public API export
   *
   * Load order: gsap -> plugins -> data.js -> store.js -> ui.js ->
   *             motion.js -> page-*.js
   * No build step, no modules, must run from file://.
   * ================================================================== */

  /* ================================================================
   * §1 — Guards and tiny utilities
   * ================================================================ */

  var warned = {};

  function warnOnce(key, message, context) {
    if (warned[key]) { return; }
    warned[key] = true;
    console.warn('[NOVA.ui] ' + message, context === undefined ? '' : context);
  }

  function getData() {
    var d = window.NOVA && window.NOVA.data;
    if (!d) { warnOnce('data', 'NOVA.data is unavailable — data-driven UI will render empty.', null); }
    return d || null;
  }

  function getStore() {
    var s = window.NOVA && window.NOVA.store;
    if (!s) { warnOnce('store', 'NOVA.store is unavailable — cart/wishlist actions are inert.', null); }
    return s || null;
  }

  function getMotion() {
    return (window.NOVA && window.NOVA.motion) || null;
  }

  function motionReduced() {
    var m = getMotion();
    return !!(m && m.reduced);
  }

  /** Short GSAP flourish, silently skipped when GSAP or motion is absent. */
  function pop(node, vars) {
    if (!node || !window.gsap || motionReduced()) { return; }
    try {
      window.gsap.fromTo(node, vars.from, vars.to);
    } catch (err) {
      console.warn('[NOVA.ui] pop() animation failed', { node: node, error: err });
    }
  }

  function productById(id) {
    var d = getData();
    if (!d || !d.products) { return null; }
    for (var i = 0; i < d.products.length; i++) {
      if (d.products[i].id === id) { return d.products[i]; }
    }
    return null;
  }

  /* ================================================================
   * §2 — DOM helpers
   * ================================================================ */

  function qs(sel, root) {
    try {
      return (root || document).querySelector(sel);
    } catch (err) {
      console.warn('[NOVA.ui] qs() bad selector', { selector: sel, error: err });
      return null;
    }
  }

  function qsa(sel, root) {
    try {
      return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    } catch (err) {
      console.warn('[NOVA.ui] qsa() bad selector', { selector: sel, error: err });
      return [];
    }
  }

  function appendChild(node, child) {
    if (child === null || child === undefined || child === false || child === true) { return; }
    if (Array.isArray(child)) {
      for (var i = 0; i < child.length; i++) { appendChild(node, child[i]); }
      return;
    }
    if (child && child.nodeType) { node.appendChild(child); return; }
    node.appendChild(document.createTextNode(String(child)));
  }

  /**
   * el('div', {class:'chip', 'data-id':'1', html:'<b>hi</b>'}, child, …)
   * Attribute keys: class/className, style (object), html, text, dataset
   * (object), on* (function -> addEventListener), true -> boolean attr,
   * null/undefined/false -> skipped.
   */
  function el(tag, attrs) {
    var node = document.createElement(tag);
    var key, value, sub;
    if (attrs) {
      for (key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) { continue; }
        value = attrs[key];
        if (value === null || value === undefined || value === false) { continue; }
        if (key === 'class' || key === 'className') {
          node.className = String(value);
        } else if (key === 'style' && value && typeof value === 'object') {
          for (sub in value) {
            if (Object.prototype.hasOwnProperty.call(value, sub)) {
              node.style.setProperty(sub, String(value[sub]));
            }
          }
        } else if (key === 'dataset' && value && typeof value === 'object') {
          for (sub in value) {
            if (Object.prototype.hasOwnProperty.call(value, sub)) {
              node.setAttribute('data-' + sub, String(value[sub]));
            }
          }
        } else if (key === 'html') {
          node.innerHTML = String(value);
        } else if (key === 'text') {
          node.textContent = String(value);
        } else if (typeof value === 'function' && key.slice(0, 2) === 'on') {
          node.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (value === true) {
          node.setAttribute(key, '');
        } else {
          node.setAttribute(key, String(value));
        }
      }
    }
    for (var i = 2; i < arguments.length; i++) { appendChild(node, arguments[i]); }
    return node;
  }

  /* ================================================================
   * §3 — Formatters
   * ================================================================ */

  var ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  /** HTML-escape. Every data-derived string interpolated into markup goes through this. */
  function esc(str) {
    if (str === null || str === undefined) { return ''; }
    return String(str).replace(/[&<>"']/g, function (c) { return ESC_MAP[c]; });
  }

  function groupThousands(intPart) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  /** 349 -> "$349"  |  1299.5 -> "$1,299.50"  |  2400 -> "$2,400" */
  function money(n) {
    var v = Number(n);
    if (!isFinite(v)) {
      console.warn('[NOVA.ui] money() received a non-numeric value', { value: n });
      v = 0;
    }
    var negative = v < 0;
    var rounded = Math.round(Math.abs(v) * 100) / 100;
    var isWhole = Math.abs(rounded - Math.round(rounded)) < 1e-9;
    var text = isWhole ? String(Math.round(rounded)) : rounded.toFixed(2);
    var parts = text.split('.');
    parts[0] = groupThousands(parts[0]);
    return (negative ? '-$' : '$') + parts.join('.');
  }

  function readQuery(query, name) {
    if (!query) { return null; }
    var pairs = query.split('&');
    for (var i = 0; i < pairs.length; i++) {
      if (!pairs[i]) { continue; }
      var eq = pairs[i].indexOf('=');
      var rawKey = eq > -1 ? pairs[i].slice(0, eq) : pairs[i];
      var key;
      try {
        key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      } catch (err) {
        key = rawKey;
      }
      if (key !== name) { continue; }
      if (eq === -1) { return ''; }
      try {
        return decodeURIComponent(pairs[i].slice(eq + 1).replace(/\+/g, ' '));
      } catch (err2) {
        console.warn('[NOVA.ui] getParam() could not decode value', { name: name, error: err2 });
        return pairs[i].slice(eq + 1);
      }
    }
    return null;
  }

  /**
   * Query parameter reader that also works for file:// URLs, and falls back
   * to a hash query (`#?id=x` or `#id=x`) when the search string is empty.
   */
  function getParam(name) {
    try {
      var search = window.location.search || '';
      if (search.charAt(0) === '?') { search = search.slice(1); }
      var found = readQuery(search, name);
      if (found !== null) { return found; }

      var hash = window.location.hash || '';
      if (hash.charAt(0) === '#') { hash = hash.slice(1); }
      var qi = hash.indexOf('?');
      var hashQuery = qi > -1 ? hash.slice(qi + 1) : (hash.indexOf('=') > -1 ? hash : '');
      return readQuery(hashQuery, name);
    } catch (err) {
      console.warn('[NOVA.ui] getParam() failed', { name: name, error: err });
      return null;
    }
  }

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** '2026-06-02' -> 'Jun 2, 2026' (parsed literally, so no timezone drift). */
  function formatDate(iso) {
    if (!iso) { return ''; }
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
    if (m) {
      var mi = parseInt(m[2], 10) - 1;
      if (mi < 0 || mi > 11) {
        console.warn('[NOVA.ui] formatDate() month out of range', { iso: iso });
        return String(iso);
      }
      return MONTHS[mi] + ' ' + parseInt(m[3], 10) + ', ' + m[1];
    }
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      console.warn('[NOVA.ui] formatDate() could not parse date', { iso: iso });
      return String(iso);
    }
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  /**
   * 5 stars + a `.stars__value` label.
   * components.css draws the star shape as a CSS mask on `.stars__icon`
   * ("no icon font, no image files"), with `.is-full` / `.is-half`
   * modifiers — so this emits spans, not SVG.
   */
  function stars(rating) {
    var value = Number(rating);
    if (!isFinite(value)) {
      console.warn('[NOVA.ui] stars() received a non-numeric rating', { rating: rating });
      value = 0;
    }
    value = Math.max(0, Math.min(5, value));

    var out = '<span class="stars" role="img" aria-label="Rated ' + esc(value.toFixed(1)) +
      ' out of 5">';
    for (var i = 1; i <= 5; i++) {
      var fill = value >= i ? 1 : (value > i - 1 ? value - (i - 1) : 0);
      var state = fill >= 0.75 ? ' is-full' : (fill >= 0.25 ? ' is-half' : '');
      out += '<span class="stars__icon' + state + '"></span>';
    }
    out += '<span class="stars__value">' + esc(value.toFixed(1)) + '</span></span>';
    return out;
  }

  /* ================================================================
   * §4 — PRODUCT ARTWORK
   * ------------------------------------------------------------------
   * There are no photographs anywhere on this site: every product,
   * category tile, cart line and gallery thumbnail is drawn here.
   *
   * Each illustration lives on a 480x480 viewBox, is composed from a
   * hue-derived palette, and is layered as:
   *     ambient glow -> product body -> highlights -> grounding shadow
   * Only gradients are used (no SVG filters) so a grid of 24 cards
   * stays cheap to composite.
   *
   * opts = { w, h, className, variant (0-3), label }
   * `variant` rotates/zooms the product group so the product page can
   * build a 4-shot gallery from one base drawing.
   * ================================================================ */

  var artUid = 0;

  var ART_KINDS = ['headphone', 'earbuds', 'speaker', 'turntable', 'mic', 'amp'];

  var ART_LABELS = {
    headphone: 'Over-ear headphones illustration',
    earbuds: 'Wireless earbuds and charging case illustration',
    speaker: 'Bookshelf speaker illustration',
    turntable: 'Turntable illustration',
    mic: 'Studio condenser microphone illustration',
    amp: 'Integrated amplifier illustration'
  };

  /* Angle / zoom offsets per gallery variant. */
  var ART_VARIANTS = [
    { r: 0, s: 1, x: 0, y: 0 },
    { r: -7, s: 1.09, x: 10, y: 8 },
    { r: 6, s: 0.93, x: -12, y: -6 },
    { r: -13, s: 1.2, x: 24, y: 22 }
  ];

  function hue360(hue) {
    var h = Number(hue);
    if (!isFinite(h)) { h = 210; }
    return ((h % 360) + 360) % 360;
  }

  function hsl(h, s, l) {
    return 'hsl(' + Math.round(h) + ', ' + s + '%, ' + l + '%)';
  }

  function palette(hue) {
    var h = hue360(hue);
    var h2 = (h + 24) % 360;
    return {
      h: h,
      accent: hsl(h, 88, 62),
      accentSoft: hsl(h, 92, 74),
      accentDeep: hsl(h2, 72, 40),
      glow: hsl(h, 95, 60),
      bodyLit: hsl(h, 18, 36),
      body: hsl(h, 20, 22),
      bodyDeep: hsl(h2, 26, 12),
      metalHi: hsl(h, 14, 90),
      metal: hsl(h, 12, 70),
      metalLo: hsl(h, 14, 42),
      ink: hsl(h2, 32, 8),
      pad: hsl(h, 16, 16)
    };
  }

  /** Shared gradient defs; `extra` adds art-specific defs. */
  function artDefs(u, c, extra) {
    return '<defs>' +
      '<linearGradient id="' + u + 'body" x1="0.1" y1="0" x2="0.75" y2="1">' +
        '<stop offset="0" stop-color="' + c.bodyLit + '"/>' +
        '<stop offset="0.52" stop-color="' + c.body + '"/>' +
        '<stop offset="1" stop-color="' + c.bodyDeep + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + u + 'metal" x1="0" y1="0" x2="0.9" y2="1">' +
        '<stop offset="0" stop-color="' + c.metalHi + '"/>' +
        '<stop offset="0.45" stop-color="' + c.metal + '"/>' +
        '<stop offset="1" stop-color="' + c.metalLo + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + u + 'accent" x1="0" y1="0" x2="1" y2="1">' +
        '<stop offset="0" stop-color="' + c.accentSoft + '"/>' +
        '<stop offset="1" stop-color="' + c.accentDeep + '"/>' +
      '</linearGradient>' +
      '<linearGradient id="' + u + 'sheen" x1="0" y1="0" x2="0.3" y2="1">' +
        '<stop offset="0" stop-color="#ffffff" stop-opacity="0.42"/>' +
        '<stop offset="0.6" stop-color="#ffffff" stop-opacity="0.06"/>' +
        '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<radialGradient id="' + u + 'glow" cx="0.5" cy="0.45" r="0.6">' +
        '<stop offset="0" stop-color="' + c.glow + '" stop-opacity="0.55"/>' +
        '<stop offset="0.55" stop-color="' + c.glow + '" stop-opacity="0.16"/>' +
        '<stop offset="1" stop-color="' + c.glow + '" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + u + 'shade" cx="0.5" cy="0.5" r="0.5">' +
        '<stop offset="0" stop-color="#000000" stop-opacity="0.5"/>' +
        '<stop offset="0.55" stop-color="#000000" stop-opacity="0.22"/>' +
        '<stop offset="1" stop-color="#000000" stop-opacity="0"/>' +
      '</radialGradient>' +
      '<radialGradient id="' + u + 'cone" cx="0.42" cy="0.36" r="0.72">' +
        '<stop offset="0" stop-color="' + c.bodyLit + '"/>' +
        '<stop offset="0.62" stop-color="' + c.ink + '"/>' +
        '<stop offset="1" stop-color="#000000"/>' +
      '</radialGradient>' +
      (extra || '') +
      '</defs>';
  }

  /* ---------- 1. Over-ear headphones ---------- */
  function artHeadphone(u, c) {
    return (
      /* headband */
      '<path d="M120 246C120 116 360 116 360 246" fill="none" stroke="url(#' + u + 'metal)"' +
        ' stroke-width="30" stroke-linecap="round"/>' +
      '<path d="M134 244C134 142 346 142 346 244" fill="none" stroke="' + c.pad + '"' +
        ' stroke-width="11" stroke-linecap="round" opacity="0.9"/>' +
      '<path d="M132 216C150 160 330 160 348 216" fill="none" stroke="url(#' + u + 'sheen)"' +
        ' stroke-width="6" stroke-linecap="round"/>' +
      /* sliders */
      '<rect x="107" y="208" width="26" height="62" rx="13" fill="url(#' + u + 'metal)"/>' +
      '<rect x="347" y="208" width="26" height="62" rx="13" fill="url(#' + u + 'metal)"/>' +
      /* left cup — facing away, logo side */
      '<rect x="74" y="238" width="92" height="116" rx="44" fill="url(#' + u + 'body)"/>' +
      '<rect x="80" y="244" width="80" height="104" rx="38" fill="none"' +
        ' stroke="url(#' + u + 'accent)" stroke-width="3" opacity="0.85"/>' +
      '<circle cx="120" cy="296" r="16" fill="none" stroke="' + c.accent + '" stroke-width="3.5"/>' +
      '<circle cx="120" cy="296" r="5.5" fill="' + c.accent + '"/>' +
      '<ellipse cx="104" cy="266" rx="20" ry="26" fill="url(#' + u + 'sheen)" opacity="0.5"/>' +
      /* right cup — facing viewer, driver visible */
      '<rect x="314" y="238" width="92" height="116" rx="44" fill="url(#' + u + 'body)"/>' +
      '<rect x="326" y="250" width="68" height="92" rx="33" fill="' + c.pad + '"/>' +
      '<ellipse cx="360" cy="296" rx="25" ry="33" fill="url(#' + u + 'cone)"/>' +
      '<ellipse cx="360" cy="296" rx="25" ry="33" fill="none" stroke="' + c.accent +
        '" stroke-width="2.5" opacity="0.75"/>' +
      '<ellipse cx="360" cy="296" rx="14" ry="19" fill="none" stroke="' + c.metal +
        '" stroke-width="2" opacity="0.35"/>' +
      '<ellipse cx="344" cy="266" rx="16" ry="22" fill="url(#' + u + 'sheen)" opacity="0.45"/>'
    );
  }

  /* ---------- 2. Earbuds + charging case ----------
   * Draw order matters: hinged lid (back) -> buds standing proud of the
   * case rim -> case front, so the stems disappear into the slot while
   * the housings stay fully visible.
   */
  function artEarbuds(u, c) {
    function bud(x, y, rot) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')">' +
        '<rect x="-11" y="4" width="22" height="62" rx="11" fill="url(#' + u + 'metal)"/>' +
        '<ellipse cx="0" cy="0" rx="28" ry="26" fill="url(#' + u + 'body)"/>' +
        '<ellipse cx="0" cy="0" rx="28" ry="26" fill="none" stroke="' + c.metalLo +
          '" stroke-width="1.5" opacity="0.5"/>' +
        '<ellipse cx="13" cy="2" rx="11" ry="10" fill="' + c.pad + '"/>' +
        '<circle cx="13" cy="2" r="5" fill="' + c.accent + '"/>' +
        '<ellipse cx="-9" cy="-11" rx="12" ry="9" fill="url(#' + u + 'sheen)" opacity="0.6"/>' +
        '<rect x="-7" y="46" width="14" height="11" rx="6" fill="' + c.accent + '" opacity="0.8"/>' +
        '</g>';
    }
    return (
      /* lid, hinged open at the back-left */
      '<g transform="rotate(-15 156 252)">' +
        '<rect x="148" y="178" width="184" height="74" rx="32" fill="' + c.bodyLit + '"/>' +
        '<rect x="162" y="190" width="156" height="48" rx="22" fill="' + c.ink + '" opacity="0.5"/>' +
        '<rect x="166" y="194" width="118" height="13" rx="6" fill="url(#' + u + 'sheen)"' +
          ' opacity="0.5"/>' +
      '</g>' +
      /* buds standing in the open case */
      bud(203, 229, -12) +
      bud(281, 225, 12) +
      /* case front */
      '<rect x="148" y="252" width="184" height="122" rx="44" fill="url(#' + u + 'body)"/>' +
      '<ellipse cx="240" cy="254" rx="86" ry="11" fill="' + c.ink + '" opacity="0.7"/>' +
      '<rect x="148" y="256" width="184" height="40" rx="40" fill="url(#' + u + 'sheen)"' +
        ' opacity="0.2"/>' +
      '<path d="M170 334h140" stroke="' + c.metal + '" stroke-width="2.5" opacity="0.3"/>' +
      '<circle cx="240" cy="354" r="6" fill="' + c.accent + '"/>' +
      '<circle cx="240" cy="354" r="14" fill="' + c.glow + '" opacity="0.25"/>' +
      '<rect x="196" y="366" width="88" height="6" rx="3" fill="' + c.ink + '" opacity="0.5"/>'
    );
  }

  /* ---------- 3. Bookshelf speaker ---------- */
  function artSpeaker(u, c) {
    return (
      /* cabinet depth */
      '<path d="M330 98L368 122V370L330 394Z" fill="' + c.bodyDeep + '"/>' +
      '<path d="M150 98L188 76H368L330 98Z" fill="' + c.bodyLit + '" opacity="0.9"/>' +
      /* front baffle */
      '<rect x="150" y="98" width="180" height="298" rx="16" fill="url(#' + u + 'body)"/>' +
      '<rect x="158" y="106" width="164" height="282" rx="12" fill="none"' +
        ' stroke="url(#' + u + 'accent)" stroke-width="2" opacity="0.35"/>' +
      /* tweeter */
      '<circle cx="240" cy="166" r="35" fill="' + c.ink + '"/>' +
      '<circle cx="240" cy="166" r="35" fill="none" stroke="url(#' + u + 'accent)" stroke-width="3"/>' +
      '<circle cx="240" cy="166" r="17" fill="url(#' + u + 'metal)"/>' +
      '<ellipse cx="234" cy="160" rx="7" ry="5" fill="#ffffff" opacity="0.45"/>' +
      /* woofer */
      '<circle cx="240" cy="292" r="63" fill="' + c.ink + '"/>' +
      '<circle cx="240" cy="292" r="63" fill="none" stroke="url(#' + u + 'accent)" stroke-width="3"/>' +
      '<circle cx="240" cy="292" r="50" fill="url(#' + u + 'cone)"/>' +
      '<circle cx="240" cy="292" r="50" fill="none" stroke="' + c.metalLo + '" stroke-width="2" opacity="0.5"/>' +
      '<circle cx="240" cy="292" r="17" fill="url(#' + u + 'metal)"/>' +
      '<circle cx="240" cy="292" r="17" fill="none" stroke="' + c.accent + '" stroke-width="2" opacity="0.6"/>' +
      '<path d="M204 258a50 50 0 0 1 26-16" stroke="#ffffff" stroke-opacity="0.22"' +
        ' stroke-width="5" fill="none" stroke-linecap="round"/>' +
      /* port + plate */
      '<ellipse cx="240" cy="368" rx="24" ry="10" fill="' + c.ink + '"/>' +
      '<rect x="214" y="212" width="52" height="5" rx="2.5" fill="' + c.accent + '" opacity="0.7"/>' +
      '<rect x="158" y="106" width="42" height="282" rx="12" fill="url(#' + u + 'sheen)" opacity="0.16"/>'
    );
  }

  /* ---------- 4. Turntable ---------- */
  function artTurntable(u, c) {
    var grooves = '';
    var radii = [104, 90, 76, 62];
    for (var i = 0; i < radii.length; i++) {
      grooves += '<ellipse cx="212" cy="272" rx="' + radii[i] + '" ry="' + (radii[i] * 0.9) +
        '" fill="none" stroke="#ffffff" stroke-opacity="0.07" stroke-width="2"/>';
    }
    return (
      /* plinth */
      '<rect x="62" y="140" width="356" height="252" rx="26" fill="url(#' + u + 'body)"/>' +
      '<rect x="62" y="140" width="356" height="66" rx="26" fill="url(#' + u + 'sheen)" opacity="0.14"/>' +
      '<rect x="74" y="152" width="332" height="228" rx="20" fill="none"' +
        ' stroke="url(#' + u + 'accent)" stroke-width="2" opacity="0.28"/>' +
      /* platter + record */
      '<ellipse cx="212" cy="272" rx="126" ry="114" fill="' + c.ink + '"/>' +
      '<ellipse cx="212" cy="272" rx="126" ry="114" fill="none" stroke="url(#' + u + 'metal)" stroke-width="4"/>' +
      '<ellipse cx="212" cy="272" rx="112" ry="101" fill="url(#' + u + 'cone)"/>' +
      grooves +
      '<ellipse cx="212" cy="272" rx="112" ry="101" fill="url(#' + u + 'sheen)" opacity="0.2"/>' +
      '<ellipse cx="212" cy="272" rx="38" ry="34" fill="url(#' + u + 'accent)"/>' +
      '<ellipse cx="212" cy="272" rx="38" ry="34" fill="none" stroke="' + c.ink +
        '" stroke-width="2" opacity="0.4"/>' +
      '<circle cx="212" cy="272" r="6" fill="url(#' + u + 'metal)"/>' +
      /* tone arm */
      '<circle cx="382" cy="196" r="24" fill="url(#' + u + 'metal)"/>' +
      '<circle cx="382" cy="196" r="10" fill="' + c.ink + '"/>' +
      '<rect x="388" y="164" width="34" height="26" rx="12" fill="url(#' + u + 'metal)"/>' +
      '<path d="M374 206L264 292" stroke="url(#' + u + 'metal)" stroke-width="9" stroke-linecap="round"/>' +
      '<g transform="translate(258,296) rotate(-38)">' +
        '<rect x="-20" y="-11" width="40" height="22" rx="5" fill="' + c.bodyLit + '"/>' +
        '<rect x="-20" y="-11" width="40" height="8" rx="4" fill="url(#' + u + 'sheen)" opacity="0.4"/>' +
        '<circle cx="14" cy="12" r="4.5" fill="' + c.accent + '"/>' +
      '</g>' +
      /* controls */
      '<circle cx="368" cy="330" r="17" fill="url(#' + u + 'metal)"/>' +
      '<circle cx="368" cy="330" r="6" fill="' + c.accent + '"/>' +
      '<rect x="322" y="240" width="14" height="62" rx="7" fill="' + c.ink + '" opacity="0.7"/>' +
      '<rect x="322" y="258" width="14" height="16" rx="7" fill="' + c.accent + '"/>' +
      '<rect x="86" y="352" width="70" height="8" rx="4" fill="' + c.ink + '" opacity="0.55"/>'
    );
  }

  /* ---------- 5. Studio condenser microphone ---------- */
  function artMic(u, c) {
    var mesh = '';
    for (var y = 132; y <= 224; y += 11) {
      mesh += '<path d="M200 ' + y + 'H280" stroke="' + c.metal +
        '" stroke-opacity="0.35" stroke-width="2.5"/>';
    }
    return (
      /* shock mount ring */
      '<ellipse cx="240" cy="212" rx="98" ry="116" fill="none" stroke="url(#' + u + 'metal)" stroke-width="11"/>' +
      '<ellipse cx="240" cy="212" rx="98" ry="116" fill="none" stroke="' + c.ink +
        '" stroke-width="2" opacity="0.4"/>' +
      '<path d="M150 176L196 196M330 176L284 196M150 250L196 232M330 250L284 232"' +
        ' stroke="' + c.accent + '" stroke-width="3" stroke-linecap="round" opacity="0.75"/>' +
      /* body */
      '<rect x="196" y="118" width="88" height="196" rx="44" fill="url(#' + u + 'body)"/>' +
      '<clipPath id="' + u + 'micclip"><rect x="196" y="118" width="88" height="112" rx="44"/></clipPath>' +
      '<g clip-path="url(#' + u + 'micclip)">' +
        '<rect x="196" y="118" width="88" height="112" fill="' + c.ink + '"/>' +
        mesh +
      '</g>' +
      '<rect x="196" y="118" width="88" height="112" rx="44" fill="none"' +
        ' stroke="url(#' + u + 'metal)" stroke-width="3"/>' +
      '<rect x="196" y="228" width="88" height="15" fill="url(#' + u + 'accent)"/>' +
      '<rect x="212" y="262" width="56" height="7" rx="3.5" fill="' + c.metal + '" opacity="0.6"/>' +
      '<circle cx="240" cy="288" r="7" fill="' + c.accent + '"/>' +
      '<rect x="204" y="126" width="18" height="96" rx="9" fill="url(#' + u + 'sheen)" opacity="0.35"/>' +
      /* stem + base */
      '<rect x="230" y="322" width="20" height="48" rx="8" fill="url(#' + u + 'metal)"/>' +
      '<ellipse cx="240" cy="380" rx="72" ry="20" fill="url(#' + u + 'metal)"/>' +
      '<ellipse cx="240" cy="374" rx="52" ry="13" fill="' + c.bodyDeep + '" opacity="0.55"/>'
    );
  }

  /* ---------- 6. Integrated amplifier ---------- */
  function artAmp(u, c) {
    function knob(cx, cy, angle) {
      var ticks = '';
      for (var i = 0; i < 12; i++) {
        ticks += '<rect x="-1.5" y="-33" width="3" height="7" rx="1.5" fill="' + c.metalLo +
          '" opacity="0.55" transform="rotate(' + (i * 30) + ')"/>';
      }
      return '<g transform="translate(' + cx + ',' + cy + ')">' +
        '<circle r="36" fill="url(#' + u + 'metal)"/>' +
        ticks +
        '<circle r="26" fill="url(#' + u + 'body)"/>' +
        '<circle r="26" fill="none" stroke="' + c.metalHi + '" stroke-width="1.5" opacity="0.4"/>' +
        '<rect x="-2.5" y="-25" width="5" height="16" rx="2.5" fill="' + c.accent +
          '" transform="rotate(' + angle + ')"/>' +
        '<ellipse cx="-10" cy="-12" rx="10" ry="7" fill="url(#' + u + 'sheen)" opacity="0.4"/>' +
        '</g>';
    }
    var vents = '';
    for (var v = 0; v < 7; v++) {
      vents += '<rect x="' + (150 + v * 26) + '" y="158" width="15" height="7" rx="3.5" fill="' +
        c.ink + '" opacity="0.55"/>';
    }
    return (
      /* chassis depth */
      '<path d="M400 178L436 152V310L400 336Z" fill="' + c.bodyDeep + '"/>' +
      '<path d="M70 178L106 152H436L400 178Z" fill="' + c.bodyLit + '"/>' +
      vents +
      /* chassis + front panel */
      '<rect x="70" y="178" width="330" height="158" rx="14" fill="url(#' + u + 'body)"/>' +
      '<rect x="84" y="192" width="302" height="130" rx="9" fill="url(#' + u + 'metal)" opacity="0.92"/>' +
      '<rect x="84" y="192" width="302" height="44" rx="9" fill="url(#' + u + 'sheen)" opacity="0.3"/>' +
      /* VU meter */
      '<rect x="192" y="206" width="110" height="66" rx="7" fill="' + c.ink + '"/>' +
      '<path d="M208 258a39 39 0 0 1 78 0" fill="none" stroke="' + c.accent +
        '" stroke-width="3" opacity="0.85"/>' +
      '<path d="M214 246l16-6M247 234v-8M280 246l-16-6" stroke="' + c.metal +
        '" stroke-width="2.5" opacity="0.6" stroke-linecap="round"/>' +
      '<path d="M247 258L268 232" stroke="' + c.accentSoft + '" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="247" cy="258" r="4.5" fill="' + c.metalHi + '"/>' +
      '<rect x="192" y="206" width="110" height="24" rx="7" fill="url(#' + u + 'sheen)" opacity="0.18"/>' +
      /* knobs, led, feet */
      knob(136, 258, -38) +
      knob(336, 258, 44) +
      '<circle cx="247" cy="296" r="6" fill="' + c.accent + '"/>' +
      '<circle cx="247" cy="296" r="13" fill="' + c.glow + '" opacity="0.25"/>' +
      '<rect x="100" y="336" width="52" height="13" rx="6" fill="' + c.ink + '"/>' +
      '<rect x="318" y="336" width="52" height="13" rx="6" fill="' + c.ink + '"/>'
    );
  }

  var ART_BUILDERS = {
    headphone: artHeadphone,
    earbuds: artEarbuds,
    speaker: artSpeaker,
    turntable: artTurntable,
    mic: artMic,
    amp: artAmp
  };

  /**
   * productArt('speaker', 210, {w:480, h:480, className:'pcard__art', variant:0})
   * -> inline <svg> string with collision-free gradient ids.
   * `w`/`h` accept a number or a CSS length such as '100%'.
   */
  function productArt(art, hue, opts) {
    var options = opts || {};
    var kind = String(art || '').toLowerCase();
    if (ART_KINDS.indexOf(kind) === -1) {
      console.warn('[NOVA.ui] productArt() unknown art kind — falling back to "headphone"',
        { art: art, allowed: ART_KINDS });
      kind = 'headphone';
    }

    var c = palette(hue);
    var u = 'nva' + (artUid++) + '-';
    var w = options.w === undefined || options.w === null ? 480 : options.w;
    var h = options.h === undefined || options.h === null ? 480 : options.h;
    var vIndex = Math.max(0, Math.min(ART_VARIANTS.length - 1, parseInt(options.variant, 10) || 0));
    var v = ART_VARIANTS[vIndex];

    var transform = 'translate(' + (240 + v.x) + ',' + (250 + v.y) + ') rotate(' + v.r +
      ') scale(' + v.s + ') translate(-240,-250)';

    var labelled = options.label
      ? ' role="img" aria-label="' + esc(options.label) + '"'
      : ' role="img" aria-label="' + esc(ART_LABELS[kind]) + '" aria-hidden="true"';

    /* The art kind travels as `data-art` (page-home.js selects on it) rather
       than as a class, so every class this file emits stays one the
       stylesheets define. */
    return '<svg' + (options.className ? ' class="' + esc(options.className) + '"' : '') +
      ' data-art="' + esc(kind) + '"' +
      ' viewBox="0 0 480 480" width="' + esc(w) + '" height="' + esc(h) + '"' +
      ' xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet"' +
      ' focusable="false" style="--art-hue:' + c.h + '"' + labelled + '>' +
      artDefs(u, c) +
      '<ellipse cx="' + (240 + v.x * 0.5) + '" cy="236" rx="204" ry="184" fill="url(#' + u + 'glow)"/>' +
      '<g transform="' + transform + '">' + ART_BUILDERS[kind](u, c) + '</g>' +
      '<ellipse cx="240" cy="412" rx="' + (152 * v.s) + '" ry="' + (24 * v.s) +
        '" fill="url(#' + u + 'shade)"/>' +
      '</svg>';
  }

  /* ================================================================
   * §5 — Card renderers
   * ================================================================ */

  var BADGE_LABELS = { 'new': 'New', sale: 'Sale', bestseller: 'Best seller' };

  /* data.js says `bestseller`; components.css defines `.badge--best`. */
  var BADGE_MODIFIERS = { 'new': 'badge--new', sale: 'badge--sale', bestseller: 'badge--best' };

  var ICON_HEART = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
    '<path d="M12 20.5l-1.35-1.22C5.9 15.02 3 12.39 3 9.15 3 6.52 5.07 4.5 7.7 4.5c1.5 0 2.94.7 3.85 1.8' +
    '.91-1.1 2.35-1.8 3.85-1.8C18.93 4.5 21 6.52 21 9.15c0 3.24-2.9 5.87-7.65 10.14z"' +
    ' fill="currentColor"/></svg>';

  /**
   * productCard(product, { reveal:'up'|false, delay:0.1, className:'', variant:0 })
   * The root <article> carries data-id + data-reveal — the page scripts and
   * motion.js both key off those.
   */
  function productCard(product, opts) {
    if (!product || !product.id) {
      console.warn('[NOVA.ui] productCard() called without a valid product', { product: product });
      return '';
    }
    var options = opts || {};
    var store = window.NOVA && window.NOVA.store;
    var out = product.stock === 0;
    var wished = false;
    if (store && typeof store.isWished === 'function') {
      try {
        wished = !!store.isWished(product.id);
      } catch (err) {
        console.warn('[NOVA.ui] productCard() isWished failed', { id: product.id, error: err });
      }
    }

    var href = 'product.html?id=' + encodeURIComponent(product.id);
    var badges = '';
    if (out) {
      badges += '<span class="badge badge--out">Out of stock</span>';
    } else if (product.badge && BADGE_LABELS[product.badge]) {
      badges += '<span class="badge ' + esc(BADGE_MODIFIERS[product.badge]) + '">' +
        esc(BADGE_LABELS[product.badge]) + '</span>';
    }

    var revealAttr = '';
    if (options.reveal !== false) {
      revealAttr = ' data-reveal="' + esc(options.reveal || 'up') + '"';
      if (options.delay) { revealAttr += ' data-reveal-delay="' + esc(options.delay) + '"'; }
    }

    return '<article class="pcard' + (out ? ' is-out' : '') +
      (options.className ? ' ' + esc(options.className) : '') + '" data-id="' + esc(product.id) + '"' +
      revealAttr + '>' +
      '<a class="pcard__media" href="' + esc(href) + '" aria-label="' + esc(product.name) + '">' +
        '<div class="pcard__art">' +
          productArt(product.art, product.hue, {
            w: '100%', h: '100%',
            variant: options.variant || 0
          }) +
        '</div>' +
        '<div class="pcard__badges">' + badges + '</div>' +
      '</a>' +
      /* `is-on` is the hook page-product.js syncs against; `is-active` is the
         state components.css paints. Both must be present. */
      '<button class="pcard__wish' + (wished ? ' is-on is-active' : '') +
        '" data-wish="' + esc(product.id) + '"' +
        ' aria-label="' + (wished ? 'Remove ' + esc(product.name) + ' from wishlist'
                                  : 'Add ' + esc(product.name) + ' to wishlist') + '"' +
        ' aria-pressed="' + (wished ? 'true' : 'false') + '" type="button">' + ICON_HEART + '</button>' +
      '<button class="pcard__quick" type="button" data-add-to-cart="' + esc(product.id) + '"' +
        (out ? ' disabled aria-disabled="true"' : '') + '>' +
        (out ? 'Out of stock' : 'Add to cart') + '</button>' +
      '<div class="pcard__body">' +
        '<p class="pcard__brand">' + esc(product.brand) + '</p>' +
        '<h3 class="pcard__title"><a href="' + esc(href) + '">' + esc(product.name) + '</a></h3>' +
        '<div class="pcard__meta">' +
          stars(product.rating) +
          '<span class="u-muted">(' + esc(product.reviewCount) + ')</span>' +
        '</div>' +
      '</div>' +
      '<div class="pcard__foot">' +
        '<span class="pcard__price">' + esc(money(product.price)) +
          (product.oldPrice
            ? '<span class="pcard__price-old">' + esc(money(product.oldPrice)) + '</span>'
            : '') +
        '</span>' +
      '</div>' +
    '</article>';
  }

  function categoryCard(category) {
    if (!category || !category.slug) {
      console.warn('[NOVA.ui] categoryCard() called without a valid category', { category: category });
      return '';
    }
    var d = getData();
    var count = 0;
    if (d && d.products) {
      for (var i = 0; i < d.products.length; i++) {
        if (d.products[i].category === category.slug) { count++; }
      }
    }
    return '<a class="ccard" href="shop.html?cat=' + esc(encodeURIComponent(category.slug)) + '"' +
      ' data-reveal="up" data-tilt>' +
      '<div class="ccard__art">' +
        productArt(category.art, category.hue, { w: '100%', h: '100%' }) +
      '</div>' +
      '<div class="ccard__body">' +
        '<h3 class="ccard__title">' + esc(category.name) + '</h3>' +
        (count ? '<span class="ccard__count">' + esc(count) + ' products</span>' : '') +
      '</div>' +
    '</a>';
  }

  function skeleton(n) {
    var count = parseInt(n, 10);
    if (!isFinite(count) || count < 1) { count = 1; }
    var out = '';
    for (var i = 0; i < count; i++) {
      out += '<article class="pcard" aria-hidden="true">' +
        '<div class="pcard__media"><span class="skeleton pcard__art"></span></div>' +
        '<div class="pcard__body">' +
          '<p class="pcard__brand skeleton">Brand</p>' +
          '<h3 class="pcard__title skeleton">Product name</h3>' +
          '<div class="pcard__meta"><span class="skeleton">Rating</span></div>' +
        '</div>' +
        '<div class="pcard__foot"><span class="pcard__price skeleton">$000</span></div>' +
      '</article>';
    }
    return out;
  }

  /* ================================================================
   * §6 — Header and footer
   * ================================================================ */

  var ICON_SEARCH = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/>' +
    '<path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var ICON_BAG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M5 8h14l-1 12H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' +
    '<path d="M9 9V6.5a3 3 0 0 1 6 0V9" fill="none" stroke="currentColor" stroke-width="2"' +
    ' stroke-linecap="round"/></svg>';

  var ICON_CLOSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
    '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var BRAND_MARK = '<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">' +
    '<circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" stroke-width="2" opacity="0.35"/>' +
    '<path d="M11 22V10l10 12V10" fill="none" stroke="currentColor" stroke-width="2.6"' +
    ' stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var NAV_LINKS = [
    { label: 'Home', href: 'index.html', key: 'home' },
    { label: 'Shop', href: 'shop.html', key: 'shop' },
    { label: 'Headphones', href: 'shop.html?cat=headphones', key: 'headphones' },
    { label: 'Speakers', href: 'shop.html?cat=speakers', key: 'speakers' }
  ];

  function brandHtml(cls) {
    return '<a class="' + esc(cls || 'brand') + '" href="index.html">' +
      '<span class="brand__mark">' + BRAND_MARK + '</span>' +
      '<span class="brand__name">NOVA</span></a>';
  }

  function navHtml(active, linkClass) {
    var out = '';
    for (var i = 0; i < NAV_LINKS.length; i++) {
      var link = NAV_LINKS[i];
      var isActive = link.key === active;
      out += '<a class="' + esc(linkClass) + (isActive ? ' is-active' : '') + '" href="' +
        esc(link.href) + '"' + (isActive ? ' aria-current="page"' : '') + '>' +
        esc(link.label) + '</a>';
    }
    return out;
  }

  function headerHtml(active) {
    return '<div class="header__inner container">' +
      brandHtml('brand') +
      '<nav class="nav" id="primary-nav" aria-label="Primary">' + navHtml(active, 'nav__link') + '</nav>' +
      '<div class="header__actions">' +
        '<button class="icon-btn" type="button" data-open-search aria-label="Search products">' +
          ICON_SEARCH + '</button>' +
        '<button class="icon-btn" type="button" data-open-wish aria-label="Wishlist">' +
          ICON_HEART +
          '<span class="icon-btn__badge" data-wish-count aria-live="polite" hidden>0</span>' +
        '</button>' +
        '<button class="icon-btn" type="button" data-open-cart aria-label="Open cart">' +
          ICON_BAG +
          '<span class="icon-btn__badge" data-cart-count aria-live="polite" hidden>0</span>' +
        '</button>' +
        /* layout.css draws the bars with ::before/::after and hides any nested
           markup (`.burger > * {display:none}`), so the button stays empty. */
        '<button class="burger" type="button" data-open-nav aria-label="Menu" aria-expanded="false"' +
          ' aria-controls="mobile-nav"></button>' +
      '</div>' +
    '</div>';
  }

  var SOCIAL = [
    { label: 'Instagram', path: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z' },
    { label: 'YouTube', path: 'M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z' },
    { label: 'Threads', path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' }
  ];

  /**
   * layout.css owns the footer grid: `.footer__top` is a 4-column grid of
   * `.footer__brand` + three `.footer__col`s, links are `.footer__link`
   * (direct flex children, no list), and `.footer__bottom` is the base bar.
   */
  function footerHtml() {
    var d = getData();
    var brand = (d && d.brand) || { name: 'NOVA', tagline: '', founded: '' };
    var cats = (d && d.categories) || [];

    var catLinks = '';
    for (var i = 0; i < cats.length; i++) {
      catLinks += '<a class="footer__link" href="shop.html?cat=' +
        esc(encodeURIComponent(cats[i].slug)) + '">' + esc(cats[i].name) + '</a>';
    }
    if (!catLinks) { catLinks = '<a class="footer__link" href="shop.html">All products</a>'; }

    var social = '';
    for (var s = 0; s < SOCIAL.length; s++) {
      social += '<a class="icon-btn" href="index.html" aria-label="' + esc(SOCIAL[s].label) + '">' +
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">' +
        '<path d="' + SOCIAL[s].path + '" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
        '</svg></a>';
    }

    return '<div class="footer__top container">' +
      '<div class="footer__brand">' +
        brandHtml('brand') +
        '<p>' + esc(brand.tagline) + '</p>' +
        '<p class="u-muted">Crafted since ' + esc(brand.founded) + '.</p>' +
      '</div>' +
      '<div class="footer__col">' +
        '<h3 class="footer__title">Shop</h3>' + catLinks +
      '</div>' +
      '<div class="footer__col">' +
        '<h3 class="footer__title">Company</h3>' +
        '<a class="footer__link" href="index.html#story">Our story</a>' +
        '<a class="footer__link" href="index.html#journal">Journal</a>' +
        '<a class="footer__link" href="index.html#faq">FAQ</a>' +
        '<a class="footer__link" href="cart.html">Your cart</a>' +
      '</div>' +
      '<div class="footer__col">' +
        '<h3 class="footer__title">Stay in tune</h3>' +
        '<div class="newsletter">' +
          '<p class="u-muted">New releases and listening notes. No noise.</p>' +
          '<form class="newsletter__form" data-newsletter novalidate>' +
            '<div class="field">' +
              '<label class="sr-only" for="nv-news">Email address</label>' +
              '<div class="field__control">' +
                '<input class="field__input" id="nv-news" type="email" name="email" required' +
                  ' placeholder="you@example.com" autocomplete="email">' +
              '</div>' +
            '</div>' +
            '<button class="btn btn--primary" type="submit" data-magnetic>Join</button>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="footer__bottom container">' +
      '<p>&copy; ' + new Date().getFullYear() + ' ' + esc(brand.name) +
        '. All rights reserved.</p>' +
      '<div class="footer__social">' + social + '</div>' +
    '</div>';
  }

  function mountHeader(active) {
    var host = document.getElementById('site-header');
    if (!host) {
      console.warn('[NOVA.ui] mountHeader(): <header id="site-header"> not found on this page.');
      return;
    }
    host.className = host.className ? host.className + ' site-header' : 'site-header';
    host.innerHTML = headerHtml(active);
  }

  function mountFooter() {
    var host = document.getElementById('site-footer');
    if (!host) {
      console.warn('[NOVA.ui] mountFooter(): <footer id="site-footer"> not found on this page.');
      return;
    }
    host.className = host.className ? host.className + ' site-footer' : 'site-footer';
    host.innerHTML = footerHtml();
  }

  /* ================================================================
   * §7 — Overlays: mini-cart drawer, search, wishlist, mobile nav
   * ------------------------------------------------------------------
   * One registry drives open/close, the focus trap, the Escape key,
   * backdrop clicks and the body scroll lock for all four.
   * ================================================================ */

  var overlayStack = [];
  var lastFocused = null;
  var bodyOverflowBefore = '';

  var OVERLAYS = {
    drawer: { id: 'mini-cart', openClass: 'is-open', focus: '[data-close-drawer]' },
    search: { id: 'site-search', openClass: 'is-open', focus: '[data-search-input]' },
    wish: { id: 'wish-modal', openClass: 'is-open', focus: '[data-close-wish]' },
    nav: { id: 'mobile-nav', openClass: 'is-open', focus: '.mobile-nav__link' }
  };

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
    ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function overlayNode(name) {
    var conf = OVERLAYS[name];
    return conf ? document.getElementById(conf.id) : null;
  }

  function lockBody() {
    if (overlayStack.length !== 1) { return; }
    bodyOverflowBefore = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('is-locked');
  }

  function unlockBody() {
    if (overlayStack.length) { return; }
    document.body.style.overflow = bodyOverflowBefore;
    document.body.classList.remove('is-locked');
  }

  function openOverlay(name) {
    var node = overlayNode(name);
    var conf = OVERLAYS[name];
    if (!node || !conf) {
      console.warn('[NOVA.ui] openOverlay(): overlay is not mounted', { name: name });
      return;
    }
    if (overlayStack.indexOf(name) > -1) { return; }
    if (!overlayStack.length) { lastFocused = document.activeElement; }

    overlayStack.push(name);
    node.classList.add(conf.openClass);
    node.setAttribute('aria-hidden', 'false');
    lockBody();

    var target = conf.focus ? qs(conf.focus, node) : null;
    if (!target) { target = qs(FOCUSABLE, node); }
    if (target) {
      try { target.focus({ preventScroll: true }); } catch (err) { target.focus(); }
    }

    /* The panel slide/fade is a CSS transition keyed on `.is-open`
       (components.css / layout.css). A GSAP tween here would write an inline
       transform that outranks the closing rule and strand the panel open. */
  }

  function closeOverlay(name) {
    var node = overlayNode(name);
    var conf = OVERLAYS[name];
    var index = overlayStack.indexOf(name);
    if (!node || !conf || index === -1) { return; }

    overlayStack.splice(index, 1);
    node.classList.remove(conf.openClass);
    node.setAttribute('aria-hidden', 'true');
    unlockBody();

    if (name === 'nav') {
      var burger = qs('[data-open-nav]');
      if (burger) {
        burger.setAttribute('aria-expanded', 'false');
        burger.classList.remove('is-open'); /* layout.css animates the bars to an X */
      }
    }
    if (!overlayStack.length && lastFocused && document.contains(lastFocused)) {
      try { lastFocused.focus({ preventScroll: true }); } catch (err) { lastFocused.focus(); }
      lastFocused = null;
    }
  }

  function closeTopOverlay() {
    if (!overlayStack.length) { return; }
    closeOverlay(overlayStack[overlayStack.length - 1]);
  }

  function trapFocus(event) {
    if (!overlayStack.length || event.key !== 'Tab') { return; }
    var name = overlayStack[overlayStack.length - 1];
    var node = overlayNode(name);
    if (!node) { return; }
    var items = qsa(FOCUSABLE, node).filter(function (item) {
      return item.offsetWidth > 0 || item.offsetHeight > 0 || item === document.activeElement;
    });
    if (!items.length) { return; }
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!node.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ---------- mini-cart drawer ---------- */

  /**
   * components.css owns the drawer: `.drawer__head` is itself the title row,
   * `.drawer__foot` is a flex column, and the open/close slide is a CSS
   * transition driven by `.drawer.is-open` — so no JS tween touches the panel.
   */
  function drawerHtml() {
    return '<div class="drawer__backdrop" data-overlay-backdrop data-close-drawer></div>' +
      '<div class="drawer__panel" role="dialog" aria-modal="true" aria-labelledby="mini-cart-title">' +
        '<header class="drawer__head">' +
          '<h2 id="mini-cart-title">Your cart</h2>' +
          '<button class="btn btn--icon" type="button" data-close-drawer' +
            ' aria-label="Close cart">' + ICON_CLOSE + '</button>' +
        '</header>' +
        '<div class="drawer__body">' +
          '<div data-ship-meter></div>' +
          '<div data-mini-cart></div>' +
        '</div>' +
        '<footer class="drawer__foot">' +
          '<div class="cluster" style="justify-content:space-between">' +
            '<span class="u-muted">Subtotal</span>' +
            '<strong class="u-mono" data-cart-subtotal>' + esc(money(0)) + '</strong>' +
          '</div>' +
          '<p class="u-muted">Shipping and taxes are calculated at checkout.</p>' +
          '<a class="btn btn--primary btn--block" href="cart.html" data-magnetic>View cart</a>' +
          '<button class="btn btn--ghost btn--block" type="button" data-close-drawer>' +
            'Continue shopping</button>' +
        '</footer>' +
      '</div>';
  }

  /**
   * `.mini-line` is a 3-column grid: art | info | remove. The quantity
   * stepper lives inside `.mini-line__meta` so it does not become a fourth
   * grid child and fall onto its own row.
   */
  function miniLineHtml(line) {
    var p = line.product || {};
    var href = 'product.html?id=' + encodeURIComponent(p.id || '');
    return '<article class="mini-line" data-key="' + esc(line.key) + '">' +
      '<a class="mini-line__art" href="' + esc(href) + '" tabindex="-1" aria-hidden="true">' +
        productArt(p.art, p.hue, { w: '100%', h: '100%' }) +
      '</a>' +
      '<div class="mini-line__info">' +
        '<a class="mini-line__title" href="' + esc(href) + '">' + esc(p.name || 'Item') + '</a>' +
        '<p class="mini-line__meta">' +
          (line.color ? esc(line.color) + ' &middot; ' : '') +
          esc(money(line.unitPrice)) + ' &middot; ' +
          '<strong>' + esc(money(line.lineTotal)) + '</strong>' +
        '</p>' +
        '<p class="mini-line__meta">' +
          '<span class="qty">' +
            '<button class="qty__btn" type="button" data-qty-dec="' + esc(line.key) + '"' +
              ' aria-label="Decrease quantity">&minus;</button>' +
            '<span class="qty__input" aria-live="polite">' + esc(line.qty) + '</span>' +
            '<button class="qty__btn" type="button" data-qty-inc="' + esc(line.key) + '"' +
              ' aria-label="Increase quantity">+</button>' +
          '</span>' +
        '</p>' +
      '</div>' +
      '<button class="mini-line__remove" type="button" data-remove-line="' + esc(line.key) + '"' +
        ' aria-label="Remove ' + esc(p.name || 'item') + ' from cart">' + ICON_CLOSE + '</button>' +
    '</article>';
  }

  /** Free-shipping meter, built from the shared `.progress` component. */
  function shipMeterHtml(totals) {
    if (!totals) { return ''; }
    var progress = Number(totals.freeShipProgress);
    if (!isFinite(progress)) { progress = 0; }
    if (progress > 1) { progress = progress / 100; }
    progress = Math.max(0, Math.min(1, progress));
    var label = totals.freeShipping
      ? 'Free shipping unlocked.'
      : 'Add ' + money(totals.amountToFreeShip) + ' more for free shipping.';
    return '<p class="u-muted">' + esc(label) + '</p>' +
      '<span class="progress"><span class="progress__bar" style="width:' +
      (progress * 100).toFixed(1) + '%"></span></span>';
  }

  function renderMiniCart() {
    var body = qs('[data-mini-cart]');
    if (!body) { return; }
    var store = getStore();
    if (!store) {
      body.innerHTML = '<p class="empty-state">Cart is unavailable.</p>';
      return;
    }

    var lines = [];
    var totals = null;
    try {
      lines = store.getDetailedCart() || [];
      totals = store.totals();
    } catch (err) {
      console.warn('[NOVA.ui] renderMiniCart() could not read the cart', { error: err });
      body.innerHTML = '<p class="empty-state">Cart is unavailable.</p>';
      return;
    }

    if (!lines.length) {
      body.innerHTML = '<div class="empty-state">' +
        '<span class="empty-state__icon">' + ICON_BAG + '</span>' +
        '<p>Your cart is empty.</p>' +
        '<a class="btn btn--primary" href="shop.html">Browse the shop</a>' +
      '</div>';
    } else {
      var html = '';
      for (var i = 0; i < lines.length; i++) { html += miniLineHtml(lines[i]); }
      body.innerHTML = html;
    }

    var meter = qs('[data-ship-meter]');
    if (meter) { meter.innerHTML = lines.length ? shipMeterHtml(totals) : ''; }

    var subtotal = qs('[data-cart-subtotal]');
    if (subtotal && totals) { subtotal.textContent = money(totals.subtotal); }
  }

  function bindDrawer(node) {
    node.addEventListener('click', function (event) {
      var store = getStore();
      var closer = event.target.closest('[data-close-drawer]');
      if (closer) { event.preventDefault(); closeOverlay('drawer'); return; }
      if (!store) { return; }

      var inc = event.target.closest('[data-qty-inc]');
      var dec = event.target.closest('[data-qty-dec]');
      var rem = event.target.closest('[data-remove-line]');
      if (!inc && !dec && !rem) { return; }

      var key = (inc || dec || rem).getAttribute(
        inc ? 'data-qty-inc' : (dec ? 'data-qty-dec' : 'data-remove-line'));
      var line = null;
      try {
        var detailed = store.getDetailedCart() || [];
        for (var i = 0; i < detailed.length; i++) {
          if (detailed[i].key === key) { line = detailed[i]; break; }
        }
      } catch (err) {
        console.warn('[NOVA.ui] drawer: could not read the cart line', { key: key, error: err });
        return;
      }
      if (!line) {
        console.warn('[NOVA.ui] drawer: cart line no longer exists', { key: key });
        return;
      }

      var result;
      if (rem || (dec && line.qty <= 1)) {
        var row = (rem || dec).closest('.mini-line');
        var motion = getMotion();
        var doRemove = function () {
          var res = store.remove(key);
          if (res && res.ok === false) { toast(res.message || 'Could not remove that item.', 'error'); }
        };
        if (row && motion && typeof motion.animateOut === 'function') {
          motion.animateOut(row, doRemove);
        } else {
          doRemove();
        }
        return;
      }

      result = store.setQty(key, line.qty + (inc ? 1 : -1));
      if (result && result.ok === false) { toast(result.message || 'Could not update quantity.', 'error'); }
    });
  }

  function openDrawer() { renderMiniCart(); openOverlay('drawer'); }
  function closeDrawer() { closeOverlay('drawer'); }

  /* ---------- search modal ---------- */

  /**
   * components.css styles the search overlay as `.modal` + `.modal__backdrop`
   * + `.modal__panel` + `.modal__close`, with `.search__input` as a direct
   * panel child (it draws its own magnifier as a background image, so no icon
   * element is emitted) and `.search__results` as the scrolling list.
   */
  function searchHtml() {
    return '<div class="modal__backdrop" data-overlay-backdrop data-close-search></div>' +
      '<div class="modal__panel" role="dialog" aria-modal="true" aria-label="Search products">' +
        '<label class="sr-only" for="nv-search-input">Search products</label>' +
        '<input class="search__input" id="nv-search-input" type="search" data-search-input' +
          ' placeholder="Search headphones, speakers, turntables…" autocomplete="off">' +
        '<button class="modal__close" type="button" data-close-search aria-label="Close search">' +
          ICON_CLOSE + '</button>' +
        '<div class="search__results" data-search-results></div>' +
      '</div>';
  }

  /* `.search__item` is a 44px | 1fr | auto grid: art, info, price. */
  function searchRowHtml(p, index) {
    return '<a class="search__item" href="product.html?id=' + esc(encodeURIComponent(p.id)) + '"' +
      ' data-search-index="' + esc(index) + '">' +
      '<span>' + productArt(p.art, p.hue, { w: 44, h: 44 }) + '</span>' +
      '<span>' +
        '<span class="pcard__title">' + esc(p.name) + '</span>' +
        '<span class="u-muted"> &middot; ' + esc(p.brand) + '</span>' +
      '</span>' +
      '<span class="u-mono">' + esc(money(p.price)) + '</span>' +
    '</a>';
  }

  function searchMatches(query) {
    var d = getData();
    if (!d || !d.products) { return []; }
    var q = String(query || '').trim().toLowerCase();
    if (!q) { return []; }
    var scored = [];
    for (var i = 0; i < d.products.length; i++) {
      var p = d.products[i];
      var name = String(p.name || '').toLowerCase();
      var brand = String(p.brand || '').toLowerCase();
      var cat = String(p.category || '').toLowerCase();
      var blurb = String(p.blurb || '').toLowerCase();
      var score = 0;
      if (name.indexOf(q) === 0) { score = 100; }
      else if (name.indexOf(q) > -1) { score = 80; }
      else if (brand.indexOf(q) > -1) { score = 60; }
      else if (cat.indexOf(q) > -1) { score = 45; }
      else if (blurb.indexOf(q) > -1) { score = 25; }
      if (score) { scored.push({ p: p, score: score }); }
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    return scored.slice(0, 8).map(function (row) { return row.p; });
  }

  function renderSearchResults(query) {
    var host = qs('[data-search-results]');
    if (!host) { return; }
    var d = getData();
    var q = String(query || '').trim();

    if (!q) {
      var featured = [];
      if (d && d.products) {
        featured = d.products.filter(function (p) { return p.featured; }).slice(0, 5);
        if (!featured.length) { featured = d.products.slice(0, 5); }
      }
      var chips = '';
      if (d && d.categories) {
        for (var c = 0; c < d.categories.length; c++) {
          chips += '<a class="chip" href="shop.html?cat=' +
            esc(encodeURIComponent(d.categories[c].slug)) + '">' + esc(d.categories[c].name) + '</a>';
        }
      }
      var popular = '';
      for (var f = 0; f < featured.length; f++) { popular += searchRowHtml(featured[f], f); }
      host.innerHTML = (chips ? '<p class="u-muted">Browse</p><div class="cluster">' +
        chips + '</div>' : '') +
        (popular ? '<p class="u-muted">Popular right now</p>' + popular : '');
      return;
    }

    var results = searchMatches(q);
    if (!results.length) {
      host.innerHTML = '<div class="search__empty">' +
        '<p>No matches for &ldquo;' + esc(q) + '&rdquo;.</p>' +
        '<p class="u-muted">Try a category, a brand or a model name.</p>' +
        '<a class="btn btn--ghost" href="shop.html">Browse everything</a></div>';
      return;
    }
    var list = '';
    for (var i = 0; i < results.length; i++) { list += searchRowHtml(results[i], i); }
    host.innerHTML = '<p class="u-muted">' + esc(results.length) +
      (results.length === 1 ? ' result' : ' results') + '</p>' + list;
  }

  function moveSearchSelection(step) {
    var items = qsa('[data-search-index]', overlayNode('search'));
    if (!items.length) { return; }
    var current = -1;
    for (var i = 0; i < items.length; i++) {
      if (items[i] === document.activeElement) { current = i; break; }
    }
    var next = current + step;
    if (next < 0) { next = items.length - 1; }
    if (next >= items.length) { next = 0; }
    /* `.search__item.is-active` is the highlight components.css paints. */
    for (var j = 0; j < items.length; j++) { items[j].classList.toggle('is-active', j === next); }
    items[next].focus();
  }

  function bindSearch(node) {
    node.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-search]')) {
        event.preventDefault();
        closeOverlay('search');
      }
    });
    var input = qs('[data-search-input]', node);
    if (!input) { return; }
    input.addEventListener('input', function () { renderSearchResults(input.value); });
    node.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveSearchSelection(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveSearchSelection(-1); }
    });
  }

  function openSearch() {
    var input = qs('[data-search-input]');
    if (input) { input.value = ''; }
    renderSearchResults('');
    openOverlay('search');
  }

  function closeSearch() { closeOverlay('search'); }

  /* ---------- wishlist modal (search-style shell) ---------- */

  function wishHtml() {
    return '<div class="modal__backdrop" data-overlay-backdrop data-close-wish></div>' +
      '<div class="modal__panel" role="dialog" aria-modal="true" aria-labelledby="wish-title">' +
        /* `.modal__title` (components.css) is the header band for a modal that
           opens with a heading rather than the search input. Unclassed, this
           h2 would inherit the global 48px display scale and sit flush against
           the panel's top edge. */
        '<h2 id="wish-title" class="modal__title u-center">Wishlist</h2>' +
        '<button class="modal__close" type="button" data-close-wish aria-label="Close wishlist">' +
          ICON_CLOSE + '</button>' +
        '<div class="search__results" data-wish-results></div>' +
      '</div>';
  }

  function renderWishModal() {
    var host = qs('[data-wish-results]');
    if (!host) { return; }
    var store = getStore();
    var ids = [];
    if (store && typeof store.getWish === 'function') {
      try {
        ids = store.getWish() || [];
      } catch (err) {
        console.warn('[NOVA.ui] renderWishModal() could not read the wishlist', { error: err });
      }
    }

    var rows = '';
    for (var i = 0; i < ids.length; i++) {
      var p = productById(ids[i]);
      if (!p) { continue; }
      rows += '<div class="search__item">' +
        '<a href="product.html?id=' + esc(encodeURIComponent(p.id)) + '"' +
          ' tabindex="-1" aria-hidden="true">' +
          productArt(p.art, p.hue, { w: 44, h: 44 }) +
        '</a>' +
        '<span>' +
          '<a class="pcard__title" href="product.html?id=' + esc(encodeURIComponent(p.id)) + '">' +
            esc(p.name) + '</a>' +
          '<span class="u-muted"> &middot; ' + esc(money(p.price)) + '</span>' +
        '</span>' +
        '<span class="cluster">' +
          '<button class="btn btn--primary btn--sm" type="button" data-add-to-cart="' +
            esc(p.id) + '"' + (p.stock === 0 ? ' disabled aria-disabled="true"' : '') + '>' +
            (p.stock === 0 ? 'Out of stock' : 'Add to cart') + '</button>' +
          '<button class="btn btn--ghost btn--sm" type="button" data-wish="' + esc(p.id) + '"' +
            ' aria-pressed="true" aria-label="Remove ' + esc(p.name) + ' from wishlist">Remove</button>' +
        '</span>' +
      '</div>';
    }

    host.innerHTML = rows
      ? rows
      : '<div class="search__empty">' +
          '<p>Your wishlist is empty.</p>' +
          '<p class="u-muted">Tap the heart on any product to save it here.</p>' +
          '<a class="btn btn--primary" href="shop.html">Find something</a></div>';
  }

  function bindWishModal(node) {
    node.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-wish]')) {
        event.preventDefault();
        closeOverlay('wish');
      }
    });
  }

  function openWish() { renderWishModal(); openOverlay('wish'); }

  /* ---------- mobile nav ---------- */

  /**
   * layout.css makes `.mobile-nav` itself the sliding panel (fixed, below the
   * header, flex column) whose only styled children are `.mobile-nav__link` —
   * there is no backdrop, inner panel or close button in the design.
   */
  function mobileNavHtml(active) {
    return navHtml(active, 'mobile-nav__link') +
      '<a class="mobile-nav__link" href="cart.html">Cart</a>';
  }

  function bindMobileNav(node) {
    node.addEventListener('click', function (event) {
      if (event.target.closest('[data-close-nav]')) {
        event.preventDefault();
        closeOverlay('nav');
        return;
      }
      if (event.target.closest('a[href]')) { closeOverlay('nav'); }
    });
  }

  /* ================================================================
   * §8 — Toasts
   * ================================================================ */

  var TOAST_TYPES = { info: 1, success: 1, error: 1 };
  var TOAST_ICONS = {
    info: '<path d="M12 8h.01M11 12h1v5h1" fill="none" stroke="currentColor" stroke-width="2"' +
      ' stroke-linecap="round"/>',
    success: '<path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" stroke-width="2.2"' +
      ' stroke-linecap="round" stroke-linejoin="round"/>',
    error: '<path d="M12 7.5v5.5M12 16.5h.01" fill="none" stroke="currentColor" stroke-width="2.2"' +
      ' stroke-linecap="round"/>'
  };
  var TOAST_LIMIT = 4;
  var TOAST_LIFE = 3200;

  function toastStack() {
    var stack = document.getElementById('toast-stack');
    if (stack) { return stack; }
    stack = el('div', {
      class: 'toast-stack',
      id: 'toast-stack',
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': 'false'
    });
    document.body.appendChild(stack);
    return stack;
  }

  function dismissToast(node) {
    if (!node || node.dataset.dismissing === '1') { return; }
    node.dataset.dismissing = '1';
    var drop = function () {
      if (node.parentNode) { node.parentNode.removeChild(node); }
    };
    if (window.gsap && !motionReduced()) {
      window.gsap.to(node, {
        opacity: 0, y: -10, scale: 0.97, duration: 0.3, ease: 'power2.in', onComplete: drop
      });
    } else {
      drop();
    }
  }

  function toast(message, type) {
    var kind = TOAST_TYPES[type] ? type : 'info';
    if (type && !TOAST_TYPES[type]) {
      console.warn('[NOVA.ui] toast() unknown type — falling back to "info"', { type: type });
    }
    var stack = toastStack();

    var extra = stack.children.length - (TOAST_LIMIT - 1);
    for (var i = 0; i < extra; i++) { dismissToast(stack.children[i]); }

    /* `.toast` is a two-column grid (icon | message) and components.css
       supplies only --success / --error modifiers plus its own entrance
       keyframes, so info is the base class and nothing else is appended. */
    var node = el('div', { class: kind === 'info' ? 'toast' : 'toast toast--' + kind });
    node.innerHTML = '<span class="toast__icon">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" stroke-width="1.6"' +
      ' opacity="0.35"/>' + TOAST_ICONS[kind] + '</svg></span>' +
      '<p class="toast__msg">' + esc(message) + '</p>';
    stack.appendChild(node);

    window.setTimeout(function () { dismissToast(node); }, TOAST_LIFE);
    return node;
  }

  /* ================================================================
   * §9 — Delegated bindings and badge sync
   * ================================================================ */

  function syncBadges() {
    var store = getStore();
    var cartCount = 0;
    var wishCount = 0;
    if (store) {
      try {
        cartCount = Number(store.count()) || 0;
        wishCount = Number(store.wishCount()) || 0;
      } catch (err) {
        console.warn('[NOVA.ui] syncBadges() could not read the store counters', { error: err });
      }
    }
    qsa('[data-cart-count]').forEach(function (node) {
      node.textContent = String(cartCount);
      node.hidden = cartCount === 0;
      node.classList.toggle('is-empty', cartCount === 0);
    });
    qsa('[data-wish-count]').forEach(function (node) {
      node.textContent = String(wishCount);
      node.hidden = wishCount === 0;
      node.classList.toggle('is-empty', wishCount === 0);
    });
  }

  function syncWishButtons() {
    var store = getStore();
    if (!store || typeof store.isWished !== 'function') { return; }
    qsa('[data-wish]').forEach(function (button) {
      var id = button.getAttribute('data-wish');
      var on = false;
      try {
        on = !!store.isWished(id);
      } catch (err) {
        console.warn('[NOVA.ui] syncWishButtons() isWished failed', { id: id, error: err });
        return;
      }
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.classList.toggle('is-on', on);
    });
  }

  /** `data-qty` is normally a number; a selector pointing at a qty input is tolerated. */
  function readQty(button) {
    var raw = button.getAttribute('data-qty');
    if (raw === null || raw === '') { return 1; }
    var direct = parseInt(raw, 10);
    if (isFinite(direct) && String(direct) === String(raw).trim()) {
      return direct > 0 ? direct : 1;
    }
    var source = qs(raw);
    if (source && source.value !== undefined) {
      var fromField = parseInt(source.value, 10);
      if (isFinite(fromField) && fromField > 0) { return fromField; }
    }
    console.warn('[NOVA.ui] data-qty could not be resolved — defaulting to 1', { value: raw });
    return 1;
  }

  function bindAddToCart(root) {
    var host = root || document;
    if (host.__novaAddBound) { return; }
    host.__novaAddBound = true;

    host.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-add-to-cart]') : null;
      if (!button) { return; }
      if (button.disabled || button.getAttribute('aria-disabled') === 'true') { return; }
      event.preventDefault();

      var store = getStore();
      if (!store) { toast('Cart is unavailable right now.', 'error'); return; }

      var id = button.getAttribute('data-add-to-cart');
      var qty = readQty(button);
      var color = button.getAttribute('data-color') || null;

      var result;
      try {
        result = store.add(id, qty, color);
      } catch (err) {
        console.warn('[NOVA.ui] bindAddToCart(): store.add threw', { id: id, error: err });
        toast('Could not add that to your cart.', 'error');
        return;
      }

      if (!result || result.ok === false) {
        toast((result && result.message) || 'Could not add that to your cart.', 'error');
        return;
      }

      var product = productById(id);
      toast((product ? product.name : 'Item') + ' added to cart', 'success');

      pop(button, {
        from: { scale: 0.93 },
        to: { scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.45)', clearProps: 'scale' }
      });
      var motion = getMotion();
      if (motion && typeof motion.flyToCart === 'function') { motion.flyToCart(button); }

      if (button.hasAttribute('data-open-drawer')) { openDrawer(); }
    });
  }

  function bindWish(root) {
    var host = root || document;
    if (host.__novaWishBound) { return; }
    host.__novaWishBound = true;

    host.addEventListener('click', function (event) {
      var button = event.target.closest ? event.target.closest('[data-wish]') : null;
      if (!button) { return; }
      event.preventDefault();

      var store = getStore();
      if (!store) { toast('Wishlist is unavailable right now.', 'error'); return; }

      var id = button.getAttribute('data-wish');
      var result;
      try {
        result = store.toggleWish(id);
      } catch (err) {
        console.warn('[NOVA.ui] bindWish(): store.toggleWish threw', { id: id, error: err });
        toast('Could not update your wishlist.', 'error');
        return;
      }
      if (!result || result.ok === false) {
        toast((result && result.message) || 'Could not update your wishlist.', 'error');
        return;
      }

      var on = false;
      try { on = !!store.isWished(id); } catch (err2) { on = false; }
      var product = productById(id);
      toast((product ? product.name : 'Item') + (on ? ' saved to wishlist' : ' removed from wishlist'),
        on ? 'success' : 'info');

      pop(button, {
        from: { scale: 0.8 },
        to: { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.4)', clearProps: 'scale' }
      });
    });
  }

  /* ================================================================
   * §10 — mountCommon and export
   * ================================================================ */

  var mounted = false;

  /** Re-point `.is-active` / aria-current at the given page key. */
  function setActiveNav(page) {
    var wanted = null;
    for (var i = 0; i < NAV_LINKS.length; i++) {
      if (NAV_LINKS[i].key === page) { wanted = NAV_LINKS[i].href; break; }
    }
    qsa('.nav__link, .mobile-nav__link').forEach(function (link) {
      var isActive = wanted !== null && link.getAttribute('href') === wanted;
      link.classList.toggle('is-active', isActive);
      if (isActive) { link.setAttribute('aria-current', 'page'); }
      else { link.removeAttribute('aria-current'); }
    });
  }

  function ensureOverlay(id, className, markup, binder) {
    var node = document.getElementById(id);
    if (node) { return node; }
    node = el('div', { class: className, id: id, 'aria-hidden': 'true' });
    node.innerHTML = markup;
    document.body.appendChild(node);
    if (binder) { binder(node); }
    return node;
  }

  function onHeaderClick(event) {
    if (!event.target.closest) { return; }
    if (event.target.closest('[data-open-search]')) { event.preventDefault(); openSearch(); return; }
    if (event.target.closest('[data-open-wish]')) { event.preventDefault(); openWish(); return; }
    if (event.target.closest('[data-open-cart]')) { event.preventDefault(); openDrawer(); return; }
    var burger = event.target.closest('[data-open-nav]');
    if (burger) {
      event.preventDefault();
      burger.setAttribute('aria-expanded', 'true');
      openOverlay('nav');
    }
  }

  function onScroll() {
    var header = qs('.site-header');
    if (!header) { return; }
    header.classList.toggle('is-scrolled', (window.pageYOffset || document.documentElement.scrollTop) > 8);
  }

  function onKeydown(event) {
    if (event.key === 'Escape') {
      if (overlayStack.length) { event.preventDefault(); closeTopOverlay(); }
      return;
    }
    if (event.key === 'Tab') { trapFocus(event); return; }
    if (event.key === '/' && !overlayStack.length) {
      var active = document.activeElement;
      var tag = active ? String(active.tagName || '').toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' ||
          (active && active.isContentEditable)) {
        return;
      }
      event.preventDefault();
      openSearch();
    }
  }

  function onNewsletterSubmit(event) {
    var form = event.target.closest ? event.target.closest('[data-newsletter]') : null;
    if (!form) { return; }
    event.preventDefault();
    var input = qs('input[type="email"]', form);
    var value = input ? String(input.value || '').trim() : '';
    if (!value || value.indexOf('@') < 1 || value.indexOf('.') === -1) {
      toast('Please enter a valid email address.', 'error');
      if (input) { input.focus(); }
      return;
    }
    toast('You are on the list. Welcome to NOVA.', 'success');
    form.reset();
  }

  function mountCommon(active) {
    var page = active || 'home';

    if (mounted) {
      /* Idempotent: re-point the active nav state and counters, bind nothing twice. */
      setActiveNav(page);
      syncBadges();
      return;
    }
    mounted = true;

    mountHeader(page);
    mountFooter();

    ensureOverlay(OVERLAYS.drawer.id, 'drawer', drawerHtml(), bindDrawer);
    ensureOverlay(OVERLAYS.search.id, 'modal', searchHtml(), bindSearch);
    ensureOverlay(OVERLAYS.wish.id, 'modal', wishHtml(), bindWishModal);
    ensureOverlay(OVERLAYS.nav.id, 'mobile-nav', mobileNavHtml(page), bindMobileNav);
    toastStack();

    var header = qs('.site-header');
    if (header) { header.addEventListener('click', onHeaderClick); }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    document.addEventListener('keydown', onKeydown);
    document.addEventListener('submit', onNewsletterSubmit);

    var store = getStore();
    if (store && typeof store.on === 'function') {
      store.on('cart:change', function () {
        syncBadges();
        renderMiniCart();
      });
      store.on('wish:change', function () {
        syncBadges();
        syncWishButtons();
        if (overlayStack.indexOf('wish') > -1) { renderWishModal(); }
      });
    }

    bindAddToCart(document);
    bindWish(document);

    syncBadges();
    syncWishButtons();
    renderMiniCart();
  }

  window.NOVA.ui = {
    qs: qs,
    qsa: qsa,
    el: el,
    money: money,
    getParam: getParam,
    esc: esc,
    stars: stars,
    productArt: productArt,
    productCard: productCard,
    categoryCard: categoryCard,
    mountCommon: mountCommon,
    mountHeader: mountHeader,
    mountFooter: mountFooter,
    toast: toast,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer,
    renderMiniCart: renderMiniCart,
    openSearch: openSearch,
    closeSearch: closeSearch,
    skeleton: skeleton,
    bindAddToCart: bindAddToCart,
    bindWish: bindWish,
    formatDate: formatDate,
    syncBadges: syncBadges
  };
}());
