window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  /* ==================================================================
   * NOVA — assets/js/motion.js
   * The GSAP layer: scroll reveals, parallax, split headlines, counters,
   * magnetic buttons, tilt, marquee, pinning, page intro.
   *
   *   §1  Resting-state flag + capability detection
   *   §2  Scope / marker helpers
   *   §3  Trigger scheduling + the "never stuck invisible" safety net
   *   §4  Static fallback (no GSAP, or prefers-reduced-motion)
   *   §5  Hooks: reveal, parallax, counters, split, magnetic, tilt,
   *       marquee, pin
   *   §6  Page-level moves: pageIn, animateOut, flyToCart, scrollTo
   *   §7  Lifecycle: init, scanAll, refresh, resize
   *
   * Declarative attributes consumed here are written by the page HTML:
   *   data-reveal / -delay / -start, data-stagger, data-parallax(-axis),
   *   data-counter(-suffix|-decimals), data-split, data-magnetic,
   *   data-tilt, data-marquee, data-pin(-end)
   * ================================================================== */

  /* ================================================================
   * §1 — Resting-state flag and capability detection
   * ------------------------------------------------------------------
   * `js-motion` must land on <html> at parse time: the stylesheet uses
   * `html.js-motion` to hide elements that are about to animate in.
   * ================================================================ */

  var MOTION_FLAG = 'js-motion';
  var docEl = document.documentElement;
  docEl.classList.add(MOTION_FLAG);

  var DEFAULT_START = 'top 85%';

  var reduced = false;
  try {
    reduced = !!(window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (err) {
    console.warn('[NOVA.motion] prefers-reduced-motion query failed — assuming full motion',
      { error: err });
  }

  function finePointer() {
    try {
      return !!(window.matchMedia &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    } catch (err) {
      console.warn('[NOVA.motion] pointer capability query failed — skipping pointer effects',
        { error: err });
      return false;
    }
  }

  var gsapRef = null;
  var ST = null;
  var SplitTextRef = null;
  var inited = false;
  var ready = false; /* GSAP + plugins registered */

  /* ================================================================
   * §2 — Scope and marker helpers
   * ------------------------------------------------------------------
   * Every processed element records the hooks already applied to it in
   * `data-motion-done`, so scanAll() after a dynamic re-render never
   * animates the same node twice — and never re-hides visible content.
   * ================================================================ */

  function scopeOf(scope) {
    if (!scope) { return document; }
    if (typeof scope === 'string') {
      var found = document.querySelector(scope);
      if (!found) {
        console.warn('[NOVA.motion] scope selector matched nothing — falling back to document',
          { scope: scope });
        return document;
      }
      return found;
    }
    if (scope.nodeType) { return scope; }
    console.warn('[NOVA.motion] unusable scope — falling back to document', { scope: scope });
    return document;
  }

  function findAll(scope, selector) {
    var root = scopeOf(scope);
    var list;
    try {
      list = Array.prototype.slice.call(root.querySelectorAll(selector));
    } catch (err) {
      console.warn('[NOVA.motion] findAll() bad selector', { selector: selector, error: err });
      return [];
    }
    if (root.nodeType === 1 && root.matches && root.matches(selector)) { list.unshift(root); }
    return list;
  }

  function isDone(node, key) {
    var value = node.getAttribute('data-motion-done');
    return !!value && (' ' + value + ' ').indexOf(' ' + key + ' ') > -1;
  }

  function markDone(node, key) {
    if (isDone(node, key)) { return false; }
    var value = node.getAttribute('data-motion-done');
    node.setAttribute('data-motion-done', value ? value + ' ' + key : key);
    return true;
  }

  function num(value, fallback) {
    var n = parseFloat(value);
    return isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max) {
    return v < min ? min : (v > max ? max : v);
  }

  function inViewport(node) {
    var rect = node.getBoundingClientRect();
    var h = window.innerHeight || docEl.clientHeight || 0;
    if (!rect.width && !rect.height) { return false; }
    return rect.bottom > 0 && rect.top < h;
  }

  /* ================================================================
   * §3 — Trigger scheduling and the safety net
   * ------------------------------------------------------------------
   * All one-shot entrances go through schedule(): a `once: true`
   * ScrollTrigger plus a registry the sweep can force-fire, so an
   * element can never be left stranded at opacity 0 because its
   * trigger position was never crossed.
   * ================================================================ */

  var pending = [];

  function schedule(node, start, play) {
    var record = { node: node, done: false };
    record.fire = function () {
      if (record.done) { return; }
      record.done = true;
      try {
        play();
      } catch (err) {
        console.warn('[NOVA.motion] entrance animation failed — forcing final state',
          { node: node, error: err });
        node.style.opacity = '1';
        node.style.transform = 'none';
      }
    };
    pending.push(record);
    try {
      ST.create({ trigger: node, start: start || DEFAULT_START, once: true, onEnter: record.fire });
    } catch (err) {
      console.warn('[NOVA.motion] could not create ScrollTrigger — playing immediately',
        { node: node, start: start, error: err });
      record.fire();
    }
    return record;
  }

  function sweepStuck() {
    var kept = [];
    for (var i = 0; i < pending.length; i++) {
      var record = pending[i];
      if (record.done) { continue; }
      if (!document.contains(record.node)) { continue; }
      if (inViewport(record.node)) { record.fire(); continue; }
      kept.push(record);
    }
    pending = kept;
  }

  /* ================================================================
   * §4 — Static fallback
   * ------------------------------------------------------------------
   * Used when GSAP is missing AND when the visitor asked for reduced
   * motion. Both paths end with `js-motion` removed from <html> and
   * inline final styles on every hook, so nothing depends on a
   * stylesheet rule to become visible again.
   * ================================================================ */

  /* Only these can be hidden by the pre-animation resting state. Pointer
     effects and parallax never hide anything, so they are marked as
     processed without touching their styles. */
  var HIDEABLE_SELECTOR = '[data-reveal], [data-split], [data-stagger]';
  var PASSIVE_SELECTOR = '[data-parallax], [data-tilt], [data-magnetic]';

  /**
   * Re-show an element only when IT is the hidden one. If an ancestor is
   * hidden (a closed drawer, an inactive tab), that is someone else's
   * intent and must not be overridden.
   */
  function ensureVisible(node) {
    if (window.getComputedStyle(node).visibility !== 'hidden') { return; }
    var parent = node.parentElement;
    if (parent && window.getComputedStyle(parent).visibility === 'hidden') { return; }
    node.style.visibility = 'visible';
  }

  function showNow(node) {
    node.style.opacity = '1';
    node.style.transform = 'none';
    ensureVisible(node);
    node.classList.add('is-revealed');
    markDone(node, 'reveal');
    markDone(node, 'stagger');
    markDone(node, 'split');
  }

  function passiveNow(node) {
    if (node.hasAttribute('data-parallax')) { node.style.transform = 'none'; }
    markDone(node, 'parallax');
    markDone(node, 'tilt');
    markDone(node, 'magnetic');
  }

  function groupThousands(intPart) {
    return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function formatCount(value, decimals) {
    var text = decimals > 0 ? Number(value).toFixed(decimals) : String(Math.round(value));
    var parts = text.split('.');
    parts[0] = groupThousands(parts[0]);
    return parts.join('.');
  }

  function counterParts(node) {
    var target = num(node.getAttribute('data-counter'), NaN);
    if (!isFinite(target)) {
      console.warn('[NOVA.motion] data-counter is not a number — leaving the text as authored',
        { node: node, value: node.getAttribute('data-counter') });
      return null;
    }
    var decimals = parseInt(node.getAttribute('data-counter-decimals'), 10);
    if (!isFinite(decimals) || decimals < 0) { decimals = 0; }
    return {
      target: target,
      decimals: decimals,
      suffix: node.getAttribute('data-counter-suffix') || ''
    };
  }

  function writeCount(node, parts, value) {
    node.textContent = formatCount(value, parts.decimals) + parts.suffix;
  }

  function forceStatic(scope) {
    docEl.classList.remove(MOTION_FLAG);
    var root = scopeOf(scope);

    findAll(root, HIDEABLE_SELECTOR).forEach(showNow);
    findAll(root, PASSIVE_SELECTOR).forEach(passiveNow);
    findAll(root, '[data-stagger]').forEach(function (parent) {
      Array.prototype.slice.call(parent.children).forEach(showNow);
    });
    findAll(root, '[data-counter]').forEach(function (node) {
      if (!markDone(node, 'counter')) { return; }
      var parts = counterParts(node);
      if (parts) { writeCount(node, parts, parts.target); }
    });
    findAll(root, '[data-marquee]').forEach(function (node) { markDone(node, 'marquee'); });
    findAll(root, '[data-pin]').forEach(function (node) { markDone(node, 'pin'); });
  }

  /** Guard shared by every hook: returns true when the caller must bail out. */
  function bail(scope) {
    if (!ready || reduced) {
      forceStatic(scope);
      return true;
    }
    return false;
  }

  /* ================================================================
   * §5 — Hooks
   * ================================================================ */

  /* ---------- reveal + stagger ---------- */

  var REVEAL_FROM = {
    up: { y: 46, opacity: 0 },
    down: { y: -46, opacity: 0 },
    left: { x: -54, opacity: 0 },
    right: { x: 54, opacity: 0 },
    fade: { opacity: 0 },
    scale: { scale: 0.92, opacity: 0 }
  };

  var REVEAL_TO = {
    up: { y: 0 },
    down: { y: 0 },
    left: { x: 0 },
    right: { x: 0 },
    fade: {},
    scale: { scale: 1 }
  };

  function revealKind(node, inherited) {
    var kind = (node.getAttribute('data-reveal') || inherited || 'up').toLowerCase();
    if (!REVEAL_FROM[kind]) {
      console.warn('[NOVA.motion] unknown data-reveal value — using "up"',
        { node: node, value: kind });
      kind = 'up';
    }
    return kind;
  }

  /**
   * Entrances deliberately keep their inline opacity/transform (no
   * clearProps): the stylesheet's `html.js-motion` resting rule would
   * otherwise take the element straight back to opacity 0.
   */
  function playReveal(targets, kind, delay, stagger) {
    var to = {};
    var source = REVEAL_TO[kind];
    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) { to[key] = source[key]; }
    }
    to.opacity = 1;
    to.duration = 1;
    to.ease = 'power3.out';
    to.overwrite = 'auto';
    if (delay) { to.delay = delay; }
    if (stagger) { to.stagger = stagger; }
    to.onComplete = function () {
      var list = this.targets();
      for (var i = 0; i < list.length; i++) { list[i].classList.add('is-revealed'); }
    };
    gsapRef.to(targets, to);
  }

  function reveal(scope) {
    if (bail(scope)) { return; }

    /* Parents first: a [data-stagger] group owns its direct children. */
    findAll(scope, '[data-stagger]').forEach(function (parent) {
      if (!markDone(parent, 'stagger')) { return; }
      markDone(parent, 'reveal');
      var kids = Array.prototype.slice.call(parent.children);
      if (!kids.length) {
        console.warn('[NOVA.motion] [data-stagger] has no children to sequence', { node: parent });
        return;
      }
      var kind = revealKind(parent, 'up');
      var each = num(parent.getAttribute('data-stagger'), 0);
      if (each <= 0) { each = 0.09; }
      var delay = num(parent.getAttribute('data-reveal-delay'), 0);
      var start = parent.getAttribute('data-reveal-start') || DEFAULT_START;

      kids.forEach(function (kid) { markDone(kid, 'reveal'); });
      gsapRef.set(kids, REVEAL_FROM[kind]);
      schedule(parent, start, function () { playReveal(kids, kind, delay, each); });
    });

    findAll(scope, '[data-reveal]').forEach(function (node) {
      if (!markDone(node, 'reveal')) { return; }
      var kind = revealKind(node, 'up');
      var delay = num(node.getAttribute('data-reveal-delay'), 0);
      var start = node.getAttribute('data-reveal-start') || DEFAULT_START;
      gsapRef.set(node, REVEAL_FROM[kind]);
      schedule(node, start, function () { playReveal(node, kind, delay, 0); });
    });
  }

  /* ---------- parallax ---------- */

  function parallax(scope) {
    if (bail(scope)) { return; }

    findAll(scope, '[data-parallax]').forEach(function (node) {
      if (!markDone(node, 'parallax')) { return; }
      var amount = num(node.getAttribute('data-parallax'), 0.2);
      if (!amount) { amount = 0.2; }
      var axis = node.getAttribute('data-parallax-axis') === 'x' ? 'x' : 'y';
      var trigger = node.parentElement || node;

      var travel = function () {
        return amount * (window.innerHeight || 800) * 0.5;
      };
      var from = {};
      var to = {};
      from[axis] = function () { return -travel(); };
      to[axis] = function () { return travel(); };
      to.ease = 'none';
      to.scrollTrigger = {
        trigger: trigger,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
        invalidateOnRefresh: true
      };
      gsapRef.fromTo(node, from, to);
    });
  }

  /* ---------- counters ---------- */

  function counters(scope) {
    if (bail(scope)) { return; }

    findAll(scope, '[data-counter]').forEach(function (node) {
      if (!markDone(node, 'counter')) { return; }
      var parts = counterParts(node);
      if (!parts) { return; }
      var start = node.getAttribute('data-reveal-start') || DEFAULT_START;
      var proxy = { value: 0 };
      writeCount(node, parts, 0);
      schedule(node, start, function () {
        gsapRef.to(proxy, {
          value: parts.target,
          duration: 2,
          ease: 'power2.out',
          onUpdate: function () { writeCount(node, parts, proxy.value); },
          onComplete: function () { writeCount(node, parts, parts.target); }
        });
      });
    });
  }

  /* ---------- split headlines ---------- */

  var SPLIT_KINDS = { lines: 1, words: 1, chars: 1 };

  /**
   * SplitText 3.15.0 (verified against assets/vendor/SplitText.min.js):
   * `SplitText.create(target, vars)` accepts type / aria / mask /
   * autoSplit / onSplit / linesClass / wordsClass / charsClass, calls
   * onSplit(self) synchronously, stores a returned animation so it can
   * revert it, and `revert()` restores the original innerHTML + aria.
   * The split is reverted once the entrance finishes so the headline
   * goes back to plain selectable text.
   */
  function splitOne(node) {
    var kind = (node.getAttribute('data-split') || 'lines').toLowerCase();
    if (!SPLIT_KINDS[kind]) {
      console.warn('[NOVA.motion] unknown data-split value — using "lines"',
        { node: node, value: kind });
      kind = 'lines';
    }
    var type = kind === 'chars' ? 'chars,words,lines'
      : (kind === 'words' ? 'words,lines' : 'lines');
    var maskWith = kind === 'chars' ? 'words' : kind;
    var start = node.getAttribute('data-reveal-start') || DEFAULT_START;
    var delay = num(node.getAttribute('data-reveal-delay'), 0);
    var split = null;
    var timeline = null;

    var restore = function () {
      gsapRef.delayedCall(0.05, function () {
        try {
          if (split && split.isSplit) { split.revert(); }
        } catch (err) {
          console.warn('[NOVA.motion] SplitText.revert() failed — text left split',
            { node: node, error: err });
        }
        gsapRef.set(node, { opacity: 1 });
        node.classList.add('is-revealed');
      });
    };

    try {
      split = SplitTextRef.create(node, {
        type: type,
        aria: 'auto',
        mask: maskWith,
        autoSplit: false,
        linesClass: 'js-split-line',
        wordsClass: 'js-split-word',
        charsClass: 'js-split-char',
        onSplit: function (self) {
          var targets = self[kind];
          if (!targets || !targets.length) {
            console.warn('[NOVA.motion] SplitText produced no targets', { node: node, kind: kind });
            return null;
          }
          timeline = gsapRef.timeline({ paused: true, onComplete: restore });
          timeline.from(targets, {
            yPercent: kind === 'lines' ? 115 : 100,
            opacity: kind === 'lines' ? 1 : 0,
            duration: kind === 'chars' ? 0.8 : 1,
            ease: 'expo.out',
            stagger: kind === 'chars' ? 0.018 : (kind === 'words' ? 0.035 : 0.09)
          }, delay);
          return timeline;
        }
      });
    } catch (err) {
      console.warn('[NOVA.motion] SplitText failed — showing the headline unanimated',
        { node: node, error: err });
      node.style.opacity = '1';
      node.style.transform = 'none';
      return;
    }

    if (!timeline) {
      node.style.opacity = '1';
      return;
    }

    /* Hidden until its trigger fires; schedule() guarantees it fires. */
    gsapRef.set(node, { opacity: 0 });
    schedule(node, start, function () {
      gsapRef.set(node, { opacity: 1 });
      timeline.play();
    });
  }

  /** Runs `fn` once fonts have settled (line splitting depends on metrics). */
  function whenTextReady(fn) {
    var ran = false;
    var go = function () {
      if (ran) { return; }
      ran = true;
      fn();
    };
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(go)['catch'](function (err) {
        console.warn('[NOVA.motion] document.fonts.ready rejected — splitting anyway',
          { error: err });
        go();
      });
    }
    window.setTimeout(go, 600);
  }

  function splitHeadlines(scope) {
    if (bail(scope)) { return; }
    var nodes = findAll(scope, '[data-split]').filter(function (node) {
      return markDone(node, 'split');
    });
    if (!nodes.length) { return; }
    whenTextReady(function () {
      nodes.forEach(function (node) {
        if (document.contains(node)) { splitOne(node); }
      });
      refresh();
    });
  }

  /* ---------- magnetic buttons ---------- */

  function magnetic(scope) {
    if (bail(scope)) { return; }
    if (!finePointer()) {
      findAll(scope, '[data-magnetic]').forEach(function (node) { markDone(node, 'magnetic'); });
      return;
    }

    findAll(scope, '[data-magnetic]').forEach(function (node) {
      if (!markDone(node, 'magnetic')) { return; }
      var xTo = gsapRef.quickTo(node, 'x', { duration: 0.5, ease: 'power3.out' });
      var yTo = gsapRef.quickTo(node, 'y', { duration: 0.5, ease: 'power3.out' });
      var pull = 0.35;
      var cap = 20;

      node.addEventListener('pointermove', function (event) {
        if (event.pointerType === 'touch') { return; }
        var rect = node.getBoundingClientRect();
        xTo(clamp((event.clientX - (rect.left + rect.width / 2)) * pull, -cap, cap));
        yTo(clamp((event.clientY - (rect.top + rect.height / 2)) * pull, -cap, cap));
      });
      node.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      node.addEventListener('pointercancel', function () { xTo(0); yTo(0); });
      node.addEventListener('blur', function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- tilt ---------- */

  function tilt(scope) {
    if (bail(scope)) { return; }
    if (!finePointer()) {
      findAll(scope, '[data-tilt]').forEach(function (node) { markDone(node, 'tilt'); });
      return;
    }

    findAll(scope, '[data-tilt]').forEach(function (node) {
      if (!markDone(node, 'tilt')) { return; }
      gsapRef.set(node, { transformPerspective: 900, transformOrigin: 'center' });
      var rotX = gsapRef.quickTo(node, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      var rotY = gsapRef.quickTo(node, 'rotationY', { duration: 0.6, ease: 'power3.out' });
      var maxTilt = 8;

      node.addEventListener('pointermove', function (event) {
        if (event.pointerType === 'touch') { return; }
        var rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) { return; }
        var px = (event.clientX - rect.left) / rect.width - 0.5;
        var py = (event.clientY - rect.top) / rect.height - 0.5;
        rotY(clamp(px * maxTilt * 2, -maxTilt, maxTilt));
        rotX(clamp(-py * maxTilt * 2, -maxTilt, maxTilt));
      });
      node.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'touch') { return; }
        gsapRef.to(node, { scale: 1.02, duration: 0.5, ease: 'power3.out' });
      });
      node.addEventListener('pointerleave', function () {
        rotX(0);
        rotY(0);
        gsapRef.to(node, { scale: 1, duration: 0.6, ease: 'power3.out' });
      });
    });
  }

  /* ---------- marquee ---------- */

  var marquees = [];

  function marqueeDuration(entry) {
    var half = entry.track.scrollWidth / 2;
    if (!half) { return 20; }
    return Math.max(6, half / entry.speed);
  }

  function marquee(scope) {
    if (bail(scope)) { return; }

    findAll(scope, '[data-marquee]').forEach(function (node) {
      if (!markDone(node, 'marquee')) { return; }
      var track = node.querySelector('.marquee__track');
      if (!track) {
        console.warn('[NOVA.motion] [data-marquee] has no .marquee__track child', { node: node });
        return;
      }
      var originals = Array.prototype.slice.call(track.children);
      if (!originals.length) {
        console.warn('[NOVA.motion] .marquee__track is empty — nothing to scroll', { node: node });
        return;
      }

      /* Duplicate the content once: -50% then equals exactly one copy. */
      for (var i = 0; i < originals.length; i++) {
        var clone = originals[i].cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.setAttribute('data-marquee-clone', '');
        track.appendChild(clone);
      }

      var raw = node.getAttribute('data-marquee') || '';
      var reverse = raw.toLowerCase() === 'reverse';
      var speed = reverse ? 60 : num(raw, 60);
      if (speed <= 0) { speed = 60; }

      var entry = { node: node, track: track, speed: speed };
      entry.tween = gsapRef.fromTo(track,
        { xPercent: reverse ? -50 : 0 },
        {
          xPercent: reverse ? 0 : -50,
          duration: marqueeDuration(entry),
          ease: 'none',
          repeat: -1
        });
      marquees.push(entry);

      node.addEventListener('pointerenter', function () {
        gsapRef.to(entry.tween, { timeScale: 0, duration: 0.4, overwrite: true });
      });
      node.addEventListener('pointerleave', function () {
        gsapRef.to(entry.tween, { timeScale: 1, duration: 0.4, overwrite: true });
      });
    });
  }

  /* ---------- pinned sections ---------- */

  function pins(scope) {
    if (bail(scope)) { return; }

    findAll(scope, '[data-pin]').forEach(function (node) {
      if (!markDone(node, 'pin')) { return; }
      var raw = node.getAttribute('data-pin') || '';
      var start = raw.indexOf(' ') > -1 ? raw : 'top top';
      var end = node.getAttribute('data-pin-end') || '+=100%';
      try {
        ST.create({
          trigger: node,
          start: start,
          end: end,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        });
      } catch (err) {
        console.warn('[NOVA.motion] could not pin section', { node: node, error: err });
      }
    });
  }

  /* ================================================================
   * §6 — Page-level moves
   * ================================================================ */

  function headerOffset() {
    var header = document.querySelector('.site-header');
    return header ? header.offsetHeight + 12 : 0;
  }

  /**
   * Page intro: the header drops in, then everything already sitting in
   * the first screen plays as one layered sequence instead of firing at
   * the same instant. Elements further down stay with ScrollTrigger.
   */
  function pageIn() {
    if (!ready || reduced) { return null; }
    var tl = gsapRef.timeline();
    var header = document.querySelector('.site-header');
    if (header) {
      tl.from(header, { y: -28, opacity: 0, duration: 0.8, ease: 'power3.out' }, 0);
    }

    var above = [];
    for (var i = 0; i < pending.length; i++) {
      if (!pending[i].done && document.contains(pending[i].node) && inViewport(pending[i].node)) {
        above.push(pending[i]);
      }
    }
    above.sort(function (a, b) {
      return a.node.getBoundingClientRect().top - b.node.getBoundingClientRect().top;
    });
    for (var j = 0; j < above.length; j++) {
      gsapRef.delayedCall(0.18 + j * 0.07, above[j].fire);
    }
    return tl;
  }

  /** Collapse + fade an element (a removed cart line), then call back. */
  function animateOut(el, done) {
    var callback = typeof done === 'function' ? done : null;
    var finish = function () {
      if (!callback) { return; }
      try {
        callback();
      } catch (err) {
        console.warn('[NOVA.motion] animateOut() callback threw', { node: el, error: err });
      }
    };
    if (!el || !el.nodeType) {
      console.warn('[NOVA.motion] animateOut() needs an element', { el: el });
      finish();
      return null;
    }
    if (!ready || reduced) {
      finish();
      return null;
    }
    var height = el.offsetHeight;
    var tl = gsapRef.timeline({ onComplete: finish });
    tl.set(el, { overflow: 'hidden', height: height });
    tl.to(el, { opacity: 0, x: 30, duration: 0.28, ease: 'power2.in' });
    tl.to(el, {
      height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0,
      duration: 0.32, ease: 'power2.inOut'
    }, '-=0.06');
    return tl;
  }

  function pulseCart() {
    if (!ready || reduced) { return; }
    var button = document.querySelector('[data-open-cart]');
    var badge = document.querySelector('[data-cart-count]');
    if (button) {
      gsapRef.fromTo(button, { scale: 1 },
        { scale: 1.14, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: 1 });
    }
    if (badge && !badge.hidden) {
      gsapRef.fromTo(badge, { scale: 0.5 },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.45)' });
    }
  }

  /** Add-to-cart flourish: a hue-matched disc arcs into the cart icon. */
  function flyToCart(fromEl) {
    if (!ready || reduced) { pulseCart(); return; }
    var target = document.querySelector('[data-open-cart]');
    if (!fromEl || !fromEl.getBoundingClientRect || !target) {
      pulseCart();
      return;
    }
    var from = fromEl.getBoundingClientRect();
    var to = target.getBoundingClientRect();

    var hue = '';
    var host = fromEl.closest ? fromEl.closest('[data-id]') : null;
    var svg = host ? host.querySelector('svg[style]') : null;
    if (svg) { hue = svg.style.getPropertyValue('--art-hue'); }
    var color = hue ? 'hsl(' + hue + ', 88%, 62%)' : 'currentColor';

    var dot = document.createElement('span');
    dot.className = 'js-fly-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.style.cssText = 'position:fixed;left:' + (from.left + from.width / 2 - 11) +
      'px;top:' + (from.top + from.height / 2 - 11) + 'px;width:22px;height:22px;' +
      'border-radius:50%;pointer-events:none;z-index:9999;background:' + color +
      ';box-shadow:0 0 24px ' + color + ';';
    document.body.appendChild(dot);

    var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
    var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
    var tl = gsapRef.timeline({
      onComplete: function () {
        if (dot.parentNode) { dot.parentNode.removeChild(dot); }
        pulseCart();
      }
    });
    tl.to(dot, { x: dx, duration: 0.78, ease: 'power1.inOut' }, 0);
    tl.to(dot, { y: dy, duration: 0.78, ease: 'power2.in' }, 0);
    tl.to(dot, { scale: 0.3, opacity: 0.15, duration: 0.3, ease: 'power2.in' }, 0.48);
  }

  function scrollTo(target, offset) {
    var off = isFinite(Number(offset)) && offset !== null && offset !== undefined
      ? Number(offset)
      : headerOffset();

    if (!ready || reduced || !window.ScrollToPlugin) {
      var y = 0;
      if (typeof target === 'number') {
        y = target - off;
      } else {
        var node = typeof target === 'string' ? document.querySelector(target) : target;
        if (!node || !node.getBoundingClientRect) {
          console.warn('[NOVA.motion] scrollTo() target not found', { target: target });
          return;
        }
        y = node.getBoundingClientRect().top + (window.pageYOffset || docEl.scrollTop || 0) - off;
      }
      window.scrollTo(0, Math.max(0, y));
      return;
    }

    gsapRef.to(window, {
      duration: 0.9,
      ease: 'power2.inOut',
      scrollTo: { y: target, offsetY: off, autoKill: true }
    });
  }

  /* ================================================================
   * §7 — Lifecycle
   * ================================================================ */

  function refresh() {
    if (!ready || reduced) { return; }
    try {
      ST.refresh();
    } catch (err) {
      console.warn('[NOVA.motion] ScrollTrigger.refresh() failed', { error: err });
    }
    sweepStuck();
  }

  function scanAll(scope) {
    if (bail(scope)) { return; }
    reveal(scope);
    parallax(scope);
    counters(scope);
    splitHeadlines(scope);
    magnetic(scope);
    tilt(scope);
    marquee(scope);
    pins(scope);
    refresh();
  }

  var resizeTimer = null;
  var lastWidth = window.innerWidth;

  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      if (window.innerWidth === lastWidth) { return; }
      lastWidth = window.innerWidth;
      /* Marquee loops are width-derived: retime them, then rebuild all
         ScrollTrigger positions in one pass. */
      for (var i = 0; i < marquees.length; i++) {
        var entry = marquees[i];
        if (!document.contains(entry.node)) { continue; }
        var progress = entry.tween.progress();
        entry.tween.duration(marqueeDuration(entry));
        entry.tween.progress(progress);
      }
      refresh();
    }, 220);
  }

  function init() {
    if (inited) { return; }
    inited = true;

    gsapRef = window.gsap || null;
    ST = window.ScrollTrigger || null;
    SplitTextRef = window.SplitText || null;

    var missing = [];
    if (!gsapRef) { missing.push('gsap'); }
    if (!ST) { missing.push('ScrollTrigger'); }
    if (!SplitTextRef) { missing.push('SplitText'); }
    if (!window.ScrollToPlugin) { missing.push('ScrollToPlugin'); }

    if (missing.length) {
      console.warn('[NOVA.motion] GSAP unavailable — rendering static',
        { missing: missing, hint: 'check the <script> tags in assets/vendor/' });
      forceStatic(document);
      return;
    }

    try {
      gsapRef.registerPlugin(ST, SplitTextRef, window.ScrollToPlugin);
    } catch (err) {
      console.warn('[NOVA.motion] GSAP unavailable — rendering static',
        { missing: ['plugin registration'], error: err });
      forceStatic(document);
      return;
    }

    ready = true;

    if (reduced) {
      forceStatic(document);
      return;
    }

    gsapRef.defaults({ overwrite: 'auto' });
    scanAll(document);

    window.addEventListener('load', function () {
      refresh();
      window.setTimeout(sweepStuck, 200);
    });
    window.addEventListener('resize', onResize);
    window.setTimeout(sweepStuck, 1500);
  }

  /* Last-resort net: if a page script never called init(), the resting
     state would leave content hidden forever. */
  window.addEventListener('load', function () {
    window.setTimeout(function () {
      if (inited) { return; }
      console.warn('[NOVA.motion] init() was never called by the page — initialising now.');
      init();
    }, 250);
  });

  window.NOVA.motion = {
    init: init,
    reveal: reveal,
    parallax: parallax,
    counters: counters,
    splitHeadlines: splitHeadlines,
    magnetic: magnetic,
    tilt: tilt,
    marquee: marquee,
    scanAll: scanAll,
    refresh: refresh,
    pageIn: pageIn,
    animateOut: animateOut,
    flyToCart: flyToCart,
    scrollTo: scrollTo,
    reduced: reduced
  };
}());
