/* ==========================================================================
   NOVA — page-shop.js
   Catalogue page: faceted filtering, sorting, view mode, pagination and URL
   state. The filter/sort core is pure and exported on NOVA.shop so it can be
   unit-tested outside a browser; everything below it is DOM plumbing.
   ========================================================================== */

window.NOVA = window.NOVA || {};

(function () {
  'use strict';

  var LOG = '[NOVA.shop]';
  var PER_PAGE = 12;
  var DEBOUNCE_MS = 180;
  var PRICE_STEP = 10;

  var SORT_KEYS = ['featured', 'price-asc', 'price-desc', 'rating', 'newest'];
  var RATING_STEPS = [0, 3.5, 4, 4.5];

  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';


  /* ======================================================================
     PURE CORE — no DOM, no globals. Exported on NOVA.shop.
     ====================================================================== */

  function toNum(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : fallback;
  }

  function clamp(n, lo, hi) {
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function normHex(value) {
    return String(value == null ? '' : value).trim().replace(/^#/, '').toLowerCase();
  }

  function timestamp(iso) {
    var t = Date.parse(iso);
    return isNaN(t) ? 0 : t;
  }

  function byName(a, b) {
    return String(a.name).localeCompare(String(b.name));
  }

  /**
   * Slider-friendly price bounds: floored / ceiled to PRICE_STEP so the rail's
   * resting min & max can never exclude the cheapest or dearest product.
   */
  function priceBounds(products) {
    var lo = Infinity;
    var hi = -Infinity;
    for (var i = 0; i < products.length; i++) {
      var price = toNum(products[i].price, NaN);
      if (!isFinite(price)) continue;
      if (price < lo) lo = price;
      if (price > hi) hi = price;
    }
    if (!isFinite(lo) || !isFinite(hi)) return { min: 0, max: 0 };
    return {
      min: Math.floor(lo / PRICE_STEP) * PRICE_STEP,
      max: Math.ceil(hi / PRICE_STEP) * PRICE_STEP
    };
  }

  /** Distinct catalogue colours, first spelling wins, keyed by bare hex. */
  function colorSwatches(products) {
    var seen = {};
    var out = [];
    for (var i = 0; i < products.length; i++) {
      var colors = products[i].colors || [];
      for (var j = 0; j < colors.length; j++) {
        var key = normHex(colors[j].hex);
        if (!key || seen[key]) continue;
        seen[key] = true;
        out.push({ key: key, hex: colors[j].hex, name: colors[j].name || ('#' + key) });
      }
    }
    return out;
  }

  function categoryCounts(products) {
    var counts = {};
    for (var i = 0; i < products.length; i++) {
      var slug = products[i].category;
      counts[slug] = (counts[slug] || 0) + 1;
    }
    return counts;
  }

  function defaultState(bounds) {
    return {
      q: '',
      cats: [],
      min: bounds.min,
      max: bounds.max,
      rating: 0,
      colors: [],
      stock: false,
      sale: false,
      sort: 'featured',
      view: 'grid',
      page: 1
    };
  }

  function cloneState(state) {
    var copy = {};
    for (var k in state) {
      if (Object.prototype.hasOwnProperty.call(state, k)) {
        copy[k] = Object.prototype.toString.call(state[k]) === '[object Array]' ? state[k].slice() : state[k];
      }
    }
    return copy;
  }

  /** AND across facets, OR inside each facet. */
  function matchesProduct(product, state) {
    if (state.cats.length && state.cats.indexOf(product.category) === -1) return false;

    var price = toNum(product.price, NaN);
    if (!isFinite(price) || price < state.min || price > state.max) return false;

    if (state.rating > 0 && !(toNum(product.rating, 0) >= state.rating)) return false;

    if (state.colors.length) {
      var colors = product.colors || [];
      var hit = false;
      for (var i = 0; i < colors.length; i++) {
        if (state.colors.indexOf(normHex(colors[i].hex)) !== -1) { hit = true; break; }
      }
      if (!hit) return false;
    }

    if (state.stock && !(toNum(product.stock, 0) > 0)) return false;

    if (state.sale && (product.oldPrice === null || product.oldPrice === undefined)) return false;

    if (state.q) {
      var needle = state.q.toLowerCase();
      var hay = [product.name, product.brand, product.category, product.blurb, product.sku]
        .join(' ').toLowerCase();
      if (hay.indexOf(needle) === -1) return false;
    }

    return true;
  }

  function filterProducts(products, state) {
    var out = [];
    for (var i = 0; i < products.length; i++) {
      if (matchesProduct(products[i], state)) out.push(products[i]);
    }
    return out;
  }

  /** Returns a new array; every comparator falls back to name for stability. */
  function sortProducts(list, key) {
    var out = list.slice();
    switch (key) {
      case 'price-asc':
        out.sort(function (a, b) { return (a.price - b.price) || byName(a, b); });
        break;
      case 'price-desc':
        out.sort(function (a, b) { return (b.price - a.price) || byName(a, b); });
        break;
      case 'rating':
        out.sort(function (a, b) {
          return (b.rating - a.rating) || (b.reviewCount - a.reviewCount) || byName(a, b);
        });
        break;
      case 'newest':
        out.sort(function (a, b) {
          return (timestamp(b.releasedAt) - timestamp(a.releasedAt)) || byName(a, b);
        });
        break;
      default:
        out.sort(function (a, b) {
          return ((b.featured ? 1 : 0) - (a.featured ? 1 : 0)) ||
                 (b.rating - a.rating) ||
                 (b.reviewCount - a.reviewCount) ||
                 byName(a, b);
        });
    }
    return out;
  }

  function splitList(value) {
    return String(value).split(',').map(function (part) {
      return part.trim();
    }).filter(function (part) {
      return part.length > 0;
    });
  }

  /**
   * @param {function(string):(string|null)} get  query-param reader
   * @param {{min:number,max:number}} bounds
   * @param {{cats:string[], colors:string[]}} vocab  known slugs / colour keys;
   *        unknown values are dropped so a stale link cannot strand the grid.
   */
  function parseState(get, bounds, vocab) {
    var state = defaultState(bounds);

    var cat = get('cat');
    if (cat) {
      state.cats = splitList(cat).filter(function (slug) {
        return vocab.cats.indexOf(slug) !== -1;
      });
    }

    var color = get('color');
    if (color) {
      state.colors = splitList(color).map(normHex).filter(function (key) {
        return vocab.colors.indexOf(key) !== -1;
      });
    }

    state.min = clamp(toNum(get('min'), bounds.min), bounds.min, bounds.max);
    state.max = clamp(toNum(get('max'), bounds.max), bounds.min, bounds.max);
    if (state.min > state.max) {
      var swap = state.min;
      state.min = state.max;
      state.max = swap;
    }

    var rating = toNum(get('rating'), 0);
    state.rating = RATING_STEPS.indexOf(rating) !== -1 ? rating : 0;

    state.stock = get('stock') === '1';
    state.sale = get('sale') === '1';

    var sort = get('sort');
    if (SORT_KEYS.indexOf(sort) !== -1) state.sort = sort;

    var view = get('view');
    if (view === 'list' || view === 'grid') state.view = view;

    state.q = String(get('q') || '').trim().slice(0, 60);

    return state;
  }

  /** Only non-default facets reach the URL, so a clean shop stays a clean URL. */
  function serializeState(state, bounds) {
    var parts = [];
    if (state.cats.length) parts.push('cat=' + state.cats.map(encodeURIComponent).join(','));
    if (state.q) parts.push('q=' + encodeURIComponent(state.q));
    if (state.min > bounds.min) parts.push('min=' + state.min);
    if (state.max < bounds.max) parts.push('max=' + state.max);
    if (state.rating > 0) parts.push('rating=' + state.rating);
    if (state.colors.length) parts.push('color=' + state.colors.join(','));
    if (state.stock) parts.push('stock=1');
    if (state.sale) parts.push('sale=1');
    if (state.sort !== 'featured') parts.push('sort=' + state.sort);
    if (state.view !== 'grid') parts.push('view=' + state.view);
    return parts.length ? '?' + parts.join('&') : '';
  }

  /**
   * One entry per removable filter. `kind` + `value` is what removeFilter()
   * consumes; `label` is raw text that the caller must escape before injecting.
   */
  function activeFilters(state, bounds, lookup) {
    var out = [];
    var i;

    for (i = 0; i < state.cats.length; i++) {
      out.push({ kind: 'cat', value: state.cats[i], label: lookup.catName(state.cats[i]) });
    }
    if (state.q) {
      out.push({ kind: 'q', value: '', label: '“' + state.q + '”' });
    }
    if (state.min > bounds.min || state.max < bounds.max) {
      out.push({
        kind: 'price',
        value: '',
        label: lookup.money(state.min) + ' – ' + lookup.money(state.max)
      });
    }
    if (state.rating > 0) {
      out.push({ kind: 'rating', value: String(state.rating), label: state.rating + '+ rating' });
    }
    for (i = 0; i < state.colors.length; i++) {
      out.push({
        kind: 'color',
        value: state.colors[i],
        label: lookup.colorName(state.colors[i]),
        swatch: '#' + state.colors[i]
      });
    }
    if (state.stock) out.push({ kind: 'stock', value: '', label: 'In stock only' });
    if (state.sale) out.push({ kind: 'sale', value: '', label: 'On sale only' });

    return out;
  }

  /** Mutates and returns `state`. */
  function removeFilter(state, kind, value, bounds) {
    var idx;
    switch (kind) {
      case 'cat':
        idx = state.cats.indexOf(value);
        if (idx !== -1) state.cats.splice(idx, 1);
        break;
      case 'color':
        idx = state.colors.indexOf(value);
        if (idx !== -1) state.colors.splice(idx, 1);
        break;
      case 'price':
        state.min = bounds.min;
        state.max = bounds.max;
        break;
      case 'rating':
        state.rating = 0;
        break;
      case 'stock':
        state.stock = false;
        break;
      case 'sale':
        state.sale = false;
        break;
      case 'q':
        state.q = '';
        break;
      default:
        console.warn(LOG, 'removeFilter called with an unknown facet:', kind);
    }
    state.page = 1;
    return state;
  }

  NOVA.shop = {
    priceBounds: priceBounds,
    colorSwatches: colorSwatches,
    categoryCounts: categoryCounts,
    defaultState: defaultState,
    cloneState: cloneState,
    matchesProduct: matchesProduct,
    filterProducts: filterProducts,
    sortProducts: sortProducts,
    parseState: parseState,
    serializeState: serializeState,
    activeFilters: activeFilters,
    removeFilter: removeFilter,
    normHex: normHex,
    PER_PAGE: PER_PAGE
  };


  /* ======================================================================
     DOM LAYER
     ====================================================================== */

  var els = {};
  var products = [];
  var categories = [];
  var bounds = { min: 0, max: 0 };
  var vocab = { cats: [], colors: [] };
  var swatchList = [];
  var catNames = {};
  var colorNames = {};
  var state = null;
  var filtered = [];
  var urlWarned = false;
  var panelOpen = false;
  var lastFocus = null;
  var mobileQuery = null;
  // motion.init() scans the whole document once; scanning a sub-scope before
  // that would run against an uninitialised engine, so pre-boot scans are skipped.
  var booted = false;

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) { return NOVA.ui.esc(String(value == null ? '' : value)); }
  function money(value) { return NOVA.ui.money(value); }

  function reduced() {
    return !!(NOVA.motion && NOVA.motion.reduced);
  }

  function hasGsap() {
    return typeof window.gsap !== 'undefined' && typeof window.gsap.to === 'function';
  }

  function scan(scope) {
    if (!booted) return;
    if (NOVA.motion && typeof NOVA.motion.scanAll === 'function') NOVA.motion.scanAll(scope);
  }

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, wait);
    };
  }

  function readParam(name) {
    return NOVA.ui.getParam(name);
  }


  /* ---------------------------------------------------------------- URL -- */

  /**
   * `history.replaceState` throws a SecurityError on file:// in some browsers.
   * The page must stay fully usable without URL sync, so the failure is logged
   * once and then swallowed for the rest of the session.
   */
  function syncUrl() {
    var query = serializeState(state, bounds);
    var url = window.location.pathname + query + window.location.hash;
    try {
      window.history.replaceState(cloneState(state), '', url);
    } catch (err) {
      if (!urlWarned) {
        urlWarned = true;
        console.warn(LOG, 'URL state sync is unavailable (likely a file:// origin); filters still work.', err);
      }
    }
  }


  /* ------------------------------------------------------------- BUILD --- */

  function buildCategoryFacet() {
    var html = categories.map(function (category) {
      return '<label class="shop-opt" data-cat-row="' + esc(category.slug) + '">' +
               '<input class="shop-opt__input" type="checkbox" name="shop-cat" value="' + esc(category.slug) + '">' +
               '<span class="shop-opt__box" aria-hidden="true"></span>' +
               '<span class="shop-opt__text">' + esc(category.name) + '</span>' +
               '<span class="shop-opt__count" data-cat-count="' + esc(category.slug) + '">0</span>' +
             '</label>';
    }).join('');
    els.cats.innerHTML = html;
  }

  function buildColorFacet() {
    var html = swatchList.map(function (swatch) {
      return '<button class="shop-swatch" type="button" data-color="' + esc(swatch.key) + '"' +
             ' aria-pressed="false" title="' + esc(swatch.name) + '"' +
             ' style="background:' + esc('#' + swatch.key) + '">' +
             '<span class="sr-only">' + esc(swatch.name) + '</span>' +
             '</button>';
    }).join('');
    els.colors.innerHTML = html;
  }

  function buildRangeInputs() {
    [els.priceMin, els.priceMax].forEach(function (input) {
      input.min = String(bounds.min);
      input.max = String(bounds.max);
      input.step = String(PRICE_STEP);
    });
    els.priceFloor.textContent = money(bounds.min);
    els.priceCeil.textContent = money(bounds.max);
  }


  /* ------------------------------------------------------------- PAINT --- */

  function paintRange() {
    var span = bounds.max - bounds.min;
    var lo = span > 0 ? ((state.min - bounds.min) / span) * 100 : 0;
    var hi = span > 0 ? ((state.max - bounds.min) / span) * 100 : 100;
    els.rangeFill.style.left = lo + '%';
    els.rangeFill.style.width = Math.max(0, hi - lo) + '%';
    els.priceLabel.textContent = money(state.min) + ' – ' + money(state.max);
  }

  function paintCategoryCounts() {
    // Counts ignore the category facet itself, so they show what ticking each
    // box would actually yield alongside the other active filters.
    var probe = cloneState(state);
    probe.cats = [];
    var counts = categoryCounts(filterProducts(products, probe));
    categories.forEach(function (category) {
      var n = counts[category.slug] || 0;
      var badge = qs('[data-cat-count="' + category.slug + '"]', els.cats);
      var row = qs('[data-cat-row="' + category.slug + '"]', els.cats);
      if (badge) badge.textContent = String(n);
      if (row) row.classList.toggle('is-empty', n === 0);
    });
  }

  function paintBanner() {
    var title = 'All products';
    var subtitle = 'Twenty-four hand-picked pieces of listening equipment. Filter, sort and compare until one of them is obviously yours.';
    var crumb = '<span aria-current="page">Shop</span>';

    if (state.cats.length === 1) {
      var category = categories.filter(function (c) { return c.slug === state.cats[0]; })[0];
      if (category) {
        title = category.name;
        subtitle = category.tagline || category.blurb || subtitle;
        crumb = '<a class="breadcrumbs__link" href="shop.html">Shop</a>' +
                '<span class="breadcrumbs__sep" aria-hidden="true">/</span>' +
                '<span aria-current="page">' + esc(category.name) + '</span>';
      }
    } else if (state.cats.length > 1) {
      title = 'Selected categories';
      subtitle = state.cats.length + ' categories combined into one shelf. Narrow it further on the left.';
      crumb = '<a class="breadcrumbs__link" href="shop.html">Shop</a>' +
              '<span class="breadcrumbs__sep" aria-hidden="true">/</span>' +
              '<span aria-current="page">' + esc(state.cats.length + ' categories') + '</span>';
    }

    if (els.title.textContent !== title) {
      els.title.textContent = title;
      if (booted) {
        // Post-boot the heading has already been split and tweened; replacing
        // its text discards those chars, so repaint it as plain visible text.
        els.title.style.opacity = '1';
        els.title.style.transform = 'none';
      }
    }
    els.subtitle.textContent = subtitle;
    els.crumb.innerHTML = crumb;
  }

  function paintCounts() {
    var shown = Math.min(filtered.length, state.page * PER_PAGE);
    els.count.textContent = filtered.length
      ? 'Showing ' + shown + ' of ' + filtered.length + ' product' + (filtered.length === 1 ? '' : 's')
      : 'No products match';
    els.bannerCount.textContent = String(filtered.length);
    els.bannerNoun.textContent = filtered.length === 1 ? 'product matches right now' : 'products match right now';
    els.applyCount.textContent = String(filtered.length);
  }

  function lookup() {
    return {
      catName: function (slug) { return catNames[slug] || slug; },
      colorName: function (key) { return colorNames[key] || ('#' + key); },
      money: money
    };
  }

  function paintChips() {
    var chips = activeFilters(state, bounds, lookup());
    els.filterCount.textContent = String(chips.length);
    els.filterCount.hidden = chips.length === 0;
    els.clear.disabled = chips.length === 0;

    if (!chips.length) {
      els.chips.innerHTML = '';
      els.chips.hidden = true;
      return;
    }

    var html = '<span class="shop-chips__label">Active</span>' + chips.map(function (chip) {
      return '<button class="chip is-active" type="button"' +
               ' data-chip-kind="' + esc(chip.kind) + '"' +
               ' data-chip-value="' + esc(chip.value) + '"' +
               ' aria-label="Remove filter: ' + esc(chip.label) + '">' +
               (chip.swatch ? '<span class="shop-chip__dot" aria-hidden="true" style="background:' + esc(chip.swatch) + '"></span>' : '') +
               '<span>' + esc(chip.label) + '</span>' +
               // .chip__x paints its own cross through a CSS mask — it must stay empty.
               '<span class="chip__x" aria-hidden="true"></span>' +
             '</button>';
    }).join('') +
    '<button class="shop-chips__reset" type="button" data-clear-all>Clear all</button>';

    els.chips.innerHTML = html;
    els.chips.hidden = false;
  }

  function paintMore() {
    var shown = Math.min(filtered.length, state.page * PER_PAGE);
    var remaining = filtered.length - shown;
    els.more.hidden = remaining <= 0;
    els.moreCount.textContent = '(' + remaining + ' left)';
  }

  function paintVisibility() {
    els.grid.classList.toggle('shop-grid--list', state.view === 'list');
    els.grid.hidden = filtered.length === 0;
    els.empty.hidden = filtered.length !== 0;
  }


  /* ------------------------------------------------------------ RENDER --- */

  function buildCards(list) {
    var host = document.createElement('div');
    var nodes = [];
    for (var i = 0; i < list.length; i++) {
      var product = list[i];
      var html;
      try {
        // reveal:false — productCard() otherwise stamps data-reveal, which
        // tokens.css rests at opacity:0. This grid owns its own entrance tween,
        // so a card must never carry a resting-hidden hook.
        html = NOVA.ui.productCard(product, { reveal: false });
      } catch (err) {
        console.error(LOG, 'ui.productCard() threw for product', product && product.id, err);
        continue;
      }
      host.innerHTML = html;
      var node = host.firstElementChild;
      if (!node) {
        console.error(LOG, 'ui.productCard() returned no element for product', product && product.id);
        continue;
      }
      nodes.push(node);
    }
    return nodes;
  }

  function settle(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.opacity = '';
      nodes[i].style.transform = '';
    }
  }

  function animateIn(nodes) {
    if (!nodes.length) return;
    if (!hasGsap() || reduced()) { settle(nodes); return; }
    window.gsap.killTweensOf(nodes);
    window.gsap.fromTo(nodes,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.44,
        ease: 'power2.out',
        stagger: 0.045,
        // clearProps guarantees no card can be stranded mid-tween: whatever
        // happens, the element ends at its natural painted state.
        clearProps: 'opacity,transform,willChange'
      }
    );
  }

  function renderCards(mode) {
    var visible = filtered.slice(0, state.page * PER_PAGE);

    if (mode === 'append') {
      var have = els.grid.children.length;
      var nodes = buildCards(visible.slice(have));
      nodes.forEach(function (node) { els.grid.appendChild(node); });
      scan(els.grid);
      animateIn(nodes);
      return;
    }

    var fresh = buildCards(visible);
    els.grid.innerHTML = '';
    fresh.forEach(function (node) { els.grid.appendChild(node); });
    scan(els.grid);
    animateIn(fresh);
  }

  function fadeOutThen(done) {
    var nodes = qsa(':scope > *', els.grid);
    if (!nodes.length || !hasGsap() || reduced()) { done(); return; }

    // Pin the current height for the length of the out-tween so the page does
    // not jump while the old cards are still occupying space.
    els.grid.style.minHeight = els.grid.offsetHeight + 'px';
    els.grid.setAttribute('aria-busy', 'true');
    window.gsap.killTweensOf(nodes);
    window.gsap.to(nodes, {
      opacity: 0,
      y: -14,
      duration: 0.2,
      ease: 'power1.in',
      stagger: 0.014,
      onComplete: function () {
        try {
          done();
        } finally {
          els.grid.setAttribute('aria-busy', 'false');
          window.requestAnimationFrame(function () { els.grid.style.minHeight = ''; });
        }
      }
    });
  }

  /** @param {'initial'|'animate'|'append'} mode */
  function apply(mode) {
    filtered = sortProducts(filterProducts(products, state), state.sort);

    var maxPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    if (state.page > maxPage) state.page = maxPage;

    syncUrl();
    paintBanner();
    paintCounts();
    paintChips();
    paintCategoryCounts();

    if (mode === 'append') {
      renderCards('append');
      paintCounts();
      paintMore();
      return;
    }

    if (mode === 'animate') {
      fadeOutThen(function () {
        renderCards('replace');
        paintVisibility();
        paintMore();
      });
      return;
    }

    renderCards('replace');
    paintVisibility();
    paintMore();
  }

  function update() {
    state.page = 1;
    apply('animate');
  }


  /* ------------------------------------------------------- SYNC CONTROLS -- */

  function syncControls() {
    els.q.value = state.q;

    qsa('input[name="shop-cat"]', els.cats).forEach(function (input) {
      input.checked = state.cats.indexOf(input.value) !== -1;
    });

    els.priceMin.value = String(state.min);
    els.priceMax.value = String(state.max);
    paintRange();

    qsa('input[name="shop-rating"]', els.rail).forEach(function (input) {
      input.checked = toNum(input.value, 0) === state.rating;
    });

    qsa('.shop-swatch', els.colors).forEach(function (button) {
      button.setAttribute('aria-pressed', state.colors.indexOf(button.getAttribute('data-color')) !== -1 ? 'true' : 'false');
    });

    els.stock.checked = state.stock;
    els.sale.checked = state.sale;
    els.sort.value = state.sort;

    qsa('.shop-view__btn', els.results).forEach(function (button) {
      var on = button.getAttribute('data-view') === state.view;
      button.classList.toggle('is-active', on);
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }


  /* --------------------------------------------------------- MOBILE PANEL -- */

  function isPanelMode() {
    return !!(mobileQuery && mobileQuery.matches);
  }

  function trapFocus(event) {
    if (event.key !== 'Tab') return;
    var focusable = qsa(FOCUSABLE, els.rail).filter(function (node) {
      return node.offsetWidth > 0 || node.offsetHeight > 0;
    });
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function onPanelKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePanel();
      return;
    }
    trapFocus(event);
  }

  function openPanel() {
    if (panelOpen || !isPanelMode()) return;
    panelOpen = true;
    lastFocus = document.activeElement;
    els.scrim.hidden = false;
    // Force a reflow so the scrim transitions in rather than snapping.
    void els.scrim.offsetWidth;
    els.scrim.classList.add('is-open');
    els.rail.classList.add('is-open');
    els.openFilters.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-locked');
    document.addEventListener('keydown', onPanelKeydown, true);
    els.railClose.focus();
  }

  function closePanel() {
    if (!panelOpen) return;
    panelOpen = false;
    els.rail.classList.remove('is-open');
    els.scrim.classList.remove('is-open');
    els.openFilters.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-locked');
    document.removeEventListener('keydown', onPanelKeydown, true);
    window.setTimeout(function () {
      if (!panelOpen) els.scrim.hidden = true;
    }, 320);
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }


  /* -------------------------------------------------------- RECENTLY SEEN -- */

  function resolveRecent(entries) {
    var byId = {};
    products.forEach(function (product) { byId[product.id] = product; });
    var out = [];
    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var product = (entry && typeof entry === 'object') ? (byId[entry.id] || entry) : byId[entry];
      if (product && product.name) out.push(product);
    }
    return out;
  }

  function renderRecent() {
    if (!NOVA.store || typeof NOVA.store.getRecent !== 'function') {
      console.warn(LOG, 'NOVA.store.getRecent() is unavailable; the "Recently viewed" strip stays hidden.');
      return;
    }
    var entries;
    try {
      entries = NOVA.store.getRecent(4) || [];
    } catch (err) {
      console.error(LOG, 'NOVA.store.getRecent(4) threw; hiding the "Recently viewed" strip.', err);
      return;
    }
    var list = resolveRecent(entries);
    if (!list.length) return;

    var nodes = buildCards(list);
    if (!nodes.length) return;

    els.recentGrid.innerHTML = '';
    nodes.forEach(function (node) { els.recentGrid.appendChild(node); });
    els.recent.hidden = false;
    scan(els.recentGrid);
    settle(nodes);
  }


  /* -------------------------------------------------------------- EVENTS -- */

  function bindEvents() {
    els.q.addEventListener('input', debounce(function () {
      state.q = els.q.value.trim().slice(0, 60);
      update();
    }, DEBOUNCE_MS));

    els.cats.addEventListener('change', function (event) {
      var input = event.target;
      if (!input || input.name !== 'shop-cat') return;
      var idx = state.cats.indexOf(input.value);
      if (input.checked && idx === -1) state.cats.push(input.value);
      else if (!input.checked && idx !== -1) state.cats.splice(idx, 1);
      update();
    });

    var commitRange = debounce(update, DEBOUNCE_MS);

    function onRangeInput() {
      var lo = clamp(toNum(els.priceMin.value, bounds.min), bounds.min, bounds.max);
      var hi = clamp(toNum(els.priceMax.value, bounds.max), bounds.min, bounds.max);
      if (lo > hi) {
        if (document.activeElement === els.priceMin) hi = lo;
        else lo = hi;
        els.priceMin.value = String(lo);
        els.priceMax.value = String(hi);
      }
      state.min = lo;
      state.max = hi;
      paintRange();
      commitRange();
    }

    els.priceMin.addEventListener('input', onRangeInput);
    els.priceMax.addEventListener('input', onRangeInput);

    els.rail.addEventListener('change', function (event) {
      var input = event.target;
      if (!input || input.name !== 'shop-rating') return;
      state.rating = toNum(input.value, 0);
      update();
    });

    els.colors.addEventListener('click', function (event) {
      var button = event.target.closest('.shop-swatch');
      if (!button) return;
      var key = button.getAttribute('data-color');
      var idx = state.colors.indexOf(key);
      if (idx === -1) state.colors.push(key);
      else state.colors.splice(idx, 1);
      button.setAttribute('aria-pressed', idx === -1 ? 'true' : 'false');
      update();
    });

    els.stock.addEventListener('change', function () {
      state.stock = els.stock.checked;
      update();
    });

    els.sale.addEventListener('change', function () {
      state.sale = els.sale.checked;
      update();
    });

    els.sort.addEventListener('change', function () {
      state.sort = SORT_KEYS.indexOf(els.sort.value) !== -1 ? els.sort.value : 'featured';
      update();
    });

    els.results.addEventListener('click', function (event) {
      var viewButton = event.target.closest('.shop-view__btn');
      if (viewButton) {
        var view = viewButton.getAttribute('data-view');
        if (view === state.view) return;
        state.view = view;
        syncControls();
        apply('animate');
        return;
      }

      var chip = event.target.closest('[data-chip-kind]');
      if (chip) {
        removeFilter(state, chip.getAttribute('data-chip-kind'), chip.getAttribute('data-chip-value'), bounds);
        syncControls();
        apply('animate');
        return;
      }

      if (event.target.closest('[data-clear-all]')) {
        clearAll();
      }
    });

    els.loadMore.addEventListener('click', function () {
      var maxPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
      if (state.page >= maxPage) return;
      state.page += 1;
      apply('append');
    });

    els.clear.addEventListener('click', clearAll);

    els.openFilters.addEventListener('click', openPanel);
    els.railClose.addEventListener('click', closePanel);
    els.railApply.addEventListener('click', closePanel);
    els.scrim.addEventListener('click', closePanel);

    if (mobileQuery) {
      var onBreakpoint = function (event) {
        if (!event.matches && panelOpen) closePanel();
      };
      if (typeof mobileQuery.addEventListener === 'function') mobileQuery.addEventListener('change', onBreakpoint);
      else if (typeof mobileQuery.addListener === 'function') mobileQuery.addListener(onBreakpoint);
    }

    window.addEventListener('popstate', function () {
      state = parseState(readParam, bounds, vocab);
      syncControls();
      apply('animate');
    });
  }

  function clearAll() {
    var view = state.view;
    var sort = state.sort;
    state = defaultState(bounds);
    state.view = view;
    state.sort = sort;
    syncControls();
    apply('animate');
  }


  /* ---------------------------------------------------------------- BOOT -- */

  function cacheEls() {
    els.title = qs('#shop-title');
    els.subtitle = qs('#shop-subtitle');
    els.crumb = qs('#shop-crumb');
    els.bannerCount = qs('#shop-banner-count');
    els.bannerNoun = qs('#shop-banner-noun');

    els.rail = qs('#shop-rail');
    els.railClose = qs('#shop-rail-close');
    els.railApply = qs('#shop-rail-apply');
    els.applyCount = qs('#shop-apply-count');
    els.scrim = qs('#shop-scrim');
    els.q = qs('#shop-q');
    els.cats = qs('#shop-cats');
    els.colors = qs('#shop-colors');
    els.priceMin = qs('#shop-price-min');
    els.priceMax = qs('#shop-price-max');
    els.priceLabel = qs('#shop-price-label');
    els.priceFloor = qs('#shop-price-floor');
    els.priceCeil = qs('#shop-price-ceil');
    els.rangeFill = qs('#shop-range-fill');
    els.stock = qs('#shop-stock');
    els.sale = qs('#shop-sale');
    els.clear = qs('#shop-clear');

    els.results = qs('.shop-results');
    els.openFilters = qs('#shop-open-filters');
    els.filterCount = qs('#shop-filter-count');
    els.count = qs('#shop-count');
    els.sort = qs('#shop-sort');
    els.chips = qs('#shop-chips');
    els.grid = qs('#shop-grid');
    els.empty = qs('#shop-empty');
    els.more = qs('#shop-more');
    els.moreCount = qs('#shop-more-count');
    els.loadMore = qs('#shop-load-more');

    els.recent = qs('#shop-recent');
    els.recentGrid = qs('#shop-recent-grid');

    var missing = Object.keys(els).filter(function (key) { return !els[key]; });
    return missing;
  }

  function missingDependency() {
    if (!window.NOVA.data || !NOVA.data.products) return 'NOVA.data.products (assets/js/data.js)';
    if (!window.NOVA.ui || typeof NOVA.ui.productCard !== 'function') return 'NOVA.ui (assets/js/ui.js)';
    return null;
  }

  function start() {
    var dependency = missingDependency();
    if (dependency) {
      console.error(LOG, 'cannot start: missing ' + dependency + '. The catalogue will not render.');
      return;
    }

    NOVA.ui.mountCommon('shop');

    var missing = cacheEls();
    if (missing.length) {
      console.error(LOG, 'shop.html is missing required elements:', missing.join(', '));
      return;
    }

    products = NOVA.data.products.slice();
    categories = (NOVA.data.categories || []).slice();
    bounds = priceBounds(products);
    swatchList = colorSwatches(products);

    vocab = {
      cats: categories.map(function (category) { return category.slug; }),
      colors: swatchList.map(function (swatch) { return swatch.key; })
    };
    categories.forEach(function (category) { catNames[category.slug] = category.name; });
    swatchList.forEach(function (swatch) { colorNames[swatch.key] = swatch.name; });

    mobileQuery = window.matchMedia('(max-width: 1023px)');

    buildCategoryFacet();
    buildColorFacet();
    buildRangeInputs();

    state = parseState(readParam, bounds, vocab);
    syncControls();
    bindEvents();
    apply('initial');
    renderRecent();

    if (NOVA.motion && typeof NOVA.motion.init === 'function') NOVA.motion.init();
    else console.warn(LOG, 'NOVA.motion.init() is unavailable; the page renders without entrance animation.');
    booted = true;
  }

  document.addEventListener('DOMContentLoaded', start);
})();
