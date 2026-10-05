// cms-loader.js — Muse Fitness Studio Dynamic CMS Hydration Engine
(function () {
  const API_ENDPOINT = '/api/content/public';

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function resolveImgUrl(url, fallback) {
    if (!url) return fallback || '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return url;
  }

  async function loadCmsContent() {
    try {
      const res = await fetch(API_ENDPOINT);
      if (!res.ok) return;
      const json = await res.json();
      if (!json.ok || !json.data) return;

      const { settings = {}, branches = [], coaches = [], pricing = [], schedules = [], blogs = [] } = json.data;

      // 1. GLOBAL CONTACTS & SOCIALS
      if (settings.hotline) {
        document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
          el.href = `tel:${settings.hotline.replace(/\s+/g, '')}`;
          if (el.dataset.keepText !== '1' && el.textContent.includes('1900')) {
            el.textContent = settings.hotline;
          }
        });
      }

      if (settings.email) {
        document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
          el.href = `mailto:${settings.email}`;
          if (el.dataset.keepText !== '1') el.textContent = settings.email;
        });
      }

      // 2. HOMEPAGE HYDRATION (index.html)
      const pageType = document.body.dataset.page || '';
      if (pageType === 'home' || window.location.pathname === '/' || window.location.pathname.endsWith('index.html')) {
        hydrateHomepage(settings, branches, coaches, schedules);
      }

      // 3. SCHEDULES PAGE (schedule.html)
      if (window.location.pathname.includes('schedule') && schedules.length > 0) {
        hydrateSchedulePage(schedules);
      }

      // 4. COACHES PAGE (coaches.html)
      if (window.location.pathname.includes('coaches') && coaches.length > 0) {
        hydrateCoachesPage(coaches);
      }

      // 5. BRANCHES PAGE (branches.html)
      if (window.location.pathname.includes('branches') && branches.length > 0) {
        hydrateBranchesPage(branches);
      }

      // 6. PRICING PAGE (pricing.html)
      if (window.location.pathname.includes('pricing') && pricing.length > 0) {
        hydratePricingPage(pricing);
      }

      // 7. BLOG PAGE (blog.html)
      if (window.location.pathname.includes('blog') && blogs.length > 0) {
        hydrateBlogPage(blogs);
      }
    } catch (err) {
      console.warn('CMS Loader: Using static fallback', err);
    }
  }

  function hydrateHomepage(settings, branches, coaches, schedules) {
    // A. Hero Section
    if (settings.home_hero) {
      const hero = settings.home_hero;
      const heroH1 = document.querySelector('.hero-content h1, .hero h1');
      if (heroH1 && hero.headline) heroH1.innerHTML = hero.headline;

      const heroEyebrow = document.querySelector('.hero-content .eyebrow, .hero .eyebrow');
      if (heroEyebrow && hero.eyebrow) heroEyebrow.textContent = hero.eyebrow;

      const heroLead = document.querySelector('.hero-content .lead, .hero .lead');
      if (heroLead && hero.lead) heroLead.textContent = hero.lead;

      const heroImg = document.querySelector('.hero-visual img, .hero-image img');
      if (heroImg && hero.hero_image) heroImg.src = resolveImgUrl(hero.hero_image);

      const heroCta = document.querySelector('.hero-actions .btn-primary');
      if (heroCta && hero.cta_text) {
        heroCta.textContent = hero.cta_text;
        if (hero.cta_link) heroCta.href = hero.cta_link;
      }
    }

    // B. Philosophy Quote
    if (settings.home_philosophy && settings.home_philosophy.quote) {
      const quoteEl = document.querySelector('.wide-quote');
      if (quoteEl) quoteEl.innerHTML = settings.home_philosophy.quote;
    }

    // C. 9-Week Journey
    if (settings.home_journey_9w) {
      const j = settings.home_journey_9w;
      const section = document.querySelector('.flow-3');
      if (section) {
        const steps = section.querySelectorAll('.flow-step');
        if (steps[0] && j.step1_title) {
          if (j.step1_title) steps[0].querySelector('h3').textContent = j.step1_title;
          if (j.step1_desc) steps[0].querySelector('p:last-of-type').textContent = j.step1_desc;
        }
        if (steps[1] && j.step2_title) {
          if (j.step2_title) steps[1].querySelector('h3').textContent = j.step2_title;
          if (j.step2_desc) steps[1].querySelector('p:last-of-type').textContent = j.step2_desc;
        }
        if (steps[2] && j.step3_title) {
          if (j.step3_title) steps[2].querySelector('h3').textContent = j.step3_title;
          if (j.step3_desc) steps[2].querySelector('p:last-of-type').textContent = j.step3_desc;
        }
      }
    }

    // D. Coaches Strip
    if (coaches.length > 0) {
      const coachStripImg = document.querySelector('.coach-strip img');
      if (coachStripImg && coaches[0].photo_url) {
        coachStripImg.src = resolveImgUrl(coaches[0].photo_url);
      }
    }

    // E. Branches Grid
    if (branches.length > 0) {
      const grid = document.querySelector('.branch-grid');
      if (grid) {
        grid.innerHTML = branches.map((b) => `
          <article class="branch-card">
            <a href="branch-${b.slug || 'hoang-van-thu'}.html">
              <img src="${escapeHtml(resolveImgUrl(b.image_url, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219582/muse-fitness-studio/branch-hoang-van-thu.jpg'))}" alt="Muse ${escapeHtml(b.name)}" loading="lazy">
            </a>
            <div class="bc-body">
              <a href="branch-${b.slug || 'hoang-van-thu'}.html" style="text-decoration:none;color:inherit">
                <h3>Muse ${escapeHtml(b.name)}</h3>
              </a>
              <p class="muted" style="font-size:14px">${escapeHtml(b.address)}</p>
              <p style="margin-top:12px;font-size:14px">${escapeHtml(b.opening_hours || '6:00 – 21:00 · Thứ 2 – Chủ nhật')}</p>
              <div class="branch-card-actions">
                <a class="btn btn-secondary branch-detail-link" href="branch-${b.slug || 'hoang-van-thu'}.html">Xem chi tiết</a>
              </div>
            </div>
          </article>
        `).join('');
      }
    }
  }

  function hydrateSchedulePage(schedules) {
    // Sáng, Chiều, Tối slot containers
    const gridLv1 = document.querySelector('.class-grid');
    if (!gridLv1) return;

    // Filter interaction hook
    const filterDisc = document.getElementById('filterDiscipline');
    const filterLevel = document.getElementById('filterLevel');

    function applyFilter() {
      const discVal = filterDisc ? filterDisc.value.toLowerCase() : '';
      const lvVal = filterLevel ? filterLevel.value.toLowerCase() : '';
      document.querySelectorAll('.class-card[data-discipline]').forEach((card) => {
        const cDisc = (card.dataset.discipline || '').toLowerCase();
        const cLv = (card.dataset.level || '').toLowerCase();
        const matchDisc = !discVal || cDisc.includes(discVal);
        const matchLv = !lvVal || cLv === lvVal;
        card.style.display = matchDisc && matchLv ? '' : 'none';
      });
    }

    if (filterDisc) filterDisc.addEventListener('change', applyFilter);
    if (filterLevel) filterLevel.addEventListener('change', applyFilter);
  }

  function hydrateCoachesPage(coaches) {
    const grid = document.querySelector('.section.band-putty .grid-3');
    if (!grid) return;

    grid.innerHTML = coaches.map((c) => `
      <article class="coach-card">
        <img src="${escapeHtml(resolveImgUrl(c.photo_url, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219629/muse-fitness-studio/photo-coach.webp'))}" alt="${escapeHtml(c.name)}" loading="lazy">
        <div class="content">
          <span class="tag">${escapeHtml(c.tag || 'Coach')}</span>
          <h3 style="margin-top:14px">${escapeHtml(c.name)} · <small style="font-size:14px;color:var(--brown)">${escapeHtml(c.title)}</small></h3>
          <p class="muted">${escapeHtml(c.bio || '')}</p>
          <div class="chip-row">
            ${(c.specialities || []).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
  }

  function hydrateBranchesPage(branches) {
    const listContainer = document.querySelector('.branches-list, .branch-cards-wrap');
    if (!listContainer) return;

    listContainer.innerHTML = branches.map((b) => `
      <article class="branch-large-card">
        <img src="${escapeHtml(resolveImgUrl(b.image_url))}" alt="Muse ${escapeHtml(b.name)}" loading="lazy">
        <div class="branch-large-body">
          <h2>Muse ${escapeHtml(b.name)}</h2>
          <p class="muted">📍 ${escapeHtml(b.address)}</p>
          <p>📞 Hotline: <strong>${escapeHtml(b.phone || '1900 299 991')}</strong></p>
          <p>⏰ Giờ mở cửa: ${escapeHtml(b.opening_hours || '6:00 – 21:00')}</p>
          <div class="branch-actions" style="margin-top:16px;display:flex;gap:12px">
            <a class="btn btn-primary" href="signup.html?branch=${encodeURIComponent(b.name)}">Đăng ký tập tại đây</a>
            ${b.map_url ? `<a class="btn btn-secondary" href="${escapeHtml(b.map_url)}" target="_blank">Chỉ đường Google Maps</a>` : ''}
          </div>
        </div>
      </article>
    `).join('');
  }

  function hydratePricingPage(pricing) {
    // Dynamic cards if element exists
    const membershipGrid = document.querySelector('.pricing-grid-3');
    if (!membershipGrid) return;

    const memberships = pricing.filter((p) => p.category === 'membership');
    if (memberships.length > 0) {
      membershipGrid.innerHTML = memberships.map((p) => `
        <article class="pricing-card ${p.is_featured ? 'featured' : ''}" data-tier="membership">
          <p class="eyebrow">${escapeHtml(p.badge || 'Gói tập')}</p>
          <h3>${escapeHtml(p.name)}</h3>
          <span class="price"><small class="price-prefix">Chỉ từ</small>${escapeHtml(p.price_display)}<small class="price-unit">${escapeHtml(p.unit)}</small></span>
          <ul>
            ${(p.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
          <a class="btn ${p.is_featured ? 'btn-light' : 'btn-secondary'}" href="signup.html?plan=${encodeURIComponent(p.name)}">${escapeHtml(p.button_text || 'Tư vấn gói này')}</a>
        </article>
      `).join('');
    }
  }

  function hydrateBlogPage(blogs) {
    const blogGrid = document.querySelector('.blog-grid, .posts-grid');
    if (!blogGrid || blogs.length === 0) return;

    blogGrid.innerHTML = blogs.map((b) => `
      <article class="blog-card">
        <img src="${escapeHtml(resolveImgUrl(b.cover_image, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219581/muse-fitness-studio/blog-weight-training.webp'))}" alt="${escapeHtml(b.title)}" loading="lazy">
        <div class="blog-body">
          <span class="eyebrow">${escapeHtml(b.category)} · ${escapeHtml(b.read_time || '5 phút')}</span>
          <h3>${escapeHtml(b.title)}</h3>
          <p class="muted">${escapeHtml(b.summary || '')}</p>
        </div>
      </article>
    `).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCmsContent);
  } else {
    loadCmsContent();
  }
})();
