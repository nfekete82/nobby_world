# Deine eigenen Nobby-Welten

Alles läuft lokal. Du brauchst weder RPGJS Studio noch ein Konto oder eine Lizenz
dafür. Tiled 1.12.2 ist unter `.tools/Tiled.app` installiert.

## Öffnen und ausprobieren

1. Im Finder im Projektordner `Karteneditor.command` doppelklicken. Das öffnet Tiled,
   das Nobby-Projekt und die erste Karte.
2. `Spielvorschau.command` doppelklicken. Das startet die lokale Vorschau und öffnet
   http://localhost:5173. Das Terminalfenster offen lassen.
3. In Tiled mit **⌘S** speichern. Die Vorschau lädt die Karte automatisch neu.

Die Docker-Version auf http://localhost:8088 ist ein fertiger Build. Sie übernimmt
Editor-Änderungen erst nach `docker compose up -d --build --force-recreate`.
Zum Gestalten immer die Live-Vorschau auf **5173** verwenden.

## Landschaft malen

Öffne `src/tiled/simplemap.tmx` oder `src/tiled/wald.tmx`. Wähle eine **Kachelebene**
und eine Kachel im Tileset-Fenster. Mit dem Stempelwerkzeug kannst du Wege, Böden,
Wasser und Dekoration malen. Die bestehenden Tilesets sind bereits eingebunden.
Mit **Karte → Kartengröße ändern** kannst du die Karte vergrößern. Verwende endliche,
orthogonale Karten mit 64×64-Pixel-Kacheln.

Einige Tiles haben bereits Kollisionen. Für neue blockierende Tiles kannst du im
Tileset die boolesche Eigenschaft `collision = true` setzen. Erstelle zunächst Wege
und freie Flächen um Startpunkte und Gegner, damit sie erreichbar bleiben.

## Bäume, Gebäude und Dekoration

Ziehe eine Vorlage wie `tree-oak.tx`, `house.tx`, `tower.tx` oder `sheep.tx`
aus `editor/templates` auf die Objektebene „Spiellogik“. Die Klasse ist `prop`.
Die Eigenschaft `asset` wählt eine Grafik aus der zentralen Registry.
Das Rechteck markiert die Bodenfläche; die Grafik steht darüber. Bäume und Häuser
werden automatisch nach ihrer Bodenposition sortiert. Der Spieler kann hinter
ihnen verschwinden. Ändere die Rechteckgröße nicht zur Skalierung: Framegrößen,
Fußpunkte und Kollisionen stehen einheitlich in `src/art/registry.json`.

Der Wassergrund ist sichtbar und nicht blockierend. Die ausgeblendete Ebene
„Wasser und Klippen · Kollision“ sperrt Wasser und Felswände. Für neues Wasser
auch dort die blockierende Wasser-Kachel malen; unter einer Brücke diese Maske
löschen. Die Brücke besteht aus 4×2 Kacheln. Die Wege sind ein 3×3-Randset.
Bei neuen Inselrändern die passende Ecke/Kante der Wiese verwenden.

**H** heilt Nobby um 25 % Leben und verbraucht 25 Mana. **Esc** öffnet das Menü.

## Gegner setzen

1. Wähle die **Objektebene „Spiellogik“** aus.
2. Zeige über **Ansicht → Ansichten → Vorlagen** das Vorlagenfenster an, falls nötig.
3. Öffne dort den Ordner `editor/templates` und ziehe `Ritter.tx` oder `Berserker.tx`
   auf die Karte. Du kannst auch einen vorhandenen Gegner kopieren und verschieben.
4. Wähle das Objekt aus und ändere links in den Eigenschaften:

| Eigenschaft | Bedeutung |
| --- | --- |
| Name | Angezeigter Name des Gegners |
| Klasse | `monster`; bei Vorlagen bereits eingestellt |
| `enemy` | `ritter` oder `berserker` |
| `level` | Stufe 1–100; höhere Stufen erhöhen HP, Angriff und Belohnungen |
| `hp` | 0 = automatisch aus der Stufe; positive Zahl = eigene maximale HP |
| `vision` | Entfernung in Pixeln, ab der der Gegner Nobby bemerkt |

Speichern, im Spiel hinlaufen und mit **Leertaste** in Blickrichtung angreifen.
Die vorbereiteten Gegner sind Nahkämpfer und schießen nicht. Besiegte Gegner geben
Gold und Erfahrung. Ein Neuladen setzt die Karte und ihre Gegner zurück.
Der Kartenbauer enthält bislang diese zwei Gegnertypen, keine beliebige KI-Erstellung.

## NPCs und Kartenwechsel

Ziehe `Dorfbewohner.tx` auf „Spiellogik“. Über die Eigenschaft `text` bestimmst du
den Dialog. Nobby spricht den NPC mit Leertaste an.

Ziehe `Kartenportal.tx` auf die Karte. `target` ist der **Dateiname der Zielkarte
ohne `.tmx`**, etwa `wald`. Im Spiel zum Portal gehen, es ansehen und Leertaste drücken.
Nobby erscheint am Startpunkt der Zielkarte. Für den Rückweg dort ein zweites Portal
setzen. Die mitgelieferten Karten sind bereits in beide Richtungen verbunden.

Genau ein **Punktobjekt** der Klasse `start` bestimmt den Einstiegspunkt einer Karte.
Verschiebe es oder benutze `Startpunkt.tx`, wenn du eine leere Karte anlegst.

## Eine neue Welt anlegen

Am einfachsten: Öffne eine der Übungskarten und wähle **Datei → Speichern unter**.
Speichere sie als `src/tiled/meine-welt.tmx`. Verwende im Dateinamen Buchstaben,
Zahlen, Bindestriche und Unterstriche. Die Karteigenschaft `nobbyWorld = true` bleibt
beim Kopieren erhalten und macht die Karte automatisch im Spiel verfügbar.

Jetzt Gelände und Objekte verändern. Über die Karteigenschaft `title` kannst du
einen Namen vergeben. Setze auf einer erreichbaren Karte ein Portal mit
`target = meine-welt`. Es ist keine manuelle Registrierung im Code nötig.

Alternativ erstellt `npm run world:new -- meine-welt` eine Kopie des Geländes der
Startkarte mit einem Startpunkt und einem Gegner. Vorhandene Dateien werden dabei
nicht überschrieben.

## Wenn etwas nicht erscheint

- Vorschau auf **5173** verwenden und in Tiled speichern.
- Gegner und NPCs gehören auf eine Objektebene; Gelände auf Kachelebenen.
- Klassennamen und Zielkartennamen müssen stimmen. Die Vorschau meldet ungültige
  Werte, fehlende Ziele, doppelte Startpunkte und Objekte außerhalb der Karte.
- Eine neue Karte braucht `nobbyWorld = true` und genau einen `start`.
- Für eine manuelle Prüfung: `npm run worlds:check`.
- Auf einem anderen Mac: `npm ci`, dann `npm run editor:setup` (macOS 13 oder neuer).

Kartenänderungen verändern Spielinhalte, nicht automatisch gespeicherte Spielstände.
Das alte 3D-Spiel und dessen Weltfortschritt sind nicht Teil dieses Editors.

## Ingame-Grafik- und Animationseditor

**Esc → Karteneditor → 🎨 Grafiken & Animationen** zeigt Figuren, Tiere, Gebäude,
Effekte und Gelände. Frame-Upload, GIF-Import, Zeitleiste, eigene Objektvarianten
und Papierkorb sind direkt integriert. Die vollständige Anleitung einschließlich
Speichern, Backups und Konflikten steht in [ASSET_EDITOR.md](../docs/ASSET_EDITOR.md).
Die produktive Docker-Spielversion und das optionale Docker-Editorprofil bleiben
für Schreibzugriffe gesperrt; die lokale Mac-Vorschau auf 5173 kann speichern.
