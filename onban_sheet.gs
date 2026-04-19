// onban_sheet.gs — 오늘의 반찬 구글 시트 연동
// 배포: 웹앱 / 실행계정: 나 / 액세스: 모든 사용자
// 재배포: 배포 관리 → 기존 배포 편집 → 새 버전

var SHEET_ID = '1_jAZK1zwob2zbiOwKRYzmpKkaswOAi4RUGC043ujiLo';

function doGet(e) {
  try {
    var action = (e.parameter.action || '');
    if (action === 'export_menu') return exportMenu(e);
    return json({ success: true, message: 'onban_sheet OK' });
  } catch(err) {
    return json({ success: false, error: err.message });
  }
}

function exportMenu(e) {
  var raw  = decodeURIComponent(e.parameter.data || '[]');
  var data = JSON.parse(raw);
  if (!data.length) return json({ success: false, error: '데이터 없음' });

  var ss = SpreadsheetApp.openById(SHEET_ID);

  // 날짜별로 그룹핑
  var byDate = {};
  data.forEach(function(m) {
    var d = Array.isArray(m) ? m[0] : m.date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  });

  var headers = ['메뉴명', '카테고리', '금액(천원)', '재고', '어린이가능'];
  var dates   = Object.keys(byDate).sort();
  var lastUrl = '';

  dates.forEach(function(date) {
    // 시트 탭 이름: 날짜 그대로 (예: 2026-04-19)
    var sheet = ss.getSheetByName(date);
    if (!sheet) sheet = ss.insertSheet(date);

    sheet.clearContents();
    sheet.clearFormats();

    // 헤더
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setFontWeight('bold')
          .setBackground('#086266')
          .setFontColor('#ffffff')
          .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // 데이터
    var rows = byDate[date].map(function(m) {
      if (Array.isArray(m)) {
        return [m[1], m[2], m[3], m[4], m[5] ? 'Y' : 'N'];
      }
      return [m.name||'', m.cat||'', m.price||0, m.stock||0, m.child ? 'Y' : 'N'];
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    sheet.autoResizeColumns(1, headers.length);

    lastUrl = 'https://docs.google.com/spreadsheets/d/'
              + SHEET_ID + '/edit#gid=' + sheet.getSheetId();
  });

  return json({ success: true, count: data.length, sheets: dates.length, url: lastUrl });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
