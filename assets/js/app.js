/* =========================================================
   TERANGAPASS — Application (routeur, header, compteurs)
   ========================================================= */
(function () {
  "use strict";

  const S = window.TERANGAPASS_STORE;
  const Views = window.TERANGAPASS_VIEWS;

  const header = document.getElementById("siteHeader");
  const nav = document.getElementById("mainNav");
  const menuBtn = document.getElementById("menuBtn");
  const searchForm = document.getElementById("headerSearch");
  let main = document.getElementById("main");

  /* ---------- hash / route ---------- */
  function parseHash() {
    let raw = window.location.hash || "";
    if (!raw || raw === "#" || raw === "#/") raw = "#/";
    if (raw.charAt(0) === "#") raw = raw.slice(1);
    if (raw.charAt(0) !== "/") return null;

    const qIndex = raw.indexOf("?");
    const pathPart = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const queryPart = qIndex >= 0 ? raw.slice(qIndex + 1) : "";
    const path = pathPart.replace(/^\/+|\/+$/g, "");
    const segments = path ? path.split("/").filter(Boolean).map((s) => {
      try { return decodeURIComponent(s); } catch (e) { return s; }
    }) : [];
    return {
      path,
      segments,
      query: new URLSearchParams(queryPart)
    };
  }

  function resolveRoute(route) {
    if (!route) return { name: "ignore", view: null, params: {}, query: new URLSearchParams() };
    const s = route.segments;
    const query = route.query;

    if (!s.length) return { name: "home", view: Views.home, params: {}, query };
    if (s[0] === "evenements") return { name: "events", view: Views.events, params: {}, query };
    if (s[0] === "evenement" && s[1]) return { name: "event", view: Views.event, params: { id: s[1] }, query };
    if (s[0] === "panier") return { name: "cart", view: Views.cart, params: {}, query };
    if (s[0] === "paiement") return { name: "checkout", view: Views.checkout, params: {}, query };
    if (s[0] === "confirmation" && s[1]) return { name: "confirmation", view: Views.confirmation, params: { ref: s[1] }, query };
    if (s[0] === "billets") return { name: "tickets", view: Views.tickets, params: {}, query };
    if (s[0] === "aide") return { name: "help", view: Views.help, params: {}, query };
    if (s[0] === "mentions") return { name: "legal", view: Views.legal, params: {}, query };
    if (s[0] === "admin") return { name: "admin", view: Views.admin, params: {}, query };
    return { name: "notFound", view: Views.notFound, params: {}, query };
  }

  /* ---------- header ---------- */
  const NAV_FOR_ROUTE = {
    home: "home",
    events: "events",
    event: "events",
    cart: "cart",
    checkout: "cart",
    confirmation: "cart",
    tickets: "tickets",
    help: "help"
  };

  function setActiveNav(name) {
    const wanted = NAV_FOR_ROUTE[name] || null;
    Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"), (a) => {
      a.classList.toggle("is-active", !!wanted && a.getAttribute("data-nav") === wanted);
    });
  }

  function closeMenu() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Ouvrir le menu");
    }
  }

  function toggleMenu() {
    if (!header) return;
    const open = !header.classList.contains("nav-open");
    header.classList.toggle("nav-open", open);
    if (menuBtn) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    }
  }

  if (menuBtn) menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  if (nav) nav.addEventListener("click", (e) => { if (e.target.closest("a")) closeMenu(); });
  document.addEventListener("click", (e) => {
    if (!header || !header.classList.contains("nav-open")) return;
    if (!header.contains(e.target)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  if (searchForm) {
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = searchForm.querySelector("input[name=q]");
      const q = input ? input.value.trim() : "";
      closeMenu();
      navigate(q ? "/evenements?q=" + encodeURIComponent(q) : "/evenements");
    });
  }

  function scrolled() {
    if (!header) return;
    header.classList.toggle("is-scrolled", (window.scrollY || window.pageYOffset || 0) > 8);
  }
  window.addEventListener("scroll", scrolled, { passive: true });

  /* ---------- panier (badges) ---------- */
  function updateCartBadges() {
    const n = S.cartCount();
    Array.prototype.forEach.call(document.querySelectorAll("[data-cart-count]"), (el) => {
      el.textContent = String(n);
      el.classList.toggle("is-empty", n === 0);
    });
    const cartBtn = document.querySelector(".cart-btn");
    if (cartBtn) cartBtn.setAttribute("aria-label", n ? "Voir mon panier (" + n + " billet" + (n > 1 ? "s" : "") + ")" : "Voir mon panier");
  }

  // Le store peut être modifié par une vue (panier, scan…). On ne relance
  // volontairement pas le rendu complet : seuls les compteurs sont mis à jour
  // afin de ne pas interrompre une saisie ou un contrôle d'accès.
  S.subscribe(updateCartBadges);

  /* ---------- compte à rebours ---------- */
  function formatCountdown(diff) {
    if (diff <= 0) return "maintenant";
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    if (days > 0) return days + " j " + hours + " h " + minutes + " min";
    if (hours > 0) return hours + " h " + String(minutes).padStart(2, "0") + " min";
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function updateCountdowns() {
    const nodes = document.querySelectorAll("[data-countdown]");
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      const target = new Date(el.getAttribute("data-countdown")).getTime();
      if (!isNaN(target)) el.textContent = formatCountdown(target - Date.now());
    }
  }
  window.setInterval(updateCountdowns, 1000);

  /* ---------- rendu ---------- */
  let currentName = null;

  function documentTitle(route) {
    if (route.name === "event") {
      if (route.view && route.view._event) return route.view._event.title + " — TERANGAPASS";
      return "Événement introuvable — TERANGAPASS";
    }
    if (route.name === "confirmation") {
      const order = S.getOrder(route.params.ref);
      if (order) return "Commande " + order.ref + " confirmée — TERANGAPASS";
    }
    return (route.view && route.view.title) || "TERANGAPASS — Billetterie concerts, soirées & festivals";
  }

  function render(opts) {
    opts = opts || {};
    const route = resolveRoute(parseHash());

    // Hash technique (ancre, skip-link…) : on ne change pas de page.
    if (route.name === "ignore") return;

    if (route.name === "confirmation" && !S.getOrder(route.params.ref)) {
      const reference = route.params.ref;
      main.innerHTML = '<section class="section"><div class="container"><p class="muted">Chargement de la commande…</p></div></section>';
      S.loadOrder(reference).then(() => render({ scroll: false })).catch(() => {
        main.innerHTML = '<section class="section"><div class="container"><div class="empty-state"><div class="empty-emoji">🔎</div><h1 class="h2">Commande introuvable</h1><p>Vérifiez la référence de commande et réessayez.</p><a class="btn btn-primary" href="#/billets">Mes billets</a></div></div></section>';
      });
      return;
    }

    const scroll = opts.scroll !== false;
    currentName = route.name;

    closeMenu();
    setActiveNav(route.name);
    document.body.setAttribute("data-route", route.name);

    let html = "";
    let renderFailed = false;
    try {
      html = route.view.render(route.params, route.query) || "";
    } catch (err) {
      renderFailed = true;
      console.error("[TERANGAPASS] Erreur de rendu :", err);
      html = '<section class="section"><div class="container">' +
        '<div class="empty-state"><div class="empty-emoji">⚠️</div><h2>Une erreur est survenue</h2>' +
        '<p>Rechargez la page ou revenez à l\'accueil.</p>' +
        '<a class="btn btn-primary" href="#/">Retour à l\'accueil</a></div></div></section>';
    }

    // On remplace <main> à chaque rendu : cela supprime d'un coup les
    // écouteurs délégués attachés à l'ancienne vue (admin, panier…).
    const freshMain = document.createElement("main");
    freshMain.id = "main";
    freshMain.setAttribute("tabindex", "-1");
    main.replaceWith(freshMain);
    main = freshMain;
    main.innerHTML = html;

    if (!renderFailed) {
      try {
        if (route.view.mount) route.view.mount(main, route.params, route.query);
      } catch (err) {
        console.error("[TERANGAPASS] Erreur de montage :", err);
      }
    }

    document.title = documentTitle(route);

    // Synchronise la recherche du header avec la page événements.
    const qInput = searchForm ? searchForm.querySelector("input[name=q]") : null;
    if (qInput) qInput.value = route.name === "events" ? (route.query.get("q") || "") : "";

    updateCartBadges();
    updateCountdowns();
    scrolled();

    if (scroll) {
      try {
        if (typeof window.scrollTo === "function") window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch (e) { /* certains environnements n'implémentent pas scrollTo */ }
    }
  }

  function navigate(path) {
    const target = "#" + (path.charAt(0) === "/" ? path : "/" + path);
    if (window.location.hash === target) {
      render({ scroll: true });
      return;
    }
    window.location.hash = target;
  }

  window.TERANGAPASS_APP = {
    render,
    rerender(opts) { render(opts); },
    navigate,
    currentRoute() { return currentName; }
  };

  /* ---------- démarrage ---------- */
  window.addEventListener("hashchange", () => render({ scroll: true }));

  const yearEl = document.getElementById("footerYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // Le skip-link ne doit pas être interprété comme une route.
  const skip = document.querySelector(".skip-link");
  if (skip) {
    skip.addEventListener("click", (e) => {
      e.preventDefault();
      if (main) {
        try { main.focus({ preventScroll: true }); } catch (err) { main.focus(); }
        try { main.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (err) { /* ignore */ }
      }
    });
  }

  // Normalise une URL sans hash pour que le routeur ait toujours une route.
  if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/") {
    try { window.history.replaceState(null, "", "#/"); } catch (e) { /* ignore */ }
  }

  function showServiceError() {
    main.innerHTML = '<section class="section"><div class="container"><div class="empty-state"><div class="empty-emoji">⚠️</div><h1 class="h2">Service momentanément indisponible</h1><p>La connexion au serveur TERANGAPASS a échoué. Vérifiez le serveur puis réessayez.</p><button class="btn btn-primary" id="retryService" type="button">Réessayer</button></div></div></section>';
    const retry = main.querySelector("#retryService");
    if (retry) retry.addEventListener("click", () => S.initialize().then(() => render({ scroll: false })).catch(showServiceError));
  }
  S.initialize().then(() => render({ scroll: false })).catch(showServiceError);
})();
