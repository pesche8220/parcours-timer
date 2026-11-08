# Parcours Timer – Anleitung für Claude

Workout-Timer für Bootcamp/Parcours im Garten. Besitzer kann nicht programmieren: Claude schreibt den Code,
der Besitzer testet auf echten Geräten. Antworten auf Deutsch (Schweizer Schreibweise: «ss» statt «ß», «du»),
ehrlich, ohne Marketing. Nach jeder Änderung kurz sagen, was auf dem Gerät zu prüfen ist.
Hintergrund und Wünsche: `timer-brief.md`. Ursprünglicher Prototyp v4: `parcours-timer.html` (nur Referenz).

## Produkt in einem Satz
Schnell ein Workout erzeugen (Dauer, Ausrüstung, Intensität → Start), Tiefe auf Wunsch (Editor, Blöcke, eigene Übungen),
und als Alleinstellungsmerkmal: **Tablet/Laptop als grosse Anzeige, Handy als Fernbedienung – ohne Server und ohne Internet.**

## Technik
- Reine statische PWA, **kein Build-Schritt**, keine Abhängigkeiten zur Laufzeit. ES-Module direkt im Browser.
- Hosting: GitHub Pages (Repo-Root = Website). Alle Pfade **relativ** (läuft unter `/<repo>/`).
- Offline: `sw.js` legt alle Dateien beim ersten Besuch ab (Cache-first). Schriften liegen lokal in `fonts/`.
- Speicherung: `localStorage` (Schlüssel `parcours.*.v1`, kompatibel zum Prototyp).
- Lokal testen: `powershell -ExecutionPolicy Bypass -File tools/serve.ps1` → http://localhost:8080
  (auf localhost ist der Service Worker absichtlich aus; Offline-Test mit `http://localhost:8080/?sw=1`).
- Auf dem Rechner gibt es kein Node/Python. Werkzeuge sind PowerShell-Skripte in `tools/`.

## Dateien
```
index.html            Gerüst: je Ansicht ein leerer Container (#v-home, #v-run, …)
css/app.css           Gesamtes Design (Tokens oben; hell/dunkel über [data-theme])
js/app.js             Start: Ansichten laden, Deep-Links (#w= / #c=), Service Worker
js/nav.js             Ansichtswechsel mit Browser-Verlauf (Android-Zurück-Taste), Bottom-Sheets
js/store.js           Workouts, eigene Übungen, Einstellungen, Backup, laufendes Workout sichern
js/library.js         Übungsarchiv BUILTIN (APPEND-ONLY, Index steckt in QR-Codes!) + Kategorien/Ausrüstung
js/generator.js       Schnelles Workout: Warm-up, Zirkel (Stationen×Runden passend zur Zeit), Cool-down; Tauschen
js/segments.js        Workout → Abschnitte (prep/work/rest/pause); describe() = Texte für Anzeige und Fernbedienung
js/runner.js          Timer-Engine mit Zeitstempeln (kein Tick-Zählen), holt nach Einfrieren sauber auf
js/link.js            WebRTC-Datenkanal ohne Server; SDP kompakt kodiert für QR (Angebot/Antwort)
js/codec.js           Workout ↔ kompakter QR-Code, Erkennen gescannter Codes
js/qr.js / qr-worker.js  QR erzeugen (vendor/qrcode.min.js) und per Kamera lesen (BarcodeDetector oder vendor/jsQR.min.js)
js/display.js         Anzeige-Seite: Befehle vom Handy ausführen, Zustand melden
js/launch.js          «Start»: lokal oder – wenn als Fernbedienung verbunden – auf der Anzeige
js/sound.js, wake.js, theme.js, pwa.js, ui.js, icons.js, util.js
js/views/*.js         home, preview, editor (+ Übungsauswahl), run (Vollbild), remote, pair (Koppeln), ready, share, settings
tools/serve.ps1       Lokaler Webserver
tools/make-icons.ps1  PNG-Icons erzeugen (System.Drawing)
```

## Kopplung Anzeige ↔ Handy (wichtig zu verstehen)
1. Anzeige: «Als Anzeige» → Kamera an (dann gibt der Browser die lokale IP frei) → WebRTC-Angebot → QR (`#c=o~…` als URL,
   damit auch die normale Handy-Kamera die App öffnet).
2. Handy: scannt → erzeugt Antwort → zeigt QR (`PT1:a~…`).
3. Anzeige scannt die Antwort → Datenkanal offen. Danach: Handy sendet `start` (fertige Segmente) und `cmd`
   (toggle/skip/prev/stop), Anzeige sendet `run` (Segmente) und `st` (Zustand, 1×/s und bei jeder Änderung).
- Voraussetzung: gemeinsames Netz (WLAN oder Handy-Hotspot; Internet nicht nötig). Keine STUN/TURN-Server.
- Die Anzeige ist der Chef: läuft weiter, wenn das Handy weg ist. Heartbeat alle 2 s, «getrennt» nach 7 s Funkstille.
- Ganz ohne Netz: Workout-QR (`#w=…`) auf die Anzeige halten → läuft dort, ohne Fernbedienung.
- Testen ohne Kamera (zwei Browser-Tabs): `__pt.qr()` liefert den zuletzt gezeigten QR-Text, `__pt.scan(text)` simuliert einen Scan.

## Regeln für Änderungen
- **Bei jedem Release `VERSION` in `sw.js` und `APP_VERSION` in `js/pwa.js` gleich erhöhen**, sonst sehen installierte Geräte nichts Neues.
  Neue Dateien zusätzlich in `ASSETS` in `sw.js` eintragen.
- `BUILTIN` in `js/library.js` nie umsortieren/löschen, nur hinten anhängen.
- Lesbarkeit vor Design: Die Vollbild-Anzeige passt Texte per `fit()` maximal ein (lesbar auf 4–5 m). Nicht verkleinern.
- Bedienung simpel halten: Startseite = Generator oben, Rest darunter. Tiefe gehört in Vorschau/Editor/Einstellungen.
- Gestaltung: schmale Display-Schrift (Barlow Condensed) für Zahlen/Titel, Atkinson Hyperlegible für Text, Signal-Orange
  nur für die Hauptaktion. Keine Emojis als Symbole, keine Verläufe/Glas-Effekte. Symbole sind eigene SVGs in `icons.js`.
- Phasenfarben: Rot = Übung, Blau = Pause, Braun = Rundenpause, Grafit = Bereit machen, Grün = fertig.

## Prüfliste vor dem Veröffentlichen
Startseite hell/dunkel, Handy und Tablet quer · Workout erstellen → Tauschen/Neu mischen → Start → Pause/Weiter/Zurück/Ende ·
Android-Zurück im Timer fragt nach · Editor: Block, Übungen, eigene Übung, Rückfrage bei ungespeichert · Countdown/Intervall ·
Kopplung mit zwei Tabs (`__pt`) inkl. Start, Steuerung, Verbindungsabbruch · Workout-QR auf Anzeige · `?sw=1` offline neu laden.

## Deployment
GitHub Pages aus Branch `main`, Ordner `/` (Root). `.nojekyll` muss vorhanden sein.
Git und GitHub CLI liegen portabel unter `%LOCALAPPDATA%\Programs\` (nicht im PATH) – siehe README.
