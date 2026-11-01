/* =========================================================
   TERANGAPASS — Espace organisateur (admin)
   ========================================================= */
(function () {
  "use strict";

  const D = window.TERANGAPASS_DATA;
  const S = window.TERANGAPASS_STORE;
  const UI = window.TERANGAPASS_UI;
  const esc = UI.esc;

  const Views = window.TERANGAPASS_VIEWS;
  const scanHistory = [];

  /* ---------- helpers ---------- */
  function pad(n) { return String(n).padStart(2, "0"); }

  function isoDatePart(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
  }

  function isoTimePart(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "20:00";
    return pad(d.getUTCHours()) + ":" + pad(d.getUTCMinutes());
  }

  function tierRows(tiers) {
    return (tiers || []).map((t, i) =>
      '<div class="tier-editor-row" data-tier-editor="' + (i + 1) + '" data-tier-id="' + esc(t.id) + '">' +
        '<div class="field"><label>Nom de la catégorie</label><input class="input" data-t-name value="' + esc(t.name) + '" placeholder="Standard" required></div>' +
        '<div class="field"><label>Prix (FCFA)</label><input class="input" type="number" min="0" step="1" data-t-price value="' + esc(t.price) + '" required></div>' +
        '<div class="field"><label>Stock</label><input class="input" type="number" min="1" step="1" data-t-stock value="' + esc(t.stock) + '" required></div>' +
        '<div class="field"><label>Déjà vendus</label><input class="input" type="number" min="0" step="1" data-t-sold value="' + esc(t.soldInitial || 0) + '"></div>' +
        '<button class="icon-btn tier-remove" type="button" data-t-remove aria-label="Supprimer cette catégorie">' + UI.icon("trash", 16) + "</button>" +
      "</div>"
    ).join("");
  }

  function eventForm(event) {
    const isNew = !event;
    const e = event || {
      title: "",
      category: "soiree",
      date: D.at(30, 20, 0),
      doorsMinutes: 45,
      venue: { name: "", city: "Dakar", address: "" },
      lineup: [],
      organizer: "TERANGAPASS",
      age: "18+",
      duration: "2h",
      description: [],
      tags: [],
      featured: false,
      image: "",
      poster: { c1: "#07132c", c2: "#176bff", c3: "#ff174f", motif: "waves" },
      tiers: [{ id: "std", name: "Standard", price: 15000, stock: 200, soldInitial: 0, perks: "" }]
    };
    return (
      '<form id="eventForm" novalidate>' +
        '<div class="form-grid">' +
          '<div class="field col-2"><label for="eTitle">Titre de l\'événement <span class="req">*</span></label>' +
            '<input class="input" id="eTitle" data-autofocus value="' + esc(e.title) + '" placeholder="Ex. Midnight Groove" required></div>' +
          '<div class="field"><label for="eCategory">Catégorie</label><select class="input" id="eCategory">' +
            D.CATEGORIES.map((c) => '<option value="' + c.id + '"' + (e.category === c.id ? " selected" : "") + ">" + esc(c.emoji + " " + c.label) + "</option>").join("") +
          "</select></div>" +
          '<div class="field"><label for="eDate">Date <span class="req">*</span></label><input class="input" id="eDate" type="date" value="' + esc(isoDatePart(e.date)) + '" required></div>' +
          '<div class="field"><label for="eTime">Heure de début</label><input class="input" id="eTime" type="time" value="' + esc(isoTimePart(e.date)) + '" required></div>' +
          '<div class="field"><label for="eDoors">Ouverture des portes (min. avant)</label><input class="input" id="eDoors" type="number" min="0" step="15" value="' + esc(e.doorsMinutes || 45) + '"></div>' +
          '<div class="field col-2"><label for="eVenue">Salle / lieu <span class="req">*</span></label><input class="input" id="eVenue" value="' + esc(e.venue.name) + '" placeholder="La Machine du Moulin Rouge" required></div>' +
          '<div class="field"><label for="eCity">Ville</label><input class="input" id="eCity" value="' + esc(e.venue.city) + '" placeholder="Dakar"></div>' +
          '<div class="field"><label for="eAddress">Adresse</label><input class="input" id="eAddress" value="' + esc(e.venue.address) + '" placeholder="Corniche Ouest, Dakar"></div>' +
          '<div class="field"><label for="eOrganizer">Organisateur</label><input class="input" id="eOrganizer" value="' + esc(e.organizer || "TERANGAPASS") + '"></div>' +
          '<div class="field"><label for="eAge">Public</label><input class="input" id="eAge" value="' + esc(e.age || "Tout public") + '" placeholder="18+ / Tout public"></div>' +
          '<div class="field"><label for="eDuration">Durée</label><input class="input" id="eDuration" value="' + esc(e.duration || "") + '" placeholder="2h / Jusqu\'à 6h"></div>' +
          '<div class="field"><label for="eLineup">Line-up (séparé par des virgules)</label><input class="input" id="eLineup" value="' + esc((e.lineup || []).join(", ")) + '"></div>' +
          '<div class="field"><label for="eTags">Tags (séparés par des virgules)</label><input class="input" id="eTags" value="' + esc((e.tags || []).join(", ")) + '"></div>' +
          '<div class="field col-2"><label for="eDesc">Description (un paragraphe par double saut de ligne)</label><textarea class="input" id="eDesc" rows="4">' + esc((e.description || []).join("\n\n")) + "</textarea></div>" +
          '<div class="field col-2"><label for="eTiers">Catégories de billets</label><div id="tiersEditorList">' + tierRows(e.tiers) + "</div>" +
            '<button class="btn btn-ghost btn-sm mt-2" type="button" id="addTier">' + UI.icon("plus", 14) + " Ajouter une catégorie</button></div>" +
        "</div>" +
        '<div class="event-form-extra">' +
          '<h3 class="h3">Affiche &amp; visuel de l\'événement</h3>' +
          '<p class="muted small mb-2">Cette image sera affichée sur l\'affiche de l\'événement, sur la billetterie et sur chaque billet client généré pour un rendu haut de gamme et professionnel.</p>' +
          '<div class="image-uploader-card">' +
            '<div class="image-preview-pane" id="imagePreviewPane">' +
              '<img id="eImagePreview" src="' + esc(e.image || "") + '" class="' + (e.image ? "" : "is-hidden") + '" alt="Aperçu de l\'affiche">' +
              '<div id="eImageEmptyState" class="image-empty-state ' + (e.image ? "is-hidden" : "") + '">' +
                UI.icon("image", 30) +
                '<span>Aucune photo</span>' +
                '<small class="muted">L\'affiche graphique sera utilisée</small>' +
              '</div>' +
            '</div>' +
            '<div class="image-inputs-pane">' +
              '<div class="field">' +
                '<label for="eImageFile"><strong>Importer une photo depuis l\'ordinateur</strong></label>' +
                '<input class="input file-input" id="eImageFile" type="file" accept="image/png, image/jpeg, image/webp, image/gif">' +
                '<span class="muted tiny">PNG, JPG, WebP — optimisée automatiquement</span>' +
              '</div>' +
              '<div class="field">' +
                '<label for="eImageUrl"><strong>Ou coller le lien d\'une image (URL)</strong></label>' +
                '<input class="input" id="eImageUrl" type="url" value="' + esc(e.image && !e.image.startsWith("data:") ? e.image : "") + '" placeholder="https://images.unsplash.com/...">' +
              '</div>' +
              '<input type="hidden" id="eImage" value="' + esc(e.image || "") + '">' +
              '<div class="image-actions-row">' +
                '<div class="image-presets">' +
                  '<span class="tiny muted">Suggestions :</span>' +
                  '<button class="btn btn-ghost btn-xs" type="button" data-preset="concert">🎵 Concert</button>' +
                  '<button class="btn btn-ghost btn-xs" type="button" data-preset="club">🪩 Club</button>' +
                  '<button class="btn btn-ghost btn-xs" type="button" data-preset="festival">🎪 Festival</button>' +
                  '<button class="btn btn-ghost btn-xs" type="button" data-preset="theatre">🎭 Spectacle</button>' +
                '</div>' +
                '<button class="btn btn-ghost btn-sm text-danger" type="button" id="eImageClear"' + (e.image ? "" : ' style="display:none"') + '>' +
                  UI.icon("trash", 14) + " Retirer la photo" +
                '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<details class="poster-advanced-toggle mt-3">' +
            '<summary class="muted small" style="cursor:pointer">Options avancées du visuel génératif (couleurs &amp; motifs de secours)</summary>' +
            '<div class="form-grid mt-2">' +
              '<div class="field"><label for="eC1">Couleur 1</label><input class="input color-input" id="eC1" type="color" value="' + esc(e.poster.c1) + '"></div>' +
              '<div class="field"><label for="eC2">Couleur 2</label><input class="input color-input" id="eC2" type="color" value="' + esc(e.poster.c2) + '"></div>' +
              '<div class="field"><label for="eC3">Couleur 3</label><input class="input color-input" id="eC3" type="color" value="' + esc(e.poster.c3) + '"></div>' +
              '<div class="field"><label for="eMotif">Motif de secours</label><select class="input" id="eMotif">' +
                UI.MOTIFS.map((m) => '<option value="' + m + '"' + (e.poster.motif === m ? " selected" : "") + ">" + m + "</option>").join("") +
              "</select></div>" +
            '</div>' +
          '</details>' +
          '<label class="checkbox mt-3"><input type="checkbox" id="eFeatured"' + (e.featured ? " checked" : "") + "><span>Mettre en avant sur la page d\'accueil</span></label>" +
        "</div>" +
      "</form>"
    );
  }

  function openEventEditor(event) {
    const isNew = !event;
    UI.modal({
      title: isNew ? "Nouvel événement" : "Modifier l'événement",
      subtitle: isNew ? "Publiez une nouvelle date en quelques secondes." : event.title,
      wide: true,
      body: eventForm(event),
      footer:
        '<button class="btn btn-ghost" type="button" data-close>Annuler</button>' +
        '<button class="btn btn-primary" type="submit" form="eventForm">' + (isNew ? "Publier l'événement" : "Enregistrer") + "</button>",
      onMount(el, close) {
        const form = el.querySelector("#eventForm");
        const list = el.querySelector("#tiersEditorList");
        let tierSeq = list.querySelectorAll(".tier-editor-row").length;

        // Gestion de l'image de l'événement
        const imageFileInput = el.querySelector("#eImageFile");
        const imageUrlInput = el.querySelector("#eImageUrl");
        const imageHiddenInput = el.querySelector("#eImage");
        const imagePreview = el.querySelector("#eImagePreview");
        const imageEmptyState = el.querySelector("#eImageEmptyState");
        const imageClearBtn = el.querySelector("#eImageClear");

        function updateEventImage(src) {
          imageHiddenInput.value = src || "";
          if (src) {
            imagePreview.src = src;
            imagePreview.classList.remove("is-hidden");
            if (imageEmptyState) imageEmptyState.classList.add("is-hidden");
            if (imageClearBtn) imageClearBtn.style.display = "inline-flex";
            if (!src.startsWith("data:")) {
              imageUrlInput.value = src;
            }
          } else {
            imagePreview.src = "";
            imagePreview.classList.add("is-hidden");
            if (imageEmptyState) imageEmptyState.classList.remove("is-hidden");
            if (imageClearBtn) imageClearBtn.style.display = "none";
            imageUrlInput.value = "";
            if (imageFileInput) imageFileInput.value = "";
          }
        }

        if (imageFileInput) {
          imageFileInput.addEventListener("change", (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            if (!file.type.startsWith("image/")) {
              UI.toast("Le fichier doit être une image valide (JPG, PNG, WebP).", "error");
              return;
            }
            const reader = new FileReader();
            reader.onload = (loadEv) => {
              const rawData = loadEv.target.result;
              const img = new Image();
              img.onload = () => {
                const maxDim = 1200;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                  if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                const compressed = canvas.toDataURL("image/jpeg", 0.85);
                updateEventImage(compressed);
                UI.toast("Image importée et optimisée avec succès !", "success");
              };
              img.onerror = () => {
                updateEventImage(rawData);
                UI.toast("Image importée !", "success");
              };
              img.src = rawData;
            };
            reader.readAsDataURL(file);
          });
        }

        if (imageUrlInput) {
          const onUrlChange = () => {
            const val = imageUrlInput.value.trim();
            if (val) updateEventImage(val);
          };
          imageUrlInput.addEventListener("input", onUrlChange);
          imageUrlInput.addEventListener("change", onUrlChange);
        }

        if (imageClearBtn) {
          imageClearBtn.addEventListener("click", () => {
            updateEventImage("");
            UI.toast("Photo retirée.", "info");
          });
        }

        const presets = {
          concert: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=80",
          club: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
          festival: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
          theatre: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?auto=format&fit=crop&w=1200&q=80"
        };
        el.querySelectorAll("[data-preset]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const key = btn.getAttribute("data-preset");
            if (presets[key]) {
              updateEventImage(presets[key]);
              UI.toast("Photo suggestion appliquée !", "success");
            }
          });
        });

        el.querySelector("#addTier").addEventListener("click", () => {
          tierSeq++;
          const div = document.createElement("div");
          div.className = "tier-editor-row";
          div.setAttribute("data-tier-editor", String(tierSeq));
          div.innerHTML =
            '<div class="field"><label>Nom</label><input class="input" data-t-name placeholder="VIP" required></div>' +
            '<div class="field"><label>Prix (FCFA)</label><input class="input" type="number" min="0" step="1" value="15000" data-t-price required></div>' +
            '<div class="field"><label>Stock</label><input class="input" type="number" min="1" step="1" value="100" data-t-stock required></div>' +
            '<div class="field"><label>Déjà vendus</label><input class="input" type="number" min="0" step="1" value="0" data-t-sold></div>' +
            '<button class="icon-btn tier-remove" type="button" data-t-remove aria-label="Supprimer cette catégorie">' + UI.icon("trash", 16) + "</button>";
          list.appendChild(div);
          div.querySelector("[data-t-name]").focus();
        });

        list.addEventListener("click", (e) => {
          const btn = e.target.closest("[data-t-remove]");
          if (!btn) return;
          if (list.querySelectorAll(".tier-editor-row").length <= 1) {
            UI.toast("Il faut conserver au moins une catégorie.", "error");
            return;
          }
          btn.closest(".tier-editor-row").remove();
        });

        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const dateVal = el.querySelector("#eDate").value;
          const timeVal = el.querySelector("#eTime").value || "20:00";
          if (!dateVal) {
            UI.toast("Merci d'indiquer une date.", "error");
            return;
          }
          const dateParts = dateVal.split("-").map(Number);
          const timeParts = timeVal.split(":").map(Number);
          const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1] || 0));
          if (isNaN(date.getTime())) {
            UI.toast("Date ou heure invalide.", "error");
            return;
          }
          if (isNew && date.getTime() < Date.now()) {
            UI.toast("La date du nouvel événement doit être dans le futur.", "error");
            return;
          }

          const tiers = Array.from(list.querySelectorAll(".tier-editor-row")).map((row, idx) => {
            const name = row.querySelector("[data-t-name]").value.trim();
            return {
              id: row.getAttribute("data-tier-id") || "tier-" + (idx + 1) + "-" + Math.random().toString(36).slice(2, 5),
              name: name,
              price: Number(row.querySelector("[data-t-price]").value) || 0,
              stock: Number(row.querySelector("[data-t-stock]").value) || 0,
              soldInitial: Number(row.querySelector("[data-t-sold]").value) || 0,
              perks: ""
            };
          });

          const description = el.querySelector("#eDesc").value
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean);

          const payload = {
            id: event ? event.id : undefined,
            title: el.querySelector("#eTitle").value,
            category: el.querySelector("#eCategory").value,
            date: date.toISOString(),
            doorsMinutes: Number(el.querySelector("#eDoors").value) || 45,
            venue: {
              name: el.querySelector("#eVenue").value,
              city: el.querySelector("#eCity").value,
              address: el.querySelector("#eAddress").value
            },
            lineup: el.querySelector("#eLineup").value.split(",").map((s) => s.trim()).filter(Boolean),
            organizer: el.querySelector("#eOrganizer").value,
            age: el.querySelector("#eAge").value,
            duration: el.querySelector("#eDuration").value,
            description: description,
            tags: el.querySelector("#eTags").value.split(",").map((s) => s.trim()).filter(Boolean),
            featured: el.querySelector("#eFeatured").checked,
            image: (el.querySelector("#eImage") ? el.querySelector("#eImage").value.trim() : ""),
            poster: {
              c1: el.querySelector("#eC1").value,
              c2: el.querySelector("#eC2").value,
              c3: el.querySelector("#eC3").value,
              motif: el.querySelector("#eMotif").value
            },
            tiers: tiers
          };

          const res = await S.saveEvent(payload);
          if (!res.ok) {
            UI.toast(res.message, "error");
            return;
          }
          close();
          UI.toast(isNew ? "Événement publié !" : "Événement mis à jour.", "success");
          if (window.TERANGAPASS_APP) window.TERANGAPASS_APP.rerender({ scroll: false });
        });
      }
    });
  }

  function openOrderModal(ref) {
    const order = S.getOrder(ref);
    if (!order) { UI.toast("Commande introuvable.", "error"); return; }
    const checked = (order.tickets || []).filter((t) => t.checkedIn).length;
    const ticketCount = (order.tickets || []).length || (order.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const pendingReview = order.status === "pending_review" && !order.seed;
    const paymentLabel = order.payment && order.payment.provider
      ? (order.payment.method === "wave" ? "🌊 " : "🟠 ") + order.payment.provider + (order.payment.accountPhone ? " · " + order.payment.accountPhone : "")
      : "Mobile Money";
    const statusLabel = order.status === "paid" ? '<span class="badge badge-green">Paiement validé</span>'
      : order.status === "rejected" ? '<span class="badge badge-red">Commande refusée</span>'
      : order.status === "refunded" ? '<span class="badge badge-muted">Remboursée</span>'
      : '<span class="badge badge-amber">À vérifier</span>';
    const proof = order.payment && order.payment.proofImage;
    const body =
      '<div class="between mb-2"><strong>Statut</strong>' + statusLabel + "</div>" +
      '<div class="order-modal-grid">' +
        '<div class="order-kv"><span>Client</span><strong>' + esc(order.name) + "</strong><em>" + esc(order.email) + "</em></div>" +
        '<div class="order-kv"><span>Montant / moyen</span><strong>' + UI.money(order.total) + "</strong><em>" + esc(paymentLabel) + "</em></div>" +
        '<div class="order-kv"><span>Billets</span><strong>' + ticketCount + "</strong><em>" + checked + " déjà validé" + (checked > 1 ? "s" : "") + "</em></div>" +
      "</div>" +
      (order.payment
        ? '<div class="admin-card payment-proof-admin"><div class="admin-card-head"><h3>Preuve de paiement</h3><span class="muted">' + esc(order.payment.provider || "Mobile Money") + "</span></div>" +
            '<dl class="payment-proof-meta"><dt>Référence de transaction</dt><dd class="mono">' + esc(order.payment.transactionId || "—") + "</dd>" +
            "<dt>Compte payeur</dt><dd>" + esc(order.payment.accountPhone || order.phone || "—") + "</dd>" +
            "<dt>Compte bénéficiaire</dt><dd>" + esc(order.payment.receivingPhone || "—") + "</dd>" +
            "<dt>Soumise le</dt><dd>" + esc(UI.dateTime(order.payment.submittedAt || order.createdAt)) + "</dd>" +
            (order.payment.reviewedAt ? "<dt>Vérifiée le</dt><dd>" + esc(UI.dateTime(order.payment.reviewedAt)) + "</dd>" : "") +
            (order.payment.reviewNote ? "<dt>Note admin</dt><dd>" + esc(order.payment.reviewNote) + "</dd>" : "") + "</dl>" +
            (proof ? '<a class="proof-image-link" href="' + esc(proof) + '" target="_blank" rel="noopener"><img class="payment-proof-image" src="' + esc(proof) + '" alt="Capture de paiement de la commande ' + esc(order.ref) + '"><span>Ouvrir la capture en grand ↗</span></a>' : '<p class="muted small">Aucun justificatif de paiement joint.</p>') +
            (pendingReview ? '<div class="field mt-2"><label for="reviewNote">Note (facultative, visible par le client si refusée)</label><textarea class="input" id="reviewNote" rows="2" placeholder="Ex. référence introuvable ou montant incorrect"></textarea></div>' : "") +
          "</div>"
        : "") +
      '<div class="admin-card" style="margin-top:14px"><div class="admin-card-head"><h3>Articles</h3></div>' +
        (order.items || []).map((it) => {
          const ev = S.getEvent(it.eventId);
          return '<div class="booking-line"><div><strong>' + esc(ev ? ev.title : "Événement supprimé") + '</strong><div class="muted">' + esc(it.tierName || "Billet") + " × " + it.qty + '</div></div><span>' + UI.money(it.unitPrice * it.qty) + "</span></div>";
        }).join("") +
        '<div class="booking-line"><span class="muted">Frais de service</span><span>' + UI.money(order.fees || 0) + "</span></div>" +
        (order.discount ? '<div class="booking-line" style="color:var(--green)"><span>Remise</span><span>−' + UI.money(order.discount) + "</span></div>" : "") +
        '<div class="summary-total"><span>' + (order.status === "paid" ? "Total payé" : "Montant de la commande") + '</span><strong>' + UI.money(order.total) + "</strong></div>" +
      "</div>" +
      '<div class="admin-card"><div class="admin-card-head"><h3>Billets &amp; contrôle d\'accès</h3><span class="muted">' + esc(UI.dateTime(order.createdAt)) + "</span></div>" +
        (order.status === "paid"
          ? '<div class="admin-ticket-list">' + (order.tickets || []).map((t) => {
            const ev = S.getEvent(t.eventId);
            return '<div class="admin-ticket" data-ticket="' + esc(t.code) + '">' +
              "<div><div class=\"admin-ticket-code mono\">" + esc(t.code) + "</div>" +
              '<div class="cell-sub">' + esc(ev ? ev.title : "Événement supprimé") + " · " + esc(t.holder) + "</div></div>" +
              (t.checkedIn
                ? '<span class="badge badge-red">Utilisé</span>'
                : '<button class="btn btn-ghost btn-sm" type="button" data-check-code="' + esc(t.code) + '">Valider</button>') +
            "</div>";
          }).join("") + "</div>"
          : '<p class="muted small">Les codes des billets ne sont pas actifs et ne seront affichés qu’après validation du paiement.</p>') +
      "</div>";

    UI.modal({
      title: "Commande " + order.ref,
      subtitle: UI.dateTime(order.createdAt) + " · " + order.email,
      wide: true,
      body: body,
      footer:
        '<button class="btn btn-ghost" type="button" data-close>Fermer</button>' +
        (order.status === "paid" && !order.seed ? '<button class="btn btn-outline" type="button" data-print-order>' + UI.icon("printer", 15) + " Imprimer</button>" : "") +
        (pendingReview
          ? '<button class="btn btn-danger" type="button" data-review="reject">Refuser</button><button class="btn btn-primary" type="button" data-review="approve">Valider le paiement</button>'
          : ""),
      onMount(el, close) {
        el.addEventListener("click", async (e) => {
          const btn = e.target.closest("[data-check-code]");
          if (!btn) return;
          const res = await S.checkIn(btn.getAttribute("data-check-code"));
          UI.toast(res.message, res.ok ? "success" : "error");
          if (res.ticket) {
            const row = el.querySelector('[data-ticket="' + res.ticket.code + '"]');
            if (row) {
              const badge = document.createElement("span");
              badge.className = "badge badge-red";
              badge.textContent = "Utilisé";
              const old = row.querySelector("button");
              if (old) old.replaceWith(badge);
            }
          }
        });
        const printBtn = el.querySelector("[data-print-order]");
        if (printBtn) printBtn.addEventListener("click", () => window.print());
        el.querySelectorAll("[data-review]").forEach((button) => {
          button.addEventListener("click", async () => {
            const decision = button.getAttribute("data-review");
            const noteField = el.querySelector("#reviewNote");
            const note = noteField ? noteField.value.trim() : "";
            if (decision === "reject") {
              const confirmed = await UI.confirmDialog({
                title: "Refuser cette commande ?",
                message: "Le billet restera inactif. Le motif indiqué sera visible par le client.",
                confirmLabel: "Refuser la commande",
                danger: true
              });
              if (!confirmed) return;
            }
            const result = await S.reviewOrder(order.ref, decision, note);
            if (!result.ok) { UI.toast(result.message, "error"); return; }
            close();
            UI.toast(decision === "approve" ? "Paiement validé. Les billets sont maintenant actifs." : "Commande refusée. Les places sont libérées.", decision === "approve" ? "success" : "info");
            if (window.TERANGAPASS_APP) window.TERANGAPASS_APP.rerender({ scroll: false });
          });
        });
      }
    });
  }

  /* =========================================================
     Connexion admin
     ========================================================= */
  function loginView(tab) {
    return (
      '<section class="admin-login"><div class="container" style="display:grid;place-items:center">' +
        '<div class="login-card">' +
          '<a class="brand" href="#/"><span class="brand-mark" aria-hidden="true">' +
            '<svg viewBox="0 0 32 32" width="20" height="20" fill="none"><path d="M3 17h5l3-9 5 16 3-7h5" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          "</span><span class=\"brand-name\">TERANGAPASS<span class=\"brand-dot\">.</span></span></a>" +
          '<h1 class="h2">Espace organisateur</h1>' +
          '<p class="muted small">Connectez-vous pour gérer vos événements, vos commandes et le contrôle d\'accès.</p>' +
          '<form id="adminLogin" class="mt-3">' +
            '<div class="field"><label for="adminEmail">Adresse e-mail</label><input class="input" id="adminEmail" type="email" autocomplete="username" required data-autofocus></div>' +
            '<div class="field"><label for="adminPass">Mot de passe</label>' +
              '<input class="input" id="adminPass" type="password" placeholder="••••••••" autocomplete="current-password" required data-autofocus></div>' +
            '<div class="field-error" data-error="adminLogin"></div>' +
            '<button class="btn btn-primary btn-block mt-2" type="submit">Se connecter ' + UI.icon("arrow", 16) + "</button>" +
          "</form>" +
          '<div class="hint">' + UI.icon("shield", 15) + "<span>Connexion sécurisée au serveur organisateur.</span></div>" +
          '<div class="center mt-3"><a class="small muted" href="#/">← Retour au site</a></div>' +
        "</div>" +
      "</div></section>"
    );
  }

  function adminShell(tab, content) {
    const tabs = [
      ["dashboard", "Tableau de bord", "chart"],
      ["events", "Événements", "calendar"],
      ["orders", "Commandes", "ticket"],
      ["payments", "Paiements", "card"],
      ["checkin", "Contrôle d'accès", "scan"]
    ];
    const st = S.stats();
    return (
      '<section class="admin"><div class="container">' +
        '<div class="admin-head">' +
          '<div><span class="eyebrow">Espace organisateur</span><h1 class="h1 mt-2">' +
            (tab === "dashboard" ? "Bonjour, équipe TERANGAPASS" : tab === "events" ? "Vos événements" : tab === "orders" ? "Vos commandes" : tab === "payments" ? "Comptes de réception" : "Contrôle d'accès") + "</h1>" +
            '<p class="muted small mt-1">' + esc(UI.todayLabel()) + " · " + S.getEvents().length + " événements · " + S.allOrders().length + " commandes</p></div>" +
          '<div class="row">' +
            (tab === "dashboard" ? '<button class="btn btn-primary btn-sm" type="button" id="newEvent">' + UI.icon("plus", 15) + " Ajouter un événement</button>" : "") +
            '<a class="btn btn-ghost btn-sm" href="#/">' + UI.icon("arrowLeft", 15) + " Voir le site</a>" +
            '<button class="btn btn-outline btn-sm" type="button" id="adminLogout">' + UI.icon("logout", 15) + " Déconnexion</button></div>" +
        "</div>" +
        '<nav class="admin-tabs" aria-label="Sections admin">' +
          tabs.map((t) => '<a href="#/admin?tab=' + t[0] + '" class="' + (tab === t[0] ? "is-active" : "") + '">' + UI.icon(t[2], 15) + " " + t[1] + "</a>").join("") +
        "</nav>" +
        content +
      "</div></section>"
    );
  }

  /* =========================================================
     Tableau de bord
     ========================================================= */
  function dashboardContent() {
    const st = S.stats();
    const waitingPayments = S.allOrders().filter((order) => order.status === "pending_review");
    const maxRevenue = Math.max.apply(null, st.byDay.map((d) => d.amount).concat([1]));
    const recent = S.allOrders().slice(0, 6);
    const top = st.perEvent.slice().sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const alerts = [];
    S.getEvents().forEach((ev) => {
      if (S.isPast(ev)) return;
      ev.tiers.forEach((t) => {
        const ts = S.tierStats(ev, t);
        if (ts.stock && ts.available <= Math.max(10, ts.stock * 0.08)) {
          alerts.push({ ev, tier: t, ts });
        }
      });
    });
    alerts.sort((a, b) => b.ts.ratio - a.ts.ratio);

    return (
      (waitingPayments.length
        ? '<div class="admin-card payment-review-alert"><div><span class="badge badge-amber">' + waitingPayments.length + (waitingPayments.length > 1 ? " paiements à vérifier" : " paiement à vérifier") + '</span><h3 class="h3 mt-2">Des commandes attendent votre vérification</h3><p class="muted small mt-1">Comparez la capture, le montant et la référence de transaction avec votre compte Mobile Money.</p></div><a class="btn btn-primary btn-sm" href="#/admin?tab=orders">Examiner les commandes</a></div>'
        : "") +
      '<div class="kpi-grid">' +
        '<div class="kpi"><div class="kpi-label"><span>CA sur 30 jours</span><span class="ic">' + UI.icon("money", 16) + '</span></div><strong>' + UI.money(st.revenue) + '</strong><div class="kpi-delta">Panier moyen ' + UI.money(st.avgOrder) + "</div></div>" +
        '<div class="kpi"><div class="kpi-label"><span>Billets vendus (30 j)</span><span class="ic">' + UI.icon("ticket", 16) + '</span></div><strong>' + st.tickets + '</strong><div class="kpi-delta neutral">' + UI.plural(st.totalTickets, "billet") + " au total</div></div>" +
        '<div class="kpi"><div class="kpi-label"><span>Commandes (30 j)</span><span class="ic">' + UI.icon("cart", 16) + '</span></div><strong>' + st.orders + '</strong><div class="kpi-delta neutral">' + st.totalOrders + " commandes enregistrées</div></div>" +
        '<div class="kpi"><div class="kpi-label"><span>Taux de remplissage</span><span class="ic">' + UI.icon("chart", 16) + '</span></div><strong>' + Math.round(st.fillRate * 100) + '&nbsp;%</strong><div class="kpi-delta neutral">' + st.sold + " / " + st.capacity + " places</div></div>" +
      "</div>" +

      '<div class="admin-grid">' +
        "<div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Chiffre d\'affaires — 14 derniers jours</h3><span class="muted">' + UI.money(st.byDay.reduce((s, d) => s + d.amount, 0)) + "</span></div>" +
            '<div class="chart" role="img" aria-label="Graphique du chiffre d\'affaires des 14 derniers jours">' +
              st.byDay.map((d, i) =>
                '<div class="chart-col" title="' + esc(d.label + " — " + UI.money(d.amount)) + '">' +
                  '<div class="chart-bar" style="height:' + Math.max(2, Math.round(d.amount / maxRevenue * 100)) + '%"></div>' +
                  '<span class="chart-label">' + (i % 2 === 0 ? esc(d.label) : "") + "</span>" +
                "</div>"
              ).join("") +
            "</div>" +
          "</div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Dernières commandes</h3><a class="small" href="#/admin?tab=orders" style="color:#8bb9ff">Tout voir →</a></div>' +
            '<div class="table-wrap" style="border:0;background:none"><table class="table" style="min-width:520px">' +
              "<thead><tr><th>Référence</th><th>Client</th><th>Date</th><th class=\"num\">Total</th><th></th></tr></thead><tbody>" +
              recent.map((o) =>
                "<tr><td class=\"cell-strong mono\">" + esc(o.ref) + "</td><td>" + esc(o.name) + '<div class="cell-sub">' + esc(o.email) + "</div></td>" +
                "<td>" + esc(UI.timeAgo(o.createdAt)) + '</td><td class="num">' + UI.money(o.total) + '</td>' +
                '<td class="num"><button class="btn btn-ghost btn-sm" type="button" data-order="' + esc(o.ref) + '">Détails</button></td></tr>'
              ).join("") +
              "</tbody></table></div>" +
          "</div>" +
        "</div>" +
        "<div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Top événements</h3><span class="muted">par CA</span></div>' +
            top.map((item) =>
              '<div class="progress-row"><div class="pr-head"><div><strong>' + esc(item.event.title) + '</strong><div class="cell-sub">' + esc(item.event.venue.city) + " · " + UI.money(item.revenue) + "</div></div>" +
              "<span>" + Math.round(item.stats.ratio * 100) + "%</span></div>" +
              '<div class="progress ' + (item.stats.ratio >= 0.95 ? "full" : item.stats.ratio >= 0.8 ? "warn" : "") + '"><span style="width:' + Math.round(item.stats.ratio * 100) + '%"></span></div></div>'
            ).join("") +
          "</div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Alertes stock</h3><span class="muted">' + alerts.length + "</span></div>" +
            (alerts.length ? alerts.slice(0, 6).map((a) =>
              '<div class="progress-row"><div class="pr-head"><div><strong>' + esc(a.ev.title) + '</strong><div class="cell-sub">' + esc(a.tier.name) + " · " + a.ts.available + " restant" + (a.ts.available > 1 ? "s" : "") + "</div></div>" +
              '<span class="' + (a.ts.available === 0 ? "badge badge-red" : "badge badge-amber") + '">' + (a.ts.available === 0 ? "Épuisé" : "Bientôt épuisé") + "</span></div></div>"
            ).join("") : '<p class="muted small">Aucune alerte : tous les stocks sont confortables.</p>') +
          "</div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Contrôle d\'accès</h3><span class="muted">' + st.checked + " / " + st.totalTickets + "</span></div>" +
            '<div class="progress"><span style="width:' + (st.totalTickets ? Math.round(st.checked / st.totalTickets * 100) : 0) + '%"></span></div>' +
            '<p class="muted small mt-2">' + (st.totalTickets - st.checked) + " billets restent à scanner.</p>" +
            '<a class="btn btn-outline btn-sm mt-2" href="#/admin?tab=checkin">' + UI.icon("scan", 15) + " Ouvrir le scanner</a>" +
          "</div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Exploitation</h3></div>' +
            '<p class="muted small">Les événements, stocks et commandes sont enregistrés dans la base de données du serveur.</p>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  /* =========================================================
     Événements
     ========================================================= */
  function eventsContent() {
    const events = S.getEvents().slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    return (
      '<div class="admin-toolbar">' +
        '<div class="search-field">' + UI.icon("search", 16) + '<input type="search" id="adminEventSearch" placeholder="Rechercher un événement ou une ville…" aria-label="Rechercher un événement"></div>' +
        '<button class="btn btn-primary btn-sm" type="button" id="newEvent">' + UI.icon("plus", 15) + " Nouvel événement</button>" +
      "</div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Événement</th><th>Date</th><th>Remplissage</th><th class="num">Dès</th><th>Statut</th><th class="num">Actions</th></tr></thead>' +
        '<tbody id="adminEventsBody">' + events.map(eventAdminRow).join("") + "</tbody></table></div>" +
      '<p class="tiny muted mt-2">' + events.length + " événements · les modifications sont immédiatement visibles sur le site public.</p>"
    );
  }

  function eventAdminRow(ev) {
    const st = S.eventStats(ev);
    const pct = Math.round(st.ratio * 100);
    const status = S.isPast(ev) ? '<span class="badge badge-muted">Terminé</span>'
      : st.status === "out" ? '<span class="badge badge-red">Complet</span>'
      : st.status === "low" ? '<span class="badge badge-amber">Dernières places</span>'
      : '<span class="badge badge-green">En ligne</span>';
    return (
      '<tr data-event-row data-search="' + esc((ev.title + " " + ev.venue.city + " " + ev.category).toLowerCase()) + '">' +
        '<td><div class="event-cell"><div class="thumb">' + UI.posterSVG(ev) + '</div><div><div class="cell-strong">' + esc(ev.title) + '</div><div class="cell-sub">' + esc(S.category(ev.category).label + " · " + ev.venue.name + ", " + ev.venue.city) + "</div></div></div></td>" +
        "<td>" + esc(UI.formatDate(ev.date, "short")) + '<div class="cell-sub">' + esc(UI.formatTime(ev.date)) + "</div></td>" +
        '<td style="min-width:150px"><div class="progress ' + (pct >= 95 ? "full" : pct >= 80 ? "warn" : "") + '"><span style="width:' + pct + '%"></span></div><div class="cell-sub">' + st.sold + " / " + st.capacity + " · " + pct + "%</div></td>" +
        '<td class="num">' + UI.money(st.minPrice) + "</td>" +
        "<td>" + status + "</td>" +
        '<td><div class="table-actions">' +
          '<button class="icon-btn" type="button" data-edit="' + esc(ev.id) + '" aria-label="Modifier ' + esc(ev.title) + '">' + UI.icon("edit", 15) + "</button>" +
          '<button class="icon-btn" type="button" data-del="' + esc(ev.id) + '" aria-label="Supprimer ' + esc(ev.title) + '">' + UI.icon("trash", 15) + "</button>" +
        "</div></td>" +
      "</tr>"
    );
  }

  /* =========================================================
     Commandes
     ========================================================= */
  function ordersContent() {
    const orders = S.allOrders();
    const pendingCount = orders.filter((order) => order.status === "pending_review").length;
    return (
      '<div class="admin-toolbar">' +
        '<div class="search-field">' + UI.icon("search", 16) + '<input type="search" id="adminOrderSearch" placeholder="Référence, nom ou e-mail…" aria-label="Rechercher une commande"></div>' +
        '<div class="row"><span class="muted small">' + orders.length + " commandes</span>" +
          (pendingCount ? '<span class="badge badge-amber">' + pendingCount + " à vérifier</span>" : "") +
          '<button class="btn btn-ghost btn-sm" type="button" id="refreshOrders">Actualiser</button>' +
          '<button class="btn btn-outline btn-sm" type="button" id="exportCsv">' + UI.icon("download", 15) + " Exporter CSV</button></div>" +
      "</div>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>Référence</th><th>Client</th><th>Statut / date</th><th class="num">Billets</th><th class="num">Total</th><th class="num">Actions</th></tr></thead>' +
        '<tbody id="adminOrdersBody">' + orders.map(orderAdminRow).join("") + "</tbody></table></div>"
    );
  }

  function paymentSettingsContent() {
    const accounts = S.getPaymentAccounts();
    return (
      '<div class="admin-card payment-settings-card">' +
        '<div class="admin-card-head"><h3>Coordonnées de réception</h3><span class="badge badge-amber">Transferts manuels</span></div>' +
        '<p class="muted small mb-3">Les comptes professionnels sont fournis par la configuration du serveur.</p>' +
        '<dl class="order-details">' +
          '<dt>Orange Money</dt><dd>' + esc(accounts.orangeMoney || "Non configuré") + '</dd>' +
          '<dt>Wave</dt><dd>' + esc(accounts.wave || "Non configuré") + '</dd>' +
        '</dl>' +
      '</div>' +
      '<div class="info-band" style="max-width:none;margin-top:16px">' + UI.icon("info", 18) + '<div>Les paiements sont effectués à l’extérieur du site puis vérifiés manuellement par un organisateur. Les identifiants de compte doivent être configurés dans le fichier d’environnement du serveur avant toute vente.</div></div>'
    );
  }

  function orderAdminRow(o) {
    const payInfo = o.payment && o.payment.provider ? (o.payment.method === "wave" ? "🌊 " : "🟠 ") + esc(o.payment.provider) : "";
    const status = o.status === "paid" ? '<span class="badge badge-green">Validée</span>'
      : o.status === "rejected" ? '<span class="badge badge-red">Refusée</span>'
      : o.status === "refunded" ? '<span class="badge badge-muted">Remboursée</span>'
      : '<span class="badge badge-amber">À vérifier</span>';
    return (
      '<tr data-order-row data-search="' + esc((o.ref + " " + o.name + " " + o.email).toLowerCase()) + '">' +
        '<td class="cell-strong mono">' + esc(o.ref) + (o.seed ? '<div class="cell-sub">démo</div>' : "") + "</td>" +
        '<td><div class="cell-strong">' + esc(o.name) + '</div><div class="cell-sub">' + (payInfo ? payInfo + " · " : "") + esc(o.email) + "</div></td>" +
        "<td>" + status + '<div class="cell-sub">' + esc(UI.formatDate(o.createdAt, "short")) + " · " + esc(UI.timeAgo(o.createdAt)) + "</div></td>" +
        '<td class="num">' + ((o.tickets || []).length || (o.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0)) + "</td>" +
        '<td class="num">' + UI.money(o.total) + "</td>" +
        '<td><div class="table-actions"><button class="btn btn-ghost btn-sm" type="button" data-order="' + esc(o.ref) + '">Détails</button></div></td>' +
      "</tr>"
    );
  }

  function csvEscape(value) {
    const s = String(value == null ? "" : value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportCsv() {
    const rows = [["reference", "date", "nom", "email", "telephone", "paiement", "billets", "total_xof", "code_promo", "statut"]];
    S.allOrders().forEach((o) => {
      rows.push([
        o.ref,
        new Date(o.createdAt).toLocaleString("fr-SN", { timeZone: "Africa/Dakar" }),
        o.name,
        o.email,
        o.phone || "",
        (o.payment && o.payment.provider ? o.payment.provider + (o.payment.accountPhone ? " (" + o.payment.accountPhone + ")" : "") : "Mobile Money"),
        (o.tickets || []).length || (o.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
        o.total.toFixed(2).replace(".", ","),
        o.promo || "",
        o.status === "paid" ? "validée" : o.status === "pending_review" ? "en attente" : o.status === "rejected" ? "refusée" : o.status
      ]);
    });
    const csv = "\uFEFF" + rows.map((r) => r.map(csvEscape).join(";")).join("\r\n");
    const ok = UI.downloadFile("terangapass-commandes.csv", csv, "text/csv;charset=utf-8");
    UI.toast(ok ? "Export CSV téléchargé." : "Export indisponible sur ce navigateur.", ok ? "success" : "error");
  }

  /* =========================================================
     Contrôle d'accès
     ========================================================= */
  function scanContent() {
    const all = [];
    S.allOrders().filter((o) => o.status === "paid").forEach((o) => (o.tickets || []).forEach((t) => all.push({ ticket: t, order: o })));
    const checked = all.filter((x) => x.ticket.checkedIn).length;
    const recent = all.filter((x) => !x.ticket.checkedIn).slice(0, 8);

    return (
      '<div class="scan-panel">' +
        '<div class="admin-card scan-box">' +
          '<div class="admin-card-head"><h3>Scanner un billet</h3><span class="badge badge-green">' + UI.icon("scan", 13) + " En ligne</span></div>" +
          '<p class="muted small">Saisissez le code du billet (ou scannez-le avec un lecteur USB / Bluetooth). Chaque code ne peut être validé qu\'une seule fois.</p>' +
          '<form id="scanForm">' +
            '<div class="scan-input-row">' +
              '<input class="input" id="scanInput" placeholder="TGP-XXXX-XXXX-XXXX" autocomplete="off" spellcheck="false" data-autofocus aria-label="Code du billet">' +
              '<button class="btn btn-primary" type="submit">Valider</button>' +
            "</div>" +
          "</form>" +
          '<div class="scan-result" id="scanResult">' + UI.icon("info", 16) + ' En attente d\'un scan…</div>' +
          '<div class="kpi-grid" style="grid-template-columns:1fr 1fr;margin-top:16px;margin-bottom:0">' +
            '<div class="kpi"><div class="kpi-label">Validés</div><strong id="scanCheckedCount">' + checked + '</strong></div>' +
            '<div class="kpi"><div class="kpi-label">Total</div><strong>' + all.length + '</strong></div>' +
          "</div>" +
        "</div>" +
        "<div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Derniers scans</h3><span class="muted">session</span></div>' +
            '<div class="scan-history" id="scanHistory">' + renderScanHistory() + "</div>" +
          "</div>" +
          '<div class="admin-card">' +
            '<div class="admin-card-head"><h3>Billets à valider</h3><span class="muted">' + (all.length - checked) + " restants</span></div>" +
            '<div class="scan-history">' +
              (recent.length ? recent.map((x) => {
                const ev = S.getEvent(x.ticket.eventId);
                return '<div class="scan-history-item"><div><div class="code">' + esc(x.ticket.code) + '</div><div class="cell-sub">' + esc(ev ? ev.title : "Événement") + " · " + esc(x.ticket.holder) + "</div></div>" +
                  '<button class="btn btn-ghost btn-sm" type="button" data-scan-code="' + esc(x.ticket.code) + '">Scanner</button></div>';
              }).join("") : '<p class="muted small">Tous les billets ont été validés.</p>') +
            "</div>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderScanHistory() {
    if (!scanHistory.length) {
      return '<p class="muted small">Aucun scan pour le moment. Les validations apparaîtront ici.</p>';
    }
    return scanHistory.slice(0, 10).map((h) =>
      '<div class="scan-history-item"><div><div class="code">' + esc(h.code) + '</div><div class="cell-sub">' + esc(h.label) + " · " + esc(h.time) + "</div></div>" +
      '<span class="' + (h.ok ? "ok" : "bad") + '">' + (h.ok ? "Validé" : h.reason === "already" ? "Déjà utilisé" : "Inconnu") + "</span></div>"
    ).join("");
  }

  function scanResultHtml(res) {
    if (!res.ok && !res.ticket) {
      return (
        '<div class="scan-result invalid"><div class="sr-head">' + UI.icon("alert", 17) + " Billet refusé</div>" +
        esc(res.message) + "</div>"
      );
    }
    const t = res.ticket;
    const ev = S.getEvent(t.eventId);
    const order = res.order;
    const tier = ev ? S.getTier(ev, t.tierId) : null;
    return (
      '<div class="scan-result ' + (res.ok ? "valid" : "invalid") + '">' +
        '<div class="sr-head">' + UI.icon(res.ok ? "checkCircle" : "alert", 17) + " " + (res.ok ? "Billet valide" : res.reason === "already" ? "Billet déjà utilisé" : res.reason === "not_approved" ? "Paiement non validé" : "Billet refusé") + "</div>" +
        '<p class="muted tiny">' + esc(res.message) + "</p>" +
        "<dl>" +
          "<dt>Événement</dt><dd>" + esc(ev ? ev.title : "—") + "</dd>" +
          "<dt>Titulaire</dt><dd>" + esc(t.holder) + "</dd>" +
          "<dt>Catégorie</dt><dd>" + esc(tier ? tier.name : "—") + "</dd>" +
          "<dt>Commande</dt><dd>" + esc(order ? order.ref : "—") + "</dd>" +
          (t.checkedInAt ? "<dt>Validé le</dt><dd>" + esc(UI.dateTime(t.checkedInAt)) + "</dd>" : "") +
        "</dl>" +
      "</div>"
    );
  }

  /* =========================================================
     Vue admin
     ========================================================= */
  Views.admin = {
    title: "Espace organisateur — TERANGAPASS",
    render(params, query) {
      const tab = (query && query.get("tab")) || "dashboard";
      if (!S.isAdmin()) return loginView(tab);
      let content = "";
      if (tab === "events") content = eventsContent();
      else if (tab === "orders") content = ordersContent();
      else if (tab === "payments") content = paymentSettingsContent();
      else if (tab === "checkin") content = scanContent();
      else content = dashboardContent();
      return adminShell(tab, content);
    },
    mount(root) {
      if (!S.isAdmin()) {
        const form = root.querySelector("#adminLogin");
        if (!form) return;
        form.addEventListener("submit", async (e) => {
          e.preventDefault();
          const email = form.querySelector("#adminEmail").value.trim();
          const pass = form.querySelector("#adminPass").value;
          if (await S.login(email, pass)) {
            UI.toast("Bienvenue dans l'espace organisateur.", "success");
            window.TERANGAPASS_APP.rerender({ scroll: false });
          } else {
            const err = root.querySelector('[data-error="adminLogin"]');
            if (err) err.textContent = "Connexion impossible. Vérifiez vos identifiants.";
            form.querySelector("#adminPass").classList.add("is-invalid");
            form.querySelector("#adminPass").select();
            UI.toast("Connexion impossible.", "error");
          }
        });
        return;
      }

      const logout = root.querySelector("#adminLogout");
      if (logout) {
        logout.addEventListener("click", async () => {
          await S.logout();
          window.location.hash = "#/admin";
          window.TERANGAPASS_APP.rerender({ scroll: false });
          UI.toast("Vous êtes déconnecté.", "info");
        });
      }

      // Actions communes
      root.addEventListener("click", async (e) => {
        const orderBtn = e.target.closest("[data-order]");
        if (orderBtn) { openOrderModal(orderBtn.getAttribute("data-order")); return; }

        const edit = e.target.closest("[data-edit]");
        if (edit) {
          const ev = S.getEvent(edit.getAttribute("data-edit"));
          if (ev) openEventEditor(ev);
          return;
        }

        const del = e.target.closest("[data-del]");
        if (del) {
          const ev = S.getEvent(del.getAttribute("data-del"));
          if (!ev) return;
          UI.confirmDialog({
            title: "Supprimer l'événement ?",
            message: "« " + ev.title + " » sera retiré du site public. Les commandes existantes resteront visibles dans l'historique.",
            confirmLabel: "Supprimer",
            danger: true
          }).then(async (ok) => {
            if (!ok) return;
            const removed = await S.deleteEvent(ev.id);
            if (!removed) { UI.toast("Impossible d'archiver cet événement.", "error"); return; }
            UI.toast("Événement supprimé.", "info");
            window.TERANGAPASS_APP.rerender({ scroll: false });
          });
          return;
        }

        if (e.target.closest("#newEvent")) { openEventEditor(null); return; }
        if (e.target.closest("#refreshOrders")) {
          await S.refresh();
          window.TERANGAPASS_APP.rerender({ scroll: false });
          return;
        }
        if (e.target.closest("#exportCsv")) { exportCsv(); return; }

        const scanQuick = e.target.closest("[data-scan-code]");
        if (scanQuick) {
          const input = root.querySelector("#scanInput");
          if (input) input.value = scanQuick.getAttribute("data-scan-code");
          doScan(scanQuick.getAttribute("data-scan-code"));
        }
      });

      // Recherche événements / commandes
      const eventSearch = root.querySelector("#adminEventSearch");
      if (eventSearch) {
        eventSearch.addEventListener("input", UI.debounce(() => {
          const q = eventSearch.value.toLowerCase().trim();
          Array.prototype.forEach.call(root.querySelectorAll("[data-event-row]"), (row) => {
            row.style.display = !q || row.getAttribute("data-search").indexOf(q) >= 0 ? "" : "none";
          });
        }, 120));
      }

      const orderSearch = root.querySelector("#adminOrderSearch");
      if (orderSearch) {
        orderSearch.addEventListener("input", UI.debounce(() => {
          const q = orderSearch.value.toLowerCase().trim();
          Array.prototype.forEach.call(root.querySelectorAll("[data-order-row]"), (row) => {
            row.style.display = !q || row.getAttribute("data-search").indexOf(q) >= 0 ? "" : "none";
          });
        }, 120));
      }

      // Scanner
      const scanForm = root.querySelector("#scanForm");
      const scanInput = root.querySelector("#scanInput");
      async function doScan(code) {
        const input = root.querySelector("#scanInput");
        const clean = String(code || "").trim().toUpperCase();
        if (!clean) return;
        const res = await S.checkIn(clean);
        const resultEl = root.querySelector("#scanResult");
        if (resultEl) resultEl.innerHTML = scanResultHtml(res);

        let label = clean;
        if (res.ticket) {
          const ev = S.getEvent(res.ticket.eventId);
          label = (ev ? ev.title : "Billet") + " · " + res.ticket.holder;
        }
        scanHistory.unshift({
          code: clean,
          ok: res.ok,
          reason: res.reason || "",
          label: label,
          time: UI.formatTime(new Date())
        });
        if (scanHistory.length > 12) scanHistory.pop();
        const historyEl = root.querySelector("#scanHistory");
        if (historyEl) historyEl.innerHTML = renderScanHistory();
        const checkedEl = root.querySelector("#scanCheckedCount");
        if (checkedEl) {
          const all = S.allOrders().reduce((s, o) => s + (o.tickets || []).length, 0);
          const checked = S.allOrders().reduce((s, o) => s + (o.tickets || []).filter((t) => t.checkedIn).length, 0);
          checkedEl.textContent = checked;
        }
        UI.toast(res.message, res.ok ? "success" : "error");
        const inputEl = root.querySelector("#scanInput");
        if (inputEl) { inputEl.value = ""; inputEl.focus(); }
      }
      if (scanForm) {
        scanForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          doScan(scanInput.value);
        });
      }
    }
  };
})();
