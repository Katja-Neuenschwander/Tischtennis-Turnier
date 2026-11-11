# Tischtennis-Turnier

Turnier-App „Jede gegen jede“ für 3 bis 8 Spielerinnen auf 1 bis 5 Tischen.

## Starten
`index.html` doppelklicken. Die App öffnet sich im Browser und läuft ohne Installation, auch offline
(ohne Internet wird eine Ersatzschrift verwendet).

## Bedienung
1. Anzahl Spielerinnen und Anzahl Tische (1–5) wählen, Namen eintragen.
2. Im Spielplan pro Spiel die erzielten Bälle beider Spielerinnen eintragen.
3. Die Rangliste rechnet automatisch. Sind alle Spiele eingetragen, wird die Siegerin angezeigt.

Die Anzahl Tische kann jederzeit geändert werden; bereits eingetragene Resultate bleiben erhalten.
Ein Tisch braucht 2 Spielerinnen, mit 8 Spielerinnen sind also höchstens 4 Tische gleichzeitig belegt.

## Wertung
- Sieg 2 Punkte, Unentschieden 1 Punkt, Niederlage 0 Punkte
- Bei Punktgleichheit: zuerst direkte Begegnung, danach Balldifferenz (erzielte minus verlorene Bälle)
- In der Rangliste zeigt **DB** bzw. **Diff**, welches Kriterium entschieden hat.

## Dateien
- `index.html` – Seitenaufbau
- `style.css` – Gestaltung (heller und dunkler Modus)
- `app.js` – Spielplan (Kreismethode, auf die gewählte Anzahl Tische verteilt) und Ranglistenberechnung

Die Eingaben werden im Browser gespeichert (localStorage). Wer im selben Browser auf demselben
Computer weiterarbeitet, findet alles wieder. Mit „Resultate löschen“ wird neu begonnen.
