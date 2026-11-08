# Parcours Timer

Workout-Timer für Bootcamp und Parcours im Garten. Läuft komplett offline als installierbare Web-App.

**Was ihn besonders macht:** Ein Tablet oder Laptop zeigt den Timer gross, das Handy wird zur Fernbedienung –
direkt von Gerät zu Gerät, ohne Server, ohne Konto, ohne Internet.

## Funktionen
- **Schnelles Workout:** Dauer (10/20/30/45 min), Ausrüstung und Intensität wählen → fertiges Zirkeltraining mit
  Warm-up und Cool-down. Einzelne Übungen tauschen, neu mischen, speichern oder anpassen.
- **Eigene Workouts:** Blöcke mit Übungszeit, Pause zum Stationswechsel, Runden und Rundenpause (auch «offen»).
  Rund 70 Übungen im Archiv, eigene Übungen anlegen, bearbeiten, löschen. Workouts duplizieren, sortieren.
- **Timer:** Countdown und Intervall (z. B. Tabata).
- **Anzeige:** Vollbild, Farbe je Phase, Texte so gross wie möglich (lesbar auf 4–5 m), Töne, Bildschirm bleibt wach.
- **Grosser Bildschirm:** Tablet/Laptop als Anzeige, Handy als Fernbedienung (Start, Pause, Weiter, Zurück, Ende).
- **Ohne Netz:** Workout per QR-Code aufs Tablet übergeben – läuft dort selbständig.
- Backup als Datei, helles und dunkles Design, Fortsetzen nach Absturz/Neuladen.

## Installieren
1. Einmal mit Internet die Adresse öffnen (siehe GitHub Pages im Repository).
2. Android/Chrome: Menü ⋮ → «App installieren» (oder in Parcours: Einstellungen → «App installieren»).
   iPhone/iPad/Safari: Teilen → «Zum Home-Bildschirm».
3. Danach läuft die App ohne Internet. In den Einstellungen steht «Offline bereit».

## Tablet als Anzeige, Handy als Fernbedienung
1. Beide Geräte ins gleiche Netz: Heim-WLAN oder im Garten der **Handy-Hotspot** (Internet nicht nötig).
2. Tablet: Startseite → **Als Anzeige**. Kamera erlauben.
3. Handy: Startseite → **Als Fernbedienung** → Code auf dem Tablet scannen.
4. Handy umdrehen und seinen Code vor die Tablet-Kamera halten. Fertig – was du am Handy startest, läuft auf dem Tablet.

Klappt die Verbindung nicht (kein gemeinsames Netz): Am Handy beim Workout **Per Code übergeben** wählen und den Code
vor die Tablet-Kamera halten. Das Workout läuft dann auf dem Tablet, nur ohne Fernbedienung.

## Entwicklung
Kein Build nötig. Lokaler Server: `powershell -ExecutionPolicy Bypass -File tools/serve.ps1` → http://localhost:8080.
Details für die Weiterentwicklung stehen in `CLAUDE.md`.

## Lizenzen
Schriften: Barlow Condensed und Atkinson Hyperlegible (SIL Open Font License, siehe `fonts/`).
QR: qrcode-generator von Kazuhiko Arase (MIT), jsQR von Cosmo Wolfe (Apache 2.0, siehe `vendor/`).
«QR Code» ist eine Marke der DENSO WAVE INCORPORATED.
