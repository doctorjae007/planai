import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeIndicatorsToKpa } from './kpaAnalyzer.js'

test('วิเคราะห์ KPA และผูกการประเมินกับจุดประสงค์ทุกข้อ', () => {
  const indicator = {
    code: 'ค 1.1 ม.1/2',
    text: 'เข้าใจและใช้สมบัติของเลขยกกำลังที่มีเลขชี้กำลังเป็นจำนวนเต็มบวกในการแก้ปัญหาคณิตศาสตร์และปัญหาในชีวิตจริง',
  }
  const result = analyzeIndicatorsToKpa([indicator], 'เลขยกกำลัง')

  assert.equal(result.objectives.length, 1)
  assert.equal(result.pObjectives.length, 1)
  assert.equal(result.aObjectives.length, 1)
  assert.equal(result.assessments.length, 3)
  assert.match(result.objectives[0], /อธิบาย.*ค 1\.1 ม\.1\/2/)
  assert.match(result.pObjectives[0], /ใช้สมบัติ.*แก้ปัญหา.*ค 1\.1 ม\.1\/2/)
  assert.ok(result.assessments.every((row) => row.length === 4))
  assert.equal(result.assessments[0][0], `K · ${result.objectives[0]}`)
  assert.equal(result.assessments[1][0], `P · ${result.pObjectives[0]}`)
  assert.equal(result.assessments[2][0], `A · ${result.aObjectives[0]}`)
})

test('ใช้คุณลักษณะที่ระบุชัดในตัวชี้วัดเป็น A ก่อนข้อความสำรอง', () => {
  const result = analyzeIndicatorsToKpa([{ code: 'ต 1', text: 'ปฏิบัติงานด้วยความรับผิดชอบและเห็นคุณค่าของทรัพยากร' }], 'ทรัพยากร')
  assert.match(result.aObjectives[0], /รับผิดชอบและเห็นคุณค่า/)
})
