// 샘플 HR 데이터 생성기
// 실행: node scripts/generate-data.mjs
// 결과: assets/data.js (대시보드가 읽는 데이터)
// 모든 데이터는 가상이며, 시드 고정으로 실행할 때마다 같은 결과가 나옵니다.

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------- 난수 ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261031);
const rint = (a, b) => Math.floor(a + rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function wpick(items, weights) {
  const total = weights.reduce((s, w) => s + w, 0);
  let r = rnd() * total;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const gauss = () => { let u = 0, v = 0; while (!u) u = rnd(); while (!v) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ---------- 날짜 ----------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const D = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const monthEnd = (y, m) => D(y, m + 1, 0);

const AS_OF = D(2026, 10, 31);
const START = D(2025, 10, 31); // 집계 시작 시점(전년 같은 달 말)
// 집계 월: 2025-11 ~ 2026-10
const MONTHS = [];
for (let i = 0; i < 12; i++) {
  const y = 2025 + Math.floor((10 + i) / 12);
  const m = ((10 + i) % 12) + 1;
  MONTHS.push({ y, m, key: `${y}-${pad(m)}` });
}

// ---------- 조직 ----------
const ORG = [
  { id: 'D1', name: '경영지원부문', short: '경영지원', hqs: [
    { id: 'H11', name: '인사본부', teams: [['인사팀', 14], ['총무팀', 12], ['교육팀', 9]] },
    { id: 'H12', name: '재무본부', teams: [['재무팀', 13], ['회계팀', 12], ['구매팀', 15]] },
    { id: 'H13', name: '전략기획본부', teams: [['경영기획팀', 11], ['법무팀', 7], ['IT지원팀', 18]] },
  ] },
  { id: 'D2', name: '영업부문', short: '영업', hqs: [
    { id: 'H21', name: '국내영업본부', teams: [['서울영업1팀', 28], ['서울영업2팀', 26], ['지방영업팀', 31], ['영업지원팀', 17]] },
    { id: 'H22', name: '해외영업본부', teams: [['미주영업팀', 22], ['유럽영업팀', 19], ['아시아영업팀', 24]] },
    { id: 'H23', name: '마케팅본부', teams: [['브랜드팀', 16], ['디지털마케팅팀', 21], ['고객경험팀', 25]] },
  ] },
  { id: 'D3', name: '연구개발부문', short: '연구개발', hqs: [
    { id: 'H31', name: '제품연구소', teams: [['선행연구팀', 27], ['소재연구팀', 31], ['설계1팀', 36], ['설계2팀', 33]] },
    { id: 'H32', name: '소프트웨어개발본부', teams: [['플랫폼팀', 38], ['앱개발팀', 34], ['데이터팀', 29], ['QA팀', 22]] },
  ] },
  { id: 'D4', name: '생산부문', short: '생산', hqs: [
    { id: 'H41', name: '제1공장', teams: [['생산1팀', 78], ['생산2팀', 74], ['설비1팀', 26]] },
    { id: 'H42', name: '제2공장', teams: [['생산3팀', 66], ['생산4팀', 61], ['설비2팀', 22]] },
    { id: 'H43', name: '품질본부', teams: [['품질보증팀', 31], ['품질관리팀', 35]] },
    { id: 'H44', name: 'SCM본부', teams: [['물류팀', 39], ['생산관리팀', 24]] },
  ] },
];
let teamSeq = 0;
const TEAMS = [];
for (const div of ORG) for (const hq of div.hqs) {
  hq.teams = hq.teams.map(([name, size]) => {
    const t = { id: `T${String(++teamSeq).padStart(2, '0')}`, name, size, hq: hq.id, div: div.id };
    TEAMS.push(t);
    return t;
  });
}

const GRADES = ['사원', '대리', '과장', '차장', '부장', '임원'];
// 직급별 연령·근속 범위
const GRADE_PROFILE = [
  { age: [23, 31], ten: [0, 4] },
  { age: [28, 36], ten: [2, 8] },
  { age: [32, 42], ten: [4, 14] },
  { age: [37, 47], ten: [7, 20] },
  { age: [42, 55], ten: [11, 27] },
  { age: [48, 58], ten: [14, 30] },
];
const DIV_PROFILE = {
  D1: { female: 0.52, contract: 0.06, grade: [28, 22, 21, 14, 15] },
  D2: { female: 0.38, contract: 0.07, grade: [31, 24, 20, 13, 12] },
  D3: { female: 0.27, contract: 0.05, grade: [26, 25, 23, 15, 11] },
  D4: { female: 0.14, contract: 0.13, grade: [42, 21, 17, 11, 9] },
};

// ---------- 이름 ----------
const SURNAMES = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '양', '손'];
const SUR_W = [21, 15, 8.5, 4.7, 4.4, 2.4, 2.1, 2.1, 2, 1.7, 1.5, 1.5, 1.5, 1.4, 1.4, 1.4, 1.3, 1.3, 1.2, 1.1, 1, 0.9, 0.9, 0.8, 0.9];
const GIVEN_M = ['민준', '서준', '도윤', '예준', '시우', '주원', '하준', '지호', '준서', '현우', '지훈', '건우', '우진', '선우', '성민', '정우', '승현', '동현', '재원', '태윤', '상훈', '영수', '성호', '준혁', '재현', '민수', '경민', '진우', '형준', '대호', '광수', '병철', '정훈', '용준', '석진'];
const GIVEN_F = ['서연', '서윤', '지우', '하은', '민서', '지민', '수아', '지아', '윤서', '채원', '은지', '수빈', '예린', '지현', '혜진', '미영', '수진', '은영', '소영', '지영', '현정', '유진', '다은', '나연', '보람', '은비', '정은', '세영', '민지', '하린'];
const usedNames = new Set();
function makeName(sex) {
  for (let i = 0; i < 20; i++) {
    const n = wpick(SURNAMES, SUR_W) + pick(sex === 'F' ? GIVEN_F : GIVEN_M);
    if (!usedNames.has(n) || i === 19) { usedNames.add(n); return n; }
  }
}

// ---------- 직원 생성 ----------
let empSeq = 10000;
const EMP = [];
function newEmployee({ team, div, hq, grade, at, isNewHire }) {
  const dp = DIV_PROFILE[div];
  const sex = rnd() < dp.female * (grade >= 4 ? 0.55 : grade >= 3 ? 0.8 : 1) ? 'F' : 'M';
  const gp = GRADE_PROFILE[grade];
  let age = rint(gp.age[0], gp.age[1]);
  // 생산 현장직은 사원·대리도 연령 폭이 넓음
  if (div === 'D4' && grade <= 1 && rnd() < 0.4) age = rint(30, 54);
  let tenureY;
  if (isNewHire) tenureY = 0;
  else {
    tenureY = rint(gp.ten[0], gp.ten[1]);
    if (div === 'D4' && grade <= 1 && age > 32) tenureY = rint(1, Math.min(22, age - 23));
    tenureY = Math.min(tenureY, age - 22);
  }
  const hire = isNewHire ? at : addDays(at, -Math.round(tenureY * 365.25 + rnd() * 330));
  const birth = addDays(at, -Math.round(age * 365.25 + rnd() * 360));
  const contract = grade <= 2 && rnd() < dp.contract * (isNewHire ? 1.4 : 1) ? 1 : 0;
  const e = {
    id: `E${++empSeq}`, name: makeName(sex), sex, birth: ymd(birth), hire: ymd(hire),
    div, hq, team: team ? team.id : null, grade, contract, role: null,
    exit: null, exitReason: null, voluntary: null,
  };
  EMP.push(e);
  return e;
}

// 초기 인원 (2025-10-31 기준). 팀 목표 인원보다 조금 적게 시작해 1년간 증가
for (const t of TEAMS) {
  const dp = DIV_PROFILE[t.div];
  const n = Math.max(5, Math.round(t.size * 1.135 * (0.965 + gauss() * 0.02)));
  // 팀장
  const lead = newEmployee({ team: t, div: t.div, hq: t.hq, grade: rnd() < 0.7 ? 4 : 3, at: START });
  lead.role = '팀장';
  for (let i = 1; i < n; i++) {
    newEmployee({ team: t, div: t.div, hq: t.hq, grade: wpick([0, 1, 2, 3, 4], dp.grade), at: START });
  }
}
// 본부장, 부문장 (임원)
for (const div of ORG) {
  const head = newEmployee({ team: null, div: div.id, hq: null, grade: 5, at: START });
  head.role = '부문장';
  div.head = head.id;
  for (const hq of div.hqs) {
    const h = newEmployee({ team: null, div: div.id, hq: hq.id, grade: 5, at: START });
    h.role = '본부장';
    hq.head = h.id;
  }
}
// 팀장 지정
for (const t of TEAMS) t.lead = EMP.find((e) => e.team === t.id && e.role === '팀장').id;

// ---------- 12개월 시뮬레이션 ----------
const MONTHLY_RATE = { D1: 0.0068, D2: 0.0125, D3: 0.0092, D4: 0.0108 };
const SEASON = { 1: 1.35, 2: 1.25, 3: 1.1, 4: 0.95, 5: 0.9, 6: 0.95, 7: 1.05, 8: 0.95, 9: 0.85, 10: 0.9, 11: 0.85, 12: 1.2 };
const GROWTH = { D1: 0.25, D2: 0.6, D3: 1.6, D4: 0.9 };
const VOL_REASONS = ['타사 이직', '처우·보상 불만', '개인 사유(학업·가사)', '커리어 전환', '조직·리더십 갈등', '건강 문제'];
const VOL_W = [38, 19, 14, 13, 10, 6];

const isActive = (e, date) => e.hire <= ymd(date) && (!e.exit || e.exit > ymd(date));
const yearsBetween = (a, b) => (new Date(b) - new Date(a)) / (365.25 * 86400000);

for (const { y, m } of MONTHS) {
  const first = D(y, m, 1);
  const last = monthEnd(y, m);
  const days = last.getUTCDate();
  for (const div of ORG) {
    const pool = EMP.filter((e) => e.div === div.id && isActive(e, first) && !e.role);
    const expected = pool.length * MONTHLY_RATE[div.id] * SEASON[m];
    const nExit = Math.max(0, Math.round(expected + gauss() * Math.sqrt(expected) * 0.6));
    const exited = [];
    for (let k = 0; k < nExit; k++) {
      const cand = pool.filter((e) => !e.exit);
      const w = cand.map((e) => {
        const ten = yearsBetween(e.hire, ymd(first));
        let wt = 1;
        if (ten < 1) wt *= 2.6; else if (ten < 3) wt *= 1.5;
        if (e.grade <= 1) wt *= 1.3;
        if (e.contract) wt *= 2.2;
        return wt;
      });
      const e = wpick(cand, w);
      e.exit = ymd(addDays(first, rint(0, days - 1)));
      const age = yearsBetween(e.birth, e.exit);
      if (e.contract && rnd() < 0.6) { e.exitReason = '계약 만료'; e.voluntary = false; }
      else if (age >= 57 && rnd() < 0.7) { e.exitReason = '정년 퇴직'; e.voluntary = false; }
      else if (rnd() < 0.06) { e.exitReason = '권고사직'; e.voluntary = false; }
      else { e.exitReason = wpick(VOL_REASONS, VOL_W); e.voluntary = true; }
      exited.push(e);
    }
    // 채용: 결원 충원 + 증원
    let growth = GROWTH[div.id] + gauss() * 0.8;
    const nGrowth = Math.max(0, Math.round(growth));
    const backfill = exited.filter(() => rnd() < 0.88);
    const targets = backfill.map((e) => TEAMS.find((t) => t.id === e.team));
    const divTeams = TEAMS.filter((t) => t.div === div.id);
    for (let k = 0; k < nGrowth; k++) targets.push(wpick(divTeams, divTeams.map((t) => t.size)));
    for (const t of targets) {
      const grade = wpick([0, 1, 2, 3], [64, 21, 12, 3]);
      newEmployee({ team: t, div: div.id, hq: t.hq, grade, at: addDays(first, rint(0, days - 1)), isNewHire: true });
    }
  }
}

// ---------- 채용 ----------
// 포지션명 → 해당 포지션을 뽑는 팀
const TITLES = {
  D1: [['HR 비즈니스 파트너', ['인사팀']], ['급여·보상 담당', ['인사팀']], ['교육 기획 담당', ['교육팀']], ['재무 분석가', ['재무팀']], ['구매 담당', ['구매팀']], ['법무 담당(사내변호사)', ['법무팀']], ['IT 인프라 엔지니어', ['IT지원팀']], ['경영기획 담당', ['경영기획팀']]],
  D2: [['B2B 영업 담당', ['서울영업1팀', '서울영업2팀', '지방영업팀']], ['해외영업(미주)', ['미주영업팀']], ['해외영업(유럽)', ['유럽영업팀']], ['해외영업(동남아)', ['아시아영업팀']], ['퍼포먼스 마케터', ['디지털마케팅팀']], ['브랜드 매니저', ['브랜드팀']], ['CS 매니저', ['고객경험팀']], ['영업기획 담당', ['영업지원팀']]],
  D3: [['백엔드 개발자', ['플랫폼팀']], ['프론트엔드 개발자', ['앱개발팀']], ['모바일 앱 개발자', ['앱개발팀']], ['데이터 엔지니어', ['데이터팀']], ['ML 엔지니어', ['데이터팀']], ['QA 엔지니어', ['QA팀']], ['소재 연구원', ['소재연구팀']], ['기구 설계 엔지니어', ['설계1팀']], ['회로 설계 엔지니어', ['설계2팀']], ['선행기술 연구원', ['선행연구팀']]],
  D4: [['생산직(교대)', ['생산1팀', '생산2팀', '생산3팀', '생산4팀']], ['설비 보전 엔지니어', ['설비1팀', '설비2팀']], ['품질 엔지니어', ['품질보증팀', '품질관리팀']], ['생산관리 담당', ['생산관리팀']], ['물류 운영 담당', ['물류팀']], ['공정 엔지니어', ['생산1팀', '생산3팀']]],
};
const TTH = { D1: 41, D2: 36, D3: 54, D4: 28 }; // 평균 채용 소요일
const POSITIONS = [];
let posSeq = 0;
const posCount = { D1: 4, D2: 7, D3: 10, D4: 6 };
for (const div of ORG) {
  const titles = [...TITLES[div.id]];
  for (let i = 0; i < posCount[div.id]; i++) {
    const [title, teamNames] = titles.splice(Math.floor(rnd() * titles.length), 1)[0];
    const team = TEAMS.find((t) => t.name === pick(teamNames));
    const daysOpen = Math.max(4, Math.round(TTH[div.id] * (0.2 + rnd() * 1.9)));
    const opened = addDays(AS_OF, -daysOpen);
    const heads = title.includes('생산직') ? rint(3, 6) : wpick([1, 2, 3], [70, 22, 8]);
    const popularity = div.id === 'D3' ? 1.6 : div.id === 'D4' ? 1.2 : 1;
    const applied = Math.round((12 + rnd() * 70) * popularity * Math.min(1.6, 0.4 + daysOpen / 40) * (heads > 2 ? 1.8 : 1));
    // 진행 단계: 경과일이 길수록 뒤 단계. 오래 열려 있어도 적합자가 없어 면접 단계에 머무는 경우 포함
    const progress = (daysOpen / TTH[div.id]) * (0.75 + rnd() * 0.5);
    let stage = progress < 0.45 ? '서류 검토' : progress < 1.15 || rnd() < 0.45 ? '면접 진행' : '처우 협의';
    const screened = Math.round(applied * (0.22 + rnd() * 0.15) * (stage === '서류 검토' ? 0.5 : 1));
    const interview = stage === '서류 검토' ? 0 : Math.max(1, Math.round(screened * (0.3 + rnd() * 0.2) * (stage === '면접 진행' ? 0.7 : 1)));
    const offer = stage === '처우 협의' ? Math.max(1, Math.min(heads, Math.round(interview * 0.2))) : 0;
    POSITIONS.push({
      id: `R${2026}${String(++posSeq).padStart(3, '0')}`, title, div: div.id, hq: team.hq, team: team.id,
      grade: title.includes('생산직') ? '사원' : pick(['사원', '사원', '대리', '대리', '과장', '차장']),
      heads, opened: ymd(opened), daysOpen, stage,
      funnel: { applied, screened, interview, offer },
    });
  }
}
POSITIONS.sort((a, b) => b.daysOpen - a.daysOpen);

// 최근 12개월 채용 퍼널(입사 인원 기반 역산)
const HIRING = {};
for (const div of ORG) {
  const hires = EMP.filter((e) => e.div === div.id && e.hire > ymd(START) && e.hire <= ymd(AS_OF)).length;
  const offer = Math.round(hires * (1.1 + rnd() * 0.08));
  const interview = Math.round(offer * (2.9 + rnd() * 0.8));
  const screened = Math.round(interview * (1.7 + rnd() * 0.4));
  const applied = Math.round(screened * (div.id === 'D3' ? 5.2 : div.id === 'D4' ? 2.6 : 4.1));
  HIRING[div.id] = {
    funnel: { applied, screened, interview, offer, hired: hires },
    timeToHire: TTH[div.id] + Math.round(gauss() * 2),
  };
}

// ---------- 출력 ----------
const meta = {
  company: '한빛그룹 (가상)',
  asOf: ymd(AS_OF),
  start: ymd(START),
  months: MONTHS.map((x) => x.key),
  grades: GRADES,
  generatedNote: '모든 데이터는 scripts/generate-data.mjs로 만든 가상 샘플입니다.',
};
const org = ORG.map((d) => ({
  id: d.id, name: d.name, short: d.short, head: d.head,
  hqs: d.hqs.map((h) => ({ id: h.id, name: h.name, head: h.head, teams: h.teams.map((t) => ({ id: t.id, name: t.name, lead: t.lead })) })),
}));
// 직원 레코드는 배열로 압축: [id, name, sex, birth, hire, div, hq, team, grade, contract, role, exit, exitReason, voluntary]
const FIELDS = ['id', 'name', 'sex', 'birth', 'hire', 'div', 'hq', 'team', 'grade', 'contract', 'role', 'exit', 'exitReason', 'voluntary'];
const rows = EMP.map((e) => FIELDS.map((f) => e[f]));
const data = { meta, org, fields: FIELDS, employees: rows, positions: POSITIONS, hiring: HIRING };

writeFileSync(join(ROOT, 'assets/data.js'),
  `// 자동 생성 파일입니다. 직접 수정하지 말고 scripts/generate-data.mjs를 실행하세요.\n` +
  `window.HR_DATA = ${JSON.stringify(data)};\n`);

// 요약 출력
const activeAt = (d) => EMP.filter((e) => isActive(e, d)).length;
const exits12 = EMP.filter((e) => e.exit && e.exit > ymd(START) && e.exit <= ymd(AS_OF)).length;
const hires12 = EMP.filter((e) => e.hire > ymd(START) && e.hire <= ymd(AS_OF)).length;
console.log('직원 레코드', EMP.length, '| 시작 인원', activeAt(START), '| 기준일 인원', activeAt(AS_OF));
console.log('12개월 입사', hires12, '퇴사', exits12, '| 퇴직률', (exits12 / ((activeAt(START) + activeAt(AS_OF)) / 2) * 100).toFixed(1) + '%');
console.log('팀', TEAMS.length, '| 채용 포지션', POSITIONS.length);
