// app.js — Muse Fitness Studio (editorial rebuild)
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const LIVE_SITE_ORIGIN =
    window.__LIVE_SITE_ORIGIN__ ||
    (window.location.protocol.startsWith("http")
      ? window.location.origin
      : "https://www.musefitnessstudio.com");
  const LEAD_ENDPOINT = window.location.protocol === "file:"
    ? `${LIVE_SITE_ORIGIN}/api/lead`
    : "/api/lead";
  const TIKTOK_EVENT_ENDPOINT = window.location.protocol === "file:"
    ? `${LIVE_SITE_ORIGIN}/api/tiktok-event`
    : "/api/tiktok-event";

  function getCookie(name) {
    const found = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${name}=`));
    return found ? decodeURIComponent(found.split("=").slice(1).join("=")) : "";
  }

  function getOrCreateMuseClientId() {
    const existing = getCookie("muse_cid");
    if (existing) return existing;

    const clientId = createEventId("muse");
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `muse_cid=${encodeURIComponent(clientId)}; Max-Age=34560000; Path=/; SameSite=Lax${secure}`;
    return clientId;
  }

  function getAttribution() {
    const params = new URLSearchParams(window.location.search);
    return {
      page_url: window.location.href,
      referrer: document.referrer || "",
      utm_source: params.get("utm_source") || "",
      utm_medium: params.get("utm_medium") || "",
      utm_campaign: params.get("utm_campaign") || "",
      utm_content: params.get("utm_content") || "",
      utm_term: params.get("utm_term") || "",
      fbclid: params.get("fbclid") || "",
      ttclid: params.get("ttclid") || "",
      gclid: params.get("gclid") || "",
      gbraid: params.get("gbraid") || "",
      wbraid: params.get("wbraid") || "",
      fbp: getCookie("_fbp"),
      fbc: getCookie("_fbc"),
      ttp: getCookie("_ttp"),
      external_id: getOrCreateMuseClientId(),
      ga_client_id: getGaClientId(),
    };
  }

  function getGaClientId() {
    const ga = getCookie("_ga");
    const parts = ga.split(".");
    return parts.length >= 4 ? `${parts[2]}.${parts[3]}` : "";
  }

  function createEventId(prefix) {
    if (window.crypto && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function trackEvent(name, params = {}, options = {}) {
    window.dataLayer = window.dataLayer || [];
    const payload = {
      event: name,
      ...params,
      event_id: options.eventId || createEventId("event"),
    };
    window.dataLayer.push(payload);

    // Lead is sent by /api/lead only after Google Sheets has accepted it.
    // Other browser events are mirrored through Muse's first-party endpoint.
    if (name !== "muse_generate_lead") postTikTokBrowserEvent(payload);
  }

  function postTikTokBrowserEvent(payload) {
    const attribution = getAttribution();
    const body = JSON.stringify({
      event: payload.event,
      event_id: payload.event_id,
      event_time: Math.floor(Date.now() / 1000),
      parameters: payload,
      page_url: attribution.page_url,
      referrer: attribution.referrer,
      ttclid: attribution.ttclid,
      ttp: attribution.ttp,
      external_id: attribution.external_id,
    });

    fetch(TIKTOK_EVENT_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function slugify(value) {
    return cleanText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function getSignupSlot(classTime) {
    const hour = Number.parseInt(cleanText(classTime).match(/\d{1,2}/)?.[0] || "", 10);
    if (!Number.isFinite(hour)) return "";
    if (hour < 10) return "Sáng (6h – 9h)";
    if (hour < 15) return "Trưa (11h – 14h)";
    if (hour < 18) return "Chiều (15h – 18h)";
    return "Tối (18h – 21h)";
  }

  async function submitLead(data) {
    const response = await fetch(LEAD_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Lead submit failed");
    return result;
  }

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-toggle");
  const navLinks = $(".nav-links");
  if (menuBtn && navLinks) {
    menuBtn.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      document.body.classList.toggle("menu-open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.textContent = open ? "✕" : "☰";
    });
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        navLinks.classList.remove("is-open");
        document.body.classList.remove("menu-open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.textContent = "☰";
      }
    });
  }

  /* ---------- Pricing tabs / blog topics: toggle is-active ---------- */
  $$(".pricing-tabs, .blog-topics").forEach((bar) => {
    bar.addEventListener("click", (e) => {
      const item = e.target.closest(".pricing-tab, .blog-topic");
      if (!item) return;
      $$(".pricing-tab, .blog-topic", bar).forEach((x) => x.classList.remove("is-active"));
      item.classList.add("is-active");
    });
  });

  /* ---------- Newsletter / inline forms (blog) ---------- */
  $$("[data-newsletter]").forEach((f) => {
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = f.querySelector("button");
      if (btn) btn.textContent = "Đã đăng ký ✓";
    });
  });

  /* ---------- Content / offering impressions ---------- */
  const pagePath = window.location.pathname;
  const contentPages = {
    "pricing.html": { content_type: "pricing", content_name: "Muse pricing" },
    "course-9-week.html": { content_type: "program", content_name: "Hanh Trinh 9 Tuan" },
    "schedule.html": { content_type: "schedule", content_name: "Muse class schedule" },
    "branches.html": { content_type: "locations", content_name: "Muse branches" },
    "branch-hoang-van-thu.html": { content_type: "location", content_name: "Muse Hoang Van Thu" },
    "branch-le-duc-tho.html": { content_type: "location", content_name: "Muse Le Duc Tho" },
    "branch-nguyen-thi-thap.html": { content_type: "location", content_name: "Muse Nguyen Thi Thap" },
  };
  const currentFile = pagePath.split("/").pop() || "index.html";
  if (contentPages[currentFile]) {
    trackEvent("muse_content_view", {
      ...contentPages[currentFile],
      page_path: pagePath,
    });
  }

  function observeOnce(element, callback, threshold = 0.5) {
    if (!element) return;
    if (!("IntersectionObserver" in window)) {
      callback();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= threshold)) return;
        observer.disconnect();
        callback();
      },
      { threshold }
    );
    observer.observe(element);
  }

  const planCards = $$(".pricing-card");
  const pricingPlanItems = planCards.map((card, index) => {
    const itemName = cleanText($("h3", card)?.textContent);
    return {
      item_id: slugify(itemName),
      item_name: itemName,
      item_category: card.dataset.tier || "plan",
      index,
    };
  });

  const homeServiceRows = $$("#dich-vu .service-row");
  const homeServiceCategories = ["membership", "program", "personal_training"];
  const homePlanItems = homeServiceRows.map((row, index) => {
    const itemName = cleanText($("h3", row)?.textContent);
    return {
      item_id: slugify(itemName),
      item_name: itemName,
      item_category: homeServiceCategories[index] || "plan",
      index,
    };
  });

  if (currentFile === "index.html" && homePlanItems.length) {
    observeOnce(homeServiceRows[0], () => {
      trackEvent("muse_view_plan_list", {
        item_list_id: "muse_home_services",
        item_list_name: "Muse homepage services",
        list_location: "homepage_services",
        items: homePlanItems,
      });
    });
  }

  if (currentFile === "pricing.html" && pricingPlanItems.length) {
    observeOnce(planCards[0], () => {
      trackEvent("muse_view_plan_list", {
        item_list_id: "muse_membership_plans",
        item_list_name: "Muse membership plans",
        list_location: "pricing_member",
        items: pricingPlanItems,
      });
    });
  }

  document.addEventListener("click", (e) => {
    const link = e.target.closest("a");
    if (!link) return;
    const href = link.getAttribute("href") || "";

    const planCard = link.closest(".pricing-card");
    const planSection = currentFile === "pricing.html" ? link.closest("#hanh-trinh, #pt-1-1") : null;
    const homeServiceRow = currentFile === "index.html" ? link.closest("#dich-vu .service-row") : null;
    const planContext = planCard || planSection || homeServiceRow;
    if (planContext && href.includes("signup.html")) {
      const planName = planCard
        ? cleanText($("h3", planCard)?.textContent)
        : homeServiceRow
          ? cleanText($("h3", homeServiceRow)?.textContent)
          : planSection.id === "hanh-trinh"
            ? "Hanh Trinh 9 Tuan"
            : "PT 1-1";
      const homeServiceIndex = homeServiceRow ? homeServiceRows.indexOf(homeServiceRow) : -1;
      trackEvent("muse_select_plan", {
        item_list_id: homeServiceRow ? "muse_home_services" : "muse_pricing_plans",
        item_list_name: homeServiceRow ? "Muse homepage services" : "Muse pricing plans",
        items: [
          {
            item_id: slugify(planName),
            item_name: planName,
            item_category:
              planCard?.dataset.tier ||
              (homeServiceRow ? homeServiceCategories[homeServiceIndex] || "plan" : null) ||
              (planSection?.id === "hanh-trinh" ? "program" : "personal_training"),
          },
        ],
      });
    }

    const classCard = link.closest(".class-card");
    if (classCard && href.includes("signup.html")) {
      const className = cleanText($(".class-title", classCard)?.textContent);
      const classLevel = cleanText($(".class-level", classCard)?.textContent);
      const classTime = cleanText($(".class-time", classCard)?.textContent);
      const signupUrl = new URL(href, window.location.href);
      signupUrl.searchParams.set("class_name", className);
      signupUrl.searchParams.set("level", classLevel);
      signupUrl.searchParams.set("slot", getSignupSlot(classTime));
      link.href = `${signupUrl.pathname.split("/").pop()}?${signupUrl.searchParams.toString()}`;

      trackEvent("muse_select_schedule_class", {
        item_list_id: "muse_class_schedule",
        item_list_name: "Muse class schedule",
        class_time: classTime,
        class_level: classLevel,
        items: [
          {
            item_id: slugify(`${className}-${classTime}-${classLevel}`),
            item_name: className,
            item_category: "class",
            item_variant: classLevel,
          },
        ],
      });
    }

    if (href.includes("signup.html")) {
      trackEvent("muse_cta_click", {
        cta_type: planContext ? "select_plan" : classCard ? "select_class" : "trial_signup",
        link_text: cleanText(link.textContent),
        page_path: window.location.pathname,
      });
    }

    if (href.includes("m.me") || href.includes("facebook.com/musefitnessstudio")) {
      trackEvent("muse_contact_click", {
        contact_method: href.includes("m.me") ? "messenger" : "facebook",
        link_text: cleanText(link.textContent),
        page_path: window.location.pathname,
      });
    }

    if (href.includes("maps.google.com") || href.includes("google.com/maps")) {
      const branchCard = link.closest(".branch-card");
      trackEvent("muse_find_location", {
        location_name:
          cleanText(branchCard ? $("h3", branchCard)?.textContent : $("h1")?.textContent) || currentFile,
        page_path: window.location.pathname,
      });
    }
  });

  /* ---------- Schedule: filter by discipline / level / branch ---------- */
  const matches = (val, filter) => !filter || filter.startsWith("Tất cả") || val === filter;

  function filterSchedule() {
    const branch = ($('[data-filter="branch"]') || {}).value || "";
    const discipline = ($('[data-filter="discipline"]') || {}).value || "";
    const level = ($('[data-filter="level"]') || {}).value || "";

    let totalVisible = 0;
    $$(".slot-block").forEach((block) => {
      let blockVisible = 0;
      $$(".class-row", block).forEach((row) => {
        const show =
          matches(row.dataset.branch, branch) &&
          matches(row.dataset.discipline, discipline) &&
          matches(row.dataset.level, level);
        row.style.display = show ? "" : "none";
        if (show) blockVisible++;
      });
      block.hidden = blockVisible === 0;
      totalVisible += blockVisible;
    });

    let empty = $(".schedule-empty");
    if (empty) empty.hidden = totalVisible > 0;
  }

  $$("[data-filter]").forEach((sel) => sel.addEventListener("change", filterSchedule));

  $$("#filterDiscipline, #filterLevel").forEach((sel) => {
    sel.addEventListener("change", () => {
      trackEvent("muse_schedule_filter", {
        filter_name: sel.id === "filterDiscipline" ? "discipline" : "level",
        filter_value: sel.value || "all",
      });
    });
  });

  /* ---------- Schedule register links → prefill signup ---------- */
  $$("[data-register-class]").forEach((link) => {
    const row = link.closest(".class-row");
    if (!row) return;
    const params = new URLSearchParams({
      class_name: row.dataset.discipline || "",
      branch: row.dataset.branch || "",
      slot: row.dataset.slot || "",
      level: row.dataset.level || "",
    });
    link.href = `signup.html?${params.toString()}`;
  });

  /* ---------- Signup form ---------- */
  const form = $("[data-lead-form]");
  if (form) {
    const params = new URLSearchParams(window.location.search);
    let formStarted = false;

    function markFormStarted(target) {
      if (formStarted || target?.name === "website") return;
      formStarted = true;
      trackEvent("muse_form_start", { form_name: "trial_signup" });
    }

    // Prefill from schedule deep-link
    const bClass = params.get("class_name");
    const bBranch = params.get("branch");
    const bSlot = params.get("slot");
    if (bBranch) { const s = $("#branch", form); if (s) s.value = bBranch; }
    if (bSlot) {
      const slotInput = $("#slot", form);
      if (slotInput) slotInput.value = bSlot;
    }
    if (bClass) {
      const goal = $("#goal", form);
      if (goal) {
        const want = bClass.includes("Kettlebell") ? "Tập Bodyweight – Kettlebell" : "Thay đổi vóc dáng";
        const opt = Array.from(goal.options).find((o) => o.textContent.trim() === want);
        if (opt) goal.value = opt.value;
      }
      const note = $("#note", form);
      if (note && !note.value) {
        note.value = `Nàng muốn đăng ký lớp ${bClass}${bSlot ? ` (khung ${bSlot})` : ""}${bBranch ? ` tại chi nhánh ${bBranch}` : ""}.`;
      }
    }

    // Chips fill matching select
    $$(".chip", form).forEach((chip) => {
      chip.addEventListener("click", () => {
        markFormStarted(chip);
        const field = chip.closest(".field");
        const select = $("select", field);
        if (!select) return;
        const opt = Array.from(select.options).find((o) => o.textContent.trim() === chip.textContent.trim());
        if (opt) { select.value = opt.value; field.classList.remove("has-error"); }
      });
    });

    form.addEventListener("input", (event) => markFormStarted(event.target));
    form.addEventListener("change", (event) => markFormStarted(event.target));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let valid = true;
      $$(".field", form).forEach((f) => f.classList.remove("has-error"));
      $$("[required]", form).forEach((input) => {
        const field = input.closest(".field");
        const value = input.value.trim();
        const isPhone = input.name === "phone";
        const phoneOk = !isPhone || /^(0|\+84)[0-9\s.-]{8,13}$/.test(value);
        if (!value || !phoneOk) { valid = false; field && field.classList.add("has-error"); }
      });

      const status = $(".form-status", form);
      if (!valid) {
        trackEvent("muse_form_validation_error", {
          form_name: "trial_signup",
          invalid_fields: $$("[required]", form)
            .filter((input) => input.closest(".field")?.classList.contains("has-error"))
            .map((input) => input.name),
        });
        if (status) { status.textContent = "Nàng kiểm tra lại các trường bắt buộc giúp Muse nhé."; status.classList.add("is-visible"); }
        return;
      }

      const eventId = createEventId("lead");
      const data = {
        ...Object.fromEntries(new FormData(form).entries()),
        ...getAttribution(),
        event_id: eventId,
      };
      if (status) {
        status.textContent = "Muse đang gửi thông tin của nàng...";
        status.classList.add("is-visible");
      }
      try {
        await submitLead(data);
      } catch (error) {
        console.error(error);
        trackEvent("muse_lead_submit_error", {
          form_name: "trial_signup",
          error_type: "request_failed",
        });
        if (status) {
          status.textContent = "Muse chưa gửi được thông tin. Nàng thử lại giúp Muse nhé.";
          status.classList.add("is-visible");
        }
        return;
      }
      trackEvent(
        "muse_generate_lead",
        { form_name: "trial_signup", method: "website_form", branch: data.branch },
        { eventId }
      );
      form.reset();
      if (status) {
        status.textContent = "Muse đã nhận thông tin của nàng. Nhân viên sẽ liên hệ tư vấn trong 4 tiếng làm việc.";
        status.classList.add("is-visible");
      }
      form.querySelector("button[type='submit']").textContent = "Đã gửi · Cảm ơn nàng ♡";
    });
  }
})();
