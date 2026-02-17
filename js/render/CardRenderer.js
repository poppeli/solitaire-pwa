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
    await this._generateAllCards(this.imageCache);
    this.ready = true;
  }

  setSize(width, height) {
    if (width !== this.cardWidth || height !== this.cardHeight) {
      this.cardWidth = width;
      this.cardHeight = height;
      // Atomic swap: generate into temp map, then replace all at once
      const tempCache = new Map();
      return this._generateAllCards(tempCache).then(() => {
        this.imageCache = tempCache;
      });
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

  async _generateAllCards(targetCache) {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const promises = [];

    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) {
        const key = `${suit}-${rank}`;
        const svg = this._generateCardSVG(suit, rank);
        promises.push(this._svgToImage(key, svg, targetCache));
      }
    }

    // Card back
    promises.push(this._svgToImage('back', this._generateBackSVG(), targetCache));

    // Empty pile placeholders
    promises.push(this._svgToImage('empty-foundation', this._generateEmptyPileSVG('foundation'), targetCache));
    promises.push(this._svgToImage('empty-tableau', this._generateEmptyPileSVG('tableau'), targetCache));
    promises.push(this._svgToImage('empty-stock', this._generateEmptyPileSVG('stock'), targetCache));
    promises.push(this._svgToImage('empty-waste', this._generateEmptyPileSVG('waste'), targetCache));
    promises.push(this._svgToImage('empty-freecell', this._generateEmptyPileSVG('freecell'), targetCache));

    await Promise.all(promises);
  }

  _svgToImage(key, svgString, targetCache, attempt = 0) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        targetCache.set(key, img);
        resolve();
      };
      img.onerror = () => {
        if (attempt < 2) {
          // Retry up to 2 times with small delay
          setTimeout(() => {
            this._svgToImage(key, svgString, targetCache, attempt + 1)
              .then(resolve);
          }, 50);
        } else {
          // Give up on this image — resolve without caching so app doesn't crash
          resolve();
        }
      };
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
      // Face cards (J, Q, K) - stylized figure
      pipsContent = this._generateFaceCardContent(suit, rank, w, h);
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
      top1: h * 0.26,
      top2: h * 0.38,
      mid1: h * 0.42,
      center: h * 0.5,
      mid2: h * 0.58,
      bot2: h * 0.62,
      bot1: h * 0.74,
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

  _generateFaceCardContent(suit, rank, w, h) {
    const color = this._suitColor(suit);
    const symbol = this._suitSymbol(suit);
    const isRed = suit === 'hearts' || suit === 'diamonds';

    // Colors
    const robeColor = isRed ? '#c0392b' : '#2c3e50';
    const robeDark = isRed ? '#922b21' : '#1a252f';
    const accentColor = isRed ? '#e74c3c' : '#34495e';
    const goldColor = '#d4a017';
    const goldDark = '#b8860b';
    const skinColor = '#f0d5a0';

    // Dimensions relative to card
    const cx = w / 2;
    const figTop = h * 0.24;
    const figBot = h * 0.76;
    const figW = w * 0.5;
    const figH = h * 0.52;

    // Head dimensions
    const headR = w * 0.09;
    const headY = figTop + h * 0.1;

    // Body dimensions
    const bodyTop = headY + headR + w * 0.02;
    const bodyBot = h * 0.5;
    const bodyW = rank === 12 ? figW * 0.55 : figW * 0.65;

    // Shoulder width
    const shoulderW = bodyW * 0.6;

    let svg = '';

    // Face card border rectangle
    const borderM = w * 0.23;
    const borderR = w * 0.04;
    svg += `<rect x="${borderM}" y="${h * 0.12}" width="${w - borderM * 2}" height="${h * 0.76}" rx="${borderR}" ry="${borderR}" fill="none" stroke="${color}" stroke-width="1" opacity="0.5"/>`;

    // Diagonal divider line
    svg += `<line x1="${w * 0.22}" y1="${h * 0.5}" x2="${w * 0.78}" y2="${h * 0.5}" stroke="${accentColor}" stroke-width="0.5" opacity="0.4"/>`;

    // === TOP HALF (normal orientation) ===
    svg += `<clipPath id="top-half"><rect x="0" y="${h * 0.15}" width="${w}" height="${h * 0.35}"/></clipPath>`;
    svg += `<g clip-path="url(#top-half)">`;

    // Body / Robe
    svg += `<rect x="${cx - bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyBot - bodyTop + h * 0.05}" rx="${w * 0.03}" fill="${robeColor}"/>`;

    // Robe center stripe
    svg += `<rect x="${cx - w * 0.02}" y="${bodyTop}" width="${w * 0.04}" height="${bodyBot - bodyTop + h * 0.05}" fill="${goldColor}"/>`;

    // Shoulders
    svg += `<rect x="${cx - shoulderW / 2 - w * 0.08}" y="${bodyTop}" width="${w * 0.12}" height="${h * 0.1}" rx="${w * 0.03}" fill="${robeDark}"/>`;
    svg += `<rect x="${cx + shoulderW / 2 - w * 0.04}" y="${bodyTop}" width="${w * 0.12}" height="${h * 0.1}" rx="${w * 0.03}" fill="${robeDark}"/>`;

    // Collar
    svg += `<polygon points="${cx},${bodyTop + h * 0.04} ${cx - w * 0.06},${bodyTop} ${cx + w * 0.06},${bodyTop}" fill="${goldColor}"/>`;

    // Head
    svg += `<circle cx="${cx}" cy="${headY}" r="${headR}" fill="${skinColor}" stroke="${goldDark}" stroke-width="0.5"/>`;

    // Eyes
    const eyeY = headY - headR * 0.1;
    const eyeOff = headR * 0.35;
    svg += `<circle cx="${cx - eyeOff}" cy="${eyeY}" r="${headR * 0.12}" fill="#333"/>`;
    svg += `<circle cx="${cx + eyeOff}" cy="${eyeY}" r="${headR * 0.12}" fill="#333"/>`;

    // Queen's hair curls
    if (rank === 12) {
      const hairColor = '#6b4c00';
      const hx = headR * 1.05;
      // Left side curls
      svg += `<path d="M${cx - hx} ${headY - headR * 0.3} Q${cx - hx - headR * 0.4} ${headY} ${cx - hx} ${headY + headR * 0.4} Q${cx - hx - headR * 0.5} ${headY + headR * 0.7} ${cx - hx + headR * 0.1} ${headY + headR * 1.0}" fill="none" stroke="${hairColor}" stroke-width="${w * 0.018}" stroke-linecap="round"/>`;
      // Right side curls
      svg += `<path d="M${cx + hx} ${headY - headR * 0.3} Q${cx + hx + headR * 0.4} ${headY} ${cx + hx} ${headY + headR * 0.4} Q${cx + hx + headR * 0.5} ${headY + headR * 0.7} ${cx + hx - headR * 0.1} ${headY + headR * 1.0}" fill="none" stroke="${hairColor}" stroke-width="${w * 0.018}" stroke-linecap="round"/>`;
    }

    // Suit symbol on chest
    const chestSymSize = Math.max(8, w * 0.14);
    svg += `<text x="${cx}" y="${bodyTop + h * 0.12}" font-size="${chestSymSize}" fill="${color}" text-anchor="middle" dominant-baseline="central" opacity="0.8">${symbol}</text>`;

    // Rank-specific headwear
    if (rank === 13) {
      // King: full crown with points
      const crownH = w * 0.1;
      const crownY = headY - headR * 0.3 - crownH;
      const crownW2 = headR * 1.1;
      svg += `<rect x="${cx - crownW2}" y="${crownY}" width="${crownW2 * 2}" height="${crownH}" rx="${w * 0.01}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.5"/>`;
      // Crown points
      const pts = 5;
      for (let i = 0; i < pts; i++) {
        const px = cx - crownW2 + (crownW2 * 2 / (pts - 1)) * i;
        svg += `<polygon points="${px},${crownY} ${px - w * 0.02},${crownY - crownH * 0.5} ${px + w * 0.02},${crownY - crownH * 0.5}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.3"/>`;
      }
      // Gems on crown
      svg += `<circle cx="${cx}" cy="${crownY + crownH * 0.45}" r="${w * 0.015}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
      svg += `<circle cx="${cx - crownW2 * 0.5}" cy="${crownY + crownH * 0.45}" r="${w * 0.012}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
      svg += `<circle cx="${cx + crownW2 * 0.5}" cy="${crownY + crownH * 0.45}" r="${w * 0.012}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
    } else if (rank === 12) {
      // Queen: tiara / smaller elegant crown
      const tiaraY = headY - headR - w * 0.01;
      const tiaraW = headR * 1.2;
      const tiaraH = w * 0.08;
      svg += `<path d="M${cx - tiaraW} ${tiaraY + tiaraH} L${cx - tiaraW * 0.7} ${tiaraY} L${cx - tiaraW * 0.3} ${tiaraY + tiaraH * 0.5} L${cx} ${tiaraY - tiaraH * 0.3} L${cx + tiaraW * 0.3} ${tiaraY + tiaraH * 0.5} L${cx + tiaraW * 0.7} ${tiaraY} L${cx + tiaraW} ${tiaraY + tiaraH}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.5"/>`;
      // Center gem
      svg += `<circle cx="${cx}" cy="${tiaraY}" r="${w * 0.018}" fill="${isRed ? '#e74c3c' : '#9b59b6'}"/>`;
    } else if (rank === 11) {
      // Jack: beret/cap with feather
      const capY = headY - headR * 0.8;
      const capW = headR * 1.4;
      svg += `<ellipse cx="${cx}" cy="${capY}" rx="${capW}" ry="${headR * 0.5}" fill="${robeColor}" stroke="${robeDark}" stroke-width="0.5"/>`;
      // Brim
      svg += `<ellipse cx="${cx}" cy="${capY + headR * 0.3}" rx="${capW * 1.1}" ry="${headR * 0.2}" fill="${robeDark}"/>`;
      // Feather
      svg += `<path d="M${cx + capW * 0.3} ${capY - headR * 0.3} Q${cx + capW * 1.2} ${capY - headR * 1.5} ${cx + capW * 0.5} ${capY - headR * 1.8}" fill="none" stroke="${goldColor}" stroke-width="${w * 0.02}" stroke-linecap="round"/>`;
    }

    svg += `</g>`;

    // === BOTTOM HALF (mirrored/inverted) ===
    svg += `<g transform="rotate(180, ${cx}, ${h / 2})">`;
    svg += `<clipPath id="bot-half"><rect x="0" y="${h * 0.15}" width="${w}" height="${h * 0.35}"/></clipPath>`;
    svg += `<g clip-path="url(#bot-half)">`;

    // Body / Robe (same as top)
    svg += `<rect x="${cx - bodyW / 2}" y="${bodyTop}" width="${bodyW}" height="${bodyBot - bodyTop + h * 0.05}" rx="${w * 0.03}" fill="${accentColor}"/>`;
    svg += `<rect x="${cx - w * 0.02}" y="${bodyTop}" width="${w * 0.04}" height="${bodyBot - bodyTop + h * 0.05}" fill="${goldColor}"/>`;
    svg += `<rect x="${cx - shoulderW / 2 - w * 0.08}" y="${bodyTop}" width="${w * 0.12}" height="${h * 0.1}" rx="${w * 0.03}" fill="${robeColor}"/>`;
    svg += `<rect x="${cx + shoulderW / 2 - w * 0.04}" y="${bodyTop}" width="${w * 0.12}" height="${h * 0.1}" rx="${w * 0.03}" fill="${robeColor}"/>`;
    svg += `<polygon points="${cx},${bodyTop + h * 0.04} ${cx - w * 0.06},${bodyTop} ${cx + w * 0.06},${bodyTop}" fill="${goldColor}"/>`;
    svg += `<circle cx="${cx}" cy="${headY}" r="${headR}" fill="${skinColor}" stroke="${goldDark}" stroke-width="0.5"/>`;
    svg += `<circle cx="${cx - eyeOff}" cy="${eyeY}" r="${headR * 0.12}" fill="#333"/>`;
    svg += `<circle cx="${cx + eyeOff}" cy="${eyeY}" r="${headR * 0.12}" fill="#333"/>`;
    if (rank === 12) {
      const hairColor = '#6b4c00';
      const hx = headR * 1.05;
      svg += `<path d="M${cx - hx} ${headY - headR * 0.3} Q${cx - hx - headR * 0.4} ${headY} ${cx - hx} ${headY + headR * 0.4} Q${cx - hx - headR * 0.5} ${headY + headR * 0.7} ${cx - hx + headR * 0.1} ${headY + headR * 1.0}" fill="none" stroke="${hairColor}" stroke-width="${w * 0.018}" stroke-linecap="round"/>`;
      svg += `<path d="M${cx + hx} ${headY - headR * 0.3} Q${cx + hx + headR * 0.4} ${headY} ${cx + hx} ${headY + headR * 0.4} Q${cx + hx + headR * 0.5} ${headY + headR * 0.7} ${cx + hx - headR * 0.1} ${headY + headR * 1.0}" fill="none" stroke="${hairColor}" stroke-width="${w * 0.018}" stroke-linecap="round"/>`;
    }
    svg += `<text x="${cx}" y="${bodyTop + h * 0.12}" font-size="${chestSymSize}" fill="${color}" text-anchor="middle" dominant-baseline="central" opacity="0.8">${symbol}</text>`;

    // Same headwear for bottom half
    if (rank === 13) {
      const crownH = w * 0.1;
      const crownY = headY - headR * 0.3 - crownH;
      const crownW2 = headR * 1.1;
      svg += `<rect x="${cx - crownW2}" y="${crownY}" width="${crownW2 * 2}" height="${crownH}" rx="${w * 0.01}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.5"/>`;
      const pts = 5;
      for (let i = 0; i < pts; i++) {
        const px = cx - crownW2 + (crownW2 * 2 / (pts - 1)) * i;
        svg += `<polygon points="${px},${crownY} ${px - w * 0.02},${crownY - crownH * 0.5} ${px + w * 0.02},${crownY - crownH * 0.5}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.3"/>`;
      }
      svg += `<circle cx="${cx}" cy="${crownY + crownH * 0.45}" r="${w * 0.015}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
      svg += `<circle cx="${cx - crownW2 * 0.5}" cy="${crownY + crownH * 0.45}" r="${w * 0.012}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
      svg += `<circle cx="${cx + crownW2 * 0.5}" cy="${crownY + crownH * 0.45}" r="${w * 0.012}" fill="${isRed ? '#e74c3c' : '#3498db'}"/>`;
    } else if (rank === 12) {
      const tiaraY = headY - headR - w * 0.01;
      const tiaraW = headR * 1.2;
      const tiaraH = w * 0.08;
      svg += `<path d="M${cx - tiaraW} ${tiaraY + tiaraH} L${cx - tiaraW * 0.7} ${tiaraY} L${cx - tiaraW * 0.3} ${tiaraY + tiaraH * 0.5} L${cx} ${tiaraY - tiaraH * 0.3} L${cx + tiaraW * 0.3} ${tiaraY + tiaraH * 0.5} L${cx + tiaraW * 0.7} ${tiaraY} L${cx + tiaraW} ${tiaraY + tiaraH}" fill="${goldColor}" stroke="${goldDark}" stroke-width="0.5"/>`;
      svg += `<circle cx="${cx}" cy="${tiaraY}" r="${w * 0.018}" fill="${isRed ? '#e74c3c' : '#9b59b6'}"/>`;
    } else if (rank === 11) {
      const capY = headY - headR * 0.8;
      const capW = headR * 1.4;
      svg += `<ellipse cx="${cx}" cy="${capY}" rx="${capW}" ry="${headR * 0.5}" fill="${accentColor}" stroke="${robeColor}" stroke-width="0.5"/>`;
      svg += `<ellipse cx="${cx}" cy="${capY + headR * 0.3}" rx="${capW * 1.1}" ry="${headR * 0.2}" fill="${robeColor}"/>`;
      svg += `<path d="M${cx + capW * 0.3} ${capY - headR * 0.3} Q${cx + capW * 1.2} ${capY - headR * 1.5} ${cx + capW * 0.5} ${capY - headR * 1.8}" fill="none" stroke="${goldColor}" stroke-width="${w * 0.02}" stroke-linecap="round"/>`;
    }

    svg += `</g></g>`;

    return svg;
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
    } else if (type === 'freecell') {
      const size = Math.max(10, w * 0.2);
      inner = `<text x="${w / 2}" y="${h / 2}" font-size="${size}" font-family="Arial, sans-serif" fill="#3a7d4a" text-anchor="middle" dominant-baseline="central">FC</text>`;
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${r}" ry="${r}" fill="none" stroke="#3a7d4a" stroke-width="2" stroke-dasharray="6,3" opacity="0.6"/>
  ${inner}
</svg>`;
  }
}
