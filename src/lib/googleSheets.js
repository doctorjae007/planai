const endpoint = import.meta.env.VITE_GOOGLE_SHEETS_API_URL?.trim()

export const isGoogleSheetsConfigured = Boolean(endpoint)

async function request(payload) {
  if (!endpoint) throw new Error('ยังไม่ได้ตั้งค่า Google Sheets API URL')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) throw new Error(`Google Sheets ตอบกลับ ${response.status}`)
  const data = await response.json()
  if (!data.ok) throw new Error(data.error || 'บันทึกข้อมูลไม่สำเร็จ')
  return data
}

export async function saveSemester(semester) {
  return request({ action: 'saveSemester', data: semester })
}
