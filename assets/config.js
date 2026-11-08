// =============================================================
//  대시보드 설정 파일 — 아이콘(타일)과 외부 링크는 여기서 바꾸세요.
// =============================================================
//  type: 'view' → 대시보드 안의 상세 화면으로 이동 (view 값은 화면 ID)
//  type: 'link' → href 주소를 새 탭으로 엽니다 (PPT, 엑셀, 그룹웨어 등)
//  icon: assets/app.js의 ICONS에 정의된 이름
// =============================================================
window.HR_CONFIG = {
  title: 'HR 대시보드',
  tiles: [
    { id: 'headcount',   type: 'view', icon: 'users',    title: '인원 현황',       desc: '총인원 · 부문/직급별 인원 · 인원 추이' },
    { id: 'turnover',    type: 'view', icon: 'door',     title: '입·퇴사 / 퇴직률', desc: '월별 입·퇴사 · 퇴직률 추이 · 퇴사 사유' },
    { id: 'org',         type: 'view', icon: 'org',      title: '조직도',          desc: '부문 → 본부 → 팀 구조와 조직장' },
    { id: 'composition', type: 'view', icon: 'pie',      title: '인력 구성',        desc: '성별 · 연령대 · 근속연수 분포' },
    { id: 'recruiting',  type: 'view', icon: 'search',   title: '채용 현황',        desc: '진행 포지션 · 채용 퍼널 · 소요일' },
    {
      id: 'report', type: 'link', icon: 'file', title: '월간 인사보고서', desc: '2026년 10월 보고서 (엑셀)',
      // 실제 보고서 주소(PPT, SharePoint, 구글 드라이브 등)로 바꾸면 됩니다.
      href: 'reports/HR_monthly_report_2026-10.xlsx',
    },
  ],
};
