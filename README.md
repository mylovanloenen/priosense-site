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

## Online zetten op priosense.nl

**GitHub Pages** (gratis):

1. Zet deze map in een GitHub-repository en zet onder *Settings → Pages* de bron op de `main`-branch.
2. Het bestand `CNAME` koppelt het domein al aan priosense.nl.
3. Zet bij je domeinregistrar deze DNS-records:
   - `A` voor `@` naar `185.199.108.153`, `185.199.109.153`, `185.199.110.153` en `185.199.111.153`
   - `CNAME` voor `www` naar `<jouw-gebruikersnaam>.github.io`
4. Vink daarna in GitHub *Enforce HTTPS* aan.

**Netlify of Cloudflare Pages** werkt ook: sleep de map erin en koppel het domein in hun dashboard.

## Nog te doen

- Maak een mailbox `info@priosense.nl` aan, of pas het adres aan in `index.html`.
- Een afbeelding voor social media (1200 × 630) als `assets/og.png`, en zet dan de `og:image`-regel terug in `index.html`.

## Licenties

three.js (MIT), GSAP en plugins (gratis "Standard No Charge"-licentie van Webflow), Lenis (MIT) en de lettertypes (SIL OFL) mogen allemaal op een commerciële site gebruikt worden.
