# priosense.nl

De merksite van PrioSense. Puur HTML, CSS en JavaScript, zonder build-stap.
Alle bibliotheken en lettertypes staan in de map zelf, dus de site laadt niets
van andere servers (geen tracking, geen cookies).

## Lokaal bekijken

```bash
python3 -m http.server 8765
```

Open daarna http://localhost:8765. Direct `index.html` openen werkt niet goed,
omdat de 3D-modules via een webserver geladen moeten worden.

## Wat zit waar

| Bestand | Inhoud |
|---|---|
| `index.html` | alle secties: laadscherm, hero, lichtkrant, statement, het kastje, waarden, slot |
| `en/index.html` | de Engelse versie (zelfde opmaak en scripts); NL/EN-knop in het menu |
| `css/styles.css` | de complete opmaak |
| `js/main.js` | laadscherm, vloeiend scrollen (Lenis) en alle scroll-animaties (GSAP) |
| `js/signal.js` | de hero: lichtpuntjes in kringen met blauwe en rode pulsen (three.js) |
| `js/device3d.js` | het 3D-kastje (maten van case v4): draait mee, is rond te draaien, en de Stad/Snelweg-schakelaar op het scherm is aan te klikken |
| `js/sim.js` | de detectieregels en het scherm van het kastje (drie balken en de modusschakelaar, taal volgt de pagina) |
| `js/vendor/` | three.js 0.186, GSAP 3.15 (+ ScrollTrigger, SplitText), Lenis 1.3 |
| `fonts/` | Archivo, Instrument Serif Italic, JetBrains Mono (alle drie OFL) |

## Online (priosense.nl)

De site draait op **Netlify** (project `priosensenl`, https://priosensenl.netlify.app).
Netlify is gekoppeld aan deze GitHub-repository: elke push naar `main` staat binnen
een minuut live op https://priosense.nl. Er is geen build-stap; de publish directory is `/`.

DNS staat bij TransIP:

| Naam | Type | Waarde |
|---|---|---|
| `@` | A | `75.2.60.5` (Netlify) |
| `www` | CNAME | `priosensenl.netlify.app.` |
| `@` | MX | `mx.zoho.eu` (10), `mx2.zoho.eu` (20), `mx3.zoho.eu` (50) |
| `@` | TXT | `v=spf1 include:zohomail.eu ~all` en de Zoho-verificatie |
| `zmail._domainkey` | TXT | DKIM-sleutel van Zoho |

Het HTTPS-certificaat (Let's Encrypt) regelt Netlify zelf. E-mail voor
info@priosense.nl loopt via Zoho Mail (gratis abonnement).

GitHub Pages staat uit; het bestand `CNAME` is een overblijfsel daarvan en doet niets.

## Nog te doen

- Een afbeelding voor social media (1200 × 630) als `assets/og.png`, en zet dan de `og:image`-regel terug in `index.html`.

## Licenties

three.js (MIT), GSAP en plugins (gratis "Standard No Charge"-licentie van Webflow), Lenis (MIT) en de lettertypes (SIL OFL) mogen allemaal op een commerciële site gebruikt worden.
