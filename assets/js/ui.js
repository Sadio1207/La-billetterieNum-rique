/* =========================================================
   TERANGAPASS — UI kit (formatage, visuels, barcode, toast, modal)
   ========================================================= */
(function () {
  "use strict";

  const D = window.TERANGAPASS_DATA;

  /* ---------- échappement & formats ---------- */
  const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ESC_MAP[c]);
  }

  function money(n) {
    return (Number(n) || 0).toLocaleString("fr-SN", { style: "currency", currency: "XOF" });
  }

  function dateObj(iso) {
    if (iso instanceof Date) return iso;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }

  function formatDate(iso, style) {
    const d = dateObj(iso);
    if (!d) return "Date à confirmer";
    const opts = {
      long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
      medium: { weekday: "short", day: "numeric", month: "short", year: "numeric" },
      short: { weekday: "short", day: "numeric", month: "short" },
      full: { weekday: "long", day: "numeric", month: "long" },
      day: { day: "2-digit" },
      month: { month: "short" },
      time: { hour: "2-digit", minute: "2-digit" },
      monthYear: { month: "long", year: "numeric" }
    }[style || "medium"];
    const s = d.toLocaleDateString("fr-SN", Object.assign({ timeZone: "Africa/Dakar" }, opts));
    return s.replace(/^./, (c) => c.toUpperCase());
  }

  function formatTime(iso) {
    const d = dateObj(iso);
    if (!d) return "";
    return d.toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Dakar" });
  }

  function dateTime(iso) {
    const d = dateObj(iso);
    if (!d) return "";
    return formatDate(d, "short") + " · " + formatTime(d);
  }

  function dayNum(iso) {
    const d = dateObj(iso);
    return d ? String(d.getUTCDate()).padStart(2, "0") : "--";
  }
  function monthShort(iso) {
    const d = dateObj(iso);
    return d ? d.toLocaleDateString("fr-SN", { month: "short", timeZone: "Africa/Dakar" }).replace(".", "").toUpperCase() : "";
  }

  function relativeDay(iso) {
    const d = dateObj(iso);
    if (!d) return "";
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const eventDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const days = Math.round((eventDay - today) / D.DAY);
    if (days < 0) return "Terminé";
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Demain";
    if (days < 7) return "Dans " + days + " jours";
    if (days < 31) return "Dans " + Math.round(days / 7) + " sem.";
    return "Dans " + Math.round(days / 30) + " mois";
  }

  function timeAgo(iso) {
    const d = dateObj(iso);
    if (!d) return "";
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "à l'instant";
    if (mins < 60) return "il y a " + mins + " min";
    const hours = Math.floor(mins / 60);
    if (hours < 24) return "il y a " + hours + " h";
    const days = Math.floor(hours / 24);
    if (days === 1) return "hier";
    if (days < 31) return "il y a " + days + " j";
    return formatDate(d, "short");
  }

  function countdownParts(iso) {
    const target = dateObj(iso);
    if (!target) return null;
    let diff = target.getTime() - Date.now();
    if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, over: true };
    const s = Math.floor(diff / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60,
      over: false
    };
  }

  function pad(n) { return String(n).padStart(2, "0"); }

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");
  }

  function slugId(str) {
    return String(str || "x").replace(/[^a-zA-Z0-9_-]/g, "");
  }

  /* ---------- icônes ---------- */
  const ICONS = {
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3.5v4M16 3.5v4M3.5 10h17"/>',
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    ticket: '<path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a3 3 0 0 0 0 6v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a3 3 0 0 0 0-6z"/><path d="M13 5v2.5M13 11v2M13 16.5V19" stroke-dasharray="1 2.5"/>',
    cart: '<path d="M4 5h2l2.2 10.2a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 1.9-1.4L21 8H7"/><circle cx="10" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/>',
    check: '<path d="m20 6.5-11 11-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.6 2.6L16.5 9"/>',
    arrow: '<path d="M4.5 12h15"/><path d="m13 5.5 6.5 6.5-6.5 6.5"/>',
    arrowLeft: '<path d="M19.5 12h-15"/><path d="m11 5.5-6.5 6.5 6.5 6.5"/>',
    shield: '<path d="M12 3.2 19 6v5.8c0 4.4-2.9 7.4-7 8.9-4.1-1.5-7-4.5-7-8.9V6z"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    users: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 20c.5-3.2 2.7-5 5.5-5s5 1.8 5.5 5"/><path d="M16 5.6a3.2 3.2 0 0 1 0 6M17.5 15.2c1.8.6 3 2.2 3.3 4.8"/>',
    card: '<rect x="2.8" y="5" width="18.4" height="14" rx="3"/><path d="M2.8 9.5h18.4"/><path d="M6.5 15h4"/>',
    lock: '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle cx="12" cy="15.2" r="1.2"/>',
    download: '<path d="M12 3.5v11"/><path d="m7.5 10 4.5 4.5 4.5-4.5"/><path d="M4.5 18.5v1a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-1"/>',
    printer: '<path d="M7 8.5V3.8h10V8.5"/><rect x="3.5" y="8.5" width="17" height="8.5" rx="2"/><path d="M7 15.5h10v4.8H7z"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4.1M8.2 13.2l7.6 4.1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12.2a2 2 0 0 0 2 1.8h5.2a2 2 0 0 0 2-1.8L18 7"/><path d="M10.2 11v5.5M13.8 11v5.5"/>',
    edit: '<path d="m14.5 5.5 4 4M4.5 19.5l1-4.6L15.6 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L9.1 18.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    chevronDown: '<path d="m6 9.5 6 6 6-6"/>',
    chevronRight: '<path d="m9.5 6 6 6-6 6"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
    alert: '<path d="M12 3.8 21 20H3z"/><path d="M12 9.5v4.8M12 17.3v.2"/>',
    sparkles: '<path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18l-1.8-5.4L4.5 10.8 10.2 9z"/><path d="M19 16.5v3M17.5 18h3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M7.5 3.8 10 8l-2 2.2a12 12 0 0 0 5.8 5.8l2.2-2 4.2 2.5a2 2 0 0 1 .9 1.7v1.2a2 2 0 0 1-2.2 2A16.8 16.8 0 0 1 3.6 6a2 2 0 0 1 2-2.2h1.9z"/>',
    scan: '<path d="M4 8.5V6a2 2 0 0 1 2-2h2.5M15.5 4H18a2 2 0 0 1 2 2v2.5M20 15.5V18a2 2 0 0 1-2 2h-2.5M8.5 20H6a2 2 0 0 1-2-2v-2.5M8 8v8M11 8v8M14 8v8M17 8v8"/>',
    copy: '<rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2.5"/><path d="M15.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H5.5A1.5 1.5 0 0 0 4 4v8.5A1.5 1.5 0 0 0 5.5 14h1.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    money: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 9h18M7 14h4"/><circle cx="16.5" cy="14" r="1.5"/>',
    play: '<path d="M8 5.5 19 12 8 18.5z"/>',
    fire: '<path d="M12 21c4 0 7-2.8 7-6.6 0-3-1.8-5-3.2-6.9-.7-.9-1.3-1.9-1.5-3.2-2.6 1.4-4 4.1-4.1 6.2-1-.7-1.6-1.7-1.9-2.9C6.7 9 5 11.5 5 14.4 5 18.2 8 21 12 21z"/>',
    image: '<rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 15-5-5L5 20"/>',
    mobile: '<rect x="5.5" y="2.5" width="13" height="19" rx="3"/><circle cx="12" cy="17.5" r="1"/>',
    map: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>',
    logout: '<path d="M15 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M10 8l-4 4 4 4M6 12h9"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>'
  };

  function icon(name, size, extraClass) {
    const body = ICONS[name];
    if (!body) return "";
    const s = size || 18;
    return '<svg class="' + (extraClass || "") + '" viewBox="0 0 24 24" width="' + s + '" height="' + s +
      '" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      body + "</svg>";
  }

  /* ---------- affiche générative ---------- */
  const MOTIFS = ["waves", "rings", "sun", "grid", "shards", "blob", "stars", "arc", "stripes", "orbit"];

  function motifMarkup(motif, c2, c3) {
    switch (motif) {
      case "waves": {
        let paths = "";
        for (let i = 0; i < 8; i++) {
          const y = 90 + i * 62;
          paths += '<path d="M-60 ' + y + ' C 140 ' + (y - 70) + ', 300 ' + (y + 80) + ', 470 ' + (y + 5) +
            ' S 760 ' + (y - 70) + ', 880 ' + (y + 20) + '" opacity="' + (0.18 + i * 0.045) + '"/>';
        }
        return '<g fill="none" stroke="' + c3 + '" stroke-width="2.4">' + paths + "</g>";
      }
      case "rings": {
        let out = "";
        for (let i = 0; i < 7; i++) {
          out += '<circle cx="620" cy="140" r="' + (46 + i * 44) + '" fill="none" stroke="' + c3 +
            '" stroke-width="' + (i % 2 ? 1.4 : 3) + '" opacity="' + (0.5 - i * 0.05) + '"/>';
        }
        out += '<circle cx="620" cy="140" r="26" fill="' + c3 + '" opacity=".85"/>';
        return out;
      }
      case "sun": {
        let lines = "";
        for (let i = 0; i < 9; i++) {
          lines += '<rect x="0" y="' + (365 + i * 28) + '" width="800" height="' + (7 + i * 2) + '" fill="#05070b" opacity=".' + (4 + i) + '"/>';
        }
        return '<circle cx="400" cy="565" r="240" fill="' + c3 + '" opacity=".55"/>' +
          '<circle cx="400" cy="565" r="170" fill="' + c2 + '" opacity=".4"/>' + lines;
      }
      case "grid": {
        let out = "";
        for (let i = 0; i <= 10; i++) {
          const x = 400 + (i - 5) * 88;
          out += '<line x1="400" y1="210" x2="' + (400 + (x - 400) * 2.6) + '" y2="620" stroke="' + c3 + '" stroke-width="1.2" opacity=".38"/>';
        }
        for (let i = 0; i < 10; i++) {
          const y = 230 + Math.pow(i / 10, 1.8) * 390;
          out += '<line x1="0" y1="' + y + '" x2="800" y2="' + y + '" stroke="' + c3 + '" stroke-width="1.2" opacity=".28"/>';
        }
        return out;
      }
      case "shards": {
        const polys = [
          "120,80 300,40 260,230 90,260",
          "330,120 520,60 590,240 380,280",
          "600,60 760,120 740,300 610,250",
          "150,300 330,250 300,470 120,440",
          "380,320 560,270 620,470 400,500",
          "110,490 280,470 330,620 80,620"
        ];
        return polys.map((p, i) =>
          '<polygon points="' + p + '" fill="' + (i % 2 ? c3 : c2) + '" opacity="' + (i % 2 ? 0.3 : 0.22) +
          '" stroke="' + c3 + '" stroke-width="1.2"/>').join("");
      }
      case "blob": {
        return '<path d="M120 470 C 40 360, 110 220, 260 200 C 380 184, 430 100, 560 120 C 720 144, 780 280, 700 400 C 640 492, 500 470, 420 540 C 330 620, 180 570, 120 470Z" fill="' + c2 + '" opacity=".3"/>' +
          '<path d="M250 420 C 210 330, 300 250, 400 260 C 500 270, 540 350, 490 420 C 440 490, 300 500, 250 420Z" fill="' + c3 + '" opacity=".26"/>';
      }
      case "stars": {
        let out = "";
        for (let i = 0; i < 38; i++) {
          const x = (i * 173.7) % 780 + 10;
          const y = (i * 97.3) % 560 + 20;
          const r = i % 7 === 0 ? 2.6 : 1.2;
          out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="#fff" opacity="' + (0.25 + (i % 5) * 0.13) + '"/>';
        }
        const star = (x, y, s) => '<path d="M' + x + " " + (y - s) + " L" + (x + s * 0.3) + " " + (y - s * 0.3) +
          " L" + (x + s) + " " + y + " L" + (x + s * 0.3) + " " + (y + s * 0.3) + " L" + x + " " + (y + s) +
          " L" + (x - s * 0.3) + " " + (y + s * 0.3) + " L" + (x - s) + " " + y + " L" + (x - s * 0.3) + " " + (y - s * 0.3) + "Z\" fill=\"" + c3 + '" opacity=".8"/>';
        return out + star(620, 150, 26) + star(160, 380, 14) + star(690, 420, 10);
      }
      case "arc": {
        let out = "";
        for (let i = 0; i < 6; i++) {
          out += '<path d="M' + (-40 + i * 20) + ' 640 A ' + (420 - i * 40) + ' ' + (420 - i * 40) + ' 0 0 1 ' + (840 - i * 20) + ' 640" fill="none" stroke="' + (i % 2 ? c2 : c3) + '" stroke-width="' + (i % 2 ? 1.5 : 3) + '" opacity="' + (0.5 - i * 0.06) + '"/>';
        }
        return out;
      }
      case "stripes": {
        let out = "";
        for (let i = 0; i < 14; i++) {
          out += '<rect x="' + (-260 + i * 88) + '" y="-160" width="' + (i % 3 === 0 ? 34 : 12) + '" height="900" fill="' + (i % 3 === 0 ? c3 : c2) + '" opacity="' + (0.1 + (i % 4) * 0.05) + '" transform="rotate(22 400 300)"/>';
        }
        return out;
      }
      case "orbit":
      default: {
        return '<g fill="none" stroke="' + c3 + '" stroke-width="1.6" opacity=".5">' +
          '<ellipse cx="400" cy="310" rx="330" ry="130" transform="rotate(-18 400 310)"/>' +
          '<ellipse cx="400" cy="310" rx="250" ry="200" transform="rotate(24 400 310)"/>' +
          '<ellipse cx="400" cy="310" rx="150" ry="290" transform="rotate(-42 400 310)"/>' +
          "</g>" +
          '<circle cx="618" cy="238" r="14" fill="' + c3 + '"/>' +
          '<circle cx="212" cy="354" r="8" fill="#fff" opacity=".8"/>';
      }
    }
  }

  let posterSeq = 0;

  function posterSVG(event, opts) {
    opts = opts || {};
    if (event && event.image && !opts.vectorOnly) {
      return '<img src="' + esc(event.image) + '" alt="Affiche ' + esc(event.title || "") + '" class="event-poster-img" loading="lazy" onerror="this.onerror=null;this.classList.add(\'is-broken\');">';
    }
    const p = (event && event.poster) || {};
    const c1 = /^#[0-9a-f]{3,8}$/i.test(p.c1 || "") ? p.c1 : "#07132c";
    const c2 = /^#[0-9a-f]{3,8}$/i.test(p.c2 || "") ? p.c2 : "#176bff";
    const c3 = /^#[0-9a-f]{3,8}$/i.test(p.c3 || "") ? p.c3 : "#ff174f";
    const motif = MOTIFS.indexOf(p.motif) >= 0 ? p.motif : "waves";
    const uid = "p" + (++posterSeq) + "-" + slugId(event.id) + (opts.variant || "");
    const letters = String(event.title || "P")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("");

    const svg =
      '<svg viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Affiche ' + esc(event.title) + '">' +
        "<defs>" +
          '<linearGradient id="bg-' + uid + '" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0" stop-color="' + c1 + '"/>' +
            '<stop offset="0.55" stop-color="' + c2 + '"/>' +
            '<stop offset="1" stop-color="' + c3 + '"/>' +
          "</linearGradient>" +
          '<radialGradient id="glow-' + uid + '" cx="0.3" cy="0.2" r="0.9">' +
            '<stop offset="0" stop-color="#ffffff" stop-opacity=".45"/>' +
            '<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>' +
          "</radialGradient>" +
          '<radialGradient id="vig-' + uid + '" cx="0.5" cy="0.55" r="0.75">' +
            '<stop offset="0.45" stop-color="#05050a" stop-opacity="0"/>' +
            '<stop offset="1" stop-color="#05050a" stop-opacity=".72"/>' +
          "</radialGradient>" +
          '<filter id="blur-' + uid + '" x="-40%" y="-40%" width="180%" height="180%">' +
            '<feGaussianBlur stdDeviation="55"/>' +
          "</filter>" +
          '<filter id="grain-' + uid + '">' +
            '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>' +
            '<feColorMatrix type="saturate" values="0"/>' +
            '<feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer>' +
          "</filter>" +
        "</defs>" +
        '<rect width="800" height="600" fill="url(#bg-' + uid + ')"/>' +
        '<ellipse cx="180" cy="120" rx="260" ry="220" fill="' + c3 + '" opacity=".4" filter="url(#blur-' + uid + ')"/>' +
        '<ellipse cx="660" cy="470" rx="280" ry="240" fill="' + c1 + '" opacity=".55" filter="url(#blur-' + uid + ')"/>' +
        '<rect width="800" height="600" fill="url(#glow-' + uid + ')"/>' +
        motifMarkup(motif, c2, c3) +
        '<text x="770" y="566" text-anchor="end" font-family="Inter, Segoe UI, sans-serif" font-size="210" font-weight="900" letter-spacing="-14" fill="#ffffff" opacity=".13">' + esc(letters) + "</text>" +
        '<rect width="800" height="600" fill="url(#vig-' + uid + ')"/>' +
        '<rect width="800" height="600" filter="url(#grain-' + uid + ')" opacity=".22" style="mix-blend-mode:overlay"/>' +
      "</svg>";

    return svg;
  }

  /* ---------- Code 39 ---------- */
  const CODE39 = {
    "0": "nnnwwnwnn", "1": "wnnwnnnnw", "2": "nnwwnnnnw", "3": "wnwwnnnnn", "4": "nnnwwnnnw",
    "5": "wnnwwnnnn", "6": "nnwwwnnnn", "7": "nnnwnnwnw", "8": "wnnwnnwnn", "9": "nnwwnnwnn",
    "A": "wnnnnwnnw", "B": "nnwnnwnnw", "C": "wnwnnwnnn", "D": "nnnnwwnnw", "E": "wnnnwwnnn",
    "F": "nnwnwwnnn", "G": "nnnnnwwnw", "H": "wnnnnwwnn", "I": "nnwnnwwnn", "J": "nnnnwwwnn",
    "K": "wnnnnnnww", "L": "nnwnnnnww", "M": "wnwnnnnwn", "N": "nnnnwnnww", "O": "wnnnwnnwn",
    "P": "nnwnwnnwn", "Q": "nnnnnnwww", "R": "wnnnnnwwn", "S": "nnwnnnwwn", "T": "nnnnwnwwn",
    "U": "wwnnnnnnw", "V": "nwwnnnnnw", "W": "wwwnnnnnn", "X": "nwnnwnnnw", "Y": "wwnnwnnnn",
    "Z": "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "$": "nwnwnwnnn",
    "/": "nwnwnnnwn", "+": "nwnnnwnwn", "%": "nnnwnwnwn", "*": "nwnnwnwnn"
  };

  function barcodeSVG(code) {
    const text = String(code || "").toUpperCase().replace(/[^0-9A-Z\-. $/+%]/g, "");
    const full = "*" + text + "*";
    const unit = 2;
    const height = 58;
    const quiet = 10;
    let x = quiet;
    let bars = "";
    for (let i = 0; i < full.length; i++) {
      const pattern = CODE39[full[i]];
      if (!pattern) continue;
      for (let e = 0; e < 9; e++) {
        const w = (pattern[e] === "w" ? 3 : 1) * unit;
        if (e % 2 === 0) {
          bars += '<rect x="' + x + '" y="0" width="' + w + '" height="' + height + '" fill="#0b0b12"/>';
        }
        x += w;
      }
      x += unit;
    }
    const total = x + quiet;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + total + '" height="' + height + '" viewBox="0 0 ' + total + " " + height + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Code-barres ' +
      esc(code) + '">' +
      '<rect width="' + total + '" height="' + height + '" fill="#ffffff"/>' + bars + "</svg>";
  }

  /* ---------- toasts ---------- */
  function toast(message, type, duration) {
    const stack = document.getElementById("toasts");
    if (!stack) return;
    const t = document.createElement("div");
    t.className = "toast " + (type || "success");
    const iconName = type === "error" ? "alert" : type === "info" ? "info" : "checkCircle";
    t.innerHTML = '<span class="t-ic">' + icon(iconName, 18) + "</span><span>" + esc(message) + "</span>";
    stack.appendChild(t);
    const kill = () => {
      if (!t.isConnected || t.classList.contains("leaving")) return;
      t.classList.add("leaving");
      setTimeout(() => t.remove(), 260);
    };
    const timer = setTimeout(kill, duration || 3800);
    t.addEventListener("click", () => { clearTimeout(timer); kill(); });
  }

  /* ---------- modal ---------- */
  function modal(opts) {
    opts = opts || {};
    const root = document.getElementById("modalRoot");
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    backdrop.innerHTML =
      '<div class="modal ' + (opts.wide ? "modal-lg" : "") + '" role="dialog" aria-modal="true" aria-labelledby="modalTitle">' +
        '<div class="modal-head">' +
          "<div><h2 id=\"modalTitle\">" + esc(opts.title || "") + "</h2>" +
          (opts.subtitle ? "<p>" + esc(opts.subtitle) + "</p>" : "") + "</div>" +
          '<button class="icon-btn" type="button" data-close aria-label="Fermer">' + icon("x", 17) + "</button>" +
        "</div>" +
        '<div class="modal-body">' + (opts.body || "") + "</div>" +
        (opts.footer === false ? "" : '<div class="modal-foot">' + (opts.footer || '<button class="btn btn-ghost" type="button" data-close>Fermer</button>') + "</div>") +
      "</div>";

    const modalEl = backdrop.querySelector(".modal");
    const previouslyFocused = document.activeElement;
    root.appendChild(backdrop);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function close() {
      if (!backdrop.isConnected) return;
      document.removeEventListener("keydown", onKey);
      backdrop.remove();
      document.body.style.overflow = prevOverflow;
      if (previouslyFocused && typeof previouslyFocused.focus === "function") {
        try { previouslyFocused.focus(); } catch (e) { /* ignore */ }
      }
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      if (e.key === "Tab") {
        const focusables = modalEl.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
      if (e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", onKey);

    const focusTarget = modalEl.querySelector("[data-autofocus]") || modalEl.querySelector("input, select, textarea, button");
    if (focusTarget) setTimeout(() => { try { focusTarget.focus(); } catch (e) { /* ignore */ } }, 30);

    if (typeof opts.onMount === "function") opts.onMount(modalEl, close);
    return { el: modalEl, close };
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (v) => { if (!settled) { settled = true; resolve(v); } };
      const m = modal({
        title: opts.title || "Confirmer",
        body: '<p class="muted" style="font-size:.88rem">' + esc(opts.message || "") + "</p>",
        footer:
          '<button class="btn btn-ghost" type="button" data-cancel>Annuler</button>' +
          '<button class="btn ' + (opts.danger ? "btn-danger" : "btn-primary") + '" type="button" data-confirm>' +
          esc(opts.confirmLabel || "Confirmer") + "</button>",
        onMount(el, close) {
          el.querySelector("[data-confirm]").addEventListener("click", () => { finish(true); close(); });
          el.querySelector("[data-cancel]").addEventListener("click", () => { finish(false); close(); });
          el.querySelector("[data-close]").addEventListener("click", () => { finish(false); });
        }
      });
      const original = m.close;
      m.close = function () { finish(false); original(); };
    });
  }

  /* ---------- divers ---------- */
  function debounce(fn, wait) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), wait || 180);
    };
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand ? document.execCommand("copy") : false;
      ta.remove();
      return Promise.resolve(!!ok);
    } catch (e) {
      return Promise.resolve(false);
    }
  }

  function downloadBlob(filename, blob) {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }, 6000);
      return true;
    } catch (e) {
      return false;
    }
  }

  function downloadDataURL(filename, dataUrl) {
    try {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (e) {
      return false;
    }
  }

  function downloadFile(filename, content, mime) {
    try {
      if (content instanceof Blob) return downloadBlob(filename, content);
      const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
      return downloadBlob(filename, blob);
    } catch (e) {
      return false;
    }
  }

  function luhn(value) {
    const digits = String(value).replace(/\D/g, "");
    if (digits.length < 12) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number(digits[i]);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  function cardBrand(number) {
    const n = String(number).replace(/\D/g, "");
    if (/^4/.test(n)) return "Visa";
    if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
    if (/^(34|37)/.test(n)) return "Amex";
    return "CB";
  }

  function validEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || "").trim());
  }

  function plural(n, singular, pluralForm) {
    return n + " " + (n > 1 ? (pluralForm || singular + "s") : singular);
  }

  function scrollReveal(root) {
    const els = Array.prototype.slice.call((root || document).querySelectorAll(".reveal"));
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    els.forEach((el) => io.observe(el));
  }

  function todayLabel() {
    return formatDate(new Date(), "full");
  }

  window.TERANGAPASS_UI = {
    esc,
    money,
    formatDate,
    formatTime,
    dateTime,
    dayNum,
    monthShort,
    relativeDay,
    timeAgo,
    countdownParts,
    pad,
    initials,
    icon,
    posterSVG,
    barcodeSVG,
    toast,
    modal,
    confirmDialog,
    debounce,
    copyText,
    downloadFile,
    downloadBlob,
    downloadDataURL,
    luhn,
    cardBrand,
    validEmail,
    plural,
    scrollReveal,
    todayLabel,
    MOTIFS
  };
})();
