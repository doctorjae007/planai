const SHEET_NAMES = { semesters: 'Semesters' };
const SEMESTER_HEADERS = ['id', 'schoolYear', 'grade', 'semester', 'course_code', 'course_name', 'course_type', 'credits', 'total_hours', 'suggested_hours_per_week', 'weeks', 'createdAt'];

function doGet() {
  return jsonResponse({ ok: true, service: 'KruPlan AI Google Sheets API', version: '0.2.0' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action === 'saveSemester') return saveSemester(body.data);
    return jsonResponse({ ok: false, error: 'Unknown action' });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  }
}

function setupKruPlanSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAMES.semesters);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAMES.semesters);
  if (sheet.getLastRow() === 0) sheet.appendRow(SEMESTER_HEADERS);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SEMESTER_HEADERS.length);
}

function saveSemester(data) {
  if (!data || !data.id || !data.course_code) throw new Error('ข้อมูลภาคเรียนไม่ครบถ้วน');
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(SHEET_NAMES.semesters);
  if (!sheet) throw new Error('กรุณารัน setupKruPlanSheets ก่อน');
  sheet.appendRow(SEMESTER_HEADERS.map((key) => data[key] ?? ''));
  return jsonResponse({ ok: true, id: data.id });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
