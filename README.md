# DBA Dossier

Standalone B2B-webapplicatie voor Nederlandse opdrachtgevers die zzp’ers inhuren onder de Wet DBA (handhaving 2026).

De app toetst een arbeidsrelatie holistisch aan het Deliveroo-arrest, toont een stoplichtscore, genereert een overeenkomst van opdracht plus fiscaal toetsingsdossier (PDF) en bewaart dossiers in de browser.

## Lokaal starten

Er is geen buildstap. ES-modules vereisen een statische HTTP-server (niet `file://`).

```bash
python3 -m http.server 4173
```

Open [http://localhost:4173](http://localhost:4173).

Tests van de toetsingsengine:

```bash
npm test
```

## IJkscenario’s

| Scenario | Verwacht stoplicht | Hash |
| --- | --- | --- |
| Echte zelfstandige | Groen | `#/toetsing?demo=groen` |
| Twijfel (kantoor, geen eigen middelen) | Oranje | `#/toetsing?demo=oranje` |
| Schijnzelfstandige | Rood | `#/toetsing?demo=rood` |

Op het dashboard: **Voorbeeldzaken** laadt dezelfde drie dossiers.

## Hosting

Statische site, bedoeld voor Cloudflare Pages. `wrangler.jsonc` zet de outputdirectory op de projectroot. Geen Functions, geen serverkosten.

```bash
npx wrangler pages deploy . --project-name=dba-dossier-ai
```

## Architectuur

- `index.html` — landing, app-shell
- `style.css` — huisstijl (navy/leisteen, brass, papier)
- `js/questions.js` — twaalf indicatoren, vier pijlers
- `js/scoring.js` — gewogen score + holistische veto’s
- `js/clauses.js` — dynamische contractclausules
- `js/storage.js` — localStorage, klaar voor een latere Supabase-backend
- `js/pdf.js` — client-side PDF via jsPDF + html2canvas
- `js/app.js` — wizard, dashboard, invites (WhatsApp/e-mail)

Dit is een besluitvormingshulpmiddel, geen ruling van de Belastingdienst.
