// onban_sheet.gs — 오늘의 반찬 구글 시트 연동
// 배포: 웹앱 / 실행계정: 나 / 액세스: 모든 사용자
// 재배포: 배포 관리 → 기존 배포 편집 → 새 버전

var SHEET_ID = '1_jAZK1zwob2zbiOwKRYzmpKkaswOAi4RUGC043ujiLo';

function doGet(e) {
  try {
    var action   = (e.parameter.action || '');
    var callback = e.parameter.callback || '';
    var result;
    if (action === 'export_menu') result = exportMenu(e);
    else if (action === 'import_menu') result = importMenu(e);
    else result = json({ success: true, message: 'onban_sheet OK' });

    // JSONP 지원 (callback 파라미터 있으면 감싸서 반환)
    if (callback) {
      return ContentService
        .createTextOutput(callback + '(' + result.getContent() + ')')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return result;
  } catch(err) {
    return json({ success: false, error: err.message });
  }
}

// ── 구글 시트 → 메뉴 가져오기 ──
function importMenu(e) {
  var date = decodeURIComponent(e.parameter.date || '');
  if (!date) return json({ success: false, error: '날짜 없음' });

  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(date);
  if (!sheet) return json({ success: false, error: date + ' 탭이 없습니다.' });

  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return json({ success: false, error: '데이터 없음' });

  // 헤더: 메뉴명, 카테고리, 금액(천원), 재고, 어린이가능
  var menus = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    menus.push({
      name:  String(r[0] || ''),
      cat:   String(r[1] || '기타'),
      price: Number(r[2]) || 0,
      stock: Number(r[3]) || 0,
      child: String(r[4]) === 'Y'
    });
  }
  return json({ success: true, date: date, menus: menus });
}

// ── 메뉴 내보내기 ──
function exportMenu(e) {
  var raw  = decodeURIComponent(e.parameter.data || '[]');
  var data = JSON.parse(raw);
  if (!data.length) return json({ success: false, error: '데이터 없음' });

  var ss = SpreadsheetApp.openById(SHEET_ID);

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
    var sheet = ss.getSheetByName(date);
    if (!sheet) sheet = ss.insertSheet(date);
    sheet.clearContents();
    sheet.clearFormats();
    sheet.appendRow(headers);
    var hRange = sheet.getRange(1, 1, 1, headers.length);
    hRange.setFontWeight('bold')
          .setBackground('#086266')
          .setFontColor('#ffffff')
          .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    var rows = byDate[date].map(function(m) {
      if (Array.isArray(m)) return [m[1], m[2], m[3], m[4], m[5] ? 'Y' : 'N'];
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
