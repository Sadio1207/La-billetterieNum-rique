/* TERANGAPASS - etat client non sensible et acces a l'API. */
(function () {
  "use strict";

  const D = window.TERANGAPASS_DATA;
  const listeners = [];
  const orders = new Map();
  const state = { events: [], cart: [], promo: null, orders: [], paymentAccounts: { accountName: "", orangeMoney: "", wave: "" }, serviceFeeXof: 0, supportPhone: "", supportEmail: "" };
  let admin = null;
  let csrfToken = "";
  let initialized = false;
  let pendingCheckoutKey = "";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const norm = (value) => String(value == null ? "" : value).trim();
  const roundXof = (value) => Math.round(Number(value) || 0);
  const nowIso = () => new Date().toISOString();

  async function request(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const headers = new Headers(options.headers || {});
    let body = options.body;
    if (body && !(body instanceof FormData) && typeof body !== "string") {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(body);
    }
    if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && csrfToken && !options.noCsrf) headers.set("X-CSRF-Token", csrfToken);
    const response = await fetch(url, { method, headers, body, credentials: "same-origin", cache: "no-store" });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Le serveur n'a pas pu traiter la demande.");
    return payload;
  }

  function emit() {
    listeners.slice().forEach((fn) => { try { fn(); } catch (_) {} });
  }

  function mapOrder(order, extra = {}) {
    const customer = order.customer || extra.customer || {};
    const method = order.paymentMethod || extra.paymentMethod || "";
    const proof = order.proof || extra.proof || null;
    const mapped = {
      id: order.id || order.ref,
      ref: order.ref,
      name: customer.name || extra.name || "",
      email: customer.email || extra.email || "",
      phone: customer.phone || extra.phone || "",
      createdAt: order.createdAt || nowIso(),
      status: order.status,
      seed: false,
      items: (order.items || []).map((item) => ({
        eventId: item.eventId,
        tierId: item.tierId,
        qty: Number(item.qty) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        tierName: item.tierName || "Billet",
        eventTitle: item.eventTitle || "Evenement"
      })),
      tickets: (order.tickets || []).map((ticket) => ({
        id: ticket.id || ticket.code,
        code: ticket.code,
        eventId: ticket.eventId,
        tierId: ticket.tierId,
        holder: ticket.holder || customer.name || extra.name || "",
        checkedIn: !!(ticket.checkedInAt || ticket.checked_in_at),
        checkedInAt: ticket.checkedInAt || ticket.checked_in_at || null
      })),
      promo: null,
      discount: Number(order.discount) || 0,
      fees: Number(order.fees) || 0,
      subtotal: Number(order.subtotal) || 0,
      total: Number(order.total) || 0,
      payment: {
        method,
        provider: method === "wave" ? "Wave" : method === "orange_money" ? "Orange Money" : "",
        accountPhone: customer.phone || extra.phone || "",
        receivingPhone: state.paymentAccounts[method === "wave" ? "wave" : "orangeMoney"] || "",
        transactionId: order.transactionReference || extra.transactionReference || extra.transactionId || "",
        proofImage: proof ? proof.url : "",
        submittedAt: proof ? proof.submitted_at : order.createdAt,
        reviewedAt: order.reviewedAt || null,
        reviewNote: order.reviewNote || ""
      },
      paymentInstructions: extra.payment || order.paymentInstructions || null
    };
    if (mapped.ref) orders.set(mapped.ref.toUpperCase(), mapped);
    return mapped;
  }

  function adoptBootstrap(data) {
    state.events = Array.isArray(data.events) ? data.events : [];
    state.paymentAccounts = Object.assign({ accountName: "", orangeMoney: "", wave: "" }, data.paymentAccounts || {});
    state.serviceFeeXof = Math.max(0, Number(data.serviceFeeXof) || 0);
    state.supportPhone = norm(data.supportPhone);
    state.supportEmail = norm(data.supportEmail).toLowerCase();
  }

  async function loadAdminOrders() {
    if (!admin) { state.orders = []; return; }
    const data = await request("/api/admin/orders");
    state.orders = (data.orders || []).map((order) => mapOrder(order));
  }

  async function initialize() {
    if (initialized) return true;
    const bootstrap = await request("/api/bootstrap");
    adoptBootstrap(bootstrap);
    try {
      const session = await request("/api/admin/session");
      admin = session.user;
      csrfToken = session.csrfToken || "";
      await loadAdminOrders();
    } catch (_) {
      admin = null;
      csrfToken = "";
      state.orders = [];
    }
    initialized = true;
    emit();
    return true;
  }

  async function refresh() {
    try {
      const bootstrap = await request("/api/bootstrap");
      adoptBootstrap(bootstrap);
      if (admin) await loadAdminOrders();
      emit();
      return true;
    } catch (_) { return false; }
  }

  async function loadOrder(reference, force = false) {
    const ref = norm(reference).toUpperCase();
    if (!ref) return null;
    if (!force && orders.has(ref)) return orders.get(ref);
    const response = await request("/api/orders/" + encodeURIComponent(ref));
    return mapOrder(response);
  }

  function getEvents() { return state.events.slice(); }
  function getEvent(id) { return state.events.find((event) => event.id === id) || null; }
  function getTier(event, tierId) { return event && Array.isArray(event.tiers) ? event.tiers.find((tier) => tier.id === tierId) || null : null; }
  function category(id) { return D.CATEGORIES.find((entry) => entry.id === id) || { id, label: "Autre", emoji: "🎫", color: "#176bff" }; }
  function isPast(event) { return !event || new Date(event.date).getTime() < Date.now(); }
  function tierStats(event, tier) {
    if (!event || !tier) return { sold: 0, stock: 0, available: 0, ratio: 0 };
    const stock = Number(tier.stock) || 0;
    const available = Math.max(0, Math.min(stock, Number.isFinite(Number(tier.available)) ? Number(tier.available) : stock - (Number(tier.soldInitial) || 0)));
    const sold = Math.max(0, stock - available);
    return { sold, stock, available, ratio: stock ? Math.min(1, sold / stock) : 1 };
  }
  function eventStats(event) {
    let sold = 0, capacity = 0, available = 0, minPrice = Infinity, minAnyPrice = Infinity;
    (event.tiers || []).forEach((tier) => {
      const stats = tierStats(event, tier);
      sold += stats.sold; capacity += stats.stock; available += stats.available;
      if (tier.price < minAnyPrice) minAnyPrice = tier.price;
      if (stats.available > 0 && tier.price < minPrice) minPrice = tier.price;
    });
    if (minPrice === Infinity) minPrice = minAnyPrice;
    return { sold, capacity, available, ratio: capacity ? sold / capacity : 1, status: available <= 0 ? "out" : available <= Math.max(12, capacity * 0.1) ? "low" : "ok", minPrice: Number.isFinite(minPrice) ? minPrice : 0, past: isPast(event) };
  }
  function cartAvailable(eventId, tierId) {
    const event = getEvent(eventId), tier = getTier(event, tierId);
    return !event || !tier || isPast(event) ? 0 : tierStats(event, tier).available;
  }
  function cartQty(eventId, tierId) {
    const line = state.cart.find((entry) => entry.eventId === eventId && entry.tierId === tierId);
    return line ? line.qty : 0;
  }
  function cartLines() {
    return state.cart.map((line) => {
      const event = getEvent(line.eventId), tier = getTier(event, line.tierId);
      if (!event || !tier) return null;
      return { eventId: line.eventId, tierId: line.tierId, qty: line.qty, event, tier, lineTotal: roundXof(tier.price * line.qty), available: cartAvailable(line.eventId, line.tierId) };
    }).filter(Boolean);
  }
  function cartCount() { return state.cart.reduce((sum, line) => sum + line.qty, 0); }
  function addToCart(eventId, tierId, qty) {
    qty = Math.max(1, Math.floor(Number(qty) || 1));
    const event = getEvent(eventId), tier = getTier(event, tierId);
    if (!event || !tier) return { ok: false, message: "Cette categorie de billet n'existe plus." };
    if (isPast(event)) return { ok: false, message: "Cet evenement est termine." };
    const available = cartAvailable(eventId, tierId), existing = state.cart.find((line) => line.eventId === eventId && line.tierId === tierId);
    const current = existing ? existing.qty : 0, add = Math.min(qty, Math.max(0, Math.min(8, available) - current));
    if (add < 1) return { ok: false, message: available ? "Maximum de 8 billets par categorie." : "Cette categorie est epuisee." };
    if (existing) existing.qty += add; else state.cart.push({ eventId, tierId, qty: add });
    emit();
    return { ok: true, added: add, capped: add < qty, message: add < qty ? "Stock limite : quantite ajustee." : "Billet(s) ajoute(s) au panier." };
  }
  function setCartQty(eventId, tierId, qty) {
    qty = Math.max(0, Math.floor(Number(qty) || 0));
    if (!qty) state.cart = state.cart.filter((line) => line.eventId !== eventId || line.tierId !== tierId);
    else {
      const line = state.cart.find((entry) => entry.eventId === eventId && entry.tierId === tierId);
      if (line) line.qty = Math.min(qty, 8, cartAvailable(eventId, tierId));
      if (line && line.qty < 1) state.cart = state.cart.filter((entry) => entry !== line);
    }
    emit();
  }
  function removeFromCart(eventId, tierId) { state.cart = state.cart.filter((line) => line.eventId !== eventId || line.tierId !== tierId); emit(); }
  function clearCart() { state.cart = []; state.promo = null; emit(); }
  function findPromo() { return null; }
  function applyPromo() { return { ok: false, message: "Les codes promotionnels seront configures par l'organisateur." }; }
  function clearPromo() { state.promo = null; emit(); }
  function currentPromo() { return null; }
  function totals() {
    const lines = cartLines(), count = lines.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const fees = state.serviceFeeXof * (count ? 1 : 0);
    return { lines, count, subtotal, fees, discount: 0, total: subtotal + fees, promo: null, savings: 0 };
  }
  function cartSubtotal() { return totals().subtotal; }
  async function reserveOrder(customer) {
    const checkout = totals();
    if (!checkout.lines.length) return { ok: false, message: "Votre panier est vide." };
    if (!pendingCheckoutKey) pendingCheckoutKey = randomBytes(24).toString("hex");
    try {
      const response = await request("/api/reservations", {
        method: "POST",
        headers: { "Idempotency-Key": pendingCheckoutKey },
        noCsrf: true,
        body: {
          customer: { name: customer.name, email: customer.email, phone: customer.phone || customer.accountPhone },
          paymentMethod: customer.paymentMethod,
          items: checkout.lines.map((line) => ({ eventId: line.eventId, tierId: line.tierId, qty: line.qty }))
        }
      });
      const order = mapOrder(response.order, { ...customer, payment: response.payment });
      pendingCheckoutKey = "";
      state.cart = [];
      state.promo = null;
      emit();
      return { ok: true, order };
    } catch (error) { return { ok: false, message: error.message }; }
  }
  async function submitProof(reference, transactionReference, proofImage) {
    try {
      const match = String(proofImage || "").match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error("La preuve doit être une image JPEG optimisée.");
      const bytes = Uint8Array.from(atob(match[1]), (character) => character.charCodeAt(0));
      const form = new FormData();
      form.append("transactionReference", transactionReference);
      form.append("proof", new Blob([bytes], { type: "image/jpeg" }), "preuve.jpg");
      const result = await request(`/api/orders/${encodeURIComponent(reference)}/proof`, { method: "POST", body: form, noCsrf: true });
      const previous = getOrder(reference);
      const mapped = mapOrder(result, { name: previous?.name, email: previous?.email, phone: previous?.phone, paymentMethod: previous?.payment?.method });
      emit();
      return { ok: true, order: mapped };
    } catch (error) { return { ok: false, message: error.message }; }
  }
  function getPaymentAccounts() { return clone(state.paymentAccounts); }
  function getServiceFee() { return state.serviceFeeXof; }
  function getSupportPhone() { return state.supportPhone; }
  function getSupportEmail() { return state.supportEmail; }
  function savePaymentAccounts() { return { ok: false, message: "Configurez les comptes dans le fichier serveur .env." }; }
  async function reviewOrder(ref, decision, note) {
    try {
      const result = await request(`/api/admin/orders/${encodeURIComponent(ref)}/decision`, { method: "POST", body: { decision, note } });
      const updated = mapOrder(result.order);
      await loadAdminOrders(); emit();
      return { ok: true, order: updated };
    } catch (error) { return { ok: false, message: error.message }; }
  }
  function getOrder(value) { return orders.get(norm(value).toUpperCase()) || null; }
  function ordersByEmail() { return []; }
  function allOrders() { return state.orders.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function localOrders() { return [...orders.values()].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function findTicket(code) {
    const target = norm(code).toUpperCase().replace(/\s+/g, "");
    for (const order of orders.values()) {
      const ticket = order.tickets.find((entry) => entry.code.toUpperCase() === target);
      if (ticket) return { ticket, order };
    }
    return null;
  }
  async function checkIn(code) {
    const foundBeforeScan = findTicket(code);
    try {
      const result = await request("/api/admin/check-in", { method: "POST", body: { code } });
      const ticket = Object.assign({}, foundBeforeScan ? foundBeforeScan.ticket : {}, result.ticket, {
        eventId: foundBeforeScan ? foundBeforeScan.ticket.eventId : "",
        tierId: foundBeforeScan ? foundBeforeScan.ticket.tierId : "",
        holder: result.ticket.holder_name || (foundBeforeScan && foundBeforeScan.ticket.holder) || "",
        checkedIn: true,
        checkedInAt: result.ticket.checked_in_at || nowIso()
      });
      for (const order of orders.values()) {
        const found = order.tickets.find((entry) => entry.code === ticket.code);
        if (found) { found.checkedIn = true; found.checkedInAt = ticket.checked_in_at; }
      }
      emit();
      return { ok: true, message: result.message || "Billet valide.", ticket, order: foundBeforeScan ? foundBeforeScan.order : null };
    } catch (error) { return { ok: false, message: error.message, reason: "invalid" }; }
  }
  async function saveEvent(input) {
    try {
      const result = input.id
        ? await request(`/api/admin/events/${encodeURIComponent(input.id)}`, { method: "PUT", body: input })
        : await request("/api/admin/events", { method: "POST", body: input });
      await refresh();
      return { ok: true, event: result.event };
    } catch (error) { return { ok: false, message: error.message }; }
  }
  async function deleteEvent(id) {
    try { await request(`/api/admin/events/${encodeURIComponent(id)}`, { method: "DELETE" }); await refresh(); return true; }
    catch (_) { return false; }
  }
  function stats() {
    const now = Date.now(), since = now - 30 * D.DAY;
    const recent = state.orders.filter((order) => new Date(order.createdAt).getTime() >= since && order.status === "paid");
    const revenue = recent.reduce((sum, order) => sum + order.total, 0);
    const tickets = recent.reduce((sum, order) => sum + order.tickets.length, 0);
    const perEvent = state.events.map((event) => {
      const totals = eventStats(event);
      const eventRevenue = state.orders.filter((order) => order.status === "paid").reduce((sum, order) => sum + order.items.filter((item) => item.eventId === event.id).reduce((subtotal, item) => subtotal + item.unitPrice * item.qty, 0), 0);
      return { event, stats: totals, revenue: eventRevenue };
    });
    const byDay = [];
    const day = new Date(now);
    for (let i = 13; i >= 0; i--) {
      const start = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() - i));
      const end = start.getTime() + D.DAY;
      const amount = state.orders.filter((order) => order.status === "paid" && new Date(order.createdAt).getTime() >= start.getTime() && new Date(order.createdAt).getTime() < end).reduce((sum, order) => sum + order.total, 0);
      byDay.push({ date: start, amount, label: start.toLocaleDateString("fr-SN", { day: "2-digit", month: "2-digit", timeZone: "Africa/Dakar" }) });
    }
    const paid = state.orders.filter((order) => order.status === "paid"), checked = paid.reduce((sum, order) => sum + order.tickets.filter((ticket) => ticket.checkedIn).length, 0), totalTickets = paid.reduce((sum, order) => sum + order.tickets.length, 0);
    const capacity = perEvent.reduce((sum, entry) => sum + entry.stats.capacity, 0), sold = perEvent.reduce((sum, entry) => sum + entry.stats.sold, 0);
    return { revenue, tickets, orders: recent.length, totalOrders: state.orders.length, capacity, sold, fillRate: capacity ? sold / capacity : 0, byDay, perEvent, checked, totalTickets, avgOrder: recent.length ? roundXof(revenue / recent.length) : 0 };
  }
  function isAdmin() { return !!admin; }
  async function login(email, password) {
    try {
      const result = await request("/api/admin/login", { method: "POST", body: { email, password }, noCsrf: true });
      admin = result.user; csrfToken = result.csrfToken || "";
      await loadAdminOrders(); emit();
      return true;
    } catch (_) { return false; }
  }
  async function logout() {
    try { await request("/api/admin/logout", { method: "POST" }); } catch (_) {}
    admin = null; csrfToken = ""; state.orders = []; emit();
  }
  function money(value) { return (Number(value) || 0).toLocaleString("fr-SN", { style: "currency", currency: "XOF" }); }

  window.TERANGAPASS_STORE = {
    subscribe(fn) { listeners.push(fn); return () => { const index = listeners.indexOf(fn); if (index >= 0) listeners.splice(index, 1); }; },
    initialize, refresh, loadOrder,
    getState() { return clone({ events: state.events, orders: state.orders, cart: state.cart, promo: state.promo }); },
    getEvents, getEvent, getTier, category, isPast, tierStats, eventStats,
    cartLines, cartCount, addToCart, setCartQty, removeFromCart, clearCart, cartAvailable, cartQty,
    findPromo, applyPromo, clearPromo, currentPromo, cartSubtotal, totals, reserveOrder, submitProof,
    getPaymentAccounts, getServiceFee, getSupportPhone, getSupportEmail, savePaymentAccounts, reviewOrder, getOrder, ordersByEmail,
    allOrders, localOrders, findTicket, checkIn, saveEvent, deleteEvent, stats,
    isAdmin, login, logout, money, roundXof
  };
})();
