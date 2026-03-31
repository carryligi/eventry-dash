Deploy: Merge Develope → main und Production Deploy auslösen.

Führe folgende Schritte der Reihe nach aus. Bei Fehler sofort stoppen und berichten.

1. Prüfe, dass wir auf dem `Develope` Branch sind. Falls nicht, wechsle dorthin.
2. Führe `npm run lint` aus — bei Fehlern stoppen.
3. Führe `npm run typecheck` aus — bei Fehlern stoppen.
4. Führe `npm run build` aus — bei Fehlern stoppen.
5. Falls es uncommittete Änderungen gibt: Frage nach einer Commit-Message, stage alle Änderungen und committe.
6. Pushe `Develope` zu origin: `git push origin Develope`
7. Wechsle auf `main`: `git checkout main`
8. Pulle den aktuellen Stand: `git pull origin main`
9. Merge `Develope` in `main`: `git merge Develope`
10. Pushe `main` zu origin: `git push origin main` (das triggert den GitHub Actions Production Deploy)
11. Wechsle zurück auf `Develope`: `git checkout Develope`

Berichte am Ende den Status und den Link zum GitHub Actions Run.
