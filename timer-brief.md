# Parcours Timer – Projekt-Brief für Claude Code

## Ziel
Workout-Timer für Bootcamp- und Parcours-Training, zuerst für den Eigenbedarf. Eine Veröffentlichung ist später denkbar.
**Kernidee:** Das Workout wird auf dem Smartphone geplant, Timer und Übungen laufen gross auf einem Tablet, das im Garten steht.

## Rahmenbedingungen
- Ich kann nicht programmieren. Claude schreibt den Code, ich teste im Alltag.
- Geräte: Android-Smartphone und Android-Tablet (Fokus). Zusätzlich ein iPad Pro, meine Frau hat iPhone und iPad. Kein Mac, Windows-Laptop vorhanden.
- Training draussen im Garten **ohne WLAN und ohne Internet**. Die App muss komplett offline laufen.
- GitHub-Account: Ich lege einen an, sobald nötig (für Hosting und später App-Builds).

## Architektur-Entscheide
- **Web-App (PWA)**, als Einzeldatei begonnen. Mit Service Worker und Manifest wird sie installierbar und offline-fähig. Hosting über GitHub Pages.
- **Das Tablet ist der Chef.** Das Anzeigegerät hält das Workout und rechnet den Timer selbst. Das Handy ist nur Planer und optional Fernbedienung. Das Tablet läuft weiter, auch wenn das Handy weg ist.
- **Timer mit Zeitstempeln** (Startzeit plus Dauer), nicht mit Ticks zählen, damit nichts driftet.
- **Übergabe Handy → Tablet offline per QR-Code** (Workout als JSON im QR).
- **Live-Fernbedienung ohne Netz** geht nur mit einer nativen App (z.B. Android Nearby Connections, ggf. Capacitor oder Flutter mit Build über GitHub Actions). Das kommt erst später und nur bei echtem Bedarf.

## Stand: Prototyp v4 (`parcours-timer.html`, liegt bei)
Funktioniert bereits:
- **Startseite:** Schnell-Countdown (Zeit einstellen, Start) und Liste gespeicherter Workouts (Bearbeiten, Start).
- **Workout-Aufbau:** Workout → Blöcke (z.B. Warm-up, Parcours) → Übungen. Pro Block: Übungszeit, Pause zum Stationswechsel, Runden, Rundenpause (Zeit frei einstellbar oder „offen“, dann geht es erst per Tipp weiter).
- **Editor:**
  - Workout-Titel gross mit „Bearbeiten“-Knopf.
  - Blöcke als aufklappbare Karten, immer nur einer offen. Jeder Block hat eine eigene Akzentfarbe (Rand, Titel, Symbole).
  - Zeiten per Schnellwahl-Knöpfen (Übung 20/30/40/45/60 s, Pause 0/10/15/20/30 s, Runden 1–5, Rundenpause 0:30–3:00 oder offen). „Andere…“ öffnet Plus/Minus.
- **Übungsauswahl:**
  - Archiv mit ca. 50 Übungen in 8 Kategorien (Körpergewicht, Core, Kettlebell, Hantel, Band, Klimmzugstange, Cardio, Mobilität).
  - Antippen fügt hinzu oder entfernt, die Nummer auf dem Knopf zeigt die Reihenfolge, danach Sortieren mit ↑ ↓.
  - Eigene Übungen mit Name und Kategorie-Symbol anlegen.
- **Anzeige:**
  - Vollbild, Hintergrundfarbe je Phase (Rot = Übung, Blau = Pause, Braun = Rundenpause, Grün = fertig).
  - Übungsname, Countdown und „Danach“ passen sich automatisch maximal gross in ihre Bereiche ein, lesbar auf 4–5 m.
  - In der Pause steht bereits die nächste Übung gross.
  - Kategorie-Symbol neben dem Namen.
  - Steuerung (zurück, Pause/Weiter, überspringen, Vollbild, Ende mit Nachfrage) blendet sich nach 4 s aus, ein Tipp holt sie zurück.
- **Ton:** Beep bei Übungsstart (lang), bei Pause (doppelt), in den letzten 3 s (kurz), am Ende (Melodie). Keine Sprachansagen, keine Musik.
- Bildschirm bleibt wach (Wake Lock). Speicherung in `localStorage`. Helles und dunkles Design.

## Bekannte Lücken / nächste Schritte
1. Eigenes Projekt aufsetzen (Git-Repo), Prototyp übernehmen und sinnvoll aufteilen.
2. **Offline-PWA:** Manifest, Service Worker, Fonts lokal einbinden, Deployment auf GitHub Pages. Auf dem Android-Tablet installieren und im Garten ohne Netz testen.
3. **QR-Übergabe** Handy → Tablet (QR erzeugen und mit der Kamera scannen, alles offline).
4. Eigene Übungen bearbeiten und löschen. Workouts duplizieren. Export/Import als Backup.
5. Lautstärke draussen prüfen (Tablet-Lautsprecher eher leise, eventuell Bluetooth-Lautsprecher).
6. Später: Piktogramm pro Übung (lizenziertes Icon-Set), weitere Formate (EMOM, AMRAP, For Time), native App mit Live-Fernbedienung.

## Stand v1.0 (November 2026)
Umgesetzt: Schritt 1 (Projekt aufgeteilt, Git), Schritt 2 (Offline-PWA, Fonts lokal, GitHub Pages),
Schritt 3 (QR-Übergabe) und grosse Teile von Schritt 4 (eigene Übungen bearbeiten/löschen, duplizieren, Backup).
Neu dazu:
- **Schnelles Workout** auf der Startseite: Dauer, Ausrüstung, Intensität → fertiger Zirkel mit Warm-up/Cool-down,
  Übungen einzeln tauschen, neu mischen, speichern oder im Editor anpassen.
- **Handy als Live-Fernbedienung ohne Server**: WebRTC direkt zwischen den Geräten, Kopplung per zwei QR-Codes.
  Braucht ein gemeinsames Netz (WLAN oder Handy-Hotspot, kein Internet). Damit ist die native App für die
  Fernbedienung vorerst nicht nötig – sofern der Hotspot im Garten klappt (muss getestet werden).
- Countdown und Intervall (Tabata), Fortsetzen nach Absturz, Android-Zurück-Taste, hell/dunkel.
Technische Details: `CLAUDE.md`.

## Wünsche zum Arbeitsstil
- Antworten auf Deutsch, ehrliche Einschätzungen, kein Marketing.
- Vorschläge mit Begründung, Code fertig zum Testen. Jeweils kurz erklären, was ich auf dem Gerät prüfen soll.
- Bedienung möglichst simpel, Anzeige so gross wie möglich (Lesbarkeit geht vor Design).
