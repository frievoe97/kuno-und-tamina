# Hochzeitsseite für Kuno & Tamina

Die Seite verwendet React und TypeScript, Vite als Entwicklungsserver und
Build-Tool, Tailwind CSS für das Layout, Lucide React für Icons, WaveSurfer.js
für die interaktive Wellenform und Motion für React für den aufklappenden
Widmungsbrief. Die Live-Audioanalyse läuft über die Web Audio API. Die Aufnahme
liegt in `public/Kumina.mp3` und wird beim Build unverändert in den statischen
Ausgabeordner kopiert.

## Lokal starten

```sh
npm install
npm run dev
```

Für einen Produktionsbuild: `npm run build`. Vite legt das fertige Deployment
in `dist/` ab; `npm run preview` zeigt diesen Build lokal an.

## Veröffentlichung auf GitHub Pages

Jeder Push nach `main` startet automatisch den Workflow in
`.github/workflows/deploy.yml`. Er baut die Seite und veröffentlicht `dist/`.
Für das Repository `frievoe97/kuno-und-tamina` lautet die Adresse:
<https://frievoe97.github.io/kuno-und-tamina/>.

GitHub Pages ist öffentlich: sowohl die Seite als auch die Audiodatei können
von allen abgerufen werden. Vor dem Teilen des Links sollten die
Veröffentlichungsrechte für die geänderten Songtexte geklärt sein. Die GEMA
beschreibt eine Textänderung als mögliche Bearbeitung, für die eine Zustimmung
der Rechteinhaber erforderlich sein kann:
<https://www.gema.de/de/w/hilfe/musiknutzer/musik-nutzen/social-media-websites/cover-online-hochladen>.

Dokumentation: [Vite](https://vite.dev/guide/),
[Tailwind CSS mit Vite](https://tailwindcss.com/docs/installation),
[WaveSurfer.js](https://wavesurfer.xyz/doc/manual/index.html),
[Motion für React](https://motion.dev/docs/react),
[GitHub Pages](https://docs.github.com/en/pages).
