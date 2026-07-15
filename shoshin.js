/* ============================================================
   SHOSHIN — shared interactions
   Mobile drawer · scroll reveals · enso draw-on · year stamp
   Pure vanilla, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  /* ---- Mobile drawer ---- */
  function initMenu() {
    var burger = document.querySelector(".sh-nav__burger");
    if (!burger) return;
    var close = function () { document.body.classList.remove("sh-menu-open"); };
    burger.addEventListener("click", function () {
      document.body.classList.toggle("sh-menu-open");
    });
    document.querySelectorAll(".sh-drawer a").forEach(function (a) {
      a.addEventListener("click", close);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
    // Close drawer if resized up to desktop
    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) close();
    });
  }

  /* ---- Reveals (visible-by-default; hide-then-reveal only on a live clock) ---- */
  function inView(el, ratio) {
    var r = el.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.height === 0 && r.width === 0) return false;
    return r.top < vh * (1 - (ratio || 0.06)) && r.bottom > 0;
  }

  function ungate() {
    var root = document.documentElement;
    root.classList.add("no-anim");   // block any NEW transitions
    root.classList.remove("js-reveal");
    // Cancel any already-running (possibly frozen) transitions and pin the
    // visible end-state inline so nothing can stay stuck at opacity:0.
    var nodes = document.querySelectorAll(".sh-reveal");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.getAnimations) {
        var as = el.getAnimations();
        for (var j = 0; j < as.length; j++) { try { as[j].cancel(); } catch (e) {} }
      }
      el.style.opacity = "1";
      el.style.transform = "none";
      el.style.transition = "none";
    }
    document.querySelectorAll(".sh-enso--draw").forEach(function (e) { e.classList.add("is-drawn"); });
  }

  function initReveals() {
    var root = document.documentElement;
    // If reduced motion, just stay visible (CSS handles it) — no gating needed.
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { ungate(); return; }

    var reveals = [].slice.call(document.querySelectorAll(".sh-reveal"));
    var ensos = [].slice.call(document.querySelectorAll(".sh-enso--draw"));
    if (!reveals.length && !ensos.length) { ungate(); return; }

    var ticking = false;
    var check = function () {
      ticking = false;
      reveals = reveals.filter(function (el) {
        if (inView(el, 0.06)) { el.classList.add("is-in"); return false; }
        return true;
      });
      ensos = ensos.filter(function (el) {
        if (inView(el, 0.2)) { el.classList.add("is-drawn"); return false; }
        return true;
      });
    };
    var onScroll = function () {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    };

    // First reveal pass + scroll/resize listeners
    requestAnimationFrame(function () { requestAnimationFrame(check); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", check);

    /* Frozen-clock probe: some embeds (screenshot/preview frames) never advance
       the animation clock, leaving transitions stuck at opacity:0. Detect that
       and un-gate so content is simply shown (base = visible). */
    var probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:fixed;left:-9999px;top:0;width:4px;height:4px;opacity:0;transition:opacity .06s linear;";
    document.body.appendChild(probe);
    // force reflow, then animate toward 1
    void probe.offsetWidth;
    probe.style.opacity = "1";
    setTimeout(function () {
      var live = parseFloat(getComputedStyle(probe).opacity) > 0.5;
      if (probe.parentNode) probe.parentNode.removeChild(probe);
      if (!live) ungate(); // clock frozen -> reveal everything statically
    }, 160);

    // Absolute last-resort safety net
    setTimeout(function () {
      check();
      document.querySelectorAll(".sh-reveal:not(.is-in)").forEach(function (el) {
        if (inView(el, 0)) el.classList.add("is-in");
      });
    }, 3000);
  }

  /* ---- Footer year ---- */
  function initYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- Nav elevate on scroll ---- */
  function initNavScroll() {
    var nav = document.querySelector(".sh-nav");
    if (!nav) return;
    var onScroll = function () {
      if (window.scrollY > 8) nav.classList.add("is-scrolled");
      else nav.classList.remove("is-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Hero flow: walk the morning, screen by screen ---- */
  function initHeroFlow() {
    var flow = document.querySelector("[data-sh-flow]");
    if (!flow) return;
    var screens = [].slice.call(flow.querySelectorAll(".sh-scr"));
    if (!screens.length) return;
    var caption = document.querySelector("[data-sh-caption]");
    var phone = flow.closest(".sh-hero__phone");
    var dots = phone ? [].slice.call(phone.querySelectorAll(".sh-hero__rail span")) : [];
    var captions = [
      "Fig. 01 — Mind awake. Solve to silence.",
      "Fig. 02 — Freshen up. Cold water, thirty seconds.",
      "Fig. 03 — Dressed. Decided the night before.",
      "Fig. 04 — Out the door. Proof for tomorrow's you.",
      "Fig. 05 — Habit begun. The crossing complete."
    ];
    var DWELL = 3400, i = 0, timer = null;

    function show(n) {
      screens.forEach(function (s, k) { s.classList.toggle("is-active", k === n); });
      dots.forEach(function (d, k) { d.classList.toggle("is-on", k === n); });
      if (caption) {
        caption.style.opacity = "0";
        setTimeout(function () { caption.textContent = captions[n] || ""; caption.style.opacity = ""; }, 260);
      }
    }
    show(0);
    if (REDUCED) return; // honour reduced motion: rest on the first screen

    var visible = true, focused = true;
    function tick() { if (visible && focused) { i = (i + 1) % screens.length; show(i); } }
    function start() { if (!timer) timer = setInterval(tick, DWELL); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }

    document.addEventListener("visibilitychange", function () {
      focused = !document.hidden;
      if (focused) start(); else stop();
    });
    // Pause when the phone scrolls out of view (calm + efficient)
    if ("IntersectionObserver" in window && phone) {
      var io = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start(); else stop();
      }, { threshold: 0.2 });
      io.observe(phone);
    }
    start();
  }

  /* ---- Scroll-scrubbed progress along a track (bridge + steps) ---- */
  function initScrub(selector, itemSelector, axis, varName) {
    var track = document.querySelector(selector);
    if (!track) return;
    var items = [].slice.call(track.querySelectorAll(itemSelector));
    if (!items.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var r = track.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var startBand = vh * 0.80, endBand = vh * 0.30;
      var span = (startBand - endBand) + r.height;
      var p = (startBand - r.top) / span;
      p = Math.max(0, Math.min(1, p));
      track.style.setProperty(varName, (p * 100).toFixed(2) + "%");
      for (var k = 0; k < items.length; k++) {
        var threshold = (k + 0.6) / items.length;
        items[k].classList.toggle("is-lit", p >= threshold);
      }
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    if (REDUCED) {
      track.style.setProperty(varName, "100%");
      items.forEach(function (el) { el.classList.add("is-lit"); });
      return;
    }
    requestAnimationFrame(function () { requestAnimationFrame(update); });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", update);
  }

  /* ---- Testimonials: gently rotating emphasis ---- */
  function initVoices() {
    var grid = document.querySelector("[data-voices]");
    if (!grid) return;
    var voices = [].slice.call(grid.querySelectorAll(".sh-voice"));
    if (voices.length < 2) return;
    var i = 0;
    function light(n) { voices.forEach(function (v, k) { v.classList.toggle("is-active", k === n); }); }
    light(0);
    if (REDUCED) return;
    var timer = null;
    function start() { if (!timer) timer = setInterval(function () { i = (i + 1) % voices.length; light(i); }, 3600); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) start(); else stop(); }, { threshold: 0.25 });
      io.observe(grid);
    } else { start(); }
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
  }

  /* ---- Site-wide sticky Download CTA (boosts conversion) ---- */
  function initDock() {
    // Don't show on the download page itself (that's the destination)
    if (/download\.html(?:$|[?#])/.test(location.pathname + location.search + location.hash) ||
        /download\.html/.test(location.pathname)) return;
    if (document.querySelector(".sh-dock")) return;
    try { if (localStorage.getItem("sh-dock-dismissed") === "1") return; } catch (e) {}

    var apple = '<svg width="14" height="16" viewBox="0 0 16 18" fill="currentColor" aria-hidden="true"><path d="M13.3 9.6c0-1.7 1.4-2.5 1.4-2.6-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.7 1.7-1.2 2-.3 5 .8 6.6.6.8 1.2 1.7 2.1 1.7.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5 1.5-.8 2-1.6c.7-.9.9-1.8.9-1.9 0 0-1.8-.7-1.8-2.8zM11.7 4.3c.5-.6.8-1.4.7-2.3-.7 0-1.5.5-2 1.1-.4.5-.8 1.3-.7 2.1.8.1 1.6-.4 2-.9z"/></svg>';
    var play = '<svg width="13" height="15" viewBox="0 0 15 17" fill="currentColor" aria-hidden="true"><path d="M.7.6C.5.8.4 1.1.4 1.5v14c0 .4.1.7.3.9l8-7.9-8-7.9zM10.9 6.5 2.6.9l7.4 4.3.9 1.3zM13.7 7.4c.5.3.5 1.2 0 1.5l-1.8 1-1.6-1.6 1.6-1.6 1.8.7zM2.6 16.1l8.3-5.6-1-1.3-7.3 6.9z"/></svg>';

    var dock = document.createElement("div");
    dock.className = "sh-dock";
    dock.setAttribute("role", "region");
    dock.setAttribute("aria-label", "Download Shoshin");
    dock.innerHTML =
      '<span class="sh-dock__pitch"><b>Begin tomorrow morning.</b><span>Free to start · Android now, iOS coming soon</span></span>' +
      '<span class="sh-dock__div" aria-hidden="true"></span>' +
      '<span class="sh-dock__actions">' +
        '<a class="sh-dock__btn sh-dock__btn--accent" href="download.html">' + play + 'Download for Android</a>' +
        '<a class="sh-dock__btn sh-dock__btn--ghost" href="download.html">' + apple + 'iOS waitlist</a>' +
      '</span>' +
      '<button class="sh-dock__close" type="button" aria-label="Dismiss download bar">&times;</button>';
    document.body.appendChild(dock);

    dock.querySelector(".sh-dock__close").addEventListener("click", function () {
      dock.classList.remove("is-up");
      try { localStorage.setItem("sh-dock-dismissed", "1"); } catch (e) {}
      setTimeout(function () { if (dock.parentNode) dock.parentNode.removeChild(dock); }, 650);
    });

    var shown = false;
    function onScroll() {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      var threshold = Math.min(680, (window.innerHeight || 700) * 0.9);
      if (y > threshold && !shown) { dock.classList.add("is-up"); shown = true; }
      else if (y <= threshold && shown) { dock.classList.remove("is-up"); shown = false; }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* ---- Contact form: graceful inline confirmation (no backend) ---- */
  function initContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (form.querySelector("[name=name]") || {}).value || "";
      var first = name.trim().split(/\s+/)[0] || "friend";
      var done = document.createElement("div");
      done.className = "sh-contact__done";
      done.innerHTML =
        '<span class="sh-contact__seal" aria-hidden="true">礼</span>' +
        '<h3 class="sh-display sh-d-3">Thank you, ' + first.replace(/[<>&]/g, "") + '.</h3>' +
        '<p class="sh-muted">Your message is on its way. We read every note and reply within a morning or two — usually before 9am.</p>';
      form.replaceWith(done);
    });
  }

  /* ---- Referral copy button ---- */
  function initReferralCopy() {
    document.querySelectorAll("[data-sh-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var code = btn.getAttribute("data-sh-copy");
        var done = function () {
          var prev = btn.textContent;
          btn.textContent = "Copied";
          setTimeout(function () { btn.textContent = prev; }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done).catch(done);
        } else { done(); }
      });
    });
  }

  /* ---- Reckoning countdown clock (Section 07) ---- */
  function initReckoningClock() {
    var els = document.querySelectorAll("[data-sh-countdown]");
    if (!els.length) return;
    function tick() {
      var now = new Date();
      var end = new Date(now); end.setHours(9, 0, 0, 0);
      if (end <= now) end.setDate(end.getDate() + 1);
      var diff = Math.max(0, end - now);
      var h = Math.floor(diff / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      var str = [h, m, s].map(function (n) { return String(n).padStart(2, "0"); }).join(":");
      els.forEach(function (el) { el.textContent = str; });
    }
    tick();
    if (!REDUCED) setInterval(tick, 1000);
  }

  /* ---- FAQ accordion ---- */
  function initFaq() {
    var items = document.querySelectorAll(".sh-faq__item");
    if (!items.length) return;
    items.forEach(function (item) {
      var btn = item.querySelector(".sh-faq__q");
      var panel = item.querySelector(".sh-faq__a");
      if (!btn || !panel) return;
      btn.addEventListener("click", function () {
        var open = item.classList.contains("is-open");
        // close siblings for a clean single-open accordion
        items.forEach(function (other) {
          if (other !== item) {
            other.classList.remove("is-open");
            var p = other.querySelector(".sh-faq__a");
            var b = other.querySelector(".sh-faq__q");
            if (p) p.style.maxHeight = null;
            if (b) b.setAttribute("aria-expanded", "false");
          }
        });
        if (open) {
          item.classList.remove("is-open");
          panel.style.maxHeight = null;
          btn.setAttribute("aria-expanded", "false");
        } else {
          item.classList.add("is-open");
          panel.style.maxHeight = panel.scrollHeight + "px";
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });
  }

  function boot() {
    initMenu();
    initReveals();
    initYear();
    initNavScroll();
    initFaq();
    initHeroFlow();
    initScrub("[data-bridge]", ".sh-station", "x", "--bridge-fill");
    initScrub("[data-steps]", ".sh-step", "y", "--steps-fill");
    initVoices();
    initDock();
    initContactForm();
    initReferralCopy();
    initReckoningClock();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
