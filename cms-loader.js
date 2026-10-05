// cms-loader.js — Muse Fitness Studio Dynamic CMS Hydration Engine
(function () {
  'use strict';

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
      hydrateGlobalContacts(settings);

      const path = window.location.pathname.toLowerCase();

      // 2. HOMEPAGE HYDRATION (index.html or root)
      if (path === '/' || path.endsWith('index.html') || path.endsWith('/')) {
        hydrateHomepage(settings, branches, coaches, pricing, schedules);
      }

      // 3. SCHEDULES PAGE (schedule.html)
      if (path.includes('schedule')) {
        hydrateSchedulePage(schedules);
      }

      // 4. COACHES PAGE (coaches.html)
      if (path.includes('coaches')) {
        hydrateCoachesPage(coaches);
      }

      // 5. BRANCHES MAIN PAGE (branches.html)
      if (path.includes('branches.html')) {
        hydrateBranchesPage(branches);
      }

      // 6. INDIVIDUAL BRANCH DETAIL PAGES
      if (path.includes('branch-')) {
        hydrateSingleBranchPage(branches, path);
      }

      // 7. PRICING PAGE (pricing.html)
      if (path.includes('pricing')) {
        hydratePricingPage(pricing);
      }

      // 8. COURSE 9 WEEK PAGE (course-9-week.html)
      if (path.includes('course-9-week')) {
        hydrateCoursePage(settings, pricing);
      }

      // 9. BLOG PAGE (blog.html)
      if (path.includes('blog')) {
        hydrateBlogPage(blogs);
      }

      // 10. SIGNUP PAGE (signup.html)
      if (path.includes('signup')) {
        hydrateSignupPage(branches, pricing);
      }

    } catch (err) {
      console.warn('CMS Loader: Using static fallback', err);
    }
  }

  /* ==================== 1. GLOBAL CONTACTS ==================== */
  function hydrateGlobalContacts(settings) {
    if (!settings) return;

    if (settings.hotline) {
      const cleanPhone = settings.hotline.replace(/\s+/g, '');
      document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
        el.href = `tel:${cleanPhone}`;
        if (el.textContent.includes('1900') || el.dataset.syncHotline) {
          el.textContent = settings.hotline;
        }
      });

      document.querySelectorAll('.site-footer li, .branch-detail-item span, .branch-meta span').forEach((el) => {
        if (el.textContent.includes('Hotline:') || el.textContent.includes('1900 299 991')) {
          el.innerHTML = `Hotline: <a href="tel:${cleanPhone}" style="color:inherit;text-decoration:none">${escapeHtml(settings.hotline)}</a>`;
        }
      });
    }

    if (settings.email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
        el.href = `mailto:${settings.email}`;
        el.textContent = settings.email;
      });
    }

    if (settings.facebook_url) {
      document.querySelectorAll('a[href*="facebook.com"]').forEach((el) => {
        el.href = settings.facebook_url;
      });
    }

    if (settings.zalo_url) {
      document.querySelectorAll('a[href*="zalo.me"]').forEach((el) => {
        el.href = settings.zalo_url;
      });
    }

    if (settings.instagram_url) {
      document.querySelectorAll('a[href*="instagram.com"]').forEach((el) => {
        el.href = settings.instagram_url;
      });
    }

    if (settings.tiktok_url) {
      document.querySelectorAll('a[href*="tiktok.com"]').forEach((el) => {
        el.href = settings.tiktok_url;
      });
    }
  }

  /* ==================== 2. HOMEPAGE HYDRATION ==================== */
  function hydrateHomepage(settings, branches, coaches, pricing, schedules) {
    // A. Hero Section
    if (settings.home_hero) {
      const hero = settings.home_hero;
      const heroH1 = document.querySelector('.hero-copy h1, .hero-content h1, .hero h1');
      if (heroH1 && hero.headline) {
        heroH1.innerHTML = escapeHtml(hero.headline).replace(/\n/g, '<br>');
      }

      const heroEyebrow = document.querySelector('.hero-copy .eyebrow, .hero-content .eyebrow, .hero .eyebrow');
      if (heroEyebrow && hero.eyebrow) {
        heroEyebrow.textContent = hero.eyebrow;
      }

      const heroLead = document.querySelector('.hero-copy .lead, .hero-content .lead, .hero .lead');
      if (heroLead && hero.lead) {
        heroLead.textContent = hero.lead;
      }

      const heroEditorial = document.querySelector('.hero-editorial');
      if (heroEditorial && hero.hero_image) {
        heroEditorial.style.setProperty('--hero-image', `url('${resolveImgUrl(hero.hero_image)}')`);
      }

      const heroImg = document.querySelector('.hero-visual img, .hero-image img');
      if (heroImg && hero.hero_image) {
        heroImg.src = resolveImgUrl(hero.hero_image);
      }

      const heroCta = document.querySelector('.hero-actions .btn-primary');
      if (heroCta && hero.cta_text) {
        heroCta.textContent = hero.cta_text;
        if (hero.cta_link) heroCta.href = hero.cta_link;
      }
    }

    // B. Philosophy Quote
    if (settings.home_philosophy && settings.home_philosophy.quote) {
      const quoteEl = document.querySelector('.wide-quote');
      if (quoteEl) {
        quoteEl.innerHTML = escapeHtml(settings.home_philosophy.quote);
      }
    }

    // C. 9-Week Journey Steps
    if (settings.home_journey_9w) {
      const j = settings.home_journey_9w;
      const section = document.querySelector('.flow-3');
      if (section) {
        const steps = section.querySelectorAll('.flow-step');
        if (steps[0] && (j.step1_title || j.step1_desc)) {
          if (j.step1_title) steps[0].querySelector('h3').textContent = j.step1_title;
          if (j.step1_desc) steps[0].querySelector('p:last-of-type').textContent = j.step1_desc;
        }
        if (steps[1] && (j.step2_title || j.step2_desc)) {
          if (j.step2_title) steps[1].querySelector('h3').textContent = j.step2_title;
          if (j.step2_desc) steps[1].querySelector('p:last-of-type').textContent = j.step2_desc;
        }
        if (steps[2] && (j.step3_title || j.step3_desc)) {
          if (j.step3_title) steps[2].querySelector('h3').textContent = j.step3_title;
          if (j.step3_desc) steps[2].querySelector('p:last-of-type').textContent = j.step3_desc;
        }
      }
    }

    // D. Service Rows Sync (Pricing preview on homepage)
    if (pricing && pricing.length > 0) {
      const rows = document.querySelectorAll('.service-row');
      const mbPlan = pricing.find((p) => p.category === 'membership');
      const coursePlan = pricing.find((p) => p.category === 'course' || p.slug === 'course-9-week');
      const ptPlan = pricing.find((p) => p.category === 'pt' || p.slug === 'pt-1-1');

      if (rows[0] && mbPlan && mbPlan.price_display) {
        const priceEl = rows[0].querySelector('.price');
        if (priceEl) priceEl.textContent = `Từ ${mbPlan.price_display} ${mbPlan.unit || '/ tháng'}`;
      }
      if (rows[1] && coursePlan && coursePlan.price_display) {
        const priceEl = rows[1].querySelector('.price');
        if (priceEl) priceEl.textContent = `${coursePlan.price_display} ${coursePlan.unit || '/ tuần'}`;
      }
      if (rows[2] && ptPlan && ptPlan.price_display) {
        const priceEl = rows[2].querySelector('.price');
        if (priceEl) priceEl.textContent = `Từ ${ptPlan.price_display} ${ptPlan.unit || '/ buổi'}`;
      }
    }

    // E. Coaches Strip
    if (coaches && coaches.length > 0) {
      const coachStripImg = document.querySelector('.coach-strip img');
      if (coachStripImg && coaches[0].photo_url) {
        coachStripImg.src = resolveImgUrl(coaches[0].photo_url);
      }
    }

    // F. Branches Grid
    if (branches && branches.length > 0) {
      const grid = document.querySelector('.branch-grid');
      if (grid) {
        grid.innerHTML = branches.map((b) => `
          <article class="branch-card">
            <a href="branch-${escapeHtml(b.slug || 'hoang-van-thu')}.html">
              <img src="${escapeHtml(resolveImgUrl(b.image_url, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219582/muse-fitness-studio/branch-hoang-van-thu.jpg'))}" alt="Muse ${escapeHtml(b.name)}" loading="lazy">
            </a>
            <div class="bc-body">
              <a href="branch-${escapeHtml(b.slug || 'hoang-van-thu')}.html" style="text-decoration:none;color:inherit">
                <h3>Muse ${escapeHtml(b.name)}</h3>
              </a>
              <p class="muted" style="font-size:14px">${escapeHtml(b.address)}</p>
              <p style="margin-top:12px;font-size:14px">${escapeHtml(b.opening_hours || '6:00 – 21:00 · Thứ 2 – Chủ nhật')}</p>
              <div class="branch-card-actions">
                <a class="btn btn-secondary branch-detail-link" href="branch-${escapeHtml(b.slug || 'hoang-van-thu')}.html" aria-label="Xem chi tiết chi nhánh Muse ${escapeHtml(b.name)}">Xem chi tiết</a>
              </div>
            </div>
          </article>
        `).join('');
      }
    }
  }

  /* ==================== 3. SCHEDULE PAGE ==================== */
  function hydrateSchedulePage(schedules) {
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

  /* ==================== 4. COACHES PAGE ==================== */
  function hydrateCoachesPage(coaches) {
    const grid = document.querySelector('.section.band-putty .grid-3');
    if (!grid || coaches.length === 0) return;

    grid.innerHTML = coaches.map((c) => `
      <article class="coach-card">
        <img src="${escapeHtml(resolveImgUrl(c.photo_url, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219629/muse-fitness-studio/photo-coach.webp'))}" alt="${escapeHtml(c.name)}" loading="lazy">
        <div class="content">
          <span class="tag">${escapeHtml(c.tag || 'Coach')}</span>
          <h3 style="margin-top:14px">${escapeHtml(c.name)} · <small style="font-size:14px;color:var(--brown)">${escapeHtml(c.title || 'HLV')}</small></h3>
          <p class="muted">${escapeHtml(c.bio || '')}</p>
          <div class="chip-row">
            ${(c.specialities || []).map((s) => `<span class="chip">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>
      </article>
    `).join('');
  }

  /* ==================== 5. BRANCHES PAGE ==================== */
  function hydrateBranchesPage(branches) {
    const listContainer = document.querySelector('.branch-cards-wrap, .branches-list');
    if (!listContainer || branches.length === 0) return;

    listContainer.innerHTML = branches.map((b, idx) => `
      <article class="branch-card-photo">
        <img src="${escapeHtml(resolveImgUrl(b.image_url, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219582/muse-fitness-studio/branch-hoang-van-thu.jpg'))}" alt="Muse ${escapeHtml(b.name)} — không gian phòng tập" loading="lazy">
        <div class="content">
          <p class="eyebrow">Chi nhánh ${idx + 1}</p>
          <h3>Muse ${escapeHtml(b.name)}</h3>
          <div class="branch-meta">
            <span><svg viewBox="0 0 24 24"><path d="M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></svg>${escapeHtml(b.address)}</span>
            <span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>${escapeHtml(b.opening_hours || '6:00 – 21:00 (Thứ 2 – Chủ nhật)')}</span>
            <span><svg viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h2.7a1 1 0 01.95.68l1.4 4.2a1 1 0 01-.25 1l-1.5 1.5a13 13 0 006.3 6.3l1.5-1.5a1 1 0 011-.25l4.2 1.4a1 1 0 01.68.95V19a2 2 0 01-2 2A16 16 0 013 5z"/></svg>${escapeHtml(b.phone || '1900 299 991')}</span>
          </div>
          <div class="actions">
            <a class="btn btn-secondary branch-detail-btn" href="branch-${escapeHtml(b.slug || 'hoang-van-thu')}.html">Xem chi tiết</a>
            ${b.map_url ? `<a class="btn btn-secondary" href="${escapeHtml(b.map_url)}" target="_blank" rel="noopener">Chỉ đường</a>` : ''}
            <a class="btn btn-primary" href="signup.html?branch=${encodeURIComponent(b.name)}">Đăng ký tập thử</a>
          </div>
        </div>
      </article>
    `).join('');
  }

  /* ==================== 6. SINGLE BRANCH DETAIL PAGE ==================== */
  function hydrateSingleBranchPage(branches, path) {
    if (!branches || branches.length === 0) return;

    let targetSlug = '';
    if (path.includes('branch-hoang-van-thu')) targetSlug = 'hoang-van-thu';
    else if (path.includes('branch-le-duc-tho')) targetSlug = 'le-duc-tho';
    else if (path.includes('branch-nguyen-thi-thap')) targetSlug = 'nguyen-thi-thap';

    const branch = branches.find((b) => b.slug === targetSlug || (targetSlug && b.name.toLowerCase().includes(targetSlug.replace(/-/g, ' '))));
    if (!branch) return;

    // Title & Hero
    const heroH1 = document.querySelector('.branch-hero-copy h1');
    if (heroH1) heroH1.textContent = `Muse ${branch.name}`;

    const infoH2 = document.querySelector('.branch-info-grid h2:last-of-type');
    if (infoH2) infoH2.textContent = `Muse ${branch.name}`;

    // Branch Detail Items
    const items = document.querySelectorAll('.branch-detail-item span');
    if (items[0] && branch.address) items[0].textContent = branch.address;
    if (items[1] && branch.opening_hours) items[1].textContent = branch.opening_hours;
    if (items[2] && branch.phone) items[2].textContent = branch.phone;

    // Maps link
    if (branch.map_url) {
      const mapBtn = document.querySelector('.branch-cta-row a[href*="maps"]');
      if (mapBtn) mapBtn.href = branch.map_url;
    }
  }

  /* ==================== 7. PRICING PAGE ==================== */
  function hydratePricingPage(pricing) {
    if (!pricing || pricing.length === 0) return;

    // A. Membership Cards
    const membershipGrid = document.querySelector('.pricing-grid-3');
    const memberships = pricing.filter((p) => p.category === 'membership');
    if (membershipGrid && memberships.length > 0) {
      membershipGrid.innerHTML = memberships.map((p) => `
        <article class="pricing-card ${p.is_featured ? 'featured' : ''}" data-tier="membership">
          ${p.image_url ? `<img class="pricing-art" src="${escapeHtml(resolveImgUrl(p.image_url))}" alt="${escapeHtml(p.name)}" loading="lazy">` : ''}
          <p class="eyebrow">${escapeHtml(p.badge || 'Gói tập')}</p>
          <h3>${escapeHtml(p.name)}</h3>
          <span class="price"><small class="price-prefix">Chỉ từ</small>${escapeHtml(p.price_display)}<small class="price-unit">${escapeHtml(p.unit || '/ tháng')}</small></span>
          <ul>
            ${(p.features || []).map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
          </ul>
          <a class="btn ${p.is_featured ? 'btn-light' : 'btn-secondary'}" href="signup.html?plan=${encodeURIComponent(p.name)}">${escapeHtml(p.button_text || 'Tư vấn gói này')}</a>
        </article>
      `).join('');
    }

    // B. Course 9 Week Row
    const coursePlan = pricing.find((p) => p.category === 'course' || p.slug === 'course-9-week');
    if (coursePlan) {
      const courseEl = document.querySelector('.content[data-tier="course"]');
      if (courseEl) {
        if (coursePlan.name) {
          const h3 = courseEl.querySelector('h3');
          if (h3) h3.textContent = coursePlan.name;
        }
        if (coursePlan.price_display) {
          const priceSpan = courseEl.querySelector('.price');
          if (priceSpan) priceSpan.innerHTML = `${escapeHtml(coursePlan.price_display)}<small class="price-unit">${escapeHtml(coursePlan.unit || '/ tuần · 3 buổi')}</small>`;
        }
        if (Array.isArray(coursePlan.features) && coursePlan.features.length) {
          const ul = courseEl.querySelector('ul');
          if (ul) ul.innerHTML = coursePlan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
        }
      }
    }

    // C. PT 1-1 Row
    const ptPlan = pricing.find((p) => p.category === 'pt' || p.slug === 'pt-1-1');
    if (ptPlan) {
      const ptEl = document.querySelector('.content[data-tier="pt"]');
      if (ptEl) {
        if (ptPlan.name) {
          const h3 = ptEl.querySelector('h3');
          if (h3) h3.textContent = ptPlan.name;
        }
        if (ptPlan.price_display) {
          const priceSpan = ptEl.querySelector('.price');
          if (priceSpan) priceSpan.innerHTML = `<small class="price-prefix" style="margin-right:6px">Chỉ từ</small>${escapeHtml(ptPlan.price_display)}<small class="price-unit">${escapeHtml(ptPlan.unit || '/ buổi')}</small>`;
        }
        if (Array.isArray(ptPlan.features) && ptPlan.features.length) {
          const ul = ptEl.querySelector('ul');
          if (ul) ul.innerHTML = ptPlan.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('');
        }
      }
    }
  }

  /* ==================== 8. COURSE 9 WEEK PAGE ==================== */
  function hydrateCoursePage(settings, pricing) {
    if (settings && settings.home_journey_9w) {
      const j = settings.home_journey_9w;
      const steps = document.querySelectorAll('.flow-3 .flow-step');
      if (steps[0] && (j.step1_title || j.step1_desc)) {
        if (j.step1_title) steps[0].querySelector('h3').textContent = j.step1_title;
        if (j.step1_desc) steps[0].querySelector('p:last-of-type').textContent = j.step1_desc;
      }
      if (steps[1] && (j.step2_title || j.step2_desc)) {
        if (j.step2_title) steps[1].querySelector('h3').textContent = j.step2_title;
        if (j.step2_desc) steps[1].querySelector('p:last-of-type').textContent = j.step2_desc;
      }
      if (steps[2] && (j.step3_title || j.step3_desc)) {
        if (j.step3_title) steps[2].querySelector('h3').textContent = j.step3_title;
        if (j.step3_desc) steps[2].querySelector('p:last-of-type').textContent = j.step3_desc;
      }
    }

    if (pricing && pricing.length > 0) {
      const coursePlan = pricing.find((p) => p.category === 'course' || p.slug === 'course-9-week');
      if (coursePlan) {
        const card = document.querySelector('.pricing-card[data-tier="course"]');
        if (card && coursePlan.price_display) {
          const priceEl = card.querySelector('.price');
          if (priceEl) priceEl.innerHTML = `${escapeHtml(coursePlan.price_display)}<small class="price-unit">${escapeHtml(coursePlan.unit || '/ tuần')}</small>`;
        }
      }
    }
  }

  /* ==================== 9. BLOG PAGE ==================== */
  function hydrateBlogPage(blogs) {
    const blogGrid = document.querySelector('.blog-grid, .posts-grid, .section .grid-3');
    if (!blogGrid || blogs.length === 0) return;

    blogGrid.innerHTML = blogs.map((b) => `
      <article class="post-card">
        <img src="${escapeHtml(resolveImgUrl(b.cover_image, 'https://res.cloudinary.com/uaanigxf/image/upload/v1791219581/muse-fitness-studio/blog-weight-training.webp'))}" alt="${escapeHtml(b.title)}" loading="lazy">
        <div class="content">
          <div class="meta"><span>${escapeHtml(b.category || 'Tập luyện')}</span><span class="dot">·</span><span>${escapeHtml(b.read_time || '5 phút đọc')}</span></div>
          <h3>${escapeHtml(b.title)}</h3>
          <p>${escapeHtml(b.summary || '')}</p>
          <span class="read-time">${escapeHtml(b.read_time || '5 phút đọc')}</span>
        </div>
      </article>
    `).join('');
  }

  /* ==================== 10. SIGNUP PAGE ==================== */
  function hydrateSignupPage(branches, pricing) {
    const params = new URLSearchParams(window.location.search);
    const preBranch = params.get('branch');
    const prePlan = params.get('plan');

    // Populate branches select
    const branchSelect = document.getElementById('branch');
    if (branchSelect && branches && branches.length > 0) {
      const currentOpts = Array.from(branchSelect.options).map((o) => o.value);
      branches.forEach((b) => {
        if (!currentOpts.includes(b.name)) {
          const opt = document.createElement('option');
          opt.value = b.name;
          opt.textContent = b.name;
          branchSelect.appendChild(opt);
        }
      });

      if (preBranch) {
        for (let i = 0; i < branchSelect.options.length; i++) {
          if (branchSelect.options[i].text.toLowerCase().includes(preBranch.toLowerCase())) {
            branchSelect.selectedIndex = i;
            break;
          }
        }
      }
    }

    // Pre-select goal from plan query
    const goalSelect = document.getElementById('goal');
    if (goalSelect && prePlan) {
      for (let i = 0; i < goalSelect.options.length; i++) {
        if (goalSelect.options[i].text.toLowerCase().includes(prePlan.toLowerCase())) {
          goalSelect.selectedIndex = i;
          break;
        }
      }
    }
  }

  // Self Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCmsContent);
  } else {
    loadCmsContent();
  }
})();
