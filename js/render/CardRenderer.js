/**
 * CardRenderer generates SVG card images and draws them on a Canvas.
 * Cards are generated as SVG strings, converted to Image objects via data URLs,
 * and cached for fast repeated drawing.
 */
export class CardRenderer {
  constructor() {
    this.imageCache = new Map();
    this.cardWidth = 70;
    this.cardHeight = 100;
    this.ready = false;
  }

  async init() {
    await this._generateAllCards();
    this.ready = true;
  }

  setSize(width, height) {
    if (width !== this.cardWidth || height !== this.cardHeight) {
      this.cardWidth = width;
      this.cardHeight = height;
      this.imageCache.clear();
      return this._generateAllCards();
    }
    return Promise.resolve();
  }

  drawCard(ctx, card, x, y) {
    if (!card.faceUp) {
      const img = this.imageCache.get('back');
      if (img) ctx.drawImage(img, x, y, this.cardWidth, this.cardHeight);
      return;
    }
    const key = `${card.suit}-${card.rank}`;
    const img = this.imageCache.get(key);
    if (img) ctx.drawImage(img, x, y, this.cardWidth, this.cardHeight);
  }

  drawEmptyPile(ctx, x, y, type) {
    const img = this.imageCache.get(`empty-${type}`);
    if (img) ctx.drawImage(img, x, y, this.cardWidth, this.cardHeight);
  }

  async _generateAllCards() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const promises = [];

    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        const key = `${suit}-${rank}`;
        const svg = this._generateCardSVG(suit, rank);
        promises.push(this._svgToImage(key, svg));
      }
    }

    // Card back
    promises.push(this._svgToImage('back', this._generateBackSVG()));

    // Empty pile placeholders
    promises.push(this._svgToImage('empty-foundation', this._generateEmptyPileSVG('foundation')));
    promises.push(this._svgToImage('empty-tableau', this._generateEmptyPileSVG('tableau')));
    promises.push(this._svgToImage('empty-stock', this._generateEmptyPileSVG('stock')));
    promises.push(this._svgToImage('empty-waste', this._generateEmptyPileSVG('waste')));

    await Promise.all(promises);
  }

  _svgToImage(key, svgString) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(key, img);
        resolve();
      };
      img.onerror = () => resolve(); // Graceful fallback
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
    });
  }

  _suitSymbol(suit) {
    return { hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663', spades: '\u2660' }[suit];
  }

  _suitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? '#cc0000' : '#1a1a1a';
  }

  _rankText(rank) {
    const names = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
    return names[rank] || String(rank);
  }

  _generateCardSVG(suit, rank) {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const r = Math.max(4, w * 0.06); // corner radius
    const color = this._suitColor(suit);
    const symbol = this._suitSymbol(suit);
    const rankText = this._rankText(rank);
    const fontSize = Math.max(10, w * 0.2);
    const symbolSize = Math.max(8, w * 0.16);
    const centerSize = Math.max(16, w * 0.35);

    // Generate pip layout for center area
    const pips = this._getPipPositions(rank, w, h);

    let pipsContent = '';
    if (rank >= 1 && rank <= 10) {
      for (const pip of pips) {
        const rot = pip.inverted ? ` transform="rotate(180, ${pip.x}, ${pip.y})"` : '';
        pipsContent += `<text x="${pip.x}" y="${pip.y}" font-size="${centerSize * 0.7}" fill="${color}" text-anchor="middle" dominant-baseline="central"${rot}>${symbol}</text>`;
      }
    } else {
      // Face cards (J, Q, K) and Ace - large center symbol
      pipsContent = `<text x="${w / 2}" y="${h / 2}" font-size="${centerSize}" fill="${color}" text-anchor="middle" dominant-baseline="central">${symbol}</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" ry="${r}" fill="#ffffff" stroke="#888" stroke-width="1"/>
  <text x="${w * 0.12}" y="${h * 0.17}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central">${rankText}</text>
  <text x="${w * 0.12}" y="${h * 0.3}" font-size="${symbolSize}" font-family="Arial, sans-serif" fill="${color}" text-anchor="middle" dominant-baseline="central">${symbol}</text>
  <text x="${w * 0.88}" y="${h * 0.83}" font-size="${fontSize}" font-family="Arial, sans-serif" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central" transform="rotate(180, ${w * 0.88}, ${h * 0.83})">${rankText}</text>
  <text x="${w * 0.88}" y="${h * 0.7}" font-size="${symbolSize}" font-family="Arial, sans-serif" fill="${color}" text-anchor="middle" dominant-baseline="central" transform="rotate(180, ${w * 0.88}, ${h * 0.7})">${symbol}</text>
  ${pipsContent}
</svg>`;
  }

  _getPipPositions(rank, w, h) {
    const cx = w / 2;
    const lx = w * 0.3;
    const rx = w * 0.7;
    const positions = [];

    const rows = {
      top1: h * 0.3,
      top2: h * 0.38,
      mid1: h * 0.42,
      center: h * 0.5,
      mid2: h * 0.58,
      bot2: h * 0.62,
      bot1: h * 0.7,
    };

    switch (rank) {
      case 1: // Ace
        positions.push({ x: cx, y: rows.center });
        break;
      case 2:
        positions.push({ x: cx, y: rows.top1 });
        positions.push({ x: cx, y: rows.bot1, inverted: true });
        break;
      case 3:
        positions.push({ x: cx, y: rows.top1 });
        positions.push({ x: cx, y: rows.center });
        positions.push({ x: cx, y: rows.bot1, inverted: true });
        break;
      case 4:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 5:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: cx, y: rows.center });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 6:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: lx, y: rows.center });
        positions.push({ x: rx, y: rows.center });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 7:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: cx, y: rows.mid1 });
        positions.push({ x: lx, y: rows.center });
        positions.push({ x: rx, y: rows.center });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 8:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: cx, y: rows.mid1 });
        positions.push({ x: lx, y: rows.center });
        positions.push({ x: rx, y: rows.center });
        positions.push({ x: cx, y: rows.mid2, inverted: true });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 9:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: lx, y: rows.top2 });
        positions.push({ x: rx, y: rows.top2 });
        positions.push({ x: cx, y: rows.center });
        positions.push({ x: lx, y: rows.bot2, inverted: true });
        positions.push({ x: rx, y: rows.bot2, inverted: true });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
      case 10:
        positions.push({ x: lx, y: rows.top1 });
        positions.push({ x: rx, y: rows.top1 });
        positions.push({ x: cx, y: rows.top2 });
        positions.push({ x: lx, y: rows.top2 });
        positions.push({ x: rx, y: rows.top2 });
        positions.push({ x: lx, y: rows.bot2, inverted: true });
        positions.push({ x: rx, y: rows.bot2, inverted: true });
        positions.push({ x: cx, y: rows.bot2, inverted: true });
        positions.push({ x: lx, y: rows.bot1, inverted: true });
        positions.push({ x: rx, y: rows.bot1, inverted: true });
        break;
    }
    return positions;
  }

  _generateBackSVG() {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const r = Math.max(4, w * 0.06);
    const m = Math.max(3, w * 0.05); // inner margin

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="${r}" ry="${r}" fill="#1a5276" stroke="#0e3a56" stroke-width="1"/>
  <rect x="${m}" y="${m}" width="${w - m * 2}" height="${h - m * 2}" rx="${r - 1}" ry="${r - 1}" fill="none" stroke="#2e86c1" stroke-width="1.5"/>
  <rect x="${m + 3}" y="${m + 3}" width="${w - m * 2 - 6}" height="${h - m * 2 - 6}" rx="${r - 2}" ry="${r - 2}" fill="#1a5276" stroke="#2e86c1" stroke-width="0.5"/>
  <pattern id="diamonds" width="${w * 0.15}" height="${w * 0.15}" patternUnits="userSpaceOnUse">
    <polygon points="${w * 0.075},0 ${w * 0.15},${w * 0.075} ${w * 0.075},${w * 0.15} 0,${w * 0.075}" fill="#2e86c1" opacity="0.3"/>
  </pattern>
  <rect x="${m + 4}" y="${m + 4}" width="${w - m * 2 - 8}" height="${h - m * 2 - 8}" rx="${r - 3}" ry="${r - 3}" fill="url(#diamonds)"/>
</svg>`;
  }

  _generateEmptyPileSVG(type) {
    const w = this.cardWidth;
    const h = this.cardHeight;
    const r = Math.max(4, w * 0.06);

    let inner = '';
    if (type === 'foundation') {
      const size = Math.max(12, w * 0.3);
      inner = `<text x="${w / 2}" y="${h / 2}" font-size="${size}" font-family="Arial, sans-serif" fill="#3a7d4a" text-anchor="middle" dominant-baseline="central">\u2660</text>`;
    } else if (type === 'stock') {
      const size = Math.max(10, w * 0.2);
      inner = `<text x="${w / 2}" y="${h / 2}" font-size="${size}" font-family="Arial, sans-serif" fill="#3a7d4a" text-anchor="middle" dominant-baseline="central">\u21BB</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" ry="${r}" fill="none" stroke="#3a7d4a" stroke-width="2" stroke-dasharray="6,3" opacity="0.6"/>
  ${inner}
</svg>`;
  }
}
