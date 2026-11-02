/* =========================================================
   TERANGAPASS — Vues publiques
   ========================================================= */
(function () {
  "use strict";

  const D = window.TERANGAPASS_DATA;
  const S = window.TERANGAPASS_STORE;
  const UI = window.TERANGAPASS_UI;
  const esc = UI.esc;

  const Views = {};
  window.TERANGAPASS_VIEWS = Views;

  /* =========================================================
     Composants partagés
     ========================================================= */
  function catLabel(id) {
    return S.category(id).label;
  }

  function supportPhoneLinks(value) {
    const digits = String(value || "").replace(/\D/g, "");
    const number = digits.startsWith("00") ? digits.slice(2) : digits;
    return number.length >= 8 && number.length <= 15 ? { telephone: "+" + number, whatsapp: number } : null;
  }

  function availability(event) {
    const st = S.eventStats(event);
    if (st.past) return { cls: "out", text: "Terminé", ratio: 1 };
    if (st.status === "out") return { cls: "out", text: "Complet", ratio: 1 };
    if (st.status === "low") return { cls: "low", text: "Dernières places", ratio: st.ratio };
    return { cls: "ok", text: "Disponible", ratio: st.ratio };
  }

  function eventCard(event, index) {
    const st = S.eventStats(event);
    const av = availability(event);
    const price = Math.round(st.minPrice);
    return (
      '<article class="event-card reveal" style="animation-delay:' + Math.min(index || 0, 5) * 45 + 'ms">' +
        '<div class="event-poster">' +
          '<div class="poster-art">' + UI.posterSVG(event) + "</div>" +
          '<div class="event-poster-top">' +
            '<span class="badge badge-accent">' + esc(S.category(event.category).emoji + " " + catLabel(event.category)) + "</span>" +
            (av.cls === "low" ? '<span class="badge badge-amber">' + esc(av.text) + "</span>" : "") +
            (av.cls === "out" ? '<span class="badge badge-red">' + esc(av.text) + "</span>" : "") +
          "</div>" +
          '<div class="event-date">' +
            '<span class="d">' + UI.dayNum(event.date) + "</span>" +
            '<span><span class="m">' + esc(UI.monthShort(event.date)) + '</span><br><span class="h">' + esc(UI.formatTime(event.date)) + "</span></span>" +
          "</div>" +
        "</div>" +
        '<div class="event-body">' +
          '<span class="event-cat">' + esc(event.venue.city) + " · " + esc(UI.relativeDay(event.date)) + "</span>" +
          '<h3 class="event-title"><a href="#/evenement/' + encodeURIComponent(event.id) + '">' + esc(event.title) + "</a></h3>" +
          '<p class="event-venue">' + UI.icon("pin", 14) + "<span>" + esc(event.venue.name) + "</span></p>" +
          '<div class="event-foot">' +
            "<div>" +
              '<span class="price-from">' + (st.status === "out" ? "Épuisé" : "Dès") + "</span>" +
              '<span class="price-value">' + (st.status === "out" ? "—" : UI.money(price)) + "</span>" +
            "</div>" +
            '<div class="avail ' + av.cls + '">' + esc(av.text) +
              '<div class="mini-bar ' + (av.cls === "low" ? "low" : "") + '"><span style="width:' + Math.round(Math.min(1, av.ratio) * 100) + '%"></span></div>' +
            "</div>" +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  function eventRow(event) {
    const st = S.eventStats(event);
    return (
      '<a class="event-row" href="#/evenement/' + encodeURIComponent(event.id) + '">' +
      '<div class="event-row-poster">' + UI.posterSVG(event) + "</div>" +
        "<div>" +
          '<div class="event-row-title">' + esc(event.title) + "</div>" +
          '<div class="event-row-meta">' + esc(UI.formatDate(event.date, "short")) + " · " + esc(event.venue.city) + "</div>" +
        "</div>" +
        '<div class="event-row-price"><span class="price-from">Dès</span><span class="price-value">' +
          (st.status === "out" ? "Complet" : UI.money(Math.round(st.minPrice))) + "</span></div>" +
      "</a>"
    );
  }

  function ticketCard(order, ticket) {
    const event = S.getEvent(ticket.eventId);
    const item = (order.items || []).find((i) => i.eventId === ticket.eventId && i.tierId === ticket.tierId);
    const tier = event ? S.getTier(event, ticket.tierId) : null;
    const tierName = item && item.tierName ? item.tierName : tier ? tier.name : "Billet";
    const cat = event ? S.category(event.category) : { emoji: "🎫", label: "Billet" };
    const imageSrc = event && event.image ? event.image : "";
    return (
      '<article class="ticket' + (ticket.checkedIn ? " is-used" : "") + (imageSrc ? " has-image" : "") + '">' +
        (ticket.checkedIn ? '<span class="ticket-used-stamp">Utilisé</span>' : "") +
        '<div class="ticket-visual">' +
          (imageSrc
            ? '<img class="ticket-visual-img" src="' + esc(imageSrc) + '" alt="' + esc(event ? event.title : "Affiche") + '" loading="lazy">'
            : '<div class="ticket-visual-fallback">' + UI.posterSVG(event || { title: "TERANGAPASS" }, { vectorOnly: true }) + '</div>') +
          '<span class="ticket-visual-cat" title="' + esc(cat.label) + '">' + esc(cat.emoji) + '</span>' +
        '</div>' +
        '<div class="ticket-main">' +
          '<div class="ticket-event">' + esc(cat.emoji + " " + cat.label) + "</div>" +
          '<h3 class="ticket-title">' + esc(event ? event.title : "Événement") + "</h3>" +
          '<div class="ticket-meta">' +
            "<span>" + UI.icon("calendar", 14) + " " + esc(event ? UI.formatDate(event.date, "long") + " · " + UI.formatTime(event.date) : "—") + "</span>" +
            "<span>" + UI.icon("pin", 14) + " " + esc(event ? event.venue.name + ", " + event.venue.city : "—") + "</span>" +
          "</div>" +
          '<div class="ticket-holder">' +
            "<div><div class=\"lbl\">Titulaire</div><strong>" + esc(ticket.holder || order.name) + "</strong></div>" +
            '<span class="ticket-tier">' + esc(tierName) + "</span>" +
          "</div>" +
        "</div>" +
        '<div class="ticket-stub">' +
          '<div class="barcode">' + UI.barcodeSVG(ticket.code) + "</div>" +
          '<div class="ticket-code">' + esc(ticket.code) + "</div>" +
          '<span class="tiny">' + (ticket.checkedIn ? "Validé le " + esc(UI.formatDate(ticket.checkedInAt, "short")) : "À présenter à l'entrée") + "</span>" +
        "</div>" +
      "</article>"
    );
  }

  function orderBlock(order, open) {
    const count = (order.tickets || []).length || (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const event = order.items && order.items[0] ? S.getEvent(order.items[0].eventId) : null;
    const title = event ? event.title : "Événement";
    const paid = order.status === "paid";
    const rejected = order.status === "rejected";
    const status = paid
      ? '<span class="badge badge-green">Paiement validé</span>'
      : rejected
        ? '<span class="badge badge-red">Commande refusée</span>'
        : '<span class="badge badge-amber">Vérification en attente</span>';
    return (
      '<details class="order-mini"' + (open ? " open" : "") + ">" +
        '<summary class="order-mini-head">' +
          "<div>" +
            '<span class="ref mono">' + esc(order.ref) + "</span>" +
            "<strong>" + esc(title) + "</strong>" +
            '<span class="muted">' + esc(UI.formatDate(order.createdAt, "short")) + " · " + UI.plural(count, "billet") + " · " + esc(UI.money(order.total)) + "</span>" +
          "</div>" +
          '<span class="icon-btn" aria-hidden="true">' + UI.icon("chevronDown", 16) + "</span>" +
        "</summary>" +
        '<div class="order-mini-body">' +
          '<div class="row" style="margin-top:10px">' +
            status +
            (paid
              ? '<button class="btn btn-outline btn-sm" type="button" data-print="' + esc(order.ref) + '">' + UI.icon("printer", 14) + " Imprimer</button>" +
                '<button class="btn btn-outline btn-sm" type="button" data-download="' + esc(order.ref) + '">' + UI.icon("download", 14) + " Télécharger PNG</button>"
              : "") +
          "</div>" +
          (paid
            ? '<div class="tickets-list">' + (order.tickets || []).map((t) => ticketCard(order, t)).join("") + "</div>"
            : '<div class="payment-review-note mt-2"><p>' + esc(rejected
                ? (order.payment && order.payment.reviewNote) || "La commande a été refusée. Contactez l'organisateur avant de repasser commande."
                : "La capture et la référence de transaction sont en attente de vérification. Les billets seront disponibles après approbation.") +
              '</p><button class="btn btn-ghost btn-sm mt-2" type="button" data-refresh-order="' + esc(order.ref) + '">Actualiser le statut</button></div>') +
        "</div>" +
      "</details>"
    );
  }

  function emptyState(emoji, title, text, cta) {
    return (
      '<div class="empty-state">' +
        '<div class="emoji" aria-hidden="true">' + emoji + "</div>" +
        "<h3>" + esc(title) + "</h3>" +
        "<p>" + esc(text) + "</p>" +
        (cta || "") +
      "</div>"
    );
  }

  function nextEvents(limit) {
    return S.getEvents()
      .filter((e) => !S.isPast(e))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, limit);
  }

  function normalize(str) {
    return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function loadTicketImage(src, timeout) {
    return new Promise((resolve) => {
      if (!src) { resolve(null); return; }
      const image = new Image();
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const timer = setTimeout(() => finish(null), timeout || 2500);
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      if (!src.startsWith("data:")) image.crossOrigin = "anonymous";
      image.src = src;
    });
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawCover(ctx, image, x, y, width, height) {
    if (!image || !image.width || !image.height) return;
    const scale = Math.max(width / image.width, height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, x + (width - w) / 2, y + (height - h) / 2, w, h);
  }

  function drawTicketText(ctx, value, x, y, maxWidth, font, color, maxLines) {
    const words = String(value || "").split(/\s+/);
    const lines = [];
    let line = "";
    ctx.font = font;
    words.forEach((word) => {
      const candidate = line ? line + " " + word : word;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else line = candidate;
    });
    if (line) lines.push(line);
    const visible = lines.slice(0, maxLines || 2);
    if (lines.length > visible.length && visible.length) {
      let last = visible[visible.length - 1];
      while (last && ctx.measureText(last + "…").width > maxWidth) last = last.slice(0, -1);
      visible[visible.length - 1] = last.replace(/\s+$/, "") + "…";
    }
    ctx.fillStyle = color;
    visible.forEach((text, i) => ctx.fillText(text, x, y + i * 50));
    return visible.length;
  }

  function ticketExportData(order) {
    return (order.tickets || []).map((ticket) => {
      const event = S.getEvent(ticket.eventId);
      const item = (order.items || []).find((entry) => entry.eventId === ticket.eventId && entry.tierId === ticket.tierId);
      const tier = event ? S.getTier(event, ticket.tierId) : null;
      return {
        ticket,
        event,
        title: event ? event.title : "Événement",
        date: event ? UI.formatDate(event.date, "long") + " · " + UI.formatTime(event.date) : "Date à confirmer",
        location: event ? [event.venue.name, event.venue.address, event.venue.city].filter(Boolean).join(", ") : "Lieu à confirmer",
        category: event ? S.category(event.category) : { emoji: "🎫", label: "Billet" },
        tierName: item && item.tierName ? item.tierName : tier ? tier.name : "Billet",
        imageSrc: event && event.image ? event.image : ""
      };
    });
  }

  async function downloadTickets(order) {
    if (!order) return;
    if (order.status !== "paid") {
      UI.toast("Les billets seront téléchargeables après validation du paiement.", "error");
      return;
    }
    const tickets = ticketExportData(order);
    if (!tickets.length) {
      UI.toast("Aucun billet à télécharger.", "error");
      return;
    }

    UI.toast("Préparation de votre image PNG…", "info", 8000);
    const imageLoads = new Map();
    const loadedImages = await Promise.all(tickets.map((entry) => {
      if (!imageLoads.has(entry.imageSrc)) imageLoads.set(entry.imageSrc, loadTicketImage(entry.imageSrc));
      return imageLoads.get(entry.imageSrc);
    }));
    const columns = tickets.length > 4 ? 2 : 1;
    const width = 1600 * columns;
    const margin = 56;
    const cardHeight = 460;
    const cardGap = 28;
    const headerHeight = 142;
    const footerHeight = 90;
    const rows = Math.ceil(tickets.length / columns);
    const height = headerHeight + rows * cardHeight + Math.max(0, rows - 1) * cardGap + footerHeight;
    const scale = Math.min(1, Math.sqrt(24000000 / (width * height)), 32000 / width, 32000 / height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width * scale));
    canvas.height = Math.max(1, Math.floor(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      UI.toast("Impossible de créer l’image sur ce navigateur.", "error");
      return;
    }
    ctx.scale(scale, scale);

    ctx.fillStyle = "#03050a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#f4f7ff";
    ctx.font = "700 38px Arial, sans-serif";
    ctx.fillText("TERANGAPASS", margin, 58);
    ctx.fillStyle = "#a5b4ca";
    ctx.font = "22px Arial, sans-serif";
    ctx.fillText("E-billets · Commande " + order.ref, margin, 98);
    ctx.textAlign = "right";
    ctx.fillText(tickets.length + (tickets.length > 1 ? " billets" : " billet"), width - margin, 98);
    ctx.textAlign = "left";

    tickets.forEach((entry, index) => {
      const x = margin + (index % columns) * 1600;
      const y = headerHeight + Math.floor(index / columns) * (cardHeight + cardGap);
      const cardWidth = 1600 - margin * 2;
      ctx.save();
      ctx.shadowColor = "rgba(36, 107, 255, .16)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      roundedRect(ctx, x, y, cardWidth, cardHeight, 24);
      ctx.fillStyle = "#090e17";
      ctx.fill();
      ctx.restore();

      const imageX = x + 22;
      const imageY = y + 22;
      const imageW = 292;
      const imageH = cardHeight - 44;
      ctx.save();
      roundedRect(ctx, imageX, imageY, imageW, imageH, 16);
      ctx.clip();
      const gradient = ctx.createLinearGradient(imageX, imageY, imageX + imageW, imageY + imageH);
      gradient.addColorStop(0, "#176bff");
      gradient.addColorStop(1, "#ff174f");
      ctx.fillStyle = gradient;
      ctx.fillRect(imageX, imageY, imageW, imageH);
      drawCover(ctx, loadedImages[index], imageX, imageY, imageW, imageH);
      if (!loadedImages[index]) {
        ctx.fillStyle = "rgba(3, 5, 10, .32)";
        ctx.fillRect(imageX, imageY, imageW, imageH);
        ctx.fillStyle = "rgba(255,255,255,.92)";
        ctx.font = "700 92px Arial, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(entry.title.trim().charAt(0).toUpperCase() || "P", imageX + imageW / 2, imageY + imageH / 2 + 32);
      }
      const badgeY = imageY + imageH - 62;
      ctx.fillStyle = "rgba(3, 5, 10, .78)";
      ctx.fillRect(imageX, badgeY, imageW, 62);
      ctx.fillStyle = "#ffffff";
      ctx.font = "600 22px Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(entry.category.emoji + "  " + entry.category.label, imageX + 18, badgeY + 39, imageW - 36);
      ctx.restore();

      const mainX = x + 350;
      const mainW = 660;
      ctx.fillStyle = "#77adff";
      ctx.font = "700 19px Arial, sans-serif";
      ctx.fillText((entry.category.emoji + " " + entry.category.label).toUpperCase(), mainX, y + 66);
      const titleLines = drawTicketText(ctx, entry.title, mainX, y + 123, mainW, "700 40px Arial, sans-serif", "#f4f7ff", 2);
      const detailY = y + (titleLines > 1 ? 204 : 174);
      ctx.fillStyle = "#a5b4ca";
      ctx.font = "22px Arial, sans-serif";
      ctx.fillText(entry.date, mainX, detailY);
      drawTicketText(ctx, entry.location, mainX, detailY + 42, mainW, "20px Arial, sans-serif", "#a5b4ca", 2);
      ctx.strokeStyle = "rgba(156, 180, 220, .2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mainX, y + 300);
      ctx.lineTo(mainX + mainW, y + 300);
      ctx.stroke();
      ctx.fillStyle = "#7888a2";
      ctx.font = "16px Arial, sans-serif";
      ctx.fillText("TITULAIRE", mainX, y + 340);
      ctx.fillText("CATÉGORIE", mainX, y + 405);
      ctx.fillStyle = "#f4f7ff";
      ctx.font = "700 24px Arial, sans-serif";
      ctx.fillText(entry.ticket.holder || order.name, mainX + 150, y + 340, mainW - 150);
      ctx.fillText(entry.tierName, mainX + 150, y + 405, mainW - 150);

      const stubX = x + 1050;
      ctx.save();
      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = "rgba(156, 180, 220, .32)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(stubX, y + 28);
      ctx.lineTo(stubX, y + cardHeight - 28);
      ctx.stroke();
      ctx.restore();

      const barcode = new Image();
      const barcodeSvg = UI.barcodeSVG(entry.ticket.code);
      const barcodeUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(barcodeSvg);
      const barcodePromise = new Promise((resolve) => {
        barcode.onload = () => resolve(barcode);
        barcode.onerror = () => resolve(null);
        barcode.src = barcodeUrl;
      });
      entry.barcodePromise = barcodePromise;

      ctx.fillStyle = "#7888a2";
      ctx.font = "16px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("CODE-BARRES", x + cardWidth - 260, y + 130);
      ctx.textAlign = "left";
    });

    const barcodes = await Promise.all(tickets.map((entry) => entry.barcodePromise));
    tickets.forEach((entry, index) => {
      const x = margin + (index % columns) * 1600;
      const y = headerHeight + Math.floor(index / columns) * (cardHeight + cardGap);
      const cardWidth = 1600 - margin * 2;
      const barcode = barcodes[index];
      if (barcode) {
        const bx = x + 1080;
        const by = y + 154;
        const bw = 380;
        const bh = 110;
        const scale = Math.min(bw / barcode.width, bh / barcode.height);
        const w = barcode.width * scale;
        const h = barcode.height * scale;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(bx, by, bw, bh);
        ctx.drawImage(barcode, bx + (bw - w) / 2, by + (bh - h) / 2, w, h);
      }
      ctx.fillStyle = "#f4f7ff";
      ctx.font = "700 21px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(entry.ticket.code, x + cardWidth - 260, y + 300, 410);
      ctx.fillStyle = entry.ticket.checkedIn ? "#ff174f" : "#a5b4ca";
      ctx.font = "18px Arial, sans-serif";
      ctx.fillText(entry.ticket.checkedIn ? "Billet déjà validé" : "À présenter à l’entrée", x + cardWidth - 260, y + 344);
      ctx.textAlign = "left";
    });

    ctx.fillStyle = "#7888a2";
    ctx.font = "17px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TERANGAPASS · commande " + order.ref, width / 2, height - 42);
    ctx.textAlign = "left";

    try {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      const ok = blob && UI.downloadBlob("terangapass-billets-" + order.ref + ".png", blob);
      UI.toast(ok ? "Vos billets ont été téléchargés en PNG." : "Le PNG n’a pas pu être créé sur ce navigateur.", ok ? "success" : "error");
    } catch (error) {
      UI.toast("Le PNG n’a pas pu être créé sur ce navigateur.", "error");
    }
  }

  /* =========================================================
     Accueil
     ========================================================= */
  Views.home = {
    title: "TERANGAPASS — Billetterie concerts, soirées & festivals",
    render() {
      const events = S.getEvents().filter((e) => !S.isPast(e));
      const featuredList = events.filter((e) => e.featured).sort((a, b) => new Date(a.date) - new Date(b.date));
      const featured = featuredList[0] || nextEvents(1)[0];
      const soon = events.slice().sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
      const cities = new Set(events.map((e) => e.venue.city));
      const minPrice = events.length ? Math.min.apply(null, events.map((e) => S.eventStats(e).minPrice)) : 0;
      const catCounts = {};
      events.forEach((e) => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });

      const hero = featured ? (
        '<div class="hero-grid">' +
          '<div class="hero-copy">' +
              '<span class="hero-kicker"><span class="dot">' + UI.icon("fire", 12) + "</span> Prochain événement dans <strong class=\"cd\" data-countdown=\"" + esc(featured.date) + "\">…</strong></span>" +
            '<h1 class="hero-title"><span class="line">La nuit vous appartient.</span><span class="line gradient-text">Réservez-la.</span></h1>' +
            '<p class="hero-sub">Concerts, clubs, festivals et spectacles : trouvez votre prochaine sortie, puis suivez la validation de vos billets après le transfert.</p>' +
            '<div class="hero-actions">' +
              '<a class="btn btn-primary btn-lg" href="#/evenement/' + encodeURIComponent(featured.id) + '">Réserver dès ' + UI.money(Math.round(S.eventStats(featured).minPrice)) + " " + UI.icon("arrow", 17) + "</a>" +
              '<a class="btn btn-outline btn-lg" href="#/evenements">Explorer les événements</a>' +
            "</div>" +
            '<div class="hero-proof">' +
              '<div class="avatars" aria-hidden="true"><span>✓</span><span>✓</span><span>✓</span><span>+</span></div>' +
              '<div><div class="stars">XOF · Wave · Orange Money</div><div>Réservation suivie par référence</div></div>' +
            "</div>" +
          "</div>" +
          '<div class="hero-visual">' +
            '<div class="hero-glow"></div>' +
            '<div class="hero-poster-wrap">' +
              '<a class="hero-card" href="#/evenement/' + encodeURIComponent(featured.id) + '">' +
                '<div class="poster-art">' + UI.posterSVG(featured, { variant: "-hero" }) + "</div>" +
                '<div class="hero-card-top">' +
                  '<span class="brand-name">TERANGAPASS<span class="brand-dot">.</span></span>' +
                  '<span class="hero-card-cat">' + esc(catLabel(featured.category)) + "</span>" +
                "</div>" +
                '<div class="hero-card-overlay">' +
                  '<div class="badge badge-accent" style="margin-bottom:10px">' + esc(UI.relativeDay(featured.date)) + "</div>" +
                  '<div class="hero-card-title">' + esc(featured.title) + "</div>" +
                  '<div class="hero-card-meta">' + esc(UI.formatDate(featured.date, "medium")) + " · " + esc(UI.formatTime(featured.date)) + "<br>" + esc(featured.venue.name + " · " + featured.venue.city) + "</div>" +
                  '<div class="hero-card-price"><span>À partir de</span><strong>' + UI.money(Math.round(S.eventStats(featured).minPrice)) + "</strong></div>" +
                "</div>" +
              "</a>" +
            "</div>" +
            '<div class="floating-ticket ft-1"><span class="ft-icon">' + UI.icon("check", 17) + "</span><div><strong>E-billet après validation</strong><span>Suivi de commande en ligne</span></div></div>" +
            '<div class="floating-ticket ft-2"><span class="ft-icon">' + UI.icon("shield", 17) + "</span><div><strong>Orange Money ou Wave</strong><span>Transfert avec reçu à vérifier</span></div></div>" +
          "</div>" +
        "</div>"
      ) : emptyState("🎫", "Aucun événement pour le moment", "Les prochaines dates arrivent très bientôt.", '<a class="btn btn-primary" href="#/evenements">Voir les événements</a>');

      const catTiles = D.CATEGORIES.map((c) =>
        '<a class="cat-tile reveal" href="#/evenements?cat=' + c.id + '" style="--cat:' + c.color + '">' +
          '<span class="emoji" aria-hidden="true">' + c.emoji + "</span>" +
          "<div><strong>" + esc(c.label) + "</strong><br><span>" + (catCounts[c.id] ? catCounts[c.id] + " événement" + (catCounts[c.id] > 1 ? "s" : "") : "Bientôt") + "</span></div>" +
        "</a>"
      ).join("");

      const faqs = [
        ["Comment recevoir mes billets ?", "Après votre transfert Mobile Money, la commande reste en attente pendant la vérification. Les billets avec leur code-barres apparaissent dans « Mes billets » quand l'organisateur approuve le reçu."],
        ["Puis-je acheter pour plusieurs personnes ?", "Oui. Sélectionnez simplement la quantité souhaitée (jusqu'à 8 billets par catégorie). Chaque billet est nominatif et dispose de son propre code d'accès."],
        ["Que se passe-t-il si un événement est complet ?", "Les catégories épuisées apparaissent grisées. Vous pouvez choisir une autre catégorie ou un autre événement. Aucun prélèvement n'est effectué pour une place indisponible."],
        ["Puis-je me faire rembourser ?", "Les conditions de remboursement sont indiquées par l'organisateur pour chaque événement. Contactez-le avec votre référence de commande."]
      ];

      const marquee = events.slice(0, 8).map((e) => "<span>" + esc(e.title) + " <i>✦</i> " + esc(e.venue.city) + "</span>").join("");

      return (
        '<section class="hero">' +
          '<div class="container">' +
            hero +
            '<div class="stats-strip">' +
              '<div class="stat"><strong>' + events.length + "</strong><span>événements à venir</span></div>" +
              '<div class="stat"><strong>' + cities.size + "</strong><span>villes au Sénégal</span></div>" +
              '<div class="stat"><strong>dès ' + UI.money(Math.round(minPrice)) + "</strong><span>pour vivre la nuit</span></div>" +
              '<div class="stat"><strong>Après contrôle</strong><span>billets activés par l’organisateur</span></div>' +
            "</div>" +
            '<div class="marquee" aria-hidden="true"><div class="marquee-track">' + marquee + marquee + "</div></div>" +
          "</div>" +
        "</section>" +

        '<section class="section" id="ambiances">' +
          '<div class="container">' +
            '<div class="section-head"><div><span class="eyebrow">Explorer</span><h2 class="h2 mt-2">Choisissez votre ambiance</h2><p>Du club intimiste au festival en plein air, il y a toujours une raison de sortir.</p></div>' +
            '<a class="btn btn-ghost" href="#/evenements">Tout voir ' + UI.icon("arrow", 16) + "</a></div>" +
            '<div class="cat-grid">' + catTiles + "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section" style="padding-top:10px">' +
          '<div class="container">' +
            '<div class="section-head"><div><span class="eyebrow">À l\'affiche</span><h2 class="h2 mt-2">Les prochaines nuits</h2><p>Les dates à ne pas manquer, sélectionnées par l\'équipe TERANGAPASS.</p></div>' +
            '<a class="btn btn-ghost" href="#/evenements">Tous les événements ' + UI.icon("arrow", 16) + "</a></div>" +
            '<div class="events-grid">' + soon.map(eventCard).join("") + "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section-sm">' +
          '<div class="container">' +
        '<section class="section">' +
          '<div class="container">' +
            '<div class="section-head"><div><span class="eyebrow">Simple &amp; rapide</span><h2 class="h2 mt-2">Votre soirée en 3 étapes</h2></div></div>' +
            '<div class="steps-grid">' +
              '<div class="step-card reveal"><div class="step-num">01</div><h3>Choisissez un événement</h3><p>Consultez les dates, lieux, tarifs et catégories publiés par l’organisateur.</p></div>' +
              '<div class="step-card reveal"><div class="step-num">02</div><h3>Envoyez le paiement</h3><p>Suivez les instructions Mobile Money et joignez votre reçu. Le stock est revalidé lors de la commande.</p></div>' +
              '<div class="step-card reveal"><div class="step-num">03</div><h3>Présentez votre billet</h3><p>Après vérification manuelle, retrouvez vos billets avec code unique dans le suivi de commande.</p></div>' +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section-sm">' +
          '<div class="container">' +
            '<div class="section-head"><div><span class="eyebrow">Contrôle</span><h2 class="h2 mt-2">Un parcours traçable</h2><p>Stocks, commandes, preuves et validations sont conservés sur le serveur TERANGAPASS.</p></div><a class="btn btn-outline" href="#/aide">Comprendre le paiement ' + UI.icon("arrow", 16) + "</a></div>" +
          "</div>" +
        "</section>" +

        '<section class="section">' +
          '<div class="container">' +
            '<div class="newsletter reveal">' +
              '<div><span class="eyebrow">À venir</span><h2 class="h2 mt-2">Explorez les prochaines dates</h2>' +
              '<p class="muted mt-1">Les nouveaux événements sont publiés par les organisateurs depuis leur espace sécurisé.</p></div>' +
              '<a class="btn btn-primary" href="#/evenements">Parcourir les événements ' + UI.icon("arrow", 16) + "</a>" +
            "</div>" +
          "</div>" +
        "</section>" +

        '<section class="section" style="padding-top:0">' +
          '<div class="container">' +
            '<div class="section-head"><div><span class="eyebrow">Questions fréquentes</span><h2 class="h2 mt-2">Tout ce qu\'il faut savoir</h2></div><a class="btn btn-ghost" href="#/aide">Centre d\'aide ' + UI.icon("arrow", 16) + "</a></div>" +
            '<div class="faq">' + faqs.map((f) => "<details><summary>" + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>").join("") + "</div>" +
          "</div>" +
        "</section>"
      );
    },
    mount(root) {
      UI.scrollReveal(root);
      const form = root.querySelector("#newsletterForm");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const email = form.querySelector("input").value.trim();
          if (!UI.validEmail(email)) {
            UI.toast("Merci de saisir une adresse e-mail valide.", "error");
            return;
          }
          UI.toast("Inscription confirmée ! À très vite dans votre boîte mail.", "success");
          form.reset();
        });
      }
      const copyBtn = root.querySelector("[data-copy]");
      if (copyBtn) {
        copyBtn.addEventListener("click", () => {
          UI.copyText(copyBtn.getAttribute("data-copy")).then((ok) => {
            UI.toast(ok ? "Code promo copié : TERANGA10" : "Copie impossible — code : TERANGA10", ok ? "success" : "info");
          });
        });
      }
    }
  };

  /* =========================================================
     Liste des événements
     ========================================================= */
  Views.events = {
    title: "Tous les événements — TERANGAPASS",
    render(params, query) {
      const filters = {
        q: (query && query.get("q")) || "",
        cat: (query && query.get("cat")) || "all",
        city: (query && query.get("city")) || "all",
        price: (query && query.get("price")) || "all",
        sort: (query && query.get("sort")) || "date"
      };
      const cities = Array.from(new Set(S.getEvents().map((e) => e.venue.city))).sort();
      return (
        '<section class="page-head">' +
          '<div class="container">' +
            '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><span>Événements</span></div>' +
            '<h1 class="h1">Trouvez votre prochaine nuit</h1>' +
            '<p class="lead mt-1">' + S.getEvents().filter((e) => !S.isPast(e)).length + " événements à venir dans " + cities.length + " villes. Filtrez, comparez, réservez.</p>" +
          "</div>" +
        "</section>" +
        '<section style="padding-bottom:70px">' +
          '<div class="container">' +
            '<form class="filters" id="filterForm" role="search" onsubmit="return false">' +
              '<div class="search-field">' + UI.icon("search", 17) +
                '<input type="search" id="searchInput" placeholder="Artiste, événement, salle…" aria-label="Rechercher un événement" value="' + esc(filters.q) + '">' +
              "</div>" +
              '<div class="select-field"><select id="citySelect" aria-label="Filtrer par ville">' +
                '<option value="all">Toutes les villes</option>' +
                cities.map((c) => '<option value="' + esc(c) + '"' + (filters.city === c ? " selected" : "") + ">" + esc(c) + "</option>").join("") +
              "</select></div>" +
              '<div class="select-field"><select id="priceSelect" aria-label="Filtrer par budget">' +
                '<option value="all"' + (filters.price === "all" ? " selected" : "") + ">Tous les budgets</option>" +
                '<option value="0-20000"' + (filters.price === "0-20000" ? " selected" : "") + ">Moins de 20 000 FCFA</option>" +
                '<option value="20000-40000"' + (filters.price === "20000-40000" ? " selected" : "") + ">20 000 – 40 000 FCFA</option>" +
                '<option value="40000+"' + (filters.price === "40000+" ? " selected" : "") + ">Plus de 40 000 FCFA</option>" +
              "</select></div>" +
              '<div class="select-field"><select id="sortSelect" aria-label="Trier les résultats">' +
                '<option value="date"' + (filters.sort === "date" ? " selected" : "") + ">Date (proche)</option>" +
                '<option value="price-asc"' + (filters.sort === "price-asc" ? " selected" : "") + ">Prix croissant</option>" +
                '<option value="price-desc"' + (filters.sort === "price-desc" ? " selected" : "") + ">Prix décroissant</option>" +
                '<option value="title"' + (filters.sort === "title" ? " selected" : "") + ">Alphabétique</option>" +
              "</select></div>" +
            "</form>" +
            '<div class="chips-row" id="catChips">' +
              '<button class="chip' + (filters.cat === "all" ? " is-active" : "") + '" type="button" data-cat="all">Tout</button>' +
              D.CATEGORIES.map((c) =>
                '<button class="chip' + (filters.cat === c.id ? " is-active" : "") + '" type="button" data-cat="' + c.id + '"><span class="emoji" aria-hidden="true">' + c.emoji + "</span>" + esc(c.label) + "</button>"
              ).join("") +
            "</div>" +
            '<div class="results-head"><p class="results-count" id="resultsCount"></p>' +
              '<button class="btn btn-ghost btn-sm" type="button" id="resetFilters">Réinitialiser les filtres</button>' +
            "</div>" +
            '<div class="events-grid" id="eventsResults"></div>' +
          "</div>" +
        "</section>"
      );
    },
    mount(root, params, query) {
      const state = {
        q: (query && query.get("q")) || "",
        cat: (query && query.get("cat")) || "all",
        city: (query && query.get("city")) || "all",
        price: (query && query.get("price")) || "all",
        sort: (query && query.get("sort")) || "date"
      };
      const search = root.querySelector("#searchInput");
      const citySel = root.querySelector("#citySelect");
      const priceSel = root.querySelector("#priceSelect");
      const sortSel = root.querySelector("#sortSelect");
      const results = root.querySelector("#eventsResults");
      const countEl = root.querySelector("#resultsCount");

      function matches(event) {
        const st = S.eventStats(event);
        if (st.past) return false;
        if (state.cat !== "all" && event.category !== state.cat) return false;
        if (state.city !== "all" && event.venue.city !== state.city) return false;
        if (state.price !== "all") {
          const p = st.minPrice;
          if (state.price === "0-20000" && p >= 20000) return false;
          if (state.price === "20000-40000" && (p < 20000 || p > 40000)) return false;
          if (state.price === "40000+" && p <= 40000) return false;
        }
        if (state.q) {
          const hay = normalize([event.title, event.venue.name, event.venue.city, (event.lineup || []).join(" "), (event.tags || []).join(" "), catLabel(event.category)].join(" "));
          const terms = normalize(state.q).split(/\s+/).filter(Boolean);
          if (!terms.every((t) => hay.indexOf(t) >= 0)) return false;
        }
        return true;
      }

      function update() {
        const all = S.getEvents().filter(matches);
        if (state.sort === "price-asc") all.sort((a, b) => S.eventStats(a).minPrice - S.eventStats(b).minPrice);
        else if (state.sort === "price-desc") all.sort((a, b) => S.eventStats(b).minPrice - S.eventStats(a).minPrice);
        else if (state.sort === "title") all.sort((a, b) => a.title.localeCompare(b.title, "fr"));
        else all.sort((a, b) => new Date(a.date) - new Date(b.date));

        countEl.innerHTML = "<strong>" + all.length + "</strong> événement" + (all.length > 1 ? "s" : "") + " trouvé" + (all.length > 1 ? "s" : "");
        results.innerHTML = all.length
          ? all.map(eventCard).join("")
          : emptyState("🔍", "Aucun événement ne correspond", "Essayez de modifier vos filtres ou explorez toutes les dates à venir.",
              '<button class="btn btn-primary" type="button" id="emptyReset">Réinitialiser les filtres</button>');
        UI.scrollReveal(results);
        const emptyReset = results.querySelector("#emptyReset");
        if (emptyReset) emptyReset.addEventListener("click", reset);
      }

      function reset() {
        state.q = ""; state.cat = "all"; state.city = "all"; state.price = "all"; state.sort = "date";
        search.value = "";
        citySel.value = "all";
        priceSel.value = "all";
        sortSel.value = "date";
        Array.prototype.forEach.call(root.querySelectorAll("[data-cat]"), (btn) => {
          btn.classList.toggle("is-active", btn.getAttribute("data-cat") === "all");
        });
        update();
      }

      search.addEventListener("input", UI.debounce(() => { state.q = search.value; update(); }, 160));
      citySel.addEventListener("change", () => { state.city = citySel.value; update(); });
      priceSel.addEventListener("change", () => { state.price = priceSel.value; update(); });
      sortSel.addEventListener("change", () => { state.sort = sortSel.value; update(); });
      root.querySelector("#catChips").addEventListener("click", (e) => {
        const btn = e.target.closest("[data-cat]");
        if (!btn) return;
        state.cat = btn.getAttribute("data-cat");
        Array.prototype.forEach.call(root.querySelectorAll("[data-cat]"), (b) => b.classList.toggle("is-active", b === btn));
        update();
      });
      root.querySelector("#resetFilters").addEventListener("click", reset);

      update();
    }
  };

  /* =========================================================
     Détail événement
     ========================================================= */
  Views.event = {
    title: "Événement — TERANGAPASS",
    render(params) {
      const event = S.getEvent(params.id);
      if (!event) { this._event = null; return Views.notFound.render(); }
      this._event = event;
      const st = S.eventStats(event);
      const cat = S.category(event.category);
      const seller = UI.formatDate(event.date, "long");
      const related = S.getEvents()
        .filter((e) => e.id !== event.id && !S.isPast(e))
        .sort((a, b) => (a.category === event.category ? -1 : 0) - (b.category === event.category ? -1 : 0) || new Date(a.date) - new Date(b.date))
        .slice(0, 3);

      const tiers = event.tiers.map((tier) => {
        const ts = S.tierStats(event, tier);
        const out = ts.available <= 0 || st.past;
        return (
          '<div class="tier' + (out ? " is-out" : "") + '" data-tier-row="' + esc(tier.id) + '">' +
            "<div>" +
              '<div class="tier-name">' + esc(tier.name) +
                (out ? ' <span class="badge badge-red">Épuisé</span>' : ts.available <= 12 ? ' <span class="badge badge-amber">Plus que ' + ts.available + "</span>" : "") +
              "</div>" +
              (tier.perks ? '<div class="tier-perks">' + esc(tier.perks) + "</div>" : "") +
              '<div class="tier-perks">' + (out ? "Indisponible" : ts.available + " place" + (ts.available > 1 ? "s" : "") + " restante" + (ts.available > 1 ? "s" : "")) + "</div>" +
            "</div>" +
            '<div class="tier-right">' +
              '<div class="tier-price">' + UI.money(tier.price) + "<span>par pers.</span></div>" +
              '<div class="qty" aria-label="Quantité pour ' + esc(tier.name) + '">' +
                '<button type="button" data-tier-minus="' + esc(tier.id) + '" aria-label="Retirer un billet ' + esc(tier.name) + '"' + (out ? " disabled" : "") + ">" + UI.icon("minus", 14) + "</button>" +
                '<input type="text" inputmode="numeric" readonly value="0" data-tier-qty="' + esc(tier.id) + '" aria-label="Nombre de billets ' + esc(tier.name) + '">' +
                '<button type="button" data-tier-plus="' + esc(tier.id) + '" aria-label="Ajouter un billet ' + esc(tier.name) + '"' + (out ? " disabled" : "") + ">" + UI.icon("plus", 14) + "</button>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      }).join("");

      const tags = (event.tags || []).map((t) => '<span class="badge">' + esc(t) + "</span>").join(" ");
      const lineup = (event.lineup || []).map((a) => "<span>" + esc(a) + "</span>").join("");

      return (
        '<section class="event-detail">' +
          '<div class="container">' +
            '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><a href="#/evenements">Événements</a><span>/</span><span>' + esc(event.title) + "</span></div>" +
            '<div class="event-hero-grid">' +
              '<div class="event-poster-main reveal">' +
                '<div class="poster-art">' + UI.posterSVG(event, { variant: "-detail" }) + "</div>" +
                '<div class="event-poster-top"><span class="badge badge-accent">' + esc(cat.emoji + " " + cat.label) + "</span>" +
                  (st.status === "low" ? '<span class="badge badge-amber">Dernières places</span>' : st.status === "out" ? '<span class="badge badge-red">Complet</span>' : "") +
                "</div>" +
                '<div class="poster-bottom"><span class="brand-name">TERANGAPASS<span class="brand-dot">.</span></span><span class="tiny">' + esc(event.organizer) + "</span></div>" +
              "</div>" +
              '<div class="event-info reveal">' +
                '<div class="row"><span class="badge badge-muted">' + esc(UI.relativeDay(event.date)) + '</span><span class="badge badge-muted">' + esc(event.age) + '</span><span class="badge badge-muted">' + esc(event.duration) + "</span></div>" +
                '<h1 class="h1 event-detail-title">' + esc(event.title) + "</h1>" +
                '<p class="lead">' + esc(event.description && event.description[0] ? event.description[0] : "") + "</p>" +
                '<div class="event-meta-grid">' +
                  '<div class="meta-tile"><span class="ic">' + UI.icon("calendar", 17) + "</span><div><strong>" + esc(seller) + "</strong><span>Ouverture des portes " + esc(UI.formatTime(new Date(new Date(event.date).getTime() - (event.doorsMinutes || 45) * 60000))) + "</span></div></div>" +
                  '<div class="meta-tile"><span class="ic">' + UI.icon("pin", 17) + "</span><div><strong>" + esc(event.venue.name) + "</strong><span>" + esc(event.venue.city + " · " + event.venue.address) + "</span></div></div>" +
                  '<div class="meta-tile"><span class="ic">' + UI.icon("clock", 17) + "</span><div><strong>" + esc(UI.formatTime(event.date)) + " — " + esc(event.duration) + "</strong><span>Durée indicative</span></div></div>" +
                  '<div class="meta-tile"><span class="ic">' + UI.icon("ticket", 17) + "</span><div><strong>Dès " + UI.money(Math.round(st.minPrice)) + "</strong><span>" + st.available + " place" + (st.available > 1 ? "s" : "") + " disponible" + (st.available > 1 ? "s" : "") + "</span></div></div>" +
                "</div>" +
                '<div class="row">' + tags + "</div>" +
                '<div class="row mt-3"><button class="btn btn-outline btn-sm" type="button" id="shareEvent">' + UI.icon("share", 15) + " Partager</button>" +
                  '<a class="btn btn-ghost btn-sm" href="#/evenements?city=' + encodeURIComponent(event.venue.city) + '">' + UI.icon("map", 15) + " Autres événements à " + esc(event.venue.city) + "</a></div>" +
              "</div>" +
            "</div>" +

            '<div class="detail-layout">' +
              '<div>' +
                '<div class="detail-block reveal"><h2 class="h3">À propos de l\'événement</h2><div class="event-description">' +
                  (event.description || []).map((p) => "<p>" + esc(p) + "</p>").join("") +
                "</div></div>" +
                (lineup ? '<div class="detail-block reveal"><h2 class="h3">Line-up &amp; invités</h2><div class="lineup">' + lineup + "</div></div>" : "") +
                '<div class="detail-block reveal"><h2 class="h3">Le lieu</h2>' +
                  '<div class="venue-card"><div class="venue-map"><span class="pin">' + UI.icon("pin", 34) + '</span><span class="map-label">' + esc(event.venue.name) + " · " + esc(event.venue.city) + "</span></div>" +
                  '<div class="venue-info"><strong>' + esc(event.venue.name) + "</strong><p>" + esc(event.venue.address) + "</p>" +
                  '<p class="mt-1">' + UI.icon("info", 13) + " Plan d'accès et informations envoyés avec votre e-billet.</p></div></div>" +
                "</div>" +
                '<div class="detail-block reveal"><h2 class="h3">Informations pratiques</h2><ul class="detail-list">' +
                  "<li>Ouverture des portes à " + esc(UI.formatTime(new Date(new Date(event.date).getTime() - (event.doorsMinutes || 45) * 60000))) + " — arrivez en avance pour éviter la file.</li>" +
                  "<li>Événement " + esc(event.age.toLowerCase()) + ". Une pièce d'identité peut être demandée à l'entrée.</li>" +
                  "<li>Billets nominatifs et non revendables en dehors des canaux officiels TERANGAPASS.</li>" +
                  "<li>Remboursement possible jusqu'à 7 jours avant l'événement (hors frais de service).</li>" +
                  "<li>Accessibilité PMR : contactez-nous au moins 72h avant l'événement.</li>" +
                "</ul></div>" +
              "</div>" +

              '<aside class="detail-sticky">' +
                '<div class="booking-card" id="bookingCard">' +
                  '<div class="between"><div><h2 class="h3">Réserver</h2><p class="booking-sub">Choisissez vos catégories de billets</p></div>' +
                    '<span class="badge badge-accent">' + esc(UI.relativeDay(event.date)) + "</span></div>" +
                  '<div class="tiers" id="tiersBox">' + tiers + "</div>" +
                  '<div id="bookingSummary" class="mt-2"></div>' +
                "</div>" +
              "</aside>" +
            "</div>" +

            (related.length ? '<div class="section" style="padding-bottom:0"><div class="section-head"><div><span class="eyebrow">Dans la même vibe</span><h2 class="h2 mt-2">Vous aimerez aussi</h2></div><a class="btn btn-ghost" href="#/evenements">Tout voir ' + UI.icon("arrow", 16) + "</a></div>" +
              '<div class="events-grid">' + related.map(eventCard).join("") + "</div></div>" : "") +
          "</div>" +
        "</section>"
      );
    },
    mount(root, params) {
      const event = S.getEvent(params.id) || this._event;
      if (!event) return;
      const selected = {};
      const tiersBox = root.querySelector("#tiersBox");
      const summary = root.querySelector("#bookingSummary");
      UI.scrollReveal(root);

      function maxFor(tier) {
        const available = S.tierStats(event, tier).available;
        const inCart = S.cartQty(event.id, tier.id);
        return Math.max(0, Math.min(8, available - inCart));
      }

      function selectedLines() {
        return Object.keys(selected).map((id) => {
          const tier = S.getTier(event, id);
          return tier && selected[id] > 0 ? { tier, qty: selected[id] } : null;
        }).filter(Boolean);
      }

      function renderSummary() {
        const lines = selectedLines();
        const count = lines.reduce((s, l) => s + l.qty, 0);
        const subtotal = lines.reduce((s, l) => s + l.tier.price * l.qty, 0);
        const fees = S.getServiceFee();

        if (!lines.length) {
          summary.innerHTML =
            '<p class="muted small" style="margin-top:14px">Sélectionnez au moins un billet pour continuer.</p>' +
            '<div class="booking-total"><span class="muted">Total</span><strong>' + UI.money(0) + "</strong></div>" +
            '<button class="btn btn-primary btn-block btn-lg" type="button" disabled>Choisir mes places</button>' +
            '<div class="booking-note">' + UI.icon("shield", 14) + "<span>Transfert Mobile Money et contrôle manuel · frais de service " + UI.money(fees) + " / commande</span></div>";
          return;
        }

        summary.innerHTML =
          lines.map((l) =>
            '<div class="booking-line"><div><strong>' + esc(l.tier.name) + "</strong><div class=\"muted\">" + l.qty + " × " + UI.money(l.tier.price) + "</div></div><strong>" + UI.money(l.tier.price * l.qty) + "</strong></div>"
          ).join("") +
          '<div class="booking-line"><span class="muted">Frais de service (' + count + ")</span><span>" + UI.money(fees) + "</span></div>" +
          '<div class="booking-total"><span>Total</span><strong>' + UI.money(subtotal + fees) + "</strong></div>" +
          '<button class="btn btn-primary btn-block btn-lg" type="button" id="addToCartBtn">Ajouter au panier ' + UI.icon("cart", 17) + "</button>" +
          '<button class="btn btn-light btn-block mt-1" type="button" id="buyNowBtn">Acheter maintenant</button>' +
          '<div class="booking-note">' + UI.icon("shield", 14) + "<span>Transfert Orange Money ou Wave · billet après validation manuelle</span></div>";
      }

      function updateTierVisuals() {
        Array.prototype.forEach.call(tiersBox.querySelectorAll("[data-tier-row]"), (row) => {
          const id = row.getAttribute("data-tier-row");
          const qty = selected[id] || 0;
          row.classList.toggle("is-selected", qty > 0);
          const input = row.querySelector("[data-tier-qty]");
          if (input) input.value = qty;
          const minus = row.querySelector("[data-tier-minus]");
          const plus = row.querySelector("[data-tier-plus]");
          const tier = S.getTier(event, id);
          if (minus) minus.disabled = qty <= 0;
          if (plus && tier) plus.disabled = qty >= maxFor(tier);
        });
      }

      function refresh(selectors) {
        updateTierVisuals();
        renderSummary();
        if (selectors) {
          selectors.forEach((sel) => {
            const el = root.querySelector(sel);
            if (el) { try { el.focus(); } catch (e) { /* ignore */ } }
          });
        }
      }

      tiersBox.addEventListener("click", (e) => {
        const plus = e.target.closest("[data-tier-plus]");
        const minus = e.target.closest("[data-tier-minus]");
        if (!plus && !minus) return;
        const id = plus ? plus.getAttribute("data-tier-plus") : minus.getAttribute("data-tier-minus");
        const tier = S.getTier(event, id);
        if (!tier) return;
        const current = selected[id] || 0;
        if (plus) {
          const max = maxFor(tier);
          if (current >= max) {
            UI.toast(max === 0 ? "Plus de places disponibles pour cette catégorie." : "Limite de " + max + " billets atteinte.", "info");
            return;
          }
          selected[id] = current + 1;
        } else {
          selected[id] = Math.max(0, current - 1);
          if (selected[id] === 0) delete selected[id];
        }
        refresh([plus ? '[data-tier-plus="' + id + '"]' : '[data-tier-minus="' + id + '"]']);
      });

      root.addEventListener("click", (e) => {
        const addBtn = e.target.closest("#addToCartBtn");
        const buyBtn = e.target.closest("#buyNowBtn");
        if (!addBtn && !buyBtn) return;
        const lines = selectedLines();
        if (!lines.length) return;
        let added = 0;
        let message = "";
        for (const l of lines) {
          const res = S.addToCart(event.id, l.tier.id, l.qty);
          if (res.ok) added += res.added;
          else message = res.message;
          if (res.capped) message = res.message;
        }
        if (!added) {
          UI.toast(message || "Impossible d'ajouter ces billets au panier.", "error");
          return;
        }
        Object.keys(selected).forEach((k) => delete selected[k]);
        refresh();
        if (buyBtn) {
          window.location.hash = "#/paiement";
        } else {
          UI.toast(message || "Billets ajoutés au panier.", message && message.indexOf("Seulement") === 0 ? "info" : "success");
          const cartCount = document.querySelector("[data-cart-count]");
          if (cartCount) cartCount.textContent = S.cartCount();
        }
      });

      const share = root.querySelector("#shareEvent");
      if (share) {
        share.addEventListener("click", () => {
          const url = window.location.href;
          const data = { title: event.title, text: event.title + " — " + UI.formatDate(event.date, "long"), url: url };
          if (navigator.share) {
            navigator.share(data).catch(() => { /* annulé */ });
          } else {
            UI.copyText(url).then((ok) => UI.toast(ok ? "Lien copié dans le presse-papiers." : "Partagez ce lien : " + url, "success"));
          }
        });
      }

      refresh();
    }
  };

  /* =========================================================
     Panier
     ========================================================= */
  Views.cart = {
    title: "Mon panier — TERANGAPASS",
    render() {
      const cart = S.cartLines();
      if (!cart.length) {
        return (
          '<section class="section"><div class="container">' +
            '<h1 class="h1 mb-3">Mon panier</h1>' +
            emptyState("🛒", "Votre panier est vide", "Il est temps de trouver votre prochaine nuit. Des dizaines d'événements vous attendent.",
              '<a class="btn btn-primary" href="#/evenements">Découvrir les événements ' + UI.icon("arrow", 16) + "</a>") +
          "</div></section>"
        );
      }
      const t = S.totals();
      return (
        '<section class="page-head"><div class="container">' +
          '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><span>Panier</span></div>' +
          '<h1 class="h1">Mon panier</h1>' +
          '<p class="lead mt-1">' + UI.plural(t.count, "billet") + " · vérifiez votre sélection avant de payer.</p>" +
        "</div></section>" +
        '<section style="padding-bottom:70px"><div class="container">' +
          '<div class="cart-layout">' +
            '<div>' +
              '<div class="cart-lines" id="cartLines">' + cart.map(cartLine).join("") + "</div>" +
              '<div class="row mt-3"><a class="btn btn-ghost btn-sm" href="#/evenements">' + UI.icon("arrowLeft", 15) + " Continuer mes achats</a>" +
                '<button class="btn btn-ghost btn-sm" type="button" id="clearCart">Vider le panier</button></div>' +
            "</div>" +
            '<aside class="summary-card">' +
              '<h2 class="h3">Récapitulatif</h2>' +
              '<p class="muted small">' + UI.plural(t.count, "billet") + " · frais de service inclus</p>" +
              '<div class="mt-2" id="promoZone">' + promoZone(t) + "</div>" +
              '<div id="summaryTotals">' + summaryTotals(t) + "</div>" +
              '<a class="btn btn-primary btn-block btn-lg mt-2" href="#/paiement">Passer commande ' + UI.icon("arrow", 17) + "</a>" +
              '<div class="secure-note">' + UI.icon("lock", 13) + " Paiement manuel — aucun code secret saisi sur le site</div>" +
              '<div class="cart-note">' + UI.icon("info", 14) + "<span>Les billets sont nominatifs et seront téléchargeables après approbation du reçu.</span></div>" +
            "</aside>" +
          "</div>" +
        "</div></section>"
      );
    },
    mount(root) {
      function refresh() {
        const t = S.totals();
        const linesEl = root.querySelector("#cartLines");
        if (!linesEl) { window.TERANGAPASS_APP.rerender({ scroll: false }); return; }
        const cart = S.cartLines();
        if (!cart.length) { window.TERANGAPASS_APP.rerender({ scroll: false }); return; }
        linesEl.innerHTML = cart.map(cartLine).join("");
        root.querySelector("#promoZone").innerHTML = promoZone(t);
        root.querySelector("#summaryTotals").innerHTML = summaryTotals(t);
        bindPromo();
      }

      function bindPromo() {
        const form = root.querySelector("#promoForm");
        if (!form) return;
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const input = form.querySelector("input");
          const res = S.applyPromo(input.value);
          UI.toast(res.message, res.ok ? "success" : "error");
          if (res.ok) refresh();
        });
        const remove = root.querySelector("#removePromo");
        if (remove) remove.addEventListener("click", () => { S.clearPromo(); refresh(); UI.toast("Code promo retiré.", "info"); });
      }

      bindPromo();

      root.addEventListener("click", (e) => {
        const inc = e.target.closest("[data-cart-plus]");
        const dec = e.target.closest("[data-cart-minus]");
        const rem = e.target.closest("[data-cart-remove]");
        if (!inc && !dec && !rem) return;
        const raw = (inc || dec || rem).getAttribute("data-cart-plus") || (dec && dec.getAttribute("data-cart-minus")) || (rem && rem.getAttribute("data-cart-remove"));
        const parts = raw.split("::");
        if (parts.length !== 2) return;
        const eventId = parts[0];
        const tierId = parts[1];
        if (inc) S.setCartQty(eventId, tierId, S.cartQty(eventId, tierId) + 1);
        else if (dec) S.setCartQty(eventId, tierId, S.cartQty(eventId, tierId) - 1);
        else S.removeFromCart(eventId, tierId);
        refresh();
        const focusSel = inc ? '[data-cart-plus="' + raw + '"]' : dec ? '[data-cart-minus="' + raw + '"]' : null;
        if (focusSel) {
          const el = root.querySelector(focusSel);
          if (el) { try { el.focus(); } catch (err) { /* ignore */ } }
        }
        if (rem) UI.toast("Billet retiré du panier.", "info");
      });

      const clear = root.querySelector("#clearCart");
      if (clear) {
        clear.addEventListener("click", () => {
          UI.confirmDialog({
            title: "Vider le panier ?",
            message: "Tous les billets sélectionnés seront retirés. Cette action est immédiate.",
            confirmLabel: "Vider le panier",
            danger: true
          }).then((ok) => {
            if (!ok) return;
            S.clearCart();
            window.TERANGAPASS_APP.rerender({ scroll: false });
            UI.toast("Panier vidé.", "info");
          });
        });
      }
    }
  };

  function cartLine(line) {
    const av = S.tierStats(line.event, line.tier).available;
    const key = line.eventId + "::" + line.tierId;
    return (
      '<article class="cart-line">' +
        '<div class="cart-thumb">' + UI.posterSVG(line.event) + "</div>" +
        "<div>" +
          '<div class="cart-line-title">' + esc(line.event.title) + "</div>" +
          '<div class="cart-line-meta">' + esc(UI.formatDate(line.event.date, "short")) + " · " + esc(UI.formatTime(line.event.date)) + " · " + esc(line.event.venue.city) + "</div>" +
          '<div class="cart-line-tier">' + esc(line.tier.name) + " · " + esc(UI.money(line.tier.price)) + " / billet</div>" +
          '<div class="qty mt-1">' +
            '<button type="button" data-cart-minus="' + key + '" aria-label="Réduire la quantité"' + (line.qty <= 1 ? " disabled" : "") + ">" + UI.icon("minus", 13) + "</button>" +
            '<input type="text" readonly value="' + line.qty + '" aria-label="Quantité">' +
            '<button type="button" data-cart-plus="' + key + '" aria-label="Augmenter la quantité"' + (line.qty >= Math.min(8, av) ? " disabled" : "") + ">" + UI.icon("plus", 13) + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="cart-line-right">' +
          '<div class="cart-line-price">' + UI.money(line.lineTotal) + "</div>" +
          '<button class="link-danger" type="button" data-cart-remove="' + key + '">' + UI.icon("trash", 13) + " Retirer</button>" +
        "</div>" +
      "</article>"
    );
  }

  function promoZone(t) {
    if (!D.PROMOS || !D.PROMOS.length) return "";
    if (t.promo) {
      return (
        '<div class="promo-applied"><span>Code <strong>' + esc(t.promo.code) + "</strong> appliqué</span>" +
          '<button class="link-danger" type="button" id="removePromo">Retirer</button></div>'
      );
    }
    return (
      '<form class="promo-form" id="promoForm">' +
        '<input type="text" name="promo" placeholder="Code promo" aria-label="Code promo" autocomplete="off">' +
        '<button class="btn btn-ghost btn-sm" type="submit">Appliquer</button>' +
      "</form>" +
      '<p class="tiny muted" style="margin-bottom:10px">Essayez <strong>TERANGA10</strong>, <strong>NEON5</strong> ou <strong>FIDELE15</strong>.</p>'
    );
  }

  function summaryTotals(t) {
    return (
      '<div class="summary-row"><span>Sous-total</span><strong>' + UI.money(t.subtotal) + "</strong></div>" +
      '<div class="summary-row"><span>Frais de service (' + t.count + ")</span><strong>" + UI.money(t.fees) + "</strong></div>" +
      (t.discount > 0 ? '<div class="summary-row discount"><span>Remise ' + esc(t.promo.code) + "</span><strong>−" + UI.money(t.discount) + "</strong></div>" : "") +
      '<div class="summary-total"><span>Total</span><strong>' + UI.money(t.total) + "</strong></div>" +
      (t.discount > 0 ? '<p class="tiny" style="color:var(--green);text-align:right;margin-top:4px">Vous économisez ' + UI.money(t.discount) + "</p>" : "")
    );
  }

  /* =========================================================
     Paiement
     ========================================================= */
  Views.checkout = {
    title: "Paiement Mobile Money — TERANGAPASS",
    render() {
      const lines = S.cartLines();
      if (!lines.length) {
        return '<section class="section"><div class="container">' + emptyState("🛒", "Votre panier est vide", "Ajoutez des billets avant de passer au paiement.",
          '<a class="btn btn-primary" href="#/evenements">Voir les événements</a>') + "</div></section>";
      }
      const t = S.totals();
      const accounts = S.getPaymentAccounts();
      const initialMethod = accounts.orangeMoney ? "orange_money" : accounts.wave ? "wave" : "orange_money";
      const last = S.localOrders()[0];
      const name = last ? last.name : "";
      const email = last ? last.email : "";
      const phone = last ? last.phone : "";

      return (
        '<section class="checkout-wrap"><div class="container">' +
          '<div class="breadcrumb"><a href="#/panier">Panier</a><span>/</span><span>Paiement</span></div>' +
          '<div class="steps" aria-label="Étapes de commande">' +
            '<span class="step done"><i>✓</i> Panier</span><span class="sep"></span>' +
            '<span class="step current"><i>2</i> Coordonnées &amp; paiement</span><span class="sep"></span>' +
            '<span class="step"><i>3</i> Confirmation</span>' +
          "</div>" +
          '<h1 class="h1 mb-3">Finaliser ma commande</h1>' +
          '<div class="checkout-grid">' +
            '<form class="checkout-form" id="checkoutForm" novalidate>' +
              '<div class="form-card">' +
                '<div class="form-card-head"><h2 class="h3">Vos coordonnées</h2><span class="badge badge-muted">Étape 1/2</span></div>' +
                '<div class="form-grid">' +
                  field("name", "Nom complet", "text", name, "Prénom et nom", true, "col-2") +
                  field("email", "Adresse e-mail", "email", email, "vous@email.com", true, "col-2") +
                  field("phone", "Téléphone de contact", "tel", phone, "+221 77 123 45 67", false, "col-2") +
                "</div>" +
                '<p class="tiny muted mt-1">Le statut de la commande sera consultable ici et dans « Mes billets ».</p>' +
              "</div>" +

              '<div class="form-card">' +
                '<div class="form-card-head"><h2 class="h3">Paiement manuel Mobile Money</h2><span class="badge badge-amber">Validation par l’organisateur</span></div>' +
                '<p class="small muted mb-3">Réservez d’abord vos places. Le serveur bloquera le stock pendant 20 minutes et affichera ensuite les instructions de transfert. Aucun code secret ou OTP ne vous sera demandé.</p>' +
                '<div class="payment-tabs">' +
                  '<label class="payment-tab ' + (initialMethod === "orange_money" ? "is-active" : "") + '" data-method="orange_money">' +
                    '<input type="radio" name="paymentMethod" value="orange_money"' + (initialMethod === "orange_money" ? " checked" : "") + '>' +
                    '<div class="payment-tab-badge om-badge"><span class="om-logo-text">OM</span></div>' +
                    '<div class="payment-tab-details">' +
                      '<strong>Orange Money</strong>' +
                      '<span>' + (accounts.orangeMoney ? "Transfert manuel" : "Compte à configurer") + '</span>' +
                    '</div>' +
                    '<div class="tab-indicator"></div>' +
                  '</label>' +
                  '<label class="payment-tab ' + (initialMethod === "wave" ? "is-active" : "") + '" data-method="wave">' +
                    '<input type="radio" name="paymentMethod" value="wave"' + (initialMethod === "wave" ? " checked" : "") + '>' +
                    '<div class="payment-tab-badge wave-badge"><span class="wave-logo-text">Wave</span></div>' +
                    '<div class="payment-tab-details">' +
                      '<strong>Wave</strong>' +
                      '<span>' + (accounts.wave ? "Transfert manuel" : "Compte à configurer") + '</span>' +
                    '</div>' +
                    '<div class="tab-indicator"></div>' +
                  '</label>' +
                '</div>' +
                (!accounts.orangeMoney && !accounts.wave
                  ? '<div class="info-band mb-2">' + UI.icon("alert", 16) + '<div><strong>Aucun compte de réception n’est configuré.</strong> L’administrateur doit l’ajouter dans Espace pro → Paiements avant qu’un transfert puisse être soumis.</div></div>'
                  : "") +

                '<div class="payment-panel ' + (initialMethod === "orange_money" ? "is-active" : "") + '" id="omPanel" style="display:' + (initialMethod === "orange_money" ? "block" : "none") + '">' +
                  '<div class="mobile-money-box om-box">' +
                    '<div class="mm-box-head">' +
                      '<div class="mm-brand-pill om-pill"><span class="dot"></span> Orange Money</div>' +
                      '<span class="tiny muted">Transfert manuel</span>' +
                    '</div>' +
                    '<div class="payment-recipient mt-2"><span>Compte destinataire</span><strong>Affiché après réservation</strong><span>Montant</span><strong>' + UI.money(t.total) + '</strong></div>' +
                    '<div class="field mt-3">' +
                      '<label for="omPhone"><strong>Votre numéro Orange Money <span class="req">*</span></strong></label>' +
                      '<div class="phone-input-wrap">' +
                        '<span class="phone-prefix">📱</span>' +
                        '<input class="input" id="omPhone" name="omPhone" type="tel" inputmode="tel" placeholder="Ex. 77 123 45 67 ou 07 12 34 56" value="' + esc(phone) + '">' +
                      '</div>' +
                      '<div class="field-error" data-error="omPhone"></div>' +
                    '</div>' +
                    '<div class="om-instruction-box mt-3"><div class="inst-step"><span class="step-num">1</span><span>Réservez les places avant d’effectuer le transfert</span></div></div>' +
                  '</div>' +
                '</div>' +

                '<div class="payment-panel ' + (initialMethod === "wave" ? "is-active" : "") + '" id="wavePanel" style="display:' + (initialMethod === "wave" ? "block" : "none") + '">' +
                  '<div class="mobile-money-box wave-box">' +
                    '<div class="mm-box-head">' +
                      '<div class="mm-brand-pill wave-pill"><span class="dot"></span> Wave Mobile Money</div>' +
                      '<span class="tiny muted">Transfert manuel</span>' +
                    '</div>' +
                    '<div class="payment-recipient mt-2"><span>Compte destinataire</span><strong>Affiché après réservation</strong><span>Montant</span><strong>' + UI.money(t.total) + '</strong></div>' +
                    '<div class="field mt-3">' +
                      '<label for="wavePhone"><strong>Votre numéro Wave <span class="req">*</span></strong></label>' +
                      '<div class="phone-input-wrap"><span class="phone-prefix">🌊</span><input class="input" id="wavePhone" name="wavePhone" type="tel" inputmode="tel" placeholder="Ex. 76 987 65 43" value="' + esc(phone) + '"></div>' +
                      '<div class="field-error" data-error="wavePhone"></div>' +
                    '</div>' +
                    '<div class="wave-instruction-box mt-3"><div class="inst-step"><span class="step-num">1</span><span>Réservez les places avant d’effectuer le transfert</span></div></div>' +
                  '</div>' +
                '</div>' +

                '<div id="reservationDetails" class="info-band mt-3 is-hidden"></div>' +
                '<div class="payment-proof-card mt-3 is-hidden" id="proofStep">' +
                  '<h3 class="h3">Envoyer la preuve du transfert</h3>' +
                  '<p class="tiny muted mt-1">La commande restera en attente jusqu’à ce que l’administrateur confirme le paiement.</p>' +
                  '<div class="field mt-2"><label for="transactionId">Référence / ID de transaction <span class="req">*</span></label><input class="input" id="transactionId" name="transactionId" required autocomplete="off" placeholder="Référence affichée sur le reçu"><div class="field-error" data-error="transactionId"></div></div>' +
                  '<div class="field mt-2"><label for="proofFile">Capture d’écran ou reçu <span class="req">*</span></label><input class="input file-input" id="proofFile" name="proofFile" type="file" accept="image/png,image/jpeg,image/webp" required><span class="tiny muted">PNG, JPG ou WebP. La capture est réduite avant son enregistrement sur cet appareil.</span><div class="field-error" data-error="proofFile"></div><div id="proofPreviewWrap" class="proof-preview is-hidden"><img id="proofPreview" alt="Aperçu du justificatif"><span id="proofSize"></span></div></div>' +
                '</div>' +

                '<label class="checkbox mt-3"><input type="checkbox" id="cgv" name="cgv"><span>J\'accepte les <a href="#/mentions">conditions de vente</a> et comprends que le paiement sera vérifié avant l’émission des billets.</span></label>' +
                '<div class="field-error" data-error="cgv"></div>' +
                '<div class="info-band mt-2">' + UI.icon("info", 16) + '<div><strong>Validation manuelle.</strong> Le transfert n’est pas initié par le site. L’organisateur vérifie le reçu avant d’activer les billets. N’entrez jamais votre code secret ou un OTP.</div></div>' +
              "</div>" +
              '<button class="btn btn-primary btn-block btn-lg btn-pay-om" type="submit" id="payBtn">Réserver les places et afficher les instructions ' + UI.icon("arrow", 17) + "</button>" +
              '<div class="secure-note">' + UI.icon("clock", 14) + " Places réservées 20 minutes; billets émis après vérification</div>" +
            "</form>" +

            '<aside class="summary-card">' +
              '<div class="between"><h2 class="h3">Votre commande</h2><a class="small" href="#/panier" style="color:#8bb9ff">Modifier</a></div>' +
              '<div class="checkout-summary-lines mt-2">' +
                t.lines.map((l) =>
                  '<div class="checkout-item"><div><div class="ci-name">' + esc(l.event.title) + '</div><div class="ci-meta">' + esc(l.tier.name) + " × " + l.qty + '</div></div><div class="ci-price">' + UI.money(l.tier.price * l.qty) + "</div></div>"
                ).join("") +
              "</div>" +
              '<div class="pay-summary-line"><span>Sous-total</span><strong>' + UI.money(t.subtotal) + "</strong></div>" +
              '<div class="pay-summary-line"><span>Frais de service</span><strong>' + UI.money(t.fees) + "</strong></div>" +
              (t.discount > 0 ? '<div class="pay-summary-line" style="color:var(--green)"><span>Remise ' + esc(t.promo.code) + "</span><strong style=\"color:var(--green)\">−" + UI.money(t.discount) + "</strong></div>" : "") +
              '<div class="summary-total"><span>Total</span><strong>' + UI.money(t.total) + "</strong></div>" +
              '<div class="secure-note">' + UI.icon("lock", 13) + " Transfert manuel, sans saisie de code secret</div>" +
              '<div class="cart-note">' + UI.icon("ticket", 14) + "<span>" + UI.plural(t.count, "e-billet") + " sera activé après validation de la preuve.</span></div>" +
            "</aside>" +
          "</div>" +
        "</div></section>"
      );
    },
    mount(root) {
      const form = root.querySelector("#checkoutForm");
      if (!form) return;
      const payBtn = root.querySelector("#payBtn");
      const phoneInput = form.querySelector("#phone");
      const omPhoneInput = form.querySelector("#omPhone");
      const wavePhoneInput = form.querySelector("#wavePhone");
      const proofFileInput = form.querySelector("#proofFile");
      const proofPreview = root.querySelector("#proofPreview");
      const proofPreviewWrap = root.querySelector("#proofPreviewWrap");
      const proofSize = root.querySelector("#proofSize");
      const proofStep = root.querySelector("#proofStep");
      const reservationDetails = root.querySelector("#reservationDetails");
      const omPanel = root.querySelector("#omPanel");
      const wavePanel = root.querySelector("#wavePanel");
      const tabs = root.querySelectorAll(".payment-tab");
      const selectedRadio = form.querySelector('input[name="paymentMethod"]:checked');
      let selectedMethod = selectedRadio ? selectedRadio.value : "orange_money";
      let proofImage = "";
      let processing = false;
      let currentOrder = null;

      function setError(name, msg) {
        const el = root.querySelector('[data-error="' + name + '"]');
        if (el) el.textContent = msg || "";
        const input = form.querySelector('[name="' + name + '"]');
        if (input) input.classList.toggle("is-invalid", !!msg);
      }

      function clearErrors() {
        Array.prototype.forEach.call(root.querySelectorAll(".field-error"), (el) => { el.textContent = ""; });
        Array.prototype.forEach.call(root.querySelectorAll(".is-invalid"), (el) => el.classList.remove("is-invalid"));
      }

      function updatePayButton() {
        payBtn.className = "btn btn-primary btn-block btn-lg " + (selectedMethod === "orange_money" ? "btn-pay-om" : "btn-pay-wave");
        payBtn.disabled = false;
        payBtn.innerHTML = (currentOrder ? "J’ai effectué le transfert — envoyer la preuve " : "Réserver les places et afficher les instructions ") + UI.icon("arrow", 17);
      }

      function compressProof(file) {
        proofImage = "";
        proofPreviewWrap.classList.add("is-hidden");
        proofPreview.removeAttribute("src");
        proofSize.textContent = "";
        if (!file) return;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
          setError("proofFile", "Choisissez une capture au format PNG, JPG ou WebP.");
          proofFileInput.value = "";
          return;
        }
        if (file.size > 8 * 1024 * 1024) {
          setError("proofFile", "La capture ne doit pas dépasser 8 Mo.");
          proofFileInput.value = "";
          return;
        }
        setError("proofFile", "");
        const reader = new FileReader();
        reader.onerror = () => setError("proofFile", "Impossible de lire ce fichier.");
        reader.onload = () => {
          const image = new Image();
          image.onerror = () => setError("proofFile", "Cette image ne peut pas être ouverte.");
          image.onload = () => {
            const maxDim = 1280;
            const scale = Math.min(1, maxDim / Math.max(image.width, image.height));
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(image.width * scale));
            canvas.height = Math.max(1, Math.round(image.height * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              setError("proofFile", "Impossible de traiter la capture sur ce navigateur.");
              return;
            }
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            try {
              proofImage = canvas.toDataURL("image/jpeg", 0.68);
              if (proofImage.length > 1100000) proofImage = canvas.toDataURL("image/jpeg", 0.5);
              proofPreview.src = proofImage;
              proofPreviewWrap.classList.remove("is-hidden");
              proofSize.textContent = "Capture optimisée · environ " + Math.max(1, Math.round(proofImage.length * 0.75 / 1024)) + " Ko";
            } catch (error) {
              proofImage = "";
              setError("proofFile", "Impossible d’optimiser cette capture.");
            }
          };
          image.src = reader.result;
        };
        reader.readAsDataURL(file);
      }

      proofFileInput.addEventListener("change", () => compressProof(proofFileInput.files && proofFileInput.files[0]));

      tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
          if (currentOrder) return;
          const method = tab.getAttribute("data-method");
          if (!method || method === selectedMethod) return;
          selectedMethod = method;
          tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
          tab.querySelector("input").checked = true;

          if (selectedMethod === "orange_money") {
            omPanel.style.display = "block";
            wavePanel.style.display = "none";
            if (!omPhoneInput.value && phoneInput.value) {
              omPhoneInput.value = phoneInput.value;
            }
          } else {
            omPanel.style.display = "none";
            wavePanel.style.display = "block";
            if (!wavePhoneInput.value && phoneInput.value) {
              wavePhoneInput.value = phoneInput.value;
            }
          }
          clearErrors();
          updatePayButton();
        });
      });

      if (phoneInput) {
        phoneInput.addEventListener("input", () => {
          if (!omPhoneInput.value) omPhoneInput.value = phoneInput.value;
          if (!wavePhoneInput.value) wavePhoneInput.value = phoneInput.value;
          setError("phone", "");
        });
      }

      omPhoneInput.addEventListener("input", () => setError("omPhone", ""));
      wavePhoneInput.addEventListener("input", () => setError("wavePhone", ""));
      form.querySelector("#name").addEventListener("input", () => setError("name", ""));
      form.querySelector("#email").addEventListener("input", () => setError("email", ""));
      form.querySelector("#transactionId").addEventListener("input", () => setError("transactionId", ""));
      form.querySelector("#cgv").addEventListener("change", () => setError("cgv", ""));

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (processing) return;
        clearErrors();

        const name = form.querySelector("#name").value.trim();
        const email = form.querySelector("#email").value.trim();
        const phone = form.querySelector("#phone").value.trim();
        const cgv = form.querySelector("#cgv").checked;
        const transactionId = form.querySelector("#transactionId").value.trim();

        let valid = true;
        let firstError = null;
        const fail = (fieldName, msg) => {
          valid = false;
          setError(fieldName, msg);
          if (!firstError) firstError = form.querySelector('[name="' + fieldName + '"]') || root.querySelector("#cgv");
        };

        if (name.length < 2) fail("name", "Indiquez votre nom complet.");
        if (!UI.validEmail(email)) fail("email", "Adresse e-mail valide requise.");
        if (currentOrder && transactionId.length < 4) fail("transactionId", "Indiquez la référence de transaction affichée sur le reçu.");
        if (currentOrder && !proofImage) fail("proofFile", "Ajoutez une capture du reçu de paiement.");

        const receivingPhone = S.getPaymentAccounts()[selectedMethod === "wave" ? "wave" : "orangeMoney"];
        if (!receivingPhone) {
          UI.toast("Ce compte de réception n’est pas configuré. Contactez l’organisateur.", "error");
          return;
        }

        let targetPhone = "";
        if (selectedMethod === "orange_money") {
          targetPhone = omPhoneInput.value.trim() || phone;
          const clean = targetPhone.replace(/\D/g, "");
          if (clean.length < 7) {
            fail("omPhone", "Indiquez un numéro Orange Money valide (ex. 77 123 45 67).");
          }
        } else {
          targetPhone = wavePhoneInput.value.trim() || phone;
          const clean = targetPhone.replace(/\D/g, "");
          if (clean.length < 7) {
            fail("wavePhone", "Indiquez un numéro Wave valide (ex. 76 123 45 67).");
          }
        }

        if (!cgv) fail("cgv", "Vous devez accepter les conditions pour continuer.");

        if (!valid) {
          UI.toast("Veuillez renseigner les informations obligatoires.", "error");
          if (firstError && firstError.focus) firstError.focus();
          return;
        }

        processing = true;
        payBtn.disabled = true;
        payBtn.innerHTML = '<span class="processing"><span class="spinner"></span> ' + (currentOrder ? "Envoi de la preuve…" : "Réservation des places…") + '</span>';
        if (!currentOrder) {
          const reservation = await S.reserveOrder({
            name,
            email,
            phone: phone,
            paymentMethod: selectedMethod,
            accountPhone: targetPhone
          });
          if (!reservation.ok) {
            processing = false;
            payBtn.disabled = false;
            updatePayButton();
            UI.toast(reservation.message, "error");
            return;
          }
          currentOrder = reservation.order;

          // ==============================================================================
          // [ÉVOLUTION API DIRECTE - REDIRECTION IMMÉDIATE VERS WAVE / ORANGE MONEY]
          // ==============================================================================
          // Lorsque l'API Wave Checkout ou Orange Money WebPay sera connectée au serveur :
          // Le serveur renverra directement une URL de paiement dans reservation.payment.checkoutUrl.
          // Il suffira de décommenter la ligne ci-dessous pour rediriger le client instantanément :
          //
          // if (reservation.payment && reservation.payment.checkoutUrl) {
          //   window.location.href = reservation.payment.checkoutUrl;
          //   return;
          // }
          //
          // Cela supprimera totalement l'étape manuelle ci-dessous (saisie ID + capture JPEG).
          // ==============================================================================

          const instructions = currentOrder.paymentInstructions || {};
          reservationDetails.innerHTML = '<div><strong>Réservation ' + esc(currentOrder.ref) + ' créée.</strong><br>Effectuez le transfert avant ' + esc(UI.dateTime(instructions.expiresAt)) + ' vers ' + esc(instructions.label || (selectedMethod === "wave" ? "Wave" : "Orange Money")) + ' — compte ' + esc(instructions.accountName || "") + ' — <span class="mono">' + esc(instructions.number || "Non configuré") + '</span>. Montant : <strong>' + UI.money(currentOrder.total) + '</strong>.</div>';
          reservationDetails.classList.remove("is-hidden");
          proofStep.classList.remove("is-hidden");
          const stepLabel = form.querySelector(".form-card-head .badge");
          if (stepLabel) stepLabel.textContent = "Étape 2/2 · réservation " + currentOrder.ref;
          processing = false;
          updatePayButton();
          UI.toast("Places réservées. Effectuez le transfert puis envoyez le reçu dans les 20 minutes.", "success");
          return;
        }

        const res = await S.submitProof(currentOrder.ref, transactionId, proofImage);
        if (!res.ok) {
          processing = false;
          payBtn.disabled = false;
          updatePayButton();
          UI.toast(res.message, "error");
          return;
        }

        UI.toast("Preuve enregistrée. La commande attend la vérification de l’organisateur.", "info");
        window.location.hash = "#/confirmation/" + encodeURIComponent(res.order.ref);
      });
    }
  };

  function field(name, label, type, value, placeholder, required, cls) {
    return (
      '<div class="field ' + (cls || "") + '">' +
        '<label for="' + name + '">' + esc(label) + (required ? ' <span class="req">*</span>' : "") + "</label>" +
        '<input class="input" id="' + name + '" name="' + name + '" type="' + type + '" value="' + esc(value || "") + '" placeholder="' + esc(placeholder || "") + '"' +
          (required ? " required" : "") + (type === "email" ? " autocomplete=\"email\"" : "") + ">" +
        '<div class="field-error" data-error="' + name + '"></div>' +
      "</div>"
    );
  }

  /* =========================================================
     Confirmation
     ========================================================= */
  Views.confirmation = {
    title: "Suivi de commande — TERANGAPASS",
    render(params) {
      const order = S.getOrder(params.ref);
      if (!order) {
        return '<section class="section"><div class="container">' +
          emptyState("🧾", "Commande introuvable", "Vérifiez votre référence ou retrouvez vos billets depuis votre espace.",
            '<a class="btn btn-primary" href="#/billets">Retrouver mes billets</a>') + "</div></section>";
      }
      const count = (order.tickets || []).length || (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
      const paid = order.status === "paid";
      const rejected = order.status === "rejected";
      const reserved = order.status === "reserved";
      const expired = order.status === "expired";
      const statusBadge = paid
        ? '<span class="badge badge-green">Paiement vérifié</span>'
        : rejected
          ? '<span class="badge badge-red">Commande refusée</span>'
          : expired
            ? '<span class="badge badge-muted">Réservation expirée</span>'
          : reserved
            ? '<span class="badge badge-amber">Places réservées · paiement à effectuer</span>'
            : '<span class="badge badge-amber">Vérification en attente</span>';
      const paymentInfo = order.payment || {};
      const instructions = order.paymentInstructions || {};
      return (
        '<section class="confirmation"><div class="container">' +
          '<div class="success-head">' +
            '<div class="success-ring">' + UI.icon(paid ? "check" : rejected ? "x" : "clock", 40) + "</div>" +
            statusBadge +
            '<h1 class="h1 mt-2">' + (paid ? "Paiement vérifié" : rejected ? "Commande refusée" : expired ? "Réservation expirée" : reserved ? "Réservation créée" : "Paiement envoyé") + "</h1>" +
            '<p class="lead mt-1">' + esc(paid
              ? "Votre transfert a été validé. Vos " + count + " billet(s) sont disponibles."
              : rejected
                ? "Votre paiement n'a pas été validé. Consultez le motif ci-dessous avant de repasser commande."
                : expired
                  ? "La réservation a expiré et les places ont été libérées. Revenez à l’événement pour recommencer la commande."
                : reserved
                  ? "Effectuez le transfert indiqué puis joignez le reçu avant l’expiration de la réservation."
                  : "Votre preuve de paiement a été transmise. La commande reste en attente jusqu'à la vérification de l'organisateur.") + "</p>" +
            '<div class="order-ref">Référence <strong class="mono">' + esc(order.ref) + "</strong>" +
              '<button class="link-danger" type="button" id="copyRef" aria-label="Copier la référence">' + UI.icon("copy", 13) + "</button></div>" +
            (paymentInfo.provider
              ? '<div class="payment-method-badge mt-2">' +
                  (paymentInfo.method === "wave" ? "🌊 " : "🟠 ") +
                  esc(paymentInfo.provider) + " · Référence de transaction <span class=\"mono\">" + esc(paymentInfo.transactionId || "—") + "</span>" +
                "</div>"
              : "") +
            (reserved ? '<div class="payment-recipient mt-3"><span>Bénéficiaire</span><strong>' + esc(instructions.accountName || "") + '</strong><span>Mode / numéro</span><strong class="mono">' + esc(instructions.label || paymentInfo.provider) + ' · ' + esc(instructions.number || "Non configuré") + '</strong><span>Montant exact</span><strong>' + UI.money(order.total) + '</strong><span>Expiration</span><strong>' + esc(UI.dateTime(instructions.expiresAt || order.holdUntil)) + '</strong></div>' : "") +
            (reserved ? '<form id="reservedProofForm" class="payment-proof-card mt-3"><h2 class="h3">Envoyer le justificatif</h2><div class="field mt-2"><label for="reservedTransaction">Référence de transaction</label><input class="input" id="reservedTransaction" required autocomplete="off"><div class="field-error" data-error="reservedTransaction"></div></div><div class="field mt-2"><label for="reservedProof">Reçu JPEG, PNG ou WebP (8 Mo maximum)</label><input class="input file-input" id="reservedProof" type="file" accept="image/jpeg,image/png,image/webp" required><div class="field-error" data-error="reservedProof"></div></div><button class="btn btn-primary mt-2" type="submit" id="submitReservedProof">Envoyer la preuve</button></form>' : "") +
            (rejected ? '<div class="payment-review-note mt-2"><strong>Motif</strong><p>' + esc(paymentInfo.reviewNote || "La preuve n'a pas pu être vérifiée.") + "</p></div>" : "") +
            (!paid && !rejected && !expired ? '<div class="info-band mt-2"><div><strong>Aucun billet n’est actif pour le moment.</strong> ' + (reserved ? "Un reçu valide doit être soumis avant l’expiration de la réservation." : "Le statut sera mis à jour après la vérification manuelle.") + ' Vous pouvez revenir à cette page ou ouvrir « Mes billets ».</div></div>' : "") +
          "</div>" +
          (paid ? '<div class="tickets-list print-area" id="ticketsArea">' + (order.tickets || []).map((t) => ticketCard(order, t)).join("") + "</div>" : "") +
          '<div class="confirm-actions">' +
            (paid
              ? '<button class="btn btn-outline" type="button" id="printTickets">' + UI.icon("printer", 16) + " Imprimer / PDF</button>" +
                '<button class="btn btn-outline" type="button" id="downloadTickets">' + UI.icon("download", 16) + " Télécharger en PNG</button>"
              : expired
                ? '<a class="btn btn-primary" href="#/evenements">Choisir un événement</a>'
                : '<button class="btn btn-outline" type="button" id="refreshOrder">Actualiser le statut</button>') +
            '<a class="btn btn-primary" href="#/billets">Voir mes billets ' + UI.icon("arrow", 16) + "</a>" +
          "</div>" +
          (paid ? '<div class="info-band">' + UI.icon("info", 18) + "<div><strong>Comment ça marche ?</strong> Présentez le code-barres de chaque billet à l'entrée. Chaque code est unique et ne peut être scanné qu'une seule fois.</div></div>" : "") +
          '<div class="center mt-3"><a class="small muted" href="#/evenements">Continuer à explorer les événements →</a></div>' +
        "</div></section>"
      );
    },
    mount(root, params) {
      const order = S.getOrder(params.ref);
      if (!order) return;
      const copy = root.querySelector("#copyRef");
      if (copy) copy.addEventListener("click", () => UI.copyText(order.ref).then((ok) => UI.toast(ok ? "Référence copiée." : order.ref, "success")));
      const refresh = root.querySelector("#refreshOrder");
      if (refresh) refresh.addEventListener("click", async () => {
        try { await S.loadOrder(params.ref, true); window.TERANGAPASS_APP.rerender({ scroll: false }); }
        catch (_) { UI.toast("Impossible de mettre à jour cette commande.", "error"); }
      });
      const proofForm = root.querySelector("#reservedProofForm");
      if (proofForm) {
        proofForm.addEventListener("submit", async (event) => {
          event.preventDefault();
          const transaction = proofForm.querySelector("#reservedTransaction").value.trim();
          const file = proofForm.querySelector("#reservedProof").files[0];
          const submit = proofForm.querySelector("#submitReservedProof");
          if (transaction.length < 4 || !file || file.size > 8 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            UI.toast("Indiquez une référence valide et joignez une image de reçu de 8 Mo maximum.", "error");
            return;
          }
          submit.disabled = true;
          submit.innerHTML = '<span class="processing"><span class="spinner"></span> Optimisation et envoi…</span>';
          try {
            const proof = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("Lecture du reçu impossible."));
              reader.onload = () => {
                const image = new Image();
                image.onerror = () => reject(new Error("Ce reçu ne peut pas être ouvert comme image."));
                image.onload = () => {
                  const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.max(1, Math.round(image.width * scale));
                  canvas.height = Math.max(1, Math.round(image.height * scale));
                  const context = canvas.getContext("2d");
                  if (!context) return reject(new Error("Optimisation de l’image impossible."));
                  context.fillStyle = "#ffffff";
                  context.fillRect(0, 0, canvas.width, canvas.height);
                  context.drawImage(image, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL("image/jpeg", 0.65));
                };
                image.src = reader.result;
              };
              reader.readAsDataURL(file);
            });
            const result = await S.submitProof(params.ref, transaction, proof);
            if (!result.ok) throw new Error(result.message);
            UI.toast("Preuve transmise. La commande attend la vérification de l’organisateur.", "success");
            window.TERANGAPASS_APP.rerender({ scroll: false });
          } catch (error) {
            UI.toast(error.message, "error");
            submit.disabled = false;
            submit.textContent = "Envoyer la preuve";
          }
        });
      }
      const printBtn = root.querySelector("#printTickets");
      if (printBtn) printBtn.addEventListener("click", () => window.print());
      const dl = root.querySelector("#downloadTickets");
      if (dl) dl.addEventListener("click", () => downloadTickets(order));
    }
  };

  /* =========================================================
     Mes billets
     ========================================================= */
  Views.tickets = {
    title: "Mes billets — TERANGAPASS",
    render() {
      const locals = S.localOrders();
      return (
        '<section class="page-head"><div class="container">' +
          '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><span>Mes billets</span></div>' +
          '<h1 class="h1">Mes billets</h1>' +
          '<p class="lead mt-1">Retrouvez vos commandes et téléchargez vos e-billets à tout moment.</p>' +
        "</div></section>" +
        '<section style="padding-bottom:70px"><div class="container">' +
          '<div class="lookup">' +
            '<div>' +
              '<div class="panel lookup-form">' +
                '<h2 class="h3">Rechercher une commande</h2>' +
              '<p class="muted small mt-1">Saisissez la référence confidentielle reçue après votre commande. L\'adresse e-mail seule ne donne pas accès aux billets.</p>' +
                '<form id="lookupForm" class="mt-2">' +
                  '<div class="field"><label for="lookup">Référence de commande</label>' +
                    '<input class="input" id="lookup" name="lookup" placeholder="TGP-…" autocomplete="off" spellcheck="false" required>' +
                  "</div>" +
                  '<button class="btn btn-primary btn-block mt-2" type="submit">' + UI.icon("search", 16) + " Rechercher mes billets</button>" +
                "</form>" +
              "</div>" +
              '<div id="lookupResults" class="mt-3"></div>' +
            "</div>" +
            "<div>" +
              '<div class="between mb-2"><h2 class="h3">Sur cet appareil</h2><span class="badge badge-muted">' + locals.length + " commande" + (locals.length > 1 ? "s" : "") + "</span></div>" +
              (locals.length
                ? '<div class="lookup-results">' + locals.map((o, i) => orderBlock(o, i === 0)).join("") + "</div>"
                : emptyState("🎟️", "Aucune commande récente", "Utilisez votre référence confidentielle pour retrouver une commande.",
                    '<a class="btn btn-primary btn-sm" href="#/evenements">Trouver un événement</a>')) +
              '<div class="info-band" style="max-width:none;margin-top:16px">' + UI.icon("shield", 17) + "<span>Votre référence donne accès au statut et aux billets de la commande. Conservez-la dans un endroit sûr.</span></div>" +
            "</div>" +
          "</div>" +
        "</div></section>"
      );
    },
    mount(root) {
      const form = root.querySelector("#lookupForm");
      const results = root.querySelector("#lookupResults");
      function renderResults(orders, query) {
        if (!orders.length) {
          results.innerHTML = emptyState("🔎", "Aucun billet trouvé", "Vérifiez l'adresse e-mail ou la référence saisie, puis réessayez.",
            '<button class="btn btn-ghost btn-sm" type="button" id="retryLookup">Nouvelle recherche</button>');
          const retry = results.querySelector("#retryLookup");
          if (retry) retry.addEventListener("click", () => { results.innerHTML = ""; form.reset(); root.querySelector("#lookup").focus(); });
          return;
        }
        results.innerHTML =
          '<h2 class="h3 mb-2">' + UI.plural(orders.length, "commande") + " trouvée" + (orders.length > 1 ? "s" : "") + "</h2>" +
          '<div class="lookup-results">' + orders.map((o, i) => orderBlock(o, i === 0)).join("") + "</div>";
        UI.scrollReveal(results);
      }
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const q = form.querySelector("#lookup").value.trim();
        if (!q) return;
        const button = form.querySelector('button[type="submit"]');
        if (button) button.disabled = true;
        try {
          const order = await S.loadOrder(q, true);
          renderResults(order ? [order] : [], q);
        } catch (_) { renderResults([], q); }
        finally { if (button) button.disabled = false; }
      });
      bindOrderActions(root);
    }
  };

  function bindOrderActions(scope) {
    scope.addEventListener("click", async (e) => {
      const refreshBtn = e.target.closest("[data-refresh-order]");
      if (refreshBtn) {
        e.preventDefault();
        try {
          await S.loadOrder(refreshBtn.getAttribute("data-refresh-order"), true);
          window.TERANGAPASS_APP.rerender({ scroll: false });
        } catch (_) { UI.toast("Impossible de mettre à jour cette commande.", "error"); }
        return;
      }
      const printBtn = e.target.closest("[data-print]");
      const dlBtn = e.target.closest("[data-download]");
      if (!printBtn && !dlBtn) return;
      const ref = printBtn ? printBtn.getAttribute("data-print") : dlBtn.getAttribute("data-download");
      const order = S.getOrder(ref);
      if (!order) return;
      if (order.status !== "paid") {
        UI.toast("Cette commande doit être approuvée avant l'activation des billets.", "error");
        return;
      }
      if (printBtn) window.print();
      else downloadTickets(order);
    });
  }

  /* =========================================================
     Aide
     ========================================================= */
  Views.help = {
    title: "Aide & contact — TERANGAPASS",
    render() {
      const supportEmail = S.getSupportEmail();
      const faqs = [
        ["Comment recevoir mes billets ?", "Après le transfert Orange Money ou Wave, saisissez la référence et joignez le reçu. Les billets deviennent téléchargeables après vérification de la commande par l'organisateur."],
        ["Comment s'effectue le paiement ?", "Envoyez le montant affiché au numéro Orange Money ou Wave configuré par l'organisateur. Joignez ensuite la capture et la référence de transaction. Le site ne débite pas votre compte et ne demande jamais votre code secret ou un OTP."],
        ["Puis-je acheter plusieurs billets ?", "Oui, jusqu'à 8 billets par catégorie. Chaque billet est nominatif et possède un code unique."],
        ["Que faire si je ne vois pas mes billets ?", "Consultez le statut de la commande dans « Mes billets ». Les billets sont masqués tant que l'organisateur n'a pas approuvé la preuve de paiement."],
        ["Comment se passe le contrôle d'accès ?", "À l'entrée, le code-barres est scanné. Un code déjà utilisé est automatiquement refusé. L'équipe organisatrice accède au contrôle d'accès depuis l'espace pro."]
      ];
      return (
        '<section class="page-head"><div class="container">' +
          '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><span>Aide</span></div>' +
          '<span class="eyebrow">Centre d’assistance</span>' +
          '<h1 class="h1">Posez votre question</h1>' +
          '<p class="lead mt-1">Décrivez votre demande. Votre messagerie préparera un e-mail à l’équipe TERANGAPASS.</p>' +
        "</div></section>" +
        '<section style="padding-bottom:70px"><div class="container">' +
          '<div class="help-layout">' +
            '<div class="panel help-question-panel">' +
              '<div class="help-form-heading"><span class="ic">' + UI.icon("mail", 18) + '</span><div><h2 class="h3">Écrire à l’assistance</h2><p class="muted small">Réponse liée à une commande ? Ajoutez sa référence.</p></div></div>' +
              '<form id="helpQuestionForm">' +
                '<div class="form-grid">' +
                  '<div class="field"><label for="helpName">Votre nom</label><input class="input" id="helpName" name="name" maxlength="120" autocomplete="name" required></div>' +
                  '<div class="field"><label for="helpEmail">Votre adresse e-mail</label><input class="input" id="helpEmail" name="email" type="email" maxlength="254" autocomplete="email" required></div>' +
                  '<div class="field col-2"><label for="helpReference">Référence de commande <span class="muted">(facultatif)</span></label><input class="input" id="helpReference" name="reference" maxlength="64" placeholder="TGP-…"></div>' +
                  '<div class="field col-2"><label for="helpMessage">Votre question</label><textarea class="input" id="helpMessage" name="message" rows="6" minlength="10" maxlength="2000" placeholder="Expliquez-nous comment nous pouvons vous aider…" required></textarea><small class="muted">2 000 caractères maximum</small></div>' +
                '</div>' +
                '<button class="btn btn-primary mt-2" type="submit"' + (supportEmail ? '' : ' disabled') + '>Préparer mon e-mail ' + UI.icon("arrow", 16) + '</button>' +
                '<p class="help-form-status" role="status" aria-live="polite">' + (supportEmail ? 'Votre application de messagerie s’ouvrira avec le message prérempli. Vous pourrez le relire avant l’envoi.' : 'Le formulaire sera activé dès que l’adresse de réception sera configurée.') + '</p>' +
              '</form>' +
            '</div>' +
            '<aside class="panel help-faq"><h2 class="h3 mb-2">Questions fréquentes</h2><div class="faq">' +
              faqs.map((f) => "<details><summary>" + esc(f[0]) + "</summary><p>" + esc(f[1]) + "</p></details>").join("") +
            '</div></aside>' +
          '</div>' +
        "</div></section>"
      );
    },
    mount(root) {
      const form = root.querySelector("#helpQuestionForm");
      if (!form) return;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const recipient = S.getSupportEmail();
        if (!recipient) return;
        const name = form.querySelector("#helpName").value.trim();
        const email = form.querySelector("#helpEmail").value.trim();
        const reference = form.querySelector("#helpReference").value.trim();
        const message = form.querySelector("#helpMessage").value.trim();
        const subject = "Question TERANGAPASS" + (reference ? " — " + reference : "");
        const body = ["Nom : " + name, "E-mail : " + email, reference ? "Référence de commande : " + reference : "", "", "Question :", message].filter((line) => line !== "").join("\n");
        window.location.href = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      });
    }
  };

  /* =========================================================
     Mentions légales
     ========================================================= */
  Views.legal = {
    title: "Mentions légales — TERANGAPASS",
    render() {
      const supportPhone = S.getSupportPhone();
      const contact = supportPhoneLinks(supportPhone);
      const legalContact = contact ? '<a href="tel:' + esc(contact.telephone) + '">' + esc(supportPhone) + '</a>' : "coordonnées à renseigner";
      const legalWhatsApp = contact ? '<a href="https://wa.me/' + esc(contact.whatsapp) + '" target="_blank" rel="noopener noreferrer">WhatsApp</a>' : "WhatsApp (numéro à configurer)";
      return (
        '<section class="page-head legal-page-head"><div class="container">' +
          '<div class="breadcrumb"><a href="#/">Accueil</a><span>/</span><span>Mentions légales</span></div>' +
          '<h1 class="h1">Mentions légales</h1>' +
          '<p class="lead mt-1">Dernière mise à jour : ' + esc(UI.formatDate(new Date(), "long")) + "</p>" +
        "</div></section>" +
        '<section style="padding-bottom:70px"><div class="container"><div class="legal">' +
          '<div class="info-band" style="margin:0 0 24px;max-width:none">' + UI.icon("info", 18) + "<div><strong>Informations à compléter avant l’ouverture publique.</strong> L’identité de l’éditeur, les conditions de vente et de remboursement, la durée de conservation et les coordonnées de contact doivent être renseignées et validées par TERANGAPASS.</div></div>" +
          "<h2>Éditeur du site</h2><p>Raison sociale, adresse, identifiants d’entreprise et responsable de publication : à compléter par l’éditeur avant mise en production. Contact : " + legalContact + ".</p>" +
          "<h2>Hébergement</h2><p>Application servie par une API et une base de données PostgreSQL. Le nom de l’hébergeur et l’adresse de contact de l’hébergeur restent à renseigner pour le déploiement final.</p>" +
          "<h2>Données personnelles</h2><p>Le serveur reçoit le nom, l’adresse e-mail, le téléphone, les billets choisis, la référence de transaction et une image JPEG du reçu. Les organisateurs authentifiés consultent les données utiles à la vérification du paiement. Une durée de conservation et une procédure de suppression doivent être définies avant l’ouverture publique.</p>" +
          "<h2>Paiement et billets</h2><p>Dans cette version, TERANGAPASS n’initie pas le transfert Mobile Money. Le client transfère le montant au compte configuré par l’éditeur, puis l’organisateur vérifie la preuve sur le serveur. Aucun code secret ni OTP ne doit être saisi sur le site. Les billets ne sont émis qu’après approbation; chaque code est contrôlé une seule fois.</p>" +
          "<h2>Conditions de vente et remboursements</h2><p>Les conditions applicables, les règles d’annulation, de remboursement et les frais doivent être indiqués pour chaque événement par l’organisateur avant toute vente.</p>" +
          "<h2>Contact et réclamations</h2><p>Appelez-nous au " + legalContact + " ou contactez-nous sur " + legalWhatsApp + ".</p>" +
        "</div></div></section>"
      );
    }
  };

  /* =========================================================
     404
     ========================================================= */
  Views.notFound = {
    title: "Page introuvable — TERANGAPASS",
    render() {
      return (
        '<section class="section"><div class="container">' +
          '<h1 class="sr-only">Page introuvable</h1>' +
          emptyState("🌌", "Cette page s'est perdue dans la nuit", "La page demandée n'existe pas ou a été déplacée. Pas de panique, la fête continue ailleurs.",
            '<div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/">Retour à l\'accueil</a><a class="btn btn-outline" href="#/evenements">Voir les événements</a></div>') +
        "</div></section>"
      );
    }
  };
})();
