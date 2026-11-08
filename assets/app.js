(function () {
  const { h, cssVar } = Charts;
  const DATA = window.HR_DATA;
  const CONFIG = window.HR_CONFIG;
  const app = document.getElementById('app');

  // ===================== 아이콘 =====================
  const ICONS = {
    users: '<path d="M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19"/><circle cx="10" cy="7.5" r="3.5"/><path d="M20 19v-1.5a3.5 3.5 0 0 0-2.5-3.35"/><path d="M15.5 4.15a3.5 3.5 0 0 1 0 6.7"/>',
    door: '<path d="M4 20h16"/><path d="M6 20V5a1 1 0 0 1 1-1h7v16"/><path d="M14 5h3a1 1 0 0 1 1 1v14"/><circle cx="11" cy="12" r="0.9" fill="currentColor"/>',
    org: '<rect x="9" y="3" width="6" height="5" rx="1.2"/><rect x="3" y="16" width="6" height="5" rx="1.2"/><rect x="15" y="16" width="6" height="5" rx="1.2"/><path d="M12 8v4M6 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>',
    pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/><path d="M8 10.5h5M10.5 8v5"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
    back: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    logo: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    good: '<circle cx="12" cy="12" r="9" fill="var(--status-good)" stroke="none"/><path d="m8 12.5 2.5 2.5L16 9.5" stroke="#fff" stroke-width="2.2"/>',
    warning: '<path d="M12 3 2.5 20h19z" fill="var(--status-warning)" stroke="none"/><path d="M12 10v4" stroke="#0b0b0b" stroke-width="2.2"/><circle cx="12" cy="17" r="1.2" fill="#0b0b0b" stroke="none"/>',
    serious: '<circle cx="12" cy="12" r="9" fill="var(--status-critical)" stroke="none"/><path d="M12 7.5v5.5" stroke="#fff" stroke-width="2.2"/><circle cx="12" cy="16.3" r="1.25" fill="#fff" stroke="none"/>',
  };
  function icon(name) {
    const span = document.createElement('span');
    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
    return span.firstChild;
  }

  // ===================== 데이터 =====================
  const EMP = DATA.employees.map((r) => Object.fromEntries(DATA.fields.map((f, i) => [f, r[i]])));
  const AS_OF = DATA.meta.asOf;
  const START = DATA.meta.start;
  const GRADES = DATA.meta.grades;
  const DIVS = DATA.org;
  const divById = {}, hqById = {}, teamById = {};
  for (const d of DIVS) { divById[d.id] = d; for (const q of d.hqs) { hqById[q.id] = { ...q, div: d.id }; for (const t of q.teams) teamById[t.id] = { ...t, hq: q.id, div: d.id }; } }
  const empById = Object.fromEntries(EMP.map((e) => [e.id, e]));

  const pad = (n) => String(n).padStart(2, '0');
  const lastDay = (key) => { const [y, m] = key.split('-').map(Number); return `${key}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`; };
  const MONTH_ENDS = DATA.meta.months.map(lastDay);
  const POINTS = [START, ...MONTH_ENDS]; // 13개 월말 시점
  const monthLabel = (d) => `${+d.slice(5, 7)}월`;
  const monthFull = (d) => `${d.slice(0, 4)}년 ${+d.slice(5, 7)}월`;
  const isActive = (e, d) => e.hire <= d && (!e.exit || e.exit > d);
  const years = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 86400000);

  const fmtN = (v) => Math.round(v).toLocaleString('ko-KR');
  const fmtP = (v, dg = 1) => (v * 100).toFixed(dg) + '%';
  const fmtDate = (d) => d.replaceAll('-', '.');

  // ===================== 상태 =====================
  const state = { div: 'ALL' };
  try { const saved = localStorage.getItem('hr-div'); if (saved && (saved === 'ALL' || divById[saved])) state.div = saved; } catch (e) { /* 무시 */ }

  const inScope = (e) => state.div === 'ALL' || e.div === state.div;
  const scopeName = () => (state.div === 'ALL' ? '전사' : divById[state.div].name);
  // 하위 조직 단위: 전사 → 부문, 부문 선택 → 본부
  function units() {
    if (state.div === 'ALL') return DIVS.map((d) => ({ id: d.id, name: d.name, match: (e) => e.div === d.id }));
    return divById[state.div].hqs.map((q) => ({ id: q.id, name: q.name, match: (e) => e.hq === q.id }));
  }

  function metrics(pred) {
    const list = EMP.filter(pred);
    const hc = POINTS.map((d) => list.filter((e) => isActive(e, d)).length);
    const hires = [], exits = [], vol = [], rate = [];
    MONTH_ENDS.forEach((end, i) => {
      const from = POINTS[i];
      const ex = list.filter((e) => e.exit && e.exit > from && e.exit <= end);
      hires.push(list.filter((e) => e.hire > from && e.hire <= end).length);
      exits.push(ex.length);
      vol.push(ex.filter((e) => e.voluntary).length);
      rate.push(ex.length / (((hc[i] + hc[i + 1]) / 2) || 1));
    });
    const avgHC = hc.reduce((a, b) => a + b, 0) / hc.length;
    const exited = list.filter((e) => e.exit && e.exit > START && e.exit <= AS_OF);
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    return {
      list, hc, hires, exits, vol, rate, avgHC, exited,
      active: list.filter((e) => isActive(e, AS_OF)),
      exits12: sum(exits), hires12: sum(hires), vol12: sum(vol),
      annualRate: sum(exits) / (avgHC || 1), volRate: sum(vol) / (avgHC || 1),
    };
  }

  // ===================== 공통 UI =====================
  function colors() {
    return {
      s1: cssVar('--s1'), s2: cssVar('--s2'), s3: cssVar('--s3'), neutral: cssVar('--s-neutral'),
      ord: ['--o1', '--o2', '--o3', '--o4', '--o5'].map(cssVar),
    };
  }

  let pending = []; // DOM에 붙은 뒤 그릴 차트
  function card({ title, sub, span, chart, table, tableFirst }) {
    const body = h('div', { class: 'chart' });
    const el = h('section', { class: `card span-${span || 6}` });
    const head = h('div', { class: 'card-head' }, [h('div', null, [h('h3', { class: 'card-title', text: title }), sub ? h('p', { class: 'card-sub', text: sub }) : null])]);
    el.appendChild(head);
    el.appendChild(body);
    let showTable = !!tableFirst || !chart;
    const draw = () => {
      body.textContent = '';
      if (showTable) { const t = table(); body.appendChild(t); } else chart(body);
    };
    if (chart && table) {
      const btn = h('button', { class: 'view-toggle', type: 'button', 'aria-pressed': 'false', text: '표로 보기' });
      btn.addEventListener('click', () => {
        showTable = !showTable;
        btn.textContent = showTable ? '차트로 보기' : '표로 보기';
        btn.setAttribute('aria-pressed', String(showTable));
        Charts.hideTip();
        draw();
      });
      head.appendChild(btn);
    }
    pending.push(draw);
    return el;
  }

  function statCard({ label, value, unit, foot, span }) {
    return h('section', { class: `card stat span-${span || 3}` }, [
      h('div', { class: 'kpi-label', text: label }),
      h('div', { class: 'kpi-value' }, [value, unit ? h('small', { text: unit }) : null]),
      foot ? h('div', { class: 'kpi-foot' }, foot) : null,
    ]);
  }

  // 증감 표시. goodWhenUp: 증가가 좋은 지표인지
  function delta(diff, { goodWhenUp = true, suffix = '', digits = 0, label } = {}) {
    const v = digits ? diff.toFixed(digits) : fmtN(Math.abs(diff));
    const sign = diff > 0 ? '+' : diff < 0 ? '−' : '±';
    const abs = digits ? Math.abs(diff).toFixed(digits) : v;
    const cls = diff === 0 ? 'flat' : (diff > 0) === goodWhenUp ? 'up-good' : 'up-bad';
    return [h('span', { class: `delta ${cls}`, text: `${sign}${abs}${suffix}` }), label ? ' ' + label : null];
  }

  function filterBar(onChange) {
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': '부문 선택' });
    const opts = [{ id: 'ALL', name: '전체' }, ...DIVS.map((d) => ({ id: d.id, name: d.short }))];
    for (const o of opts) {
      const b = h('button', { type: 'button', 'aria-pressed': String(state.div === o.id), text: o.name });
      b.addEventListener('click', () => {
        state.div = o.id;
        try { localStorage.setItem('hr-div', o.id); } catch (e) { /* 무시 */ }
        onChange();
      });
      seg.appendChild(b);
    }
    return h('div', { class: 'filters' }, [h('span', { class: 'filters-label', text: '조직' }), seg]);
  }

  function detailShell(tile, opts = {}) {
    const wrap = h('div');
    wrap.appendChild(h('div', { class: 'detail-head' }, [
      h('a', { class: 'back-btn', href: '#/' }, [icon('back'), '대시보드']),
    ]));
    wrap.appendChild(h('div', { class: 'detail-title' }, [
      h('div', { class: 'tile-icon' }, icon(tile.icon)),
      h('div', null, [h('h1', { text: tile.title }), h('p', { text: opts.sub || `${scopeName()} · ${fmtDate(AS_OF)} 기준` })]),
    ]));
    if (opts.filter !== false) wrap.appendChild(filterBar(render));
    const grid = h('div', { class: 'grid' });
    wrap.appendChild(grid);
    return { wrap, grid };
  }

  // ===================== 메인 =====================
  function viewHome() {
    const all = metrics(() => true);
    const c = colors();
    const now = all.hc[12], prev = all.hc[11];
    const lastM = MONTH_ENDS[11];
    const openPos = DATA.positions;
    const openHeads = openPos.reduce((a, p) => a + p.heads, 0);
    const teams = Object.keys(teamById).length, hqs = Object.keys(hqById).length;
    const ages = all.active.map((e) => years(e.birth, AS_OF));
    const avgAge = ages.reduce((a, b) => a + b, 0) / ages.length;

    const root = h('div');
    root.appendChild(h('div', { class: 'greeting' }, [
      h('h1', { text: '인사 현황 한눈에 보기' }),
      h('p', { text: `${DATA.meta.company} · ${fmtDate(AS_OF)} 기준 · 샘플 데이터` }),
    ]));

    const spark = h('div', { class: 'spark' });
    pending.push(() => Charts.spark(spark, all.hc, c.s1));
    root.appendChild(h('div', { class: 'kpis' }, [
      h('section', { class: 'kpi hero' }, [
        h('div', { class: 'kpi-label', text: '총인원' }),
        h('div', { class: 'kpi-value' }, [fmtN(now), h('small', { text: '명' })]),
        h('div', { class: 'kpi-foot' }, delta(now - prev, { suffix: '명', label: '전월 대비' })),
        spark,
      ]),
      h('section', { class: 'kpi' }, [
        h('div', { class: 'kpi-label', text: '연환산 퇴직률' }),
        h('div', { class: 'kpi-value', text: fmtP(all.annualRate) }),
        h('div', { class: 'kpi-foot', text: `최근 12개월 퇴사 ${fmtN(all.exits12)}명 · 자발적 ${fmtP(all.volRate)}` }),
      ]),
      h('section', { class: 'kpi' }, [
        h('div', { class: 'kpi-label', text: `${monthLabel(lastM)} 입사 / 퇴사` }),
        h('div', { class: 'kpi-value' }, [`${all.hires[11]} / ${all.exits[11]}`, h('small', { text: '명' })]),
        h('div', { class: 'kpi-foot' }, delta(all.hires[11] - all.exits[11], { suffix: '명', label: '순증' })),
      ]),
      h('section', { class: 'kpi' }, [
        h('div', { class: 'kpi-label', text: '채용 진행 포지션' }),
        h('div', { class: 'kpi-value' }, [String(openPos.length), h('small', { text: '개' })]),
        h('div', { class: 'kpi-foot', text: `채용 예정 ${openHeads}명 · 장기 미충원 ${openPos.filter((p) => p.daysOpen > 60).length}개` }),
      ]),
    ]));

    root.appendChild(h('div', { class: 'section-head' }, [h('h2', { text: '바로가기' }), h('p', { text: '아이콘을 누르면 자세한 화면이나 문서로 이동합니다' })]));

    const stats = {
      headcount: [fmtN(now) + '명', `${DIVS.length}개 부문`],
      turnover: [fmtP(all.annualRate), '연환산 퇴직률'],
      org: [`${teams}개 팀`, `${DIVS.length}부문 · ${hqs}본부`],
      composition: [`${avgAge.toFixed(1)}세`, '평균 연령'],
      recruiting: [`${openPos.length}개`, '진행 중인 포지션'],
    };
    const tiles = h('div', { class: 'tiles' });
    for (const t of CONFIG.tiles) {
      const isLink = t.type === 'link';
      const st = stats[t.id];
      const a = h('a', {
        class: 'tile', href: isLink ? t.href : `#/${t.id}`,
        target: isLink ? '_blank' : null, rel: isLink ? 'noopener' : null,
      }, [
        h('div', { class: 'tile-icon' }, icon(t.icon)),
        h('div', { class: 'tile-body' }, [
          h('div', { class: 'tile-title' }, [t.title, isLink ? h('span', { class: 'badge-ext', text: '새 창' }) : null]),
          h('div', { class: 'tile-desc', text: t.desc }),
          st ? h('div', { class: 'tile-stat' }, [h('strong', { text: st[0] }), st[1]]) : (isLink ? h('div', { class: 'tile-stat', text: '문서 열기' }) : null),
        ]),
      ]);
      const arrow = icon(isLink ? 'external' : 'arrow');
      arrow.classList.add('tile-arrow');
      a.appendChild(arrow);
      tiles.appendChild(a);
    }
    root.appendChild(tiles);
    return root;
  }

  // ===================== 인원 현황 =====================
  function viewHeadcount(tile) {
    const { wrap, grid } = detailShell(tile);
    const c = colors();
    const m = metrics(inScope);
    const now = m.hc[12];
    const regular = m.active.filter((e) => !e.contract).length;
    const us = units().map((u) => {
      const um = metrics((e) => inScope(e) && u.match(e));
      return { ...u, now: um.hc[12], prev: um.hc[11], yago: um.hc[0], regular: um.active.filter((e) => !e.contract).length, contract: um.active.filter((e) => e.contract).length };
    });

    grid.append(
      statCard({ label: '현재 인원', value: fmtN(now), unit: '명', foot: [`${fmtDate(AS_OF)} 기준`] }),
      statCard({ label: '전월 대비', value: (now - m.hc[11] >= 0 ? '+' : '−') + fmtN(Math.abs(now - m.hc[11])), unit: '명', foot: [`입사 ${m.hires[11]} · 퇴사 ${m.exits[11]}`] }),
      statCard({ label: '전년 동월 대비', value: (now - m.hc[0] >= 0 ? '+' : '−') + fmtN(Math.abs(now - m.hc[0])), unit: '명', foot: delta((now - m.hc[0]) / m.hc[0] * 100, { digits: 1, suffix: '%', label: `(${fmtN(m.hc[0])}명 → ${fmtN(now)}명)` }) }),
      statCard({ label: '정규직 비율', value: fmtP(regular / now), foot: [`정규직 ${fmtN(regular)} · 계약직 ${fmtN(now - regular)}`] }),
    );

    grid.appendChild(card({
      title: '월말 인원 추이', sub: '2025년 10월 ~ 2026년 10월, 단위: 명', span: 8,
      chart: (el) => Charts.line(el, { labels: POINTS.map(monthLabel), tipLabels: POINTS.map(monthFull), series: [{ name: '인원', values: m.hc, color: c.s1 }], format: fmtN, valueName: '명', ariaLabel: '월말 인원 추이' }),
      table: () => Charts.table([{ label: '월' }, { label: '월말 인원', num: true }, { label: '입사', num: true }, { label: '퇴사', num: true }],
        POINTS.map((d, i) => [monthFull(d), fmtN(m.hc[i]), i ? m.hires[i - 1] : '–', i ? m.exits[i - 1] : '–'])),
    }));

    grid.appendChild(card({
      title: state.div === 'ALL' ? '부문별 인원' : '본부별 인원', sub: '단위: 명', span: 4,
      chart: (el) => Charts.bars(el, { items: [...us].sort((a, b) => b.now - a.now).map((u) => ({ label: u.name, value: u.now })), color: c.s1, format: fmtN, valueName: '명' }),
      table: () => Charts.table([{ label: '조직' }, { label: '인원', num: true }, { label: '비중', num: true }], us.map((u) => [u.name, fmtN(u.now), fmtP(u.now / now)])),
    }));

    const byGrade = GRADES.map((g, i) => ({ label: g, value: m.active.filter((e) => e.grade === i).length })).reverse();
    grid.appendChild(card({
      title: '직급별 인원', sub: '단위: 명', span: 6,
      chart: (el) => Charts.bars(el, { items: byGrade, color: c.s1, format: fmtN, valueName: '명' }),
      table: () => Charts.table([{ label: '직급' }, { label: '인원', num: true }, { label: '비중', num: true }], byGrade.map((g) => [g.label, fmtN(g.value), fmtP(g.value / now)])),
    }));

    grid.appendChild(card({
      title: '고용 형태', sub: '정규직 · 계약직 비중', span: 6,
      chart: (el) => {
        const top = h('div'); const rows = h('div', { style: { marginTop: '18px' } });
        el.append(top, rows);
        Charts.segbar(top, [{ name: '정규직', value: regular, color: c.s1 }, { name: '계약직', value: now - regular, color: c.s2 }], { format: (v) => fmtN(v) + '명' });
        Charts.segrows(rows, us.map((u) => ({ name: u.name, right: fmtP(u.contract / (u.now || 1)), parts: [{ name: '정규직', value: u.regular, color: c.s1 }, { name: '계약직', value: u.contract, color: c.s2 }] })), [{ name: '조직별 · 오른쪽 숫자는 계약직 비중', color: 'transparent' }]);
        rows.querySelector('.legend').remove();
        rows.prepend(h('p', { class: 'card-sub', style: { margin: '0 0 8px' }, text: '조직별 비교 (오른쪽: 계약직 비중)' }));
      },
      table: () => Charts.table([{ label: '조직' }, { label: '정규직', num: true }, { label: '계약직', num: true }, { label: '계약직 비중', num: true }],
        us.map((u) => [u.name, fmtN(u.regular), fmtN(u.contract), fmtP(u.contract / (u.now || 1))]), ['합계', fmtN(regular), fmtN(now - regular), fmtP((now - regular) / now)]),
    }));

    // 조직별 상세 표
    const rows = [];
    const divs = state.div === 'ALL' ? DIVS : [divById[state.div]];
    for (const d of divs) for (const q of d.hqs) {
      const qm = metrics((e) => e.hq === q.id);
      rows.push([d.name, q.name, fmtN(qm.hc[12]), signed(qm.hc[12] - qm.hc[11]), signed(qm.hc[12] - qm.hc[0]), fmtN(qm.active.filter((e) => !e.contract).length), fmtN(qm.active.filter((e) => e.contract).length)]);
    }
    const headOnly = m.active.filter((e) => !e.hq).length;
    if (headOnly) rows.push(['', '부문장(임원)', fmtN(headOnly), '', '', fmtN(headOnly), '0']);
    grid.appendChild(card({
      title: '본부별 인원 상세', sub: '전월·전년 동월 대비 증감', span: 12,
      table: () => Charts.table([{ label: '부문' }, { label: '본부' }, { label: '인원', num: true }, { label: '전월 대비', num: true }, { label: '전년 대비', num: true }, { label: '정규직', num: true }, { label: '계약직', num: true }], rows,
        ['합계', '', fmtN(now), signed(now - m.hc[11]), signed(now - m.hc[0]), fmtN(regular), fmtN(now - regular)]),
    }));
    return wrap;
  }
  const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtN(Math.abs(v));

  // ===================== 입·퇴사 / 퇴직률 =====================
  function viewTurnover(tile) {
    const { wrap, grid } = detailShell(tile);
    const c = colors();
    const m = metrics(inScope);
    const early = m.exited.filter((e) => years(e.hire, e.exit) < 1).length;
    const labels = MONTH_ENDS.map(monthLabel), tips = MONTH_ENDS.map(monthFull);

    grid.append(
      statCard({ label: '연환산 퇴직률', value: fmtP(m.annualRate), foot: [`최근 12개월 퇴사 ÷ 평균 인원 ${fmtN(m.avgHC)}명`] }),
      statCard({ label: '자발적 퇴직률', value: fmtP(m.volRate), foot: [`자발적 퇴사 ${fmtN(m.vol12)}명 (퇴사자의 ${fmtP(m.vol12 / (m.exits12 || 1), 0)})`] }),
      statCard({ label: '최근 12개월 입사 / 퇴사', value: `${fmtN(m.hires12)} / ${fmtN(m.exits12)}`, unit: '명', foot: delta(m.hires12 - m.exits12, { suffix: '명', label: '순증' }) }),
      statCard({ label: '1년 미만 근속 퇴사 비중', value: fmtP(early / (m.exits12 || 1)), foot: [`퇴사자 ${fmtN(m.exits12)}명 중 ${fmtN(early)}명`] }),
    );

    grid.appendChild(card({
      title: '월별 입사 · 퇴사', sub: '2025년 11월 ~ 2026년 10월, 단위: 명', span: 8,
      chart: (el) => Charts.columns(el, { labels, tipLabels: tips, series: [{ name: '입사', values: m.hires, color: c.s1 }, { name: '퇴사', values: m.exits, color: c.s2 }], format: fmtN, labelMode: 'none', ariaLabel: '월별 입사 퇴사' }),
      table: () => Charts.table([{ label: '월' }, { label: '입사', num: true }, { label: '퇴사', num: true }, { label: '순증', num: true }],
        MONTH_ENDS.map((d, i) => [monthFull(d), m.hires[i], m.exits[i], signed(m.hires[i] - m.exits[i])]), ['합계', fmtN(m.hires12), fmtN(m.exits12), signed(m.hires12 - m.exits12)]),
    }));

    const inv = m.exits12 - m.vol12;
    grid.appendChild(card({
      title: '퇴사 유형', sub: '최근 12개월', span: 4,
      chart: (el) => {
        const top = h('div'); el.appendChild(top);
        Charts.segbar(top, [{ name: '자발적', value: m.vol12, color: c.s2 }, { name: '비자발적', value: inv, color: c.neutral, ink: '#0b0b0b' }], { format: (v) => fmtN(v) + '명' });
        const inv_r = {};
        m.exited.filter((e) => !e.voluntary).forEach((e) => inv_r[e.exitReason] = (inv_r[e.exitReason] || 0) + 1);
        el.appendChild(h('p', { class: 'card-sub', style: { marginTop: '14px' }, text: '비자발적 퇴사: ' + Object.entries(inv_r).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}명`).join(' · ') }));
      },
      table: () => Charts.table([{ label: '유형' }, { label: '인원', num: true }, { label: '비중', num: true }], [['자발적', fmtN(m.vol12), fmtP(m.vol12 / (m.exits12 || 1))], ['비자발적', fmtN(inv), fmtP(inv / (m.exits12 || 1))]]),
    }));

    grid.appendChild(card({
      title: '월 퇴직률 추이', sub: '해당 월 퇴사자 ÷ 월평균 인원', span: 6,
      chart: (el) => Charts.line(el, { labels, tipLabels: tips, series: [{ name: '퇴직률', values: m.rate, color: c.s2 }], format: (v, tick) => (v * 100).toFixed(tick ? 1 : 2) + '%', zero: true, valueName: '월 퇴직률', ariaLabel: '월 퇴직률 추이' }),
      table: () => Charts.table([{ label: '월' }, { label: '퇴사', num: true }, { label: '월 퇴직률', num: true }], MONTH_ENDS.map((d, i) => [monthFull(d), m.exits[i], fmtP(m.rate[i], 2)])),
    }));

    const us = units().map((u) => { const um = metrics((e) => inScope(e) && u.match(e)); return { name: u.name, rate: um.annualRate, exits: um.exits12, vol: um.vol12, avg: um.avgHC }; });
    grid.appendChild(card({
      title: state.div === 'ALL' ? '부문별 연환산 퇴직률' : '본부별 연환산 퇴직률', sub: '최근 12개월', span: 6,
      chart: (el) => Charts.bars(el, { items: [...us].sort((a, b) => b.rate - a.rate).map((u) => ({ label: u.name, value: u.rate, note: `퇴사 ${u.exits}명` })), color: c.s2, format: (v) => fmtP(v) }),
      table: () => Charts.table([{ label: '조직' }, { label: '평균 인원', num: true }, { label: '퇴사', num: true }, { label: '자발적', num: true }, { label: '퇴직률', num: true }], us.map((u) => [u.name, fmtN(u.avg), u.exits, u.vol, fmtP(u.rate)])),
    }));

    const reasons = {};
    m.exited.forEach((e) => reasons[e.exitReason] = (reasons[e.exitReason] || 0) + 1);
    const reasonItems = Object.entries(reasons).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, note: fmtP(v / (m.exits12 || 1), 0) }));
    grid.appendChild(card({
      title: '퇴사 사유', sub: '최근 12개월, 단위: 명', span: 6,
      chart: (el) => Charts.bars(el, { items: reasonItems, color: c.s2, format: fmtN, rowH: 30 }),
      table: () => Charts.table([{ label: '사유' }, { label: '인원', num: true }, { label: '비중', num: true }], reasonItems.map((r) => [r.label, r.value, r.note])),
    }));

    const tb = [['1년 미만', 0, 1], ['1~3년', 1, 3], ['3~5년', 3, 5], ['5~10년', 5, 10], ['10년 이상', 10, 99]];
    const tenItems = tb.map(([label, a, b]) => { const v = m.exited.filter((e) => { const y = years(e.hire, e.exit); return y >= a && y < b; }).length; return { label, value: v, note: fmtP(v / (m.exits12 || 1), 0) }; });
    grid.appendChild(card({
      title: '근속기간별 퇴사자', sub: '퇴사 시점 근속, 단위: 명', span: 6,
      chart: (el) => Charts.bars(el, { items: tenItems, color: c.s2, format: fmtN, rowH: 30 }),
      table: () => Charts.table([{ label: '근속기간' }, { label: '인원', num: true }, { label: '비중', num: true }], tenItems.map((r) => [r.label, r.value, r.note])),
    }));
    return wrap;
  }

  // ===================== 조직도 =====================
  function viewOrg(tile) {
    const { wrap, grid } = detailShell(tile);
    const active = EMP.filter((e) => isActive(e, AS_OF));
    const count = (pred) => active.filter(pred).length;
    const divs = state.div === 'ALL' ? DIVS : [divById[state.div]];
    const nHq = divs.reduce((a, d) => a + d.hqs.length, 0);
    const nTeam = divs.reduce((a, d) => a + d.hqs.reduce((b, q) => b + q.teams.length, 0), 0);
    const total = count(inScope);
    const teamSizes = divs.flatMap((d) => d.hqs.flatMap((q) => q.teams.map((t) => count((e) => e.team === t.id))));
    const maxTeam = Math.max(...teamSizes);

    grid.append(
      statCard({ label: '조직 수', value: `${divs.length} · ${nHq} · ${nTeam}`, foot: ['부문 · 본부 · 팀'] }),
      statCard({ label: '인원', value: fmtN(total), unit: '명', foot: [`${scopeName()}`] }),
      statCard({ label: '평균 팀 규모', value: (teamSizes.reduce((a, b) => a + b, 0) / teamSizes.length).toFixed(1), unit: '명', foot: [`최소 ${Math.min(...teamSizes)}명 · 최대 ${maxTeam}명`] }),
      statCard({ label: '여성 조직장 비율', value: fmtP(divs.flatMap((d) => [d.head, ...d.hqs.flatMap((q) => [q.head, ...q.teams.map((t) => t.lead)])]).filter((id) => empById[id].sex === 'F').length / (divs.length + nHq + nTeam)), foot: ['부문장 · 본부장 · 팀장 기준'] }),
    );

    const holder = h('section', { class: 'card span-12' });
    const toolbar = h('div', { class: 'org-toolbar' });
    const expandAll = h('button', { class: 'view-toggle', type: 'button', text: '모두 펼치기' });
    const collapseAll = h('button', { class: 'view-toggle', type: 'button', text: '모두 접기' });
    toolbar.append(expandAll, collapseAll);
    holder.append(h('div', { class: 'card-head' }, [h('div', null, [h('h3', { class: 'card-title', text: '조직 구조' }), h('p', { class: 'card-sub', text: '부문 → 본부 → 팀 · 막대는 팀 인원 규모' })]), toolbar]));

    const toggles = [];
    function node(cls, name, head, n, children, open) {
      const box = h('div', { class: cls });
      const kids = h('div', { class: 'org-children' }, children);
      kids.hidden = !open;
      const tg = h('button', { class: 'org-toggle', type: 'button', 'aria-expanded': String(open), 'aria-label': `${name} 펼치기/접기` }, icon('chevron'));
      tg.addEventListener('click', () => { const o = tg.getAttribute('aria-expanded') !== 'true'; tg.setAttribute('aria-expanded', String(o)); kids.hidden = !o; });
      toggles.push([tg, kids]);
      box.appendChild(h('div', { class: `org-node ${cls === 'org-div' ? 'div-node' : ''}` }, [
        tg,
        h('div', { style: { minWidth: 0 } }, [h('div', { class: 'org-name', text: name }), h('div', { class: 'org-head', text: head })]),
        h('div', { class: 'org-count' }, [h('strong', { text: fmtN(n) }), ' 명']),
      ]));
      box.appendChild(kids);
      return box;
    }
    const person = (id, title) => { const e = empById[id]; return `${title} ${e.name} (${GRADES[e.grade]})`; };
    for (const d of divs) {
      const hqNodes = d.hqs.map((q) => {
        const teams = h('div', { class: 'team-grid' }, q.teams.map((t) => {
          const n = count((e) => e.team === t.id);
          const lead = empById[t.lead];
          return h('div', { class: 'team' }, [
            h('div', { class: 't-name' }, [h('span', { text: t.name }), h('span', { text: `${n}명` })]),
            h('div', { class: 't-lead', text: `팀장 ${lead.name} ${GRADES[lead.grade]}` }),
            h('div', { class: 't-bar' }, h('div', { style: { width: `${(n / maxTeam) * 100}%` } })),
          ]);
        }));
        return node('org-hq', q.name, person(q.head, '본부장'), count((e) => e.hq === q.id), [teams], true);
      });
      holder.appendChild(node('org-div', d.name, person(d.head, '부문장'), count((e) => e.div === d.id), hqNodes, true));
    }
    expandAll.addEventListener('click', () => toggles.forEach(([t, k]) => { t.setAttribute('aria-expanded', 'true'); k.hidden = false; }));
    collapseAll.addEventListener('click', () => toggles.forEach(([t, k]) => { t.setAttribute('aria-expanded', 'false'); k.hidden = true; }));
    grid.appendChild(holder);
    return wrap;
  }

  // ===================== 인력 구성 =====================
  function viewComposition(tile) {
    const { wrap, grid } = detailShell(tile);
    const c = colors();
    const act = EMP.filter((e) => inScope(e) && isActive(e, AS_OF));
    const n = act.length;
    const age = (e) => years(e.birth, AS_OF), ten = (e) => years(e.hire, AS_OF);
    const avg = (arr, f) => arr.reduce((a, e) => a + f(e), 0) / (arr.length || 1);
    const female = act.filter((e) => e.sex === 'F').length;
    const leaders = act.filter((e) => e.role);

    grid.append(
      statCard({ label: '평균 연령', value: avg(act, age).toFixed(1), unit: '세', foot: [`중위 ${median(act.map(age)).toFixed(0)}세`] }),
      statCard({ label: '평균 근속', value: avg(act, ten).toFixed(1), unit: '년', foot: [`10년 이상 근속 ${fmtP(act.filter((e) => ten(e) >= 10).length / n, 0)}`] }),
      statCard({ label: '여성 비율', value: fmtP(female / n), foot: [`여성 ${fmtN(female)} · 남성 ${fmtN(n - female)}`] }),
      statCard({ label: '여성 리더 비율', value: fmtP(leaders.filter((e) => e.sex === 'F').length / (leaders.length || 1)), foot: [`팀장 이상 ${leaders.length}명 기준`] }),
    );

    const us = units().map((u) => { const a = act.filter(u.match); return { name: u.name, f: a.filter((e) => e.sex === 'F').length, m: a.filter((e) => e.sex === 'M').length }; });
    grid.appendChild(card({
      title: '성별 구성', sub: `${scopeName()} · 조직별 비교`, span: 6,
      chart: (el) => {
        const top = h('div'); const rows = h('div', { style: { marginTop: '18px' } });
        el.append(top, rows);
        Charts.segbar(top, [{ name: '남성', value: n - female, color: c.s1 }, { name: '여성', value: female, color: c.s2 }], { format: (v) => fmtN(v) + '명' });
        Charts.segrows(rows, us.map((u) => ({ name: u.name, right: `여성 ${fmtP(u.f / ((u.f + u.m) || 1), 0)}`, parts: [{ name: '남성', value: u.m, color: c.s1 }, { name: '여성', value: u.f, color: c.s2 }] })), []);
        rows.querySelector('.legend').remove();
      },
      table: () => Charts.table([{ label: '조직' }, { label: '남성', num: true }, { label: '여성', num: true }, { label: '여성 비율', num: true }], us.map((u) => [u.name, fmtN(u.m), fmtN(u.f), fmtP(u.f / ((u.f + u.m) || 1))])),
    }));

    const ageBands = [['24세 이하', 0, 25], ['25~29', 25, 30], ['30~34', 30, 35], ['35~39', 35, 40], ['40~44', 40, 45], ['45~49', 45, 50], ['50~54', 50, 55], ['55세 이상', 55, 99]];
    const ageV = ageBands.map(([, a, b]) => act.filter((e) => age(e) >= a && age(e) < b).length);
    grid.appendChild(card({
      title: '연령대 분포', sub: '단위: 명', span: 6,
      chart: (el) => Charts.columns(el, { labels: ageBands.map((b) => b[0].replace('세 이하', '↓').replace('세 이상', '↑')), tipLabels: ageBands.map((b) => b[0].includes('세') ? b[0] : b[0] + '세'), series: [{ name: '', values: ageV, color: c.s1 }], format: fmtN, valueName: '명', labelMode: 'max', ariaLabel: '연령대 분포' }),
      table: () => Charts.table([{ label: '연령대' }, { label: '인원', num: true }, { label: '비중', num: true }], ageBands.map((b, i) => [b[0], fmtN(ageV[i]), fmtP(ageV[i] / n)])),
    }));

    const tenBands = [['1년 미만', 0, 1], ['1~3년', 1, 3], ['3~5년', 3, 5], ['5~10년', 5, 10], ['10~15년', 10, 15], ['15~20년', 15, 20], ['20년 이상', 20, 99]];
    const tenV = tenBands.map(([, a, b]) => act.filter((e) => ten(e) >= a && ten(e) < b).length);
    grid.appendChild(card({
      title: '근속연수 분포', sub: '단위: 명', span: 6,
      chart: (el) => Charts.columns(el, { labels: tenBands.map((b) => b[0]), series: [{ name: '', values: tenV, color: c.s1 }], format: fmtN, valueName: '명', labelMode: 'max', ariaLabel: '근속연수 분포' }),
      table: () => Charts.table([{ label: '근속연수' }, { label: '인원', num: true }, { label: '비중', num: true }], tenBands.map((b, i) => [b[0], fmtN(tenV[i]), fmtP(tenV[i] / n)])),
    }));

    grid.appendChild(card({
      title: '직급별 구성', sub: '인원 · 여성 비율 · 평균 연령 · 평균 근속', span: 6,
      table: () => Charts.table([{ label: '직급' }, { label: '인원', num: true }, { label: '여성 비율', num: true }, { label: '평균 연령', num: true }, { label: '평균 근속', num: true }],
        GRADES.map((g, i) => { const a = act.filter((e) => e.grade === i); return [g, fmtN(a.length), fmtP(a.filter((e) => e.sex === 'F').length / (a.length || 1)), avg(a, age).toFixed(1) + '세', avg(a, ten).toFixed(1) + '년']; }).reverse(),
        ['전체', fmtN(n), fmtP(female / n), avg(act, age).toFixed(1) + '세', avg(act, ten).toFixed(1) + '년']),
    }));
    return wrap;
  }
  function median(a) { const s = [...a].sort((x, y) => x - y); const k = Math.floor(s.length / 2); return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; }

  // ===================== 채용 현황 =====================
  function viewRecruiting(tile) {
    const { wrap, grid } = detailShell(tile);
    const c = colors();
    const pos = DATA.positions.filter((p) => state.div === 'ALL' || p.div === state.div);
    const divIds = state.div === 'ALL' ? DIVS.map((d) => d.id) : [state.div];
    const fun = { applied: 0, screened: 0, interview: 0, offer: 0, hired: 0 };
    let tthW = 0, hiredSum = 0;
    for (const id of divIds) { const hr = DATA.hiring[id]; for (const k in fun) fun[k] += hr.funnel[k]; tthW += hr.timeToHire * hr.funnel.hired; hiredSum += hr.funnel.hired; }
    const tth = tthW / (hiredSum || 1);
    const inPipe = pos.reduce((a, p) => a + p.funnel.applied, 0);
    const heads = pos.reduce((a, p) => a + p.heads, 0);
    const longOpen = pos.filter((p) => p.daysOpen > 60).length;

    grid.append(
      statCard({ label: '진행 중인 포지션', value: String(pos.length), unit: '개', foot: [`장기 미충원(60일 초과) ${longOpen}개`] }),
      statCard({ label: '채용 예정 인원', value: fmtN(heads), unit: '명', foot: ['진행 포지션 합계'] }),
      statCard({ label: '진행 중 지원자', value: fmtN(inPipe), unit: '명', foot: [`포지션당 평균 ${(inPipe / (pos.length || 1)).toFixed(0)}명`] }),
      statCard({ label: '평균 채용 소요일', value: tth.toFixed(0), unit: '일', foot: ['공고 오픈 → 입사 확정, 최근 12개월'] }),
    );

    const stages = [['지원', 'applied'], ['서류 통과', 'screened'], ['면접', 'interview'], ['최종 합격', 'offer'], ['입사', 'hired']];
    const funItems = stages.map(([label, k], i) => ({ label, value: fun[k], color: c.ord[4 - i] , note: i ? `전 단계 대비 ${fmtP(fun[k] / (fun[stages[i - 1][1]] || 1), 0)}` : '' }));
    grid.appendChild(card({
      title: '채용 퍼널', sub: '최근 12개월 누적, 단위: 명', span: 7,
      chart: (el) => Charts.bars(el, { items: funItems.map((f) => ({ ...f, color: f.color })), format: fmtN, rowH: 40, barH: 22 }),
      table: () => Charts.table([{ label: '단계' }, { label: '인원', num: true }, { label: '전 단계 대비', num: true }, { label: '지원 대비', num: true }],
        funItems.map((f, i) => [f.label, fmtN(f.value), i ? fmtP(f.value / funItems[i - 1].value, 1) : '–', fmtP(f.value / funItems[0].value, 1)])),
    }));

    const stageCount = ['서류 검토', '면접 진행', '처우 협의'].map((st) => ({ name: st, value: pos.filter((p) => p.stage === st).length }));
    const tthItems = DIVS.filter((d) => divIds.includes(d.id)).map((d) => ({ label: d.short, value: DATA.hiring[d.id].timeToHire }));
    grid.appendChild(card({
      title: '포지션 진행 단계', sub: `진행 중 ${pos.length}개 포지션`, span: 5,
      chart: (el) => {
        const top = h('div'); el.appendChild(top);
        Charts.segbar(top, stageCount.map((s, i) => ({ ...s, color: c.ord[[0, 2, 4][i]], ink: i === 0 ? '#0b0b0b' : '#fff' })), { format: (v) => v + '개' });
        if (tthItems.length > 1) {
          el.appendChild(h('p', { class: 'card-sub', style: { margin: '18px 0 6px' }, text: '부문별 평균 채용 소요일' }));
          const b = h('div'); el.appendChild(b);
          Charts.bars(b, { items: tthItems.sort((a, b2) => b2.value - a.value), color: c.s1, format: (v) => v + '일', rowH: 28 });
        }
      },
      table: () => Charts.table([{ label: '단계' }, { label: '포지션 수', num: true }], stageCount.map((s) => [s.name, s.value])),
    }));

    const statusOf = (p) => p.daysOpen > 60 ? ['serious', '장기 미충원'] : p.daysOpen > 45 ? ['warning', '주의'] : ['good', '정상'];
    grid.appendChild(card({
      title: '진행 중인 포지션', sub: '경과일 순 · 60일 초과는 장기 미충원', span: 12,
      table: () => Charts.table(
        [{ label: '상태' }, { label: '포지션' }, { label: '조직' }, { label: '직급' }, { label: '채용 인원', num: true }, { label: '오픈일' }, { label: '경과일', num: true }, { label: '진행 단계' }, { label: '지원', num: true }, { label: '서류 통과', num: true }, { label: '면접', num: true }],
        pos.map((p) => {
          const [st, lb] = statusOf(p);
          return [h('span', { class: 'status' }, [icon(st), lb]), p.title, `${hqById[p.hq].name} · ${teamById[p.team].name}`, p.grade, p.heads, fmtDate(p.opened), p.daysOpen + '일', p.stage, p.funnel.applied, p.funnel.screened, p.funnel.interview];
        })),
    }));
    return wrap;
  }

  // ===================== 라우터 =====================
  const VIEWS = { headcount: viewHeadcount, turnover: viewTurnover, org: viewOrg, composition: viewComposition, recruiting: viewRecruiting };
  let lastRoute = null;

  function render() {
    Charts.hideTip();
    pending = [];
    const route = (location.hash.replace(/^#\/?/, '') || '').split('?')[0];
    const tile = CONFIG.tiles.find((t) => t.id === route && t.type === 'view');
    const view = tile && VIEWS[tile.id] ? VIEWS[tile.id](tile) : viewHome();
    document.title = tile ? `${tile.title} · ${CONFIG.title}` : CONFIG.title;
    app.textContent = '';
    app.appendChild(view);
    app.appendChild(h('div', { class: 'footer' }, [
      h('span', { text: `${DATA.meta.company} · 모든 수치는 가상 샘플 데이터입니다` }),
      h('span', { text: `데이터 기준일 ${fmtDate(AS_OF)}` }),
    ]));
    for (const f of pending) f();
    if (route !== lastRoute) { window.scrollTo(0, 0); lastRoute = route; }
  }

  // 테마
  const themeBtn = document.getElementById('theme-btn');
  function currentTheme() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function paintThemeBtn() {
    const t = currentTheme();
    themeBtn.textContent = '';
    themeBtn.appendChild(icon(t === 'dark' ? 'sun' : 'moon'));
    themeBtn.setAttribute('aria-label', t === 'dark' ? '밝은 화면으로 전환' : '어두운 화면으로 전환');
    themeBtn.title = themeBtn.getAttribute('aria-label');
  }
  themeBtn.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('hr-theme', next); } catch (e) { /* 무시 */ }
    paintThemeBtn();
    render();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { paintThemeBtn(); render(); });
  paintThemeBtn();

  document.getElementById('brand-sub').textContent = `${DATA.meta.company} · ${fmtDate(AS_OF)} 기준`;

  window.addEventListener('hashchange', render);
  let lastW = window.innerWidth, rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (Math.abs(window.innerWidth - lastW) > 4) { lastW = window.innerWidth; render(); } }, 150);
  });
  render();
})();
