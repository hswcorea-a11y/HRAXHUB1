// 의존성 없는 SVG 차트 모음 (라인, 세로 막대, 가로 막대, 분할 막대)
(function () {
  const SVGNS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function h(tag, attrs, children) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (attrs[k] == null) continue;
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(n.style, attrs[k]);
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (children) for (const c of [].concat(children)) if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  }
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  // ---------- 툴팁 ----------
  let tipEl;
  function tip() {
    if (!tipEl) { tipEl = h('div', { class: 'tooltip', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(tipEl); }
    return tipEl;
  }
  // rows: [{name, value, color, kind:'line'|'rect'}]
  function showTip(x, y, title, rows) {
    const t = tip();
    t.textContent = '';
    if (title) t.appendChild(h('div', { class: 'tt-title', text: title }));
    for (const r of rows) {
      const key = r.color ? h('span', { class: r.kind === 'rect' ? 'key-rect' : 'key-line', style: { background: r.color } }) : null;
      t.appendChild(h('div', { class: 'tt-row' }, [key, h('span', { class: 'tt-val', text: r.value }), r.name ? h('span', { class: 'tt-name', text: r.name }) : null]));
    }
    t.classList.add('show');
    const rect = t.getBoundingClientRect();
    let left = x + 14, top = y - rect.height - 12;
    if (left + rect.width > window.innerWidth - 8) left = x - rect.width - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 16;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTip() { if (tipEl) tipEl.classList.remove('show'); }
  window.addEventListener('scroll', hideTip, { passive: true });

  // ---------- 눈금 ----------
  function niceStep(range, count) {
    const raw = range / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
    return step * mag;
  }
  function niceDomain(min, max, count, zero) {
    if (zero) min = Math.min(0, min);
    if (min === max) { max = min + 1; }
    const step = niceStep(max - min, count);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10));
    return { lo, hi, ticks };
  }

  // 위쪽만 둥근 세로 막대 / 오른쪽만 둥근 가로 막대
  function colPath(x, y, w, hgt, r) {
    r = Math.min(r, w / 2, hgt);
    if (hgt <= 0) return '';
    return `M${x},${y + hgt}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt}Z`;
  }
  function rowPath(x, y, w, hgt, r) {
    r = Math.min(r, hgt / 2, w);
    if (w <= 0) return '';
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + hgt - r}Q${x + w},${y + hgt} ${x + w - r},${y + hgt}H${x}Z`;
  }

  function legend(items, kind) {
    return h('ul', { class: 'legend' }, items.map((it) => h('li', null, [
      h('span', { class: kind === 'line' ? 'key-line' : 'key-rect', style: { background: it.color } }), it.name,
    ])));
  }

  function measure(text, size) {
    const c = measure.c || (measure.c = document.createElement('canvas').getContext('2d'));
    c.font = `${size || 12}px ${getComputedStyle(document.body).fontFamily}`;
    return c.measureText(text).width;
  }

  // ---------- 라인 차트 ----------
  // opts: { labels, tipLabels, series:[{name, values, color}], format, height, zero, area }
  function line(container, opts) {
    container.textContent = '';
    const series = opts.series;
    if (series.length > 1) container.appendChild(legend(series, 'line'));
    const W = Math.max(280, container.clientWidth);
    const H = opts.height || 240;
    const fmt = opts.format || String;
    const all = series.flatMap((x) => x.values);
    const dom = niceDomain(Math.min(...all), Math.max(...all), 4, opts.zero);
    const tickW = Math.max(...dom.ticks.map((t) => measure(fmt(t, true), 11.5)));
    const endW = Math.max(...series.map((x) => measure(fmt(x.values[x.values.length - 1]), 12))) + 14;
    const m = { l: tickW + 12, r: endW, t: 12, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const n = opts.labels.length;
    const X = (i) => m.l + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
    const Y = (v) => m.t + ph - ((v - dom.lo) / (dom.hi - dom.lo)) * ph;

    const svg = s('svg', { width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
    for (const t of dom.ticks) {
      s('line', { x1: m.l, x2: m.l + pw, y1: Y(t), y2: Y(t), class: t === dom.lo ? 'base-line' : 'grid-line' }, svg);
      s('text', { x: m.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = fmt(t, true);
    }
    const every = Math.ceil((n * 44) / pw);
    opts.labels.forEach((lb, i) => {
      if (i % every !== 0 && i !== n - 1) return;
      s('text', { x: X(i), y: H - 6, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = lb;
    });
    for (const sr of series) {
      const pts = sr.values.map((v, i) => [X(i), Y(v)]);
      const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('');
      if (opts.area !== false && series.length === 1) {
        s('path', { d: d + `L${X(n - 1)},${Y(dom.lo)}L${X(0)},${Y(dom.lo)}Z`, fill: sr.color, 'fill-opacity': cssVar('--area-alpha') || 0.1 }, svg);
      }
      s('path', { d, fill: 'none', stroke: sr.color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
      const last = pts[pts.length - 1];
      s('circle', { cx: last[0], cy: last[1], r: 4, fill: sr.color, stroke: cssVar('--surface'), 'stroke-width': 2 }, svg);
      s('text', { x: last[0] + 9, y: last[1] + 4, class: 'val-label' }, svg).textContent = fmt(sr.values[n - 1]);
    }
    // 크로스헤어
    const cross = s('line', { y1: m.t, y2: m.t + ph, class: 'crosshair', visibility: 'hidden' }, svg);
    const dots = series.map((sr) => s('circle', { r: 4, fill: sr.color, stroke: cssVar('--surface'), 'stroke-width': 2, visibility: 'hidden', 'pointer-events': 'none' }, svg));
    const hit = s('rect', { x: m.l - 10, y: 0, width: pw + 20, height: H, class: 'hit', tabindex: 0, 'aria-label': (opts.ariaLabel || '') + ' — 좌우 화살표로 값 탐색' }, svg);
    let cur = n - 1;
    function at(i, cx, cy) {
      cur = Math.max(0, Math.min(n - 1, i));
      cross.setAttribute('x1', X(cur)); cross.setAttribute('x2', X(cur)); cross.setAttribute('visibility', 'visible');
      series.forEach((sr, k) => { dots[k].setAttribute('cx', X(cur)); dots[k].setAttribute('cy', Y(sr.values[cur])); dots[k].setAttribute('visibility', 'visible'); });
      const box = svg.getBoundingClientRect();
      showTip(cx != null ? cx : box.left + X(cur), cy != null ? cy : box.top + Y(series[0].values[cur]),
        (opts.tipLabels || opts.labels)[cur], series.map((sr) => ({ name: series.length > 1 ? sr.name : (opts.valueName || ''), value: fmt(sr.values[cur]), color: sr.color, kind: 'line' })));
    }
    function off() { cross.setAttribute('visibility', 'hidden'); dots.forEach((d) => d.setAttribute('visibility', 'hidden')); hideTip(); }
    hit.addEventListener('pointermove', (e) => {
      const box = svg.getBoundingClientRect();
      const px = e.clientX - box.left;
      at(Math.round(((px - m.l) / pw) * (n - 1)), e.clientX, e.clientY);
    });
    hit.addEventListener('pointerleave', off);
    hit.addEventListener('focus', () => at(cur));
    hit.addEventListener('blur', off);
    hit.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { at(cur - 1); e.preventDefault(); }
      if (e.key === 'ArrowRight') { at(cur + 1); e.preventDefault(); }
    });
  }

  // ---------- 세로 막대 (묶음) ----------
  // opts: { labels, tipLabels, series:[{name, values, color}], format, height, labelMode:'max'|'none'|'all' }
  function columns(container, opts) {
    container.textContent = '';
    const series = opts.series;
    if (series.length > 1) container.appendChild(legend(series, 'rect'));
    const W = Math.max(280, container.clientWidth);
    const H = opts.height || 240;
    const fmt = opts.format || String;
    const all = series.flatMap((x) => x.values);
    const dom = niceDomain(0, Math.max(...all), 4, true);
    const tickW = Math.max(...dom.ticks.map((t) => measure(fmt(t, true), 11.5)));
    const m = { l: tickW + 12, r: 8, t: 18, b: 26 };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;
    const n = opts.labels.length, k = series.length;
    const band = pw / n;
    const bw = Math.max(4, Math.min(24, (band * 0.72 - (k - 1) * 2) / k));
    const groupW = bw * k + (k - 1) * 2;
    const Y = (v) => m.t + ph - (v / dom.hi) * ph;

    const svg = s('svg', { width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
    for (const t of dom.ticks) {
      s('line', { x1: m.l, x2: m.l + pw, y1: Y(t), y2: Y(t), class: t === 0 ? 'base-line' : 'grid-line' }, svg);
      s('text', { x: m.l - 8, y: Y(t) + 4, 'text-anchor': 'end', class: 'tick' }, svg).textContent = fmt(t, true);
    }
    const maxLabelW = Math.max(...opts.labels.map((l) => measure(l, 11.5)));
    const every = Math.max(1, Math.ceil((maxLabelW + 8) / band));
    let maxV = -Infinity, maxAt = null;
    series.forEach((sr, si) => sr.values.forEach((v, i) => { if (v > maxV) { maxV = v; maxAt = [si, i]; } }));

    opts.labels.forEach((lb, i) => {
      const gx = m.l + band * i + (band - groupW) / 2;
      const g = s('g', null, svg);
      const hitR = s('rect', { x: m.l + band * i, y: m.t - 10, width: band, height: ph + 10, class: 'hit', tabindex: 0,
        'aria-label': `${(opts.tipLabels || opts.labels)[i]}: ` + series.map((sr) => `${sr.name || ''} ${fmt(sr.values[i])}`).join(', ') }, g);
      const marks = s('g', { class: 'mark' }, g);
      series.forEach((sr, si) => {
        const v = sr.values[i];
        const x = gx + si * (bw + 2);
        s('path', { d: colPath(x, Y(v), bw, Y(0) - Y(v), 4), fill: sr.color }, marks);
        const show = opts.labelMode === 'all' || (opts.labelMode !== 'none' && maxAt && maxAt[0] === si && maxAt[1] === i);
        if (show) s('text', { x: x + bw / 2, y: Y(v) - 6, 'text-anchor': 'middle', class: 'val-label' }, g).textContent = fmt(v);
      });
      if (i % every === 0) s('text', { x: m.l + band * i + band / 2, y: H - 6, 'text-anchor': 'middle', class: 'tick' }, svg).textContent = lb;
      const show = (e) => {
        const box = hitR.getBoundingClientRect();
        showTip(e && e.clientX != null ? e.clientX : box.left + box.width / 2, e && e.clientY != null ? e.clientY : box.top + 20,
          (opts.tipLabels || opts.labels)[i], series.map((sr) => ({ name: sr.name || opts.valueName || '', value: fmt(sr.values[i]), color: sr.color, kind: 'rect' })));
      };
      hitR.addEventListener('pointermove', show);
      hitR.addEventListener('pointerenter', () => marks.style.opacity = 0.8);
      hitR.addEventListener('pointerleave', () => { marks.style.opacity = ''; hideTip(); });
      hitR.addEventListener('focus', () => { marks.style.opacity = 0.8; show(); });
      hitR.addEventListener('blur', () => { marks.style.opacity = ''; hideTip(); });
    });
  }

  // ---------- 가로 막대 ----------
  // opts: { items:[{label, value, color, note}], format, color, rowH, max }
  function bars(container, opts) {
    container.textContent = '';
    const items = opts.items;
    const W = Math.max(260, container.clientWidth);
    const rowH = opts.rowH || 32;
    const bh = Math.min(24, opts.barH || 16);
    const fmt = opts.format || String;
    const labelW = Math.min(W * 0.4, Math.max(...items.map((it) => measure(it.label, 12.5))) + 12);
    const valW = Math.max(...items.map((it) => measure(fmt(it.value) + (it.note ? '  ' + it.note : ''), 12))) + 12;
    const pw = Math.max(40, W - labelW - valW);
    const max = opts.max || Math.max(...items.map((it) => it.value)) || 1;
    const H = items.length * rowH + 4;
    const svg = s('svg', { width: W, height: H, role: 'img', 'aria-label': opts.ariaLabel || '' }, container);
    s('line', { x1: labelW, x2: labelW, y1: 0, y2: H, class: 'base-line' }, svg);
    items.forEach((it, i) => {
      const y = i * rowH + (rowH - bh) / 2;
      const w = (it.value / max) * pw;
      const g = s('g', null, svg);
      const hitR = s('rect', { x: 0, y: i * rowH, width: W, height: rowH, class: 'hit', tabindex: 0, 'aria-label': `${it.label}: ${fmt(it.value)}${it.note ? ', ' + it.note : ''}` }, g);
      const mark = s('path', { d: rowPath(labelW, y, Math.max(w, 1), bh, 4), fill: it.color || opts.color, class: 'mark' }, g);
      const lbl = s('text', { x: labelW - 10, y: y + bh / 2 + 4.5, 'text-anchor': 'end', class: 'cat-label' }, g);
      lbl.textContent = it.label;
      const vt = s('text', { x: labelW + w + 8, y: y + bh / 2 + 4.5, class: 'val-label' }, g);
      vt.textContent = fmt(it.value);
      if (it.note) {
        const ns = s('tspan', { fill: cssVar('--muted'), 'font-weight': 400, dx: 6 }, vt);
        ns.textContent = it.note;
      }
      const show = (e) => {
        const box = mark.getBoundingClientRect();
        showTip(e && e.clientX != null ? e.clientX : box.right, e && e.clientY != null ? e.clientY : box.top,
          it.label, [{ value: fmt(it.value), name: it.tipNote || it.note || opts.valueName || '', color: it.color || opts.color, kind: 'rect' }]);
      };
      hitR.addEventListener('pointermove', show);
      hitR.addEventListener('pointerenter', () => mark.style.opacity = 0.8);
      hitR.addEventListener('pointerleave', () => { mark.style.opacity = ''; hideTip(); });
      hitR.addEventListener('focus', () => { mark.style.opacity = 0.8; show(); });
      hitR.addEventListener('blur', () => { mark.style.opacity = ''; hideTip(); });
    });
  }

  // ---------- 분할 막대 (하나의 전체를 부분으로) ----------
  // parts: [{name, value, color, ink}] — ink: 블록 안 글자색 (기본 흰색)
  function segbar(container, parts, opts) {
    opts = opts || {};
    container.textContent = '';
    const total = parts.reduce((a, p) => a + p.value, 0) || 1;
    container.appendChild(legend(parts, 'rect'));
    const bar = h('div', { class: 'segbar', role: 'img', 'aria-label': parts.map((p) => `${p.name} ${p.value.toLocaleString()} (${(p.value / total * 100).toFixed(1)}%)`).join(', ') });
    container.appendChild(bar);
    const W = Math.max(200, container.clientWidth);
    for (const p of parts) {
      if (!p.value) continue;
      const share = p.value / total;
      const label = (share * 100).toFixed(1) + '%';
      const blk = h('div', { tabindex: 0, style: { flex: `${p.value} 1 0`, background: p.color, color: p.ink || '#fff' } });
      if (measure(label, 12.5) + 18 < W * share) blk.textContent = label;
      const show = (e) => {
        const box = blk.getBoundingClientRect();
        showTip(e && e.clientX != null ? e.clientX : box.left + box.width / 2, e && e.clientY != null ? e.clientY : box.top,
          p.name, [{ value: `${(opts.format || ((v) => v.toLocaleString()))(p.value)} · ${label}`, color: p.color, kind: 'rect' }]);
      };
      blk.addEventListener('pointermove', show);
      blk.addEventListener('pointerleave', hideTip);
      blk.addEventListener('focus', () => show());
      blk.addEventListener('blur', hideTip);
      bar.appendChild(blk);
    }
  }

  // 여러 행을 비교하는 얇은 분할 막대: rows [{name, parts:[{name,value,color}], right}]
  function segrows(container, rows, legendParts) {
    container.textContent = '';
    container.appendChild(legend(legendParts, 'rect'));
    const grid = h('div', { class: 'seg-rows' });
    for (const r of rows) {
      const total = r.parts.reduce((a, p) => a + p.value, 0) || 1;
      const bar = h('div', { class: 'segbar thin', role: 'img', 'aria-label': `${r.name}: ` + r.parts.map((p) => `${p.name} ${(p.value / total * 100).toFixed(1)}%`).join(', ') });
      for (const p of r.parts) {
        if (!p.value) continue;
        const blk = h('div', { style: { flex: `${p.value} 1 0`, background: p.color } });
        blk.addEventListener('pointermove', (e) => showTip(e.clientX, e.clientY, `${r.name} · ${p.name}`, [{ value: `${p.value.toLocaleString()}명 · ${(p.value / total * 100).toFixed(1)}%`, color: p.color, kind: 'rect' }]));
        blk.addEventListener('pointerleave', hideTip);
        bar.appendChild(blk);
      }
      grid.appendChild(h('div', { class: 'name', text: r.name }));
      grid.appendChild(bar);
      grid.appendChild(h('div', { class: 'num', text: r.right }));
    }
    container.appendChild(grid);
  }

  // 12개 점짜리 스파크라인 (호버 없음, 장식용 보조 정보)
  function spark(container, values, color) {
    container.textContent = '';
    const W = Math.max(120, container.clientWidth), H = 36;
    const min = Math.min(...values), max = Math.max(...values);
    const X = (i) => 2 + (i / (values.length - 1)) * (W - 8);
    const Y = (v) => 4 + (1 - (v - min) / (max - min || 1)) * (H - 8);
    const svg = s('svg', { width: W, height: H, 'aria-hidden': 'true' }, container);
    const d = values.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
    s('path', { d: d + `L${X(values.length - 1)},${H}L${X(0)},${H}Z`, fill: color, 'fill-opacity': cssVar('--area-alpha') || 0.1 }, svg);
    s('path', { d, fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    s('circle', { cx: X(values.length - 1), cy: Y(values[values.length - 1]), r: 4, fill: color, stroke: cssVar('--surface'), 'stroke-width': 2 }, svg);
  }

  // ---------- 표 ----------
  // cols: [{label, num}] rows: [[...]] foot: [...]
  function table(cols, rows, foot) {
    const thead = h('thead', null, h('tr', null, cols.map((c) => h('th', { class: c.num ? 'num' : null, text: c.label }))));
    const tbody = h('tbody', null, rows.map((r) => h('tr', null, r.map((v, i) => {
      const td = h('td', { class: cols[i].num ? 'num' : null });
      if (v instanceof Node) td.appendChild(v); else td.textContent = v == null ? '' : String(v);
      return td;
    }))));
    const t = h('table', { class: 'data' }, [thead, tbody]);
    if (foot) t.appendChild(h('tfoot', null, h('tr', null, foot.map((v, i) => h('td', { class: cols[i].num ? 'num' : null, text: v == null ? '' : String(v) })))));
    return h('div', { class: 'table-wrap' }, t);
  }

  window.Charts = { line, columns, bars, segbar, segrows, spark, table, h, s, cssVar, showTip, hideTip };
})();
