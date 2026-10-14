/* PrioSense — pre-order.
   Bestellen staat UIT. Aanzetten, als de KvK-inschrijving en de voorwaarden rond zijn:
   1. maak in Stripe een Payment Link (zie README, "Pre-order live zetten");
   2. plak die link hieronder bij STRIPE_LINK en zet LIVE op true.
   Zolang het uit staat, toont de site "Binnenkort te bestellen" en blijft de wachtlijst actief. */
(function () {
  'use strict';
  const LIVE = false;
  const STRIPE_LINK = ''; // bijvoorbeeld 'https://buy.stripe.com/abc123'

  const section = document.querySelector('.preorder');
  if (!section || !LIVE || !/^https:\/\/buy\.stripe\.com\/\w+/.test(STRIPE_LINK)) return;

  const lang = document.documentElement.lang === 'en' ? 'en' : 'nl';
  const buy = section.querySelector('.preorder-buy');
  buy.href = `${STRIPE_LINK}?locale=${lang}`;
  buy.hidden = false;
  section.querySelector('.preorder-note').hidden = false;
  section.classList.add('is-live');

  // knoppen bovenin wijzen nu naar de pre-order in plaats van de wachtlijst
  const label = 'Pre-order';
  const cta = document.querySelector('.nav-cta');
  if (cta) { cta.href = '#preorder'; cta.textContent = label; }
  const hero = document.querySelector('.hero-content .pill');
  if (hero) { hero.href = '#preorder'; hero.querySelector('span').textContent = label; }
})();
