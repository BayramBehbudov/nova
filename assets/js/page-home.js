/* NOVA — page-home.js
 * Renders the dynamic sections of the home page and owns its three
 * interactions: the FAQ accordion, the newsletter form and the smooth-scroll
 * buttons. Cards, money, escaping, toasts and cart maths all come from
 * NOVA.ui / NOVA.store; motion comes from NOVA.motion. */
window.NOVA = window.NOVA || {};
(function () {
  'use strict';

  var LOG = '[NOVA.home]';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
  var FALLBACK_HUE = 42;

  /* ---------------------------------------------------------------- utils */

  function fail(where, err, context) {
    console.error(LOG + ' ' + where + ' failed', {
      message: err && err.message ? err.message : String(err),
      context: context || null,
      stack: err && err.stack ? err.stack : null
    });
  }

  /* Each section renders independently: a malformed record in one dataset
   * must not take the rest of the page down with it. */
  function safe(where, fn) {
    try {
      fn();
    } catch (err) {
      fail(where, err);
    }
  }

  function hueOf(value) {
    var h = Number(value);
    return isFinite(h) ? h : FALLBACK_HUE;
  }

  function byId(id) {
    return document.getElementById(id);
  }

  /* Attaches a parallax depth to a card's artwork when the shared renderer
   * exposes one, otherwise to the wrapper so the effect is never lost. */
  function parallaxArt(wrapper, depth) {
    var art = wrapper.querySelector('.ccard__art, .pcard__art, [data-art], svg');
    var target = art || wrapper.firstElementChild || wrapper;
    target.setAttribute('data-parallax', String(depth));
  }

  /* ------------------------------------------------------------- sections */

  function renderHero(ui, data) {
    var host = byId('home-hero-art');
    var eyebrow = byId('home-hero-eyebrow');
    var hero = data.products.filter(function (p) { return p.featured; })[0] || data.products[0];
    if (!hero) return;

    if (host) {
      host.innerHTML = ui.productArt(hero.art, hero.hue);
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', hero.name + ' — ' + hero.category);
    }

    /* The eyebrow names the most recent release rather than a fixed string,
     * so it can never drift out of step with the catalogue. */
    if (eyebrow) {
      var latest = data.products.filter(function (p) { return p.isNew; })
        .sort(function (a, b) { return String(b.releasedAt).localeCompare(String(a.releasedAt)); })[0];
      if (latest) eyebrow.textContent = 'New — ' + latest.name;
    }
  }

  function renderStats(ui, data) {
    var host = byId('home-stats-grid');
    if (!host) return;
    var stats = data.brand && data.brand.stats ? data.brand.stats : [];

    host.innerHTML = stats.map(function (stat) {
      var digits = String(stat.value).replace(/[^0-9.\-]/g, '');
      var num = parseFloat(digits);
      var decimals = (digits.split('.')[1] || '').length;
      var suffix = stat.suffix ? ui.esc(stat.suffix) : '';

      /* A non-numeric stat still has to read correctly — it just does not count. */
      var value = isFinite(num)
        ? '<span data-counter="' + num + '" data-counter-decimals="' + decimals + '">0</span>'
        : '<span>' + ui.esc(String(stat.value)) + '</span>';

      return '<div class="home-stat">' +
        '<p class="home-stat__value">' + value +
        (suffix ? '<span class="home-stat__suffix">' + suffix + '</span>' : '') +
        '</p>' +
        '<p class="home-stat__label">' + ui.esc(stat.label) + '</p>' +
        '</div>';
    }).join('');
  }

  function renderPartners(ui, data) {
    var host = byId('home-partners-track');
    if (!host) return;
    var partners = data.brand && data.brand.partners ? data.brand.partners : [];
    /* One clean pass only: motion.marquee() clones the track's children once
     * so the -50% loop lands on an exact copy. Duplicating here as well would
     * double the scroll speed of the fixed-duration CSS keyframes. */
    host.innerHTML = partners.map(function (name) {
      return '<span class="home-partner">' + ui.esc(name) + '</span>';
    }).join('');
  }

  function renderFeatured(ui, data) {
    var host = byId('home-featured-grid');
    if (!host) return;
    var picked = data.products.filter(function (p) { return p.featured; }).slice(0, 4);
    if (picked.length < 4) {
      data.products.forEach(function (p) {
        if (picked.length < 4 && picked.indexOf(p) === -1) picked.push(p);
      });
    }
    host.innerHTML = picked.map(function (p) { return ui.productCard(p); }).join('');
  }

  function renderCategories(ui, data) {
    var host = byId('home-cats-grid');
    if (!host) return;

    /* categoryCard() already emits the shop.html?cat=<slug> href, its own
     * data-reveal and data-tilt — the wrapper only adds the editorial column
     * offset and carries the parallax depth. */
    host.innerHTML = data.categories.map(function (cat, i) {
      var offset = i % 3 === 1 ? ' home-cat--offset' : '';
      return '<div class="home-cat' + offset + '">' + ui.categoryCard(cat) + '</div>';
    }).join('');

    data.categories.forEach(function (cat, i) {
      var wrapper = host.children[i];
      if (!wrapper) return;
      /* The grid is a [data-stagger] parent, which sequences its direct
       * children — the card's own data-reveal would then fire a second,
       * unsequenced animation, so it is removed. */
      var card = wrapper.querySelector('[data-reveal]');
      if (card) card.removeAttribute('data-reveal');
      parallaxArt(wrapper, i % 3 === 1 ? 0.16 : 0.08);
    });
  }

  function renderEngineered(ui, data) {
    var host = byId('home-eng-art');
    var caption = byId('home-eng-caption');
    var story = byId('home-eng-story');
    var featured = data.products.filter(function (p) { return p.featured; });
    var subject = featured[1] || featured[0] || data.products[0];

    if (host && subject) {
      host.innerHTML = ui.productArt(subject.art, subject.hue);
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', subject.name + ' — cutaway view');
    }
    if (caption && subject) {
      caption.textContent = subject.name + ' · ' + subject.sku;
    }
    if (story && data.brand && data.brand.story) {
      story.textContent = data.brand.story;
    }
  }

  function renderBestsellers(ui, data) {
    var host = byId('home-best-track');
    if (!host) return;
    var ranked = data.products.slice().sort(function (a, b) {
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    }).slice(0, 4);
    host.innerHTML = ranked.map(function (p) { return ui.productCard(p); }).join('');
  }

  function renderVoices(ui, data) {
    var grid = byId('home-voices-grid');
    var pull = byId('home-voices-pull');
    var list = data.testimonials || [];

    if (pull && data.brand) {
      pull.innerHTML =
        '<p class="home-voices__pullText">' + ui.esc(data.brand.tagline) + '</p>' +
        '<cite class="home-voices__pullBy">' + ui.esc(data.brand.name) +
        ' · established ' + ui.esc(String(data.brand.founded)) + '</cite>';
    }

    if (!grid) return;
    grid.innerHTML = list.map(function (t) {
      var h = hueOf(t.hue);
      var initials = String(t.name || '').trim().split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0); }).join('').toUpperCase();
      /* ui.stars() already returns the .stars wrapper with its own role/label. */
      return '<figure class="home-voice" data-tilt>' +
        ui.stars(t.rating) +
        '<blockquote class="home-voice__text">' + ui.esc(t.text) + '</blockquote>' +
        '<figcaption class="home-voice__by">' +
        '<span class="home-voice__mark" aria-hidden="true" style="background:hsl(' + h + ' 62% 62%)">' +
        ui.esc(initials) + '</span>' +
        '<span><span class="home-voice__name">' + ui.esc(t.name) + '</span>' +
        '<span class="home-voice__role">' + ui.esc(t.role) + ' · ' + ui.esc(t.city) + '</span></span>' +
        '</figcaption>' +
        '</figure>';
    }).join('');
  }

  function renderJournal(ui, data) {
    var host = byId('home-journal-grid');
    if (!host) return;
    var posts = data.journal || [];

    host.innerHTML = posts.map(function (post) {
      var h = hueOf(post.hue);
      var art = 'background:' +
        'radial-gradient(ellipse 80% 90% at 25% 15%, hsl(' + h + ' 70% 46% / 0.85), transparent 65%),' +
        'linear-gradient(140deg, hsl(' + (h + 24) + ' 46% 22%), hsl(' + h + ' 38% 10%))';
      return '<a class="home-post" href="#" data-home-journal="' + ui.esc(post.slug) + '" ' +
        'title="Demo article — the NOVA Journal is not part of this storefront build">' +
        '<span class="home-post__art" style="' + art + '">' +
        '<span class="tag home-post__tag">' + ui.esc(post.tag) + '</span>' +
        '</span>' +
        '<span class="home-post__body">' +
        '<span class="home-post__meta">' +
        '<span>' + ui.esc(ui.formatDate(post.date)) + '</span><span>·</span>' +
        '<span>' + ui.esc(String(post.readMins)) + ' min read</span>' +
        '</span>' +
        '<h3 class="home-post__title">' + ui.esc(post.title) + '</h3>' +
        '<span class="home-post__excerpt">' + ui.esc(post.excerpt) + '</span>' +
        '<span class="home-post__more">Read the piece</span>' +
        '</span>' +
        '</a>';
    }).join('');
  }

  function renderFaq(ui, data) {
    var host = byId('home-faq-list');
    if (!host) return;
    var faqs = data.faqs || [];

    host.innerHTML = faqs.map(function (faq, i) {
      var headId = 'home-faq-head-' + i;
      var bodyId = 'home-faq-body-' + i;
      return '<div class="accordion__item home-faq__item">' +
        '<button class="accordion__head" type="button" id="' + headId + '" ' +
        'aria-expanded="false" aria-controls="' + bodyId + '">' +
        '<span class="home-faq__q">' + ui.esc(faq.q) + '</span>' +
        '</button>' +
        '<div class="accordion__body" id="' + bodyId + '" role="region" aria-labelledby="' + headId + '">' +
        '<p class="home-faq__answer">' + ui.esc(faq.a) + '</p>' +
        '</div>' +
        '</div>';
    }).join('');
  }

  /* --------------------------------------------------------- interactions */

  function faqBodyOf(item) {
    return item.querySelector('.accordion__body');
  }

  function closeFaq(item, animate) {
    var body = faqBodyOf(item);
    var head = item.querySelector('.accordion__head');
    if (!body || !head) return;

    item.classList.remove('is-open');
    head.setAttribute('aria-expanded', 'false');

    if (!animate || !window.gsap || NOVA.motion.reduced) {
      if (window.gsap) gsap.killTweensOf(body);
      body.style.height = '0px';
      return;
    }
    gsap.killTweensOf(body);
    gsap.fromTo(body,
      { height: body.scrollHeight },
      { height: 0, duration: 0.4, ease: 'power2.inOut' });
  }

  function openFaq(item) {
    var body = faqBodyOf(item);
    var head = item.querySelector('.accordion__head');
    if (!body || !head) return;

    item.classList.add('is-open');
    head.setAttribute('aria-expanded', 'true');

    var target = body.scrollHeight;
    if (!window.gsap || NOVA.motion.reduced) {
      body.style.height = 'auto';
      return;
    }
    gsap.killTweensOf(body);
    gsap.fromTo(body,
      { height: 0 },
      {
        height: target,
        duration: 0.45,
        ease: 'power2.out',
        onComplete: function () {
          body.style.height = 'auto';
          if (NOVA.motion.refresh) NOVA.motion.refresh();
        }
      });
  }

  function setupFaq(ui) {
    var root = byId('home-faq-list');
    if (!root) return;
    var items = ui.qsa('.home-faq__item', root);

    /* components.css animates .accordion__body with a max-height + opacity
     * CSS transition. GSAP drives real height here instead, so those three
     * declarations are neutralised inline (page-local, shared CSS untouched)
     * and the collapsed state becomes height:0 alone. Spacing moves to
     * .home-faq__answer, which is inside the measured box. */
    items.forEach(function (item) {
      var body = faqBodyOf(item);
      if (!body) return;
      body.style.transition = 'none';
      body.style.maxHeight = 'none';
      body.style.opacity = '1';
      body.style.paddingBottom = '0px';
      body.style.overflow = 'hidden';
      body.style.height = '0px';
    });

    root.addEventListener('click', function (event) {
      var head = event.target.closest('.accordion__head');
      if (!head || !root.contains(head)) return;
      var item = head.closest('.home-faq__item');
      if (!item) return;

      var wasOpen = item.classList.contains('is-open');
      items.forEach(function (other) {
        if (other !== item && other.classList.contains('is-open')) closeFaq(other, true);
      });
      if (wasOpen) closeFaq(item, true); else openFaq(item);
    });
  }

  function setupNewsletter(ui) {
    var form = byId('home-news-form');
    var field = byId('home-news-field');
    var input = byId('home-news-email');
    var error = byId('home-news-error');
    var button = byId('home-news-submit');
    if (!form || !field || !input || !error || !button) return;

    var buttonLabel = button.textContent;
    var resetTimer = 0;

    function showError(message) {
      field.classList.add('is-invalid');
      error.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.focus();
    }

    function clearError() {
      field.classList.remove('is-invalid');
      error.textContent = '';
      input.removeAttribute('aria-invalid');
    }

    input.addEventListener('input', function () {
      if (field.classList.contains('is-invalid')) clearError();
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var value = input.value.trim();

      if (!value) {
        showError('Please enter your email');
        return;
      }
      if (!EMAIL_RE.test(value)) {
        showError("That email doesn't look right");
        return;
      }

      clearError();
      input.value = '';
      button.classList.add('is-success');
      button.textContent = 'You are on the list';
      ui.toast('Thanks — one letter a month, nothing else.', 'success');

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        button.classList.remove('is-success');
        button.textContent = buttonLabel;
      }, 3200);
    });
  }

  function setupScrollButtons() {
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-home-scroll]');
      if (!trigger) return;
      var target = trigger.getAttribute('data-home-scroll');
      var node = document.querySelector(target);
      if (!node) {
        console.error(LOG + ' scroll target missing', { selector: target });
        return;
      }
      event.preventDefault();
      /* No offset argument: motion.scrollTo() falls back to its own
       * headerOffset(), which already knows the fixed header's height. */
      NOVA.motion.scrollTo(node);
    });
  }

  function setupJournalLinks(ui) {
    var host = byId('home-journal-grid');
    if (!host) return;
    host.addEventListener('click', function (event) {
      var link = event.target.closest('[data-home-journal]');
      if (!link) return;
      event.preventDefault();
      ui.toast('The Journal is a demo section — no article pages in this build.', 'info');
    });
  }

  function startHeroDrift() {
    var drift = byId('home-hero-drift');
    if (!drift || !window.gsap || NOVA.motion.reduced) return;
    gsap.to(drift, {
      x: 46,
      y: -34,
      rotation: 22,
      duration: 11,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
    gsap.to(drift, {
      scale: 1.12,
      duration: 7,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }

  /* ---------------------------------------------------------------- boot */

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.NOVA || !NOVA.ui || !NOVA.data || !NOVA.motion) {
      console.error(LOG + ' shared modules are missing — the page cannot render', {
        ui: !!(window.NOVA && NOVA.ui),
        data: !!(window.NOVA && NOVA.data),
        motion: !!(window.NOVA && NOVA.motion),
        store: !!(window.NOVA && NOVA.store)
      });
      return;
    }

    var ui = NOVA.ui;
    var data = NOVA.data;

    safe('mountCommon', function () { ui.mountCommon('home'); });

    safe('hero', function () { renderHero(ui, data); });
    safe('stats', function () { renderStats(ui, data); });
    safe('partners', function () { renderPartners(ui, data); });
    safe('featured collection', function () { renderFeatured(ui, data); });
    safe('categories', function () { renderCategories(ui, data); });
    safe('engineered', function () { renderEngineered(ui, data); });
    safe('bestsellers', function () { renderBestsellers(ui, data); });
    safe('testimonials', function () { renderVoices(ui, data); });
    safe('journal', function () { renderJournal(ui, data); });
    safe('faq', function () { renderFaq(ui, data); });

    safe('faq behaviour', function () { setupFaq(ui); });
    safe('newsletter', function () { setupNewsletter(ui); });
    safe('scroll buttons', setupScrollButtons);
    safe('journal links', function () { setupJournalLinks(ui); });

    safe('motion', function () {
      NOVA.motion.init();
      startHeroDrift();
    });
  });
})();
