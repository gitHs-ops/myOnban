// ══════════════════════════════════════════════════════
// onban_sheet.gs — 오늘의 반찬 구글 시트 연동
//
// 【설정】
//   1. 구글 시트 ID 아래 SHEET_ID 에 입력
//      (시트 URL: /spreadsheets/d/[SHEET_ID]/edit)
//   2. Apps Script → 배포 → 웹앱
//      실행 계정: 본인, 액세스: 모든 사용자
//   3. 배포 URL → menu-manager.html 설정 탭 GAS URL 입력
//
// 【재배포 주의】
//   배포 관리 → 기존 배포 편집 → 새 버전 (URL 유지!)
// ══════════════════════════════════════════════════════

var SHEET_ID   = '1_jAZK1zwob2zbiOwKRYzmpKkaswOAi4RUGC043ujiLo'; // ← 구글 시트 ID 입력
var SHEET_NAME = '온반01';              // 시트 탭 이름 고정

// ── 진입점 ──────────────────────────────────────────
function doGet(e) {
  var action = (e.parameter.action || '').toString();

  try {
    if (action === 'export_menu') return exportMenu(e);
    if (action === 'ping')        return ping();
    return ping(); // 기본: 연결 확인
  } catch(err) {
    return json({ success: false, error: err.message });
  }
}

// ── 연결 확인 ────────────────────────────────────────
function ping() {
  return json({ success: true, message: 'onban_sheet 정상 작동 중' });
}

// ── 메뉴 창고 → 구글 시트 내보내기 ─────────────────
function exportMenu(e) {
  var data = JSON.parse(decodeURIComponent(e.parameter.data || '[]'));

  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // 시트 없으면 생성
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  // 기존 내용 삭제
  sheet.clearContents();
  sheet.clearFormats();

  // 헤더
  var headers = ['날짜', '메뉴명', '카테고리', '금액(천원)', '재고', '어린이가능', '이미지URL'];
  sheet.appendRow(headers);

  // 헤더 스타일
  var hRange = sheet.getRange(1, 1, 1, headers.length);
  hRange.setFontWeight('bold')
        .setBackground('#086266')
        .setFontColor('#ffffff')
        .setHorizontalAlignment('center');
  sheet.setFrozenRows(1);

  // 데이터 삽입
  if (data.length > 0) {
    var rows = data.map(function(m) {
      return [
        m.date   || '',
        m.name   || '',
        m.cat    || '',
        m.price  || 0,
        m.stock  || 0,
        m.child  ? 'Y' : 'N',
        m.imgUrl || ''
      ];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }

  // 컬럼 너비 자동 조정
  sheet.autoResizeColumns(1, headers.length);

  // 시트 직접 링크
  var url = 'https://docs.google.com/spreadsheets/d/'
            + SHEET_ID + '/edit#gid=' + sheet.getSheetId();

  return json({ success: true, count: data.length, url: url });
}

// ── 공통: JSON 응답 ───────────────────────────────────
function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}