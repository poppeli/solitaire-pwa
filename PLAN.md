# Pasianssi PWA - Projektisuunnitelma

## Tilanne

### Tehty (v0.1)
- [x] Projektirakenne ja Git-repo
- [x] Korttien tietomalli (Card, Deck, Pile, GameState)
- [x] Klondike-säännöt (BaseGame, KlondikeGame, GameRegistry)
- [x] SVG-korttien generointi ja renderöinti (CardRenderer)
- [x] Pelilaudan renderöinti ja hit-testing (BoardRenderer)
- [x] Hiiri + kosketusohjaus + drag-and-drop (InputManager)
- [x] HUD (siirtolaskuri, ajastin, kumoa, uusi peli)
- [x] PWA-tuki (manifest.json, sw.js, kuvakkeet)
- [x] Undo-toiminto
- [x] Kortin tuplaklikkaus → automaattinen siirto perustaan
- [x] Responsiivinen canvas + High-DPI-tuki

### Seuraavaksi (v0.2)
- [ ] Pelitilan tallennus localStorage:een (jatka keskeneräistä peliä)
- [ ] Korttien siirtoanimaatiot
- [ ] Voittoanimaatio
- [ ] Asetukset: nosto 1 vs 3 korttia
- [ ] GitHub Pages -julkaisu

### Myöhemmin (v1.0)
- [ ] Spider-pasianssi (SpiderGame.js)
- [ ] FreeCell-pasianssi (FreeCellGame.js)
- [ ] Pelivalintavalikko (MenuScreen.js)
- [ ] Voitto/häviötilastot per pelityyppi
- [ ] Asetukset: kortin selkäkuvan valinta
- [ ] Vinkkitoiminto (getHint)

## Arkkitehtuuri

### Teknologia
- **Vanilla JavaScript** (ES Modules), ei frameworkia
- **HTML5 Canvas** korttien renderöintiin
- **PWA** (manifest.json + Service Worker) asennettavuuteen ja offline-tukeen
- **GitHub Pages** hostingiin

### Pelisääntöjen lisääminen
Jokainen pasianssityyppi on oma luokkansa joka laajentaa `BaseGame`:

```javascript
class BaseGame {
  setup()                          // Luo pakat ja pinot, jaa kortit
  canMove(cards, fromPile, toPile) // Voiko siirron tehdä?
  onMove(cards, fromPile, toPile)  // Siirron jälkeiset toimet
  isWon()                          // Onko peli voitettu?
  getBoardLayout()                 // Pinojen sijainnit renderöijälle
  onStockClick()                   // Varastopakan klikkaus
}
```

Uusi pelityyppi = uusi luokka + rekisteröinti `GameRegistry.js`:ään.

### Tiedostorakenne
```
solitaire-pwa/
├── index.html
├── manifest.json
├── sw.js
├── css/main.css
├── js/
│   ├── main.js              # GameController
│   ├── engine/              # Card, Deck, Pile, GameState
│   ├── rules/               # BaseGame, KlondikeGame, GameRegistry
│   ├── render/              # CardRenderer, BoardRenderer
│   ├── input/               # InputManager
│   └── ui/                  # HUD
└── icons/                   # PWA-kuvakkeet (SVG + PNG)
```

## Jakelu
1. Koodi GitHub-repoon
2. GitHub Pages päälle → HTTPS-osoite automaattisesti
3. Käyttäjälle jaetaan URL (tai QR-koodi)
4. Käyttäjä asentaa kotinäytölle selaimesta (ei sovelluskauppaa)
