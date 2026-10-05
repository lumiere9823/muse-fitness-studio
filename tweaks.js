/* ============================================================
   MUSE — Tweaks panel (vanilla, multi-page)
   So sánh phiên bản TRƯỚC ↔ SAU: màu nút CTA/accent + font tiêu đề.
   State giữ trong localStorage (carry qua mọi trang) + đồng bộ host.
   ============================================================ */
(function () {
  var LS_KEY = "muse_tweaks";
  var defaults = (window.MUSE_TWEAKS && typeof window.MUSE_TWEAKS === "object")
    ? window.MUSE_TWEAKS : { cta: "rose", font: "spectral" };

  function load() {
    var s = { cta: defaults.cta, font: defaults.font };
    try {
      var saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (saved.cta) s.cta = saved.cta;
      if (saved.font) s.font = saved.font;
    } catch (e) {}
    return s;
  }

  var state = load();

  function apply() {
    var r = document.documentElement;
    r.setAttribute("data-cta", state.cta);
    r.setAttribute("data-font", state.font);
  }
  apply();

  /* ---------- Vietnamese display-copy line breaks ---------- */
  var protectedPhrases = [
    "Bodyweight – Kettlebell",
    "Bodyweight–Kettlebell",
    "Hành Trình 9 Tuần",
    "tập thử miễn phí",
    "lộ trình phù hợp",
    "bắt đầu nhẹ nhàng",
    "đồng hành sát sao",
    "đồng hành chuyên sâu",
    "Nguyễn Thị Thập",
    "Hoàng Văn Thụ",
    "Lê Đức Thọ",
    "Gói Hội Viên",
    "Không phán xét",
    "Phòng gym",
    "khu thay đồ",
    "dành riêng",
    "không gian",
    "riêng tư",
    "lớp nhóm nhỏ",
    "cải thiện vóc dáng",
    "lộ trình riêng",
    "xứng đáng",
    "chăm sóc",
    "phòng tập",
    "lộ trình",
    "phù hợp",
    "bắt đầu",
    "đồng hành",
    "tập thử",
    "tập đúng",
    "tập đều",
    "tập tạ",
    "nhẹ nhàng",
    "rõ ràng",
    "một mình",
    "vóc dáng",
    "sức khỏe",
    "sức khoẻ",
    "sức bền",
    "sau sinh",
    "nhóm nhỏ",
    "kỹ thuật",
    "mục tiêu",
    "khởi đầu",
    "làm quen",
    "hội viên",
    "chi nhánh",
    "lịch lớp",
    "khung giờ",
    "miễn phí",
    "ép buộc",
    "phán xét",
    "thay đổi",
    "lựa chọn",
    "thời gian",
    "Chủ nhật",
    "tư vấn",
    "đăng ký",
    "quyết định",
    "thói quen",
    "cơ thể",
    "cá nhân",
    "9 tuần",
    "3 buổi",
    "4 tiếng",
    "1 tiếng",
    "30 phút",
    "60 phút",
    "PT 1-1"
  ].sort(function (a, b) { return b.length - a.length; });

  function protectDisplayCopyLineBreaks() {
    var selector = "h1, h2, h3, .wide-quote, blockquote, .t-quote, .lead, .cta-band p, .stat span, .stat em";
    document.querySelectorAll(selector).forEach(function (element) {
      if (element.hasAttribute("data-line-breaks-protected")) return;
      var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      var textNodes = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode);

      textNodes.forEach(function (node) {
        var value = node.nodeValue;
        protectedPhrases.forEach(function (phrase) {
          var escaped = phrase
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\s+/g, "\\s+");
          value = value.replace(new RegExp(escaped, "giu"), function (match) {
            return match.replace(/\s+/g, "\u00a0");
          });
        });
        node.nodeValue = value;
      });
      element.setAttribute("data-line-breaks-protected", "true");
    });
  }
  protectDisplayCopyLineBreaks();

  function persist(key, val) {
    state[key] = val;
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
    apply();
    var edits = {}; edits[key] = val;
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: edits }, "*"); } catch (e) {}
    syncUI();
  }

  /* ---------- Panel UI ---------- */
  var panel, built = false;

  function injectStyles() {
    if (document.getElementById("muse-tweaks-style")) return;
    var css = document.createElement("style");
    css.id = "muse-tweaks-style";
    css.textContent = [
      ".muse-tweaks{position:fixed;right:20px;bottom:20px;z-index:9999;width:280px;",
      "background:#FFFDF9;border:1px solid rgba(61,50,37,.14);border-radius:14px;",
      "box-shadow:0 24px 60px -24px rgba(61,50,37,.45);",
      "font-family:'Montserrat',Arial,sans-serif;color:#3D3225;overflow:hidden;display:none;}",
      ".muse-tweaks.is-open{display:block;}",
      ".muse-tweaks__hd{display:flex;align-items:center;justify-content:space-between;",
      "padding:14px 16px;border-bottom:1px solid rgba(61,50,37,.1);}",
      ".muse-tweaks__hd h4{margin:0;font-family:'Spectral','Cormorant Garamond',Georgia,serif;",
      "font-weight:300;font-size:20px;letter-spacing:.2px;}",
      ".muse-tweaks__x{border:0;background:transparent;font-size:18px;line-height:1;color:#817B73;",
      "cursor:pointer;width:28px;height:28px;border-radius:50%;}",
      ".muse-tweaks__x:hover{background:rgba(61,50,37,.07);color:#3D3225;}",
      ".muse-tweaks__body{padding:16px;display:flex;flex-direction:column;gap:18px;}",
      ".muse-tweaks__grp label{display:block;font-size:11px;font-weight:600;letter-spacing:1.4px;",
      "text-transform:uppercase;color:#8A7356;margin-bottom:8px;}",
      ".muse-seg{display:flex;gap:4px;padding:4px;background:#F2ECE3;border-radius:999px;}",
      ".muse-seg button{flex:1;border:0;background:transparent;padding:8px 6px;border-radius:999px;",
      "font:inherit;font-size:12.5px;font-weight:500;color:#6F5C45;cursor:pointer;transition:all .18s;}",
      ".muse-seg button.on{background:#C4898A;color:#FFFDF9;box-shadow:0 2px 8px -2px rgba(168,112,115,.6);}",
      ".muse-seg button.on[data-v='before'],.muse-seg button.on[data-v='cormorant']{background:#8A7356;}",
      ".muse-tweaks__note{font-size:11.5px;line-height:1.5;color:#817B73;margin:0;}",
      ".muse-tweaks__tag{display:inline-block;font-size:10px;font-weight:700;letter-spacing:.5px;",
      "padding:2px 7px;border-radius:6px;margin-left:6px;vertical-align:middle;}"
    ].join("");
    document.head.appendChild(css);
  }

  function seg(key, opts) {
    var wrap = document.createElement("div");
    wrap.className = "muse-seg";
    opts.forEach(function (o) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = o.label;
      b.setAttribute("data-key", key);
      b.setAttribute("data-val", o.val);
      b.setAttribute("data-v", o.tone);
      b.addEventListener("click", function () { persist(key, o.val); });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function build() {
    if (built) return;
    injectStyles();
    panel = document.createElement("div");
    panel.className = "muse-tweaks";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Tweaks");

    var hd = document.createElement("div");
    hd.className = "muse-tweaks__hd";
    hd.innerHTML = "<h4>Tweaks</h4>";
    var x = document.createElement("button");
    x.className = "muse-tweaks__x";
    x.setAttribute("aria-label", "Đóng");
    x.innerHTML = "&times;";
    x.addEventListener("click", function () {
      hide();
      try { window.parent.postMessage({ type: "__edit_mode_dismissed" }, "*"); } catch (e) {}
    });
    hd.appendChild(x);

    var body = document.createElement("div");
    body.className = "muse-tweaks__body";

    var g1 = document.createElement("div");
    g1.className = "muse-tweaks__grp";
    g1.innerHTML = "<label>Nút CTA &amp; màu nhấn</label>";
    g1.appendChild(seg("cta", [
      { label: "Rose (sau)", val: "rose", tone: "after" },
      { label: "Nâu (trước)", val: "brown", tone: "before" }
    ]));

    var g2 = document.createElement("div");
    g2.className = "muse-tweaks__grp";
    g2.innerHTML = "<label>Font tiêu đề</label>";
    g2.appendChild(seg("font", [
      { label: "Spectral (sau)", val: "spectral", tone: "after" },
      { label: "Cormorant (trước)", val: "cormorant", tone: "cormorant" }
    ]));

    var note = document.createElement("p");
    note.className = "muse-tweaks__note";
    note.innerHTML = "Bật/tắt để so sánh phiên bản trước và sau. Lựa chọn được giữ khi chuyển trang.";

    body.appendChild(g1);
    body.appendChild(g2);
    body.appendChild(note);
    panel.appendChild(hd);
    panel.appendChild(body);
    document.body.appendChild(panel);
    built = true;
    syncUI();
  }

  function syncUI() {
    if (!panel) return;
    panel.querySelectorAll(".muse-seg button").forEach(function (b) {
      var on = state[b.getAttribute("data-key")] === b.getAttribute("data-val");
      b.classList.toggle("on", on);
    });
  }

  function show() { build(); panel.classList.add("is-open"); }
  function hide() { if (panel) panel.classList.remove("is-open"); }

  /* ---------- Host protocol ---------- */
  window.addEventListener("message", function (e) {
    var d = e.data || {};
    if (d.type === "__activate_edit_mode") show();
    else if (d.type === "__deactivate_edit_mode") hide();
  });
  try { window.parent.postMessage({ type: "__edit_mode_available" }, "*"); } catch (e) {}
})();
