/* Referentiels visuels statiques. Les evenements, stocks, tarifs et commandes
   proviennent exclusivement de l'API serveur. */
(function () {
  "use strict";

  const DAY = 24 * 60 * 60 * 1000;
  function at(days, hour, minute) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days, hour, minute || 0, 0, 0)).toISOString();
  }

  const CATEGORIES = [
    { id: "soiree", label: "Soirees", emoji: "🌙", color: "#176bff", blurb: "Clubs & nuits electroniques" },
    { id: "concert", label: "Concerts", emoji: "🎸", color: "#ff174f", blurb: "Live & tournees" },
    { id: "festival", label: "Festivals", emoji: "🔥", color: "#2464ff", blurb: "Plusieurs jours de fete" },
    { id: "humour", label: "Humour", emoji: "😂", color: "#ff174f", blurb: "Stand-up & spectacles" },
    { id: "sport", label: "Sport", emoji: "🏟️", color: "#3984ff", blurb: "Rencontres & competitions" },
    { id: "culture", label: "Culture", emoji: "🎻", color: "#f13c5b", blurb: "Arts & culture" }
  ];
  const CITIES = ["Dakar", "Diamniadio", "Thies", "Saint-Louis", "Saly", "Ziguinchor", "Kaolack"];

  window.TERANGAPASS_DATA = { DAY, at, CATEGORIES, CITIES, PROMOS: [], FEES_PER_TICKET: 0 };
})();
