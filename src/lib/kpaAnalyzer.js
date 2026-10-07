const KNOWLEDGE_VERBS = ['เข้าใจ', 'อธิบาย', 'บอก', 'ระบุ', 'จำแนก', 'เปรียบเทียบ', 'วิเคราะห์', 'สรุป', 'ตีความ', 'ประเมิน', 'ให้เหตุผล', 'อภิปราย']
const SKILL_VERBS = ['ประยุกต์ใช้', 'เลือกใช้', 'ใช้', 'แก้ปัญหา', 'คำนวณ', 'สร้าง', 'ออกแบบ', 'ทดลอง', 'ปฏิบัติ', 'สาธิต', 'สืบค้น', 'รวบรวม', 'นำเสนอ', 'เขียน', 'อ่าน', 'พูด', 'ฟัง', 'วาด', 'เล่น', 'เคลื่อนไหว', 'จัดทำ', 'ผลิต']
const ATTITUDE_VERBS = ['เห็นคุณค่า', 'ตระหนัก', 'รับผิดชอบ', 'มีวินัย', 'ใฝ่เรียนรู้', 'ซื่อสัตย์', 'มุ่งมั่น', 'ร่วมมือ', 'เคารพ', 'ยอมรับ', 'อนุรักษ์', 'ประหยัด', 'ปลอดภัย', 'มีจิตสาธารณะ']

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function indicatorCode(indicator) {
  return cleanText(indicator.code || indicator.indicator_code)
}

function indicatorText(indicator) {
  return cleanText(indicator.text || indicator.description)
}

function firstMatch(text, words) {
  return words
    .map((word) => ({ word, index: text.indexOf(word) }))
    .filter(({ index }) => index >= 0)
    .sort((a, b) => a.index - b.index)[0]
}

function clauseFrom(text, match) {
  if (!match) return ''
  return cleanText(text.slice(match.index).replace(/[.。]+$/, ''))
}

function withCode(text, code) {
  return `${text}${code ? ` (ตัวชี้วัด ${code})` : ''}`
}

function knowledgeObjective(text, code, topic) {
  const match = firstMatch(text, KNOWLEDGE_VERBS)
  let behavior = clauseFrom(text, match)
  if (match?.word === 'เข้าใจ') {
    behavior = behavior.startsWith('เข้าใจและ')
      ? behavior.replace(/^เข้าใจและ/, 'อธิบายหลักการและแนวคิดที่เกี่ยวข้องกับการ')
      : behavior.replace(/^เข้าใจ/, 'อธิบายความรู้และแนวคิดเกี่ยวกับ')
  }
  if (!behavior) behavior = `อธิบายหลักการและแนวคิดสำคัญเกี่ยวกับ${topic}`
  return withCode(`${behavior.replace(/ได้$/, '')}ได้`, code)
}

function skillObjective(text, code, topic) {
  const match = firstMatch(text, SKILL_VERBS)
  const behavior = clauseFrom(text, match) || `นำความรู้เรื่อง${topic}ไปปฏิบัติหรือแก้ปัญหาตามสถานการณ์ที่กำหนด`
  return withCode(`${behavior.replace(/ได้$/, '')}ได้`, code)
}

function attitudeObjective(text, code, topic) {
  const explicitAttitude = clauseFrom(text, firstMatch(text, ATTITUDE_VERBS))
  if (explicitAttitude) return withCode(`${explicitAttitude.replace(/ได้$/, '')}อย่างเหมาะสม`, code)
  if (/ปลอดภัย|สุขภาพ|สิ่งแวดล้อม|อนุรักษ์/.test(text)) {
    return withCode(`ตระหนักและรับผิดชอบต่อการนำความรู้เรื่อง${topic}ไปใช้อย่างปลอดภัยและเหมาะสม`, code)
  }
  if (/ตรวจสอบ|ถูกต้อง|ข้อมูล|หลักฐาน|เทคโนโลยี|อินเทอร์เน็ต/.test(text)) {
    return withCode(`มีความรอบคอบและรับผิดชอบในการใช้ข้อมูลหรือหลักฐานเพื่อทำงานเรื่อง${topic}`, code)
  }
  return withCode(`มีความมุ่งมั่นและรับผิดชอบในการทำงานตามภาระงานเรื่อง${topic}จนสำเร็จ`, code)
}

function knowledgeAssessment(objective) {
  const method = /วิเคราะห์|เปรียบเทียบ|ให้เหตุผล|ประเมิน|ตีความ/.test(objective)
    ? 'ตรวจคำตอบ การวิเคราะห์ และการให้เหตุผลตามจุดประสงค์'
    : 'ตรวจคำตอบและการอธิบายความเข้าใจตามจุดประสงค์'
  return [`K · ${objective}`, method, 'แบบทดสอบ / ใบงานพร้อมเกณฑ์การให้คะแนน', 'ผ่านร้อยละ 70']
}

function skillAssessment(objective) {
  if (/สร้าง|ออกแบบ|ผลิต|จัดทำ|วาด|เขียน/.test(objective)) {
    return [`P · ${objective}`, 'ประเมินกระบวนการและผลงานตามจุดประสงค์', 'แบบประเมินชิ้นงาน (Rubric)', 'ระดับดีขึ้นไป']
  }
  if (/นำเสนอ|พูด|อภิปราย|สื่อสาร/.test(objective)) {
    return [`P · ${objective}`, 'สังเกตและประเมินการนำเสนอตามจุดประสงค์', 'แบบประเมินการนำเสนอ (Rubric)', 'ระดับดีขึ้นไป']
  }
  if (/ทดลอง|ปฏิบัติ|สาธิต|เล่น|เคลื่อนไหว/.test(objective)) {
    return [`P · ${objective}`, 'สังเกตการปฏิบัติและตรวจผลการปฏิบัติตามจุดประสงค์', 'แบบสังเกตทักษะการปฏิบัติ', 'ระดับดีขึ้นไป']
  }
  return [`P · ${objective}`, 'ตรวจขั้นตอน วิธีทำ และผลลัพธ์ตามจุดประสงค์', 'แบบประเมินกระบวนการ / ภาระงาน', 'ระดับดีขึ้นไป']
}

function attitudeAssessment(objective) {
  return [`A · ${objective}`, 'สังเกตพฤติกรรมระหว่างการทำภาระงานตามจุดประสงค์', 'แบบสังเกตพฤติกรรมรายบุคคล', 'ระดับดีขึ้นไป']
}

export function analyzeIndicatorsToKpa(indicators, topic) {
  const safeTopic = cleanText(topic) || 'เนื้อหาที่เรียน'
  const usableIndicators = indicators.filter((item) => indicatorText(item))
  const objectives = usableIndicators.map((item) => knowledgeObjective(indicatorText(item), indicatorCode(item), safeTopic))
  const pObjectives = usableIndicators.map((item) => skillObjective(indicatorText(item), indicatorCode(item), safeTopic))
  const aObjectives = usableIndicators.map((item) => attitudeObjective(indicatorText(item), indicatorCode(item), safeTopic))

  return {
    objectives,
    pObjectives,
    aObjectives,
    assessments: [
      ...objectives.map(knowledgeAssessment),
      ...pObjectives.map(skillAssessment),
      ...aObjectives.map(attitudeAssessment),
    ],
  }
}
