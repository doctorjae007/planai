import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Cloud,
  Database,
  FileCheck2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Save,
  Trash2,
  Printer,
  ImageDown,
  X,
} from 'lucide-react'
import courses from '../data/courses.json'
import curriculum from '../data/curriculum_contents.json'
import paCriteria from '../data/pa_criteria.json'
import standardsData from '../data/standards.json'
import indicatorsData from '../data/indicators.json'
import learningModelsData from '../data/learning_models.json'
import curriculumCatalog from '../data/curriculum_index.json'
import { deleteLessonPlan, deleteSemesterRecord, loadLessonPlans, loadReferenceData, loadSemesters, saveLessonPlan, saveSemesterRecord } from './lib/dataStore'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { analyzeIndicatorsToKpa } from './lib/kpaAnalyzer'
import AuthGate from './AuthGate'

const navItems = [
  { label: 'ภาพรวม', icon: LayoutDashboard },
  { label: 'ภาคเรียนของฉัน', icon: CalendarDays },
  { label: 'แผนการสอน', icon: FileText, badge: '3' },
  { label: 'คลังหลักสูตร', icon: BookOpen },
  { label: 'ตรวจ PA', icon: FileCheck2 },
]

const initialPlans = [
  { id: 1, title: 'จำนวนเต็มและการนำไปใช้', course: 'ค21101 · ม.1', updated: 'แก้ไข 2 ชม. ที่แล้ว', status: 'ฉบับร่าง', tone: 'amber' },
  { id: 2, title: 'การสร้างทางเรขาคณิต', course: 'ค21101 · ม.1', updated: 'แก้ไขเมื่อวานนี้', status: 'พร้อมใช้', tone: 'green' },
  { id: 3, title: 'เลขยกกำลัง', course: 'ค21101 · ม.1', updated: 'แก้ไข 4 วันที่แล้ว', status: 'กำลังตรวจ', tone: 'blue' },
]

function Sidebar({ open, onClose, activeNav, onNavigate, onAction, profile }) {
  const displayName = profile?.display_name || 'คุณครู'
  const initials = displayName.replace(/^ครู/, '').trim().slice(0, 2) || 'ครู'
  return (
    <>
      {open && <button aria-label="ปิดเมนู" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={onClose} />}
      <aside className={`app-sidebar fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col px-4 pb-5 pt-7 transition-transform lg:w-[104px] lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="sidebar-brand mb-10 flex items-center gap-3 px-3">
          <div className="sidebar-logo grid size-11 shrink-0 place-items-center rounded-full"><GraduationCap size={23} strokeWidth={2.2} /></div>
          <div className="sidebar-brand-copy"><div className="text-[21px] font-bold leading-none">KruPlan <span>AI</span></div><p className="mt-1 text-xs">พื้นที่ทำงานของคุณครู</p></div>
          <button onClick={onClose} className="ml-auto lg:hidden"><X size={20} /></button>
        </div>

        <nav className="sidebar-nav space-y-2">
          {navItems.map(({ label, icon: Icon, badge }) => (
            <button title={label} key={label} onClick={() => onNavigate(label)} className={`sidebar-nav-item ${activeNav === label ? 'is-active' : ''}`}>
              <Icon size={20} /> <span className="sidebar-nav-label">{label}</span>{badge && <span className="sidebar-badge">{badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-tools mt-auto space-y-2 border-t pt-4">
          <button title="ศูนย์ช่วยเหลือ" onClick={() => onAction('help')} className="sidebar-nav-item"><CircleHelp size={19} /><span className="sidebar-nav-label">ศูนย์ช่วยเหลือ</span></button>
          <button title="ตั้งค่า" onClick={() => onAction('settings')} className="sidebar-nav-item"><Settings size={19} /><span className="sidebar-nav-label">ตั้งค่า</span></button>
          <div className="sidebar-profile mt-3 flex items-center gap-3 rounded-2xl p-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#ef9fa9] text-sm font-bold text-[#18181a]">{initials}</div>
            <div className="sidebar-profile-copy min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-slate-500">{profile?.school_name || 'KruPlan AI'}</p></div>
            <MoreHorizontal size={18} className="ml-auto text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  )
}

function SupabaseLoginPanel({ onNotify }) {
  const [email, setEmail] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!supabase) return undefined
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email || ''))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user?.email || ''))
    return () => data.subscription.unsubscribe()
  }, [])

  if (!isSupabaseConfigured) return <div className="rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">เพิ่ม VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ในไฟล์ .env ก่อนเชื่อมต่อ</div>
  if (userEmail) return <div className="rounded-2xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">เชื่อมต่อ Supabase แล้ว</p><p className="mt-1 text-xs text-emerald-700">{userEmail}</p><button onClick={async () => { await supabase.auth.signOut(); onNotify('ออกจากระบบ Supabase แล้ว') }} className="btn-secondary mt-3">ออกจากระบบ</button></div>

  const sendMagicLink = async () => {
    if (!email.trim()) return
    setSending(true)
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: window.location.origin } })
    setSending(false)
    onNotify(error ? `ส่งลิงก์เข้าสู่ระบบไม่สำเร็จ: ${error.message}` : 'ส่งลิงก์เข้าสู่ระบบไปที่อีเมลแล้ว', error ? 'error' : 'success')
  }

  return <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-bold text-slate-800">เข้าสู่ระบบเพื่อซิงก์แผนกับ Supabase</p><p className="mt-1 text-xs leading-5 text-slate-500">ระบบจะส่งลิงก์เข้าสู่ระบบไปทางอีเมล โดยไม่ต้องใช้รหัสผ่าน</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input type="email" className="field" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teacher@example.com" /><button onClick={sendMagicLink} disabled={sending || !email.trim()} className="btn-primary shrink-0">{sending ? 'กำลังส่ง...' : 'ส่งลิงก์เข้าสู่ระบบ'}</button></div></div>
}

function DetailModal({ detail, onClose, onNotify }) {
  if (!detail) return null
  const isPlan = detail.type === 'plan'
  const isTopic = detail.type === 'topic'
  const isPa = detail.type === 'pa'
  const titles = { plan: 'แก้ไขแผนการสอน', topic: 'รายละเอียดหน่วยการเรียนรู้', pa: 'PA Checker', help: 'ศูนย์ช่วยเหลือ', settings: 'ตั้งค่า', notifications: 'การแจ้งเตือน' }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section role="dialog" aria-modal="true" className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between"><div><p className="eyebrow">KruPlan AI</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{titles[detail.type]}</h2></div><button onClick={onClose} className="icon-btn" aria-label="ปิด"><X size={20} /></button></div>
        {isPlan && <div className="mt-6 space-y-4"><label className="block"><span className="field-label">ชื่อแผนการสอน</span><input className="field mt-2" defaultValue={detail.data.title} /></label><label className="block"><span className="field-label">บันทึกกิจกรรมการเรียนรู้</span><textarea className="field mt-2 min-h-32 resize-y" defaultValue="ทบทวนความรู้เดิม เชื่อมโยงสถานการณ์ และให้นักเรียนร่วมกันแก้ปัญหา" /></label><div className="flex justify-end gap-3"><button onClick={onClose} className="btn-secondary">ยกเลิก</button><button onClick={() => { onNotify('บันทึกฉบับร่างแล้ว'); onClose() }} className="btn-primary">บันทึกฉบับร่าง</button></div></div>}
        {isTopic && <div className="mt-6"><div className="rounded-2xl bg-[#eff8f5] p-5"><p className="text-sm text-[#477b71]">{selectedCourseLabel(detail.data.course)}</p><h3 className="mt-2 text-xl font-bold text-[#194f45]">{detail.data.topic.name}</h3></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-400">ลำดับหน่วย</p><strong className="mt-1 block">หน่วยที่ {detail.data.topic.sequence}</strong></div><div className="rounded-2xl border border-slate-200 p-4"><p className="text-xs text-slate-400">สถานะ</p><strong className="mt-1 block text-blue-700">รอตรวจสอบทางการ</strong></div></div><button onClick={() => { onNotify('เพิ่มหน่วยนี้ลงแผนแล้ว'); onClose() }} className="btn-primary mt-6">เพิ่มลงแผนการสอน</button></div>}
        {isPa && <div className="mt-6 space-y-3">{paCriteria.criteria.map((item) => <label key={item.number} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300"><input type="checkbox" className="mt-1 size-4 accent-[#176254]" defaultChecked={item.number < 7} /><span><strong className="text-sm text-slate-800">{item.number}. {item.name}</strong><small className="mt-1 block text-xs leading-5 text-slate-400">{item.evidence_examples.join(' · ')}</small></span></label>)}<button onClick={() => onNotify('ตรวจ PA แล้ว: พบหลักฐาน 6 จาก 8 รายการ')} className="btn-primary mt-3">ประเมินหลักฐาน</button></div>}
        {detail.type === 'help' && <div className="mt-6 space-y-3 text-sm leading-7 text-slate-600"><p>1. เลือกรายวิชาในส่วนโครงสร้างรายวิชา</p><p>2. กด “สร้างภาคเรียนใหม่” เพื่อกำหนดปีและจำนวนสัปดาห์</p><p>3. เปิดแผนล่าสุดเพื่อแก้ไข หรือใช้ PA Checker เพื่อตรวจความครบถ้วน</p></div>}
        {detail.type === 'settings' && <div className="mt-6 space-y-4"><SupabaseLoginPanel onNotify={onNotify} /><label className="block"><span className="field-label">ชื่อผู้สอน</span><input className="field mt-2" defaultValue="ครูพิมพ์ใจ" /></label><label className="block"><span className="field-label">สถานศึกษา</span><input className="field mt-2" defaultValue="โรงเรียนบ้านคูหา" /></label><button onClick={() => { onNotify('บันทึกการตั้งค่าแล้ว'); onClose() }} className="btn-primary">บันทึกการตั้งค่า</button></div>}
        {detail.type === 'notifications' && <div className="mt-6 rounded-2xl bg-amber-50 p-5 text-sm leading-6 text-amber-800">แผน “จำนวนเต็มและการนำไปใช้” ยังขาดหลักฐานการประเมิน 1 รายการ</div>}
      </section>
    </div>
  )
}

function selectedCourseLabel(course) {
  return `${course.course_code} · ${course.course_name} · ${course.grade} ภาคเรียนที่ ${course.semester}`
}

const essentialIdeaMaxLines = 8
const essentialIdeaMaxLength = 256

function limitEssentialIdea(value) {
  const lines = String(value || '').split(/\r?\n/).slice(0, essentialIdeaMaxLines)
  const withoutRepeatedStandard = lines.join(' ').split(/โดยเชื่อมโยงกับมาตรฐาน|สอดคล้องกับมาตรฐาน/)[0].trim()
  return withoutRepeatedStandard.slice(0, essentialIdeaMaxLength)
}

function conciseLearningContent(value, topic) {
  const lines = String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/มาตรฐานที่เกี่ยวข้อง|ตัวชี้วัด\s*:/.test(line))
    .slice(0, 4)
  return lines.length ? lines.join('\n') : `${topic}\n- ความหมายและแนวคิดสำคัญ\n- วิธีการหรือขั้นตอนที่เกี่ยวข้อง\n- การนำความรู้ไปใช้ในสถานการณ์ใกล้ตัว`
}

function conciseActivity(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (/ลงมือศึกษาและปฏิบัติกิจกรรม/.test(text)) return 'ปฏิบัติกิจกรรม แลกเปลี่ยนวิธีคิด และนำเสนอผลงาน'
  if (/ใช้คำถามหรือสถานการณ์ใกล้ตัว/.test(text)) return 'ใช้คำถามกระตุ้นความสนใจและตรวจสอบความรู้เดิม'
  if (/ร่วมกันสรุปความรู้/.test(text)) return 'สรุปความรู้และตรวจความเข้าใจด้วยคำถามหรือ Exit Ticket'
  if (text.length <= 90) return text
  const shortened = text.slice(0, 90)
  return `${shortened.slice(0, shortened.lastIndexOf(' ')) || shortened}…`
}

function conciseActivityStep(value) {
  return String(value || '').replace(/\s*\([^)]*\)\s*/g, '').trim()
}

const planDrafts = {
  1: {
    unit: 'หน่วยการเรียนรู้ที่ 1 จำนวนเต็ม', duration: '2 ชั่วโมง', subject: 'ค21101 คณิตศาสตร์ 1', grade: 'มัธยมศึกษาปีที่ 1', semester: '1 / 2569',
    concept: 'จำนวนเต็มประกอบด้วยจำนวนเต็มบวก จำนวนเต็มลบ และศูนย์ การเปรียบเทียบและการดำเนินการสามารถอธิบายผ่านเส้นจำนวนและสถานการณ์ในชีวิตประจำวันได้',
    objectives: ['อธิบายความหมายและเปรียบเทียบจำนวนเต็มได้', 'หาผลบวกและผลลบของจำนวนเต็มได้ถูกต้อง', 'นำความรู้เรื่องจำนวนเต็มไปแก้สถานการณ์ปัญหาได้'],
    activities: [
      ['ขั้นนำเข้าสู่บทเรียน', 'ครูใช้สถานการณ์อุณหภูมิและระดับความสูง เชื่อมโยงกับความรู้เดิมเรื่องจำนวนนับ', '10 นาที'],
      ['ขั้นสำรวจและสืบค้น', 'นักเรียนทำงานเป็นกลุ่ม วางบัตรจำนวนบนเส้นจำนวนและอภิปรายความสัมพันธ์', '25 นาที'],
      ['ขั้นอธิบายและอภิปราย', 'นักเรียนนำเสนอวิธีคิด ครูร่วมสรุปหลักการเปรียบเทียบและการบวกจำนวนเต็ม', '25 นาที'],
      ['ขั้นลงมือปฏิบัติ', 'แก้โจทย์สถานการณ์รายบุคคล แล้วแลกเปลี่ยนตรวจคำตอบกับเพื่อน', '40 นาที'],
      ['ขั้นสรุปและประเมินผล', 'เขียน Exit Ticket อธิบายวิธีหาคำตอบพร้อมเหตุผล', '20 นาที'],
    ],
  },
  2: { unit: 'หน่วยการเรียนรู้ที่ 2 การสร้างทางเรขาคณิต', duration: '2 ชั่วโมง', subject: 'ค21101 คณิตศาสตร์ 1', grade: 'มัธยมศึกษาปีที่ 1', semester: '1 / 2569', concept: 'การสร้างรูปเรขาคณิตพื้นฐานด้วยวงเวียนและสันตรงอาศัยสมบัติของจุด เส้นตรง ส่วนของเส้นตรง และมุม', objectives: ['ใช้วงเวียนและสันตรงสร้างรูปพื้นฐานได้', 'อธิบายลำดับขั้นตอนการสร้างได้', 'ตรวจสอบความถูกต้องของรูปที่สร้างได้'], activities: [['สร้างความสนใจ', 'สำรวจรูปเรขาคณิตจากสิ่งของรอบตัวและตั้งคำถามเกี่ยวกับวิธีสร้าง', '15 นาที'], ['สำรวจและค้นหา', 'ฝึกสร้างส่วนของเส้นตรงและมุมตามเงื่อนไข', '35 นาที'], ['อธิบายและลงข้อสรุป', 'เปรียบเทียบขั้นตอนและเหตุผลของแต่ละกลุ่ม', '25 นาที'], ['ขยายความรู้', 'ออกแบบลวดลายเรขาคณิตจากการสร้างพื้นฐาน', '35 นาที'], ['ประเมินผล', 'นำเสนอผลงานและใช้เกณฑ์ร่วมกันตรวจความถูกต้อง', '10 นาที']] },
  3: { unit: 'หน่วยการเรียนรู้ที่ 3 เลขยกกำลัง', duration: '2 ชั่วโมง', subject: 'ค21101 คณิตศาสตร์ 1', grade: 'มัธยมศึกษาปีที่ 1', semester: '1 / 2569', concept: 'เลขยกกำลังเป็นการเขียนการคูณจำนวนเดียวกันซ้ำ ๆ ในรูปที่กระชับ และใช้สมบัติของเลขยกกำลังช่วยคำนวณได้', objectives: ['เขียนจำนวนในรูปเลขยกกำลังได้', 'ใช้สมบัติของเลขยกกำลังคำนวณได้', 'อธิบายเหตุผลของวิธีคำนวณได้'], activities: [['ขั้นนำเข้าสู่บทเรียน', 'สังเกตรูปแบบการเพิ่มจำนวนแบบเท่าตัว', '10 นาที'], ['ขั้นสำรวจและสืบค้น', 'จัดกลุ่มบัตรการคูณซ้ำกับรูปเลขยกกำลัง', '25 นาที'], ['ขั้นอธิบายและอภิปราย', 'ร่วมกันสร้างข้อสรุปเกี่ยวกับฐานและเลขชี้กำลัง', '25 นาที'], ['ขั้นลงมือปฏิบัติ', 'แก้โจทย์และอธิบายวิธีคิดเป็นคู่', '45 นาที'], ['ขั้นสรุปและประเมินผล', 'ทำแบบตรวจความเข้าใจท้ายคาบ', '15 นาที']] },
}

function PlanExportSheet({ sheetRef, planInfo, plan, standard, indicators, teachingModel }) {
  const PrintHeader = ({ compact = false, pageLabel = '' }) => (
    <header className={`lesson-print-header ${compact ? 'lesson-print-header-small' : ''}`}>
      <div className="print-subject-mark"><span className="print-subject-emoji" aria-hidden="true">📚</span><span>แผนการสอน</span></div>
      <div><p>KRUPLAN AI</p><h2>แผนการสอน <span>(Lesson Plan)</span></h2></div>
      <div className="print-plan-number"><small>แผนที่</small><strong>{String(planInfo.id).padStart(2, '0')}</strong></div>
      {pageLabel && <span className="print-page-label">{pageLabel}</span>}
    </header>
  )

  const PrintMeta = () => (
    <div className="print-meta-rows">
      <div><span>กลุ่มสาระการเรียนรู้</span><strong>{plan.subject}</strong><span>ชั้น</span><strong>{plan.grade}</strong></div>
      <div><span>{plan.unit}</span><strong>เวลา {plan.duration}</strong></div>
      <div><span>เรื่อง</span><strong>{planInfo.title}</strong></div>
      <div><span>รูปแบบการสอน</span><strong>{teachingModel.name}</strong></div>
    </div>
  )

  return (
    <div ref={sheetRef} className="plan-export-document">
      <section className="plan-export-page plan-export-page-one">
        <PrintHeader pageLabel="หน้า 1 / 2" />
        <PrintMeta />

        <div className="print-page-one-content">
            <section className="print-section print-green print-section-standard">
              <h3><i />1. มาตรฐานการเรียนรู้ / ตัวชี้วัด</h3>
              <h4>มาตรฐานการเรียนรู้</h4>
              <p>{standard ? `${standard.code} ${standard.text}` : 'ครูยังไม่ได้เลือกมาตรฐานการเรียนรู้'}</p>
              <h4>ตัวชี้วัด</h4>
              {indicators.length ? indicators.map((item) => <p key={item.id}><b>{item.code}</b> {item.text}</p>) : <p>เลือกตัวชี้วัดจากหน้าแก้ไขแผนก่อนส่งออก</p>}
            </section>
            <section className="print-section print-red print-section-concept">
              <h3><i />2. สาระสำคัญ</h3><p>{limitEssentialIdea(plan.concept) || 'ยังไม่ได้ระบุสาระสำคัญ'}</p>
            </section>
            <section className="print-section print-blue print-section-objectives">
              <h3><i />3. จุดประสงค์การเรียนรู้</h3>
              <div><h4>ด้านความรู้ (K)</h4><ul>{plan.objectives.filter(Boolean).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul></div>
              <div><h4>ด้านทักษะกระบวนการ (P)</h4><p>{plan.pObjectives.join(' · ')}</p></div>
              <div><h4>ด้านคุณลักษณะ (A)</h4><p>{plan.aObjectives.join(' · ')}</p></div>
            </section>
            <section className="print-section print-blue print-section-content">
              <h3><i />4. สาระการเรียนรู้</h3><p className="whitespace-pre-line">{conciseLearningContent(plan.content, planInfo.title)}</p>
            </section>
            <section className="print-section print-green print-section-competencies">
              <h3><i />5. สมรรถนะสำคัญ</h3><p>{[['communication', 'การสื่อสาร'], ['thinking', 'การคิด'], ['problemSolving', 'การแก้ปัญหา'], ['technology', 'การใช้เทคโนโลยี']].filter(([key]) => plan.competencies[key]).map(([, label]) => label).join(' · ') || 'ยังไม่ได้เลือกสมรรถนะ'}</p>
            </section>
            <section className="print-section print-main-activity print-lime">
              <h3><i />6. กิจกรรมการเรียนรู้</h3>
              {plan.activities.map(([step, activity, time]) => <div className="print-activity" key={step}><div><strong>{conciseActivityStep(step)}</strong><span>{time}</span></div><p>{conciseActivity(activity)}</p></div>)}
            </section>
        </div>
      </section>

      <section className="plan-export-page plan-export-page-two">
        <div className="print-continuation-heading">
          <span>แผนการสอน (ต่อ)</span>
          <strong>{planInfo.title}</strong>
          <em>หน้า 2 / 2</em>
        </div>
        <div className="print-page-two-content">
          <section className="print-section print-pink">
            <h3><i />7. สื่อและเทคโนโลยีการเรียนรู้</h3>
            <p className="whitespace-pre-line">{plan.media}</p>
          </section>
          <section className="print-section print-lime">
            <h3><i />8. การวัดและการประเมินผล</h3>
            <div className="print-compact-assessment">{plan.assessments.map((row, index) => <div key={index}><strong>{row[0]}</strong><span>{row[1]} · {row[2]} · {row[3]}</span></div>)}</div>
          </section>
          <section className="print-section print-pink print-compact-notes">
            <h3><i />9. บันทึกหลังการสอน</h3><p>{plan.reflection || 'ผลการจัดการเรียนรู้ / ปัญหาและอุปสรรค / แนวทางปรับปรุง'}</p>
          </section>
          <section className="print-section print-green print-compact-signature">
            <h3><i />ความคิดเห็นและการรับรอง</h3>
            <div><p>{plan.academicComment || 'ความคิดเห็นหัวหน้ากลุ่มสาระ'}<br />ลงชื่อ {plan.academicName || '........................................'}</p><p>{plan.principalComment || 'ความคิดเห็นผู้อำนวยการ'}<br />ลงชื่อ {plan.principalName || '........................................'}</p></div>
          </section>
        </div>
      </section>
    </div>
  )
}

function createEditablePlan(planInfo, draft) {
  return {
    ...draft,
    title: planInfo.title,
    objectives: [...draft.objectives],
    pObjectives: ['แก้ปัญหาและให้เหตุผลทางคณิตศาสตร์ได้', 'สื่อสารและสื่อความหมายทางคณิตศาสตร์ได้'],
    aObjectives: ['มีความรับผิดชอบและร่วมมือในการทำกิจกรรม', 'มีความกระตือรือร้นในการเรียนรู้'],
    content: `${planInfo.title}\n- ความหมายและแนวคิดสำคัญ\n- ขั้นตอนและวิธีการแก้ปัญหา\n- การนำไปใช้ในสถานการณ์จริง`,
    competencies: { communication: true, thinking: true, problemSolving: true, technology: false },
    activities: draft.activities.map((item) => [...item]),
    media: '1. หนังสือเรียนรายวิชาคณิตศาสตร์\n2. บัตรจำนวนและเส้นจำนวน\n3. ใบกิจกรรมรายกลุ่ม\n4. แบบฝึกทักษะและ Exit Ticket',
    assessments: [
      ['ด้านความรู้ (K)', 'ตรวจคำตอบและวิธีคิด', 'ใบกิจกรรม', 'ร้อยละ 70'],
      ['ด้านทักษะ (P)', 'สังเกตกระบวนการแก้ปัญหา', 'แบบประเมินทักษะ', 'ระดับดีขึ้นไป'],
      ['ด้านคุณลักษณะ (A)', 'สังเกตพฤติกรรม', 'แบบสังเกต', 'ระดับดีขึ้นไป'],
    ],
    reflection: '',
    academicComment: '',
    academicName: '',
    principalComment: '',
    principalName: '',
    standardId: '',
    indicatorIds: [],
    teachingModelId: 'inquiry-process',
  }
}

function createSemesterPlan(semester, id = 1) {
  const subject = semester?.course_name || 'รายวิชาใหม่'
  const grade = semester?.grade || ''
  return {
    id,
    semesterId: semester?.id || '',
    title: '',
    unit: 'หน่วยการเรียนรู้ที่ 1',
    duration: '1 ชั่วโมง',
    subject,
    grade,
    semester: `${semester?.semester || 1} / ${semester?.schoolYear || '2569'}`,
    concept: '',
    objectives: ['', '', ''],
    pObjectives: ['', ''],
    aObjectives: ['', ''],
    content: '',
    competencies: { communication: true, thinking: true, problemSolving: false, technology: false },
    activities: [
      ['ขั้นนำเข้าสู่บทเรียน', '', '10 นาที'],
      ['ขั้นจัดกิจกรรมการเรียนรู้', '', '40 นาที'],
      ['ขั้นสรุปและประเมินผล', '', '10 นาที'],
    ],
    media: `1. หนังสือเรียนรายวิชา${subject}\n2. ใบกิจกรรม / ใบงาน\n3. สื่อประกอบการเรียนรู้`,
    assessments: [
      ['ด้านความรู้ (K)', 'ตรวจผลงานและคำตอบ', 'ใบกิจกรรม', 'ร้อยละ 70'],
      ['ด้านทักษะ (P)', 'สังเกตการปฏิบัติกิจกรรม', 'แบบประเมินทักษะ', 'ระดับดีขึ้นไป'],
      ['ด้านคุณลักษณะ (A)', 'สังเกตพฤติกรรม', 'แบบสังเกต', 'ระดับดีขึ้นไป'],
    ],
    reflection: '',
    academicComment: '',
    academicName: '',
    principalComment: '',
    principalName: '',
    standardId: '',
    indicatorIds: [],
    teachingModelId: 'inquiry-process',
  }
}

export function LessonPlanWorkspace({ activePlanId, activeSemester, roomId, onSelectPlan, onBack, onNotify, userId }) {
  const editablePlansStorageKey = `kruplan:${userId}:editable-plans-v2`
  const [editablePlans, setEditablePlans] = useState(() => {
    const defaults = Object.fromEntries(initialPlans.map((item) => [item.id, createEditablePlan(item, planDrafts[item.id] || planDrafts[1])]))
    try {
      const saved = JSON.parse(localStorage.getItem(editablePlansStorageKey) || 'null')
      return saved ? { ...defaults, ...saved } : defaults
    } catch {
      return defaults
    }
  })
  const samplePlanInfo = initialPlans.find((item) => item.id === activePlanId) || initialPlans[0]
  const planKey = activeSemester ? `${activeSemester.id}:${activePlanId}` : String(samplePlanInfo.id)
  const fallbackPlan = activeSemester ? createSemesterPlan(activeSemester, activePlanId) : createEditablePlan(samplePlanInfo, planDrafts[samplePlanInfo.id] || planDrafts[1])
  const plan = editablePlans[planKey] || fallbackPlan
  const planInfo = activeSemester
    ? { id: activePlanId, title: plan.title || 'แผนการจัดการเรียนรู้ใหม่', status: 'ฉบับร่าง', tone: 'amber' }
    : { ...samplePlanInfo, title: plan.title }
  const updatePlan = (changes) => setEditablePlans((current) => ({ ...current, [planKey]: { ...(current[planKey] || fallbackPlan), ...changes } }))
  const [selectedSubject, setSelectedSubject] = useState(activeSemester?.subject_id || 'math')
  const [selectedGrade, setSelectedGrade] = useState(activeSemester?.grade || 'ม.1')
  const [selectedStandard, setSelectedStandard] = useState('')
  const [selectedIndicators, setSelectedIndicators] = useState([])
  const [selectedTeachingModel, setSelectedTeachingModel] = useState('inquiry-process')
  const [referenceData, setReferenceData] = useState({ standards: standardsData.standards, indicators: indicatorsData.indicators, learningModels: learningModelsData.models, source: 'json' })
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const exportRef = useRef(null)
  useEffect(() => {
    let active = true
    loadReferenceData().then((data) => active && setReferenceData(data))
    return () => { active = false }
  }, [])
  useEffect(() => {
    let active = true
    const hydratePlans = async () => {
      const rows = await loadLessonPlans()
      if (!active || !rows?.length) return
       const remotePlans = Object.fromEntries(rows.map((row) => [row.external_id, {
         ...row.content,
         standardId: row.content?.standardId || row.standard_id || '',
         indicatorIds: row.content?.indicatorIds || row.indicator_ids || [],
         teachingModelId: row.content?.teachingModelId || row.teaching_model_id || 'inquiry-process',
       }]))
      setEditablePlans((current) => ({ ...current, ...remotePlans }))
    }
    hydratePlans().catch(() => {})
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!activeSemester) return
    const targetPlan = editablePlans[planKey] || createSemesterPlan(activeSemester, activePlanId)
    setSelectedSubject(activeSemester.subject_id)
    setSelectedGrade(activeSemester.grade)
    setSelectedStandard(targetPlan.standardId || '')
    setSelectedIndicators(targetPlan.indicatorIds || [])
    setSelectedTeachingModel(targetPlan.teachingModelId || 'inquiry-process')
    setEditablePlans((current) => ({
      ...current,
      [planKey]: {
        ...(current[planKey] || createSemesterPlan(activeSemester, activePlanId)),
        subject: activeSemester.course_name,
        grade: activeSemester.grade,
        semester: `${activeSemester.semester || 1} / ${activeSemester.schoolYear}`,
      },
    }))
  }, [activeSemester?.id, activePlanId])
  useEffect(() => {
    localStorage.setItem(editablePlansStorageKey, JSON.stringify(editablePlans))
  }, [editablePlans])
  const verifiedStandards = referenceData.standards.filter((item) => {
    const verified = String(item.verification_status || item.status || '').startsWith('verified')
    const subjectMatches = item.subject_id === selectedSubject
    const gradeMatches = !item.grades || item.grades.includes(selectedGrade)
    return verified && subjectMatches && gradeMatches
  })
  const verifiedIndicators = referenceData.indicators.filter((item) => {
    const verified = String(item.verification_status || item.status || '').startsWith('verified')
    const grade = item.grade || item.grade_level
    const matchesGrade = !grade || grade === selectedGrade || (Array.isArray(grade) && grade.includes(selectedGrade))
    const subjectMatches = item.subject_id === selectedSubject
    const standardKey = item.standard_id || item.standard_code
    return verified && subjectMatches && matchesGrade && (!selectedStandard || !standardKey || standardKey === selectedStandard)
  })

  const itemKey = (item) => item.id || item.code || item.standard_code || item.indicator_code
  const itemLabel = (item) => [item.code || item.standard_code || item.indicator_code, item.name_th || item.text || item.description].filter(Boolean).join(' · ')

  const addIndicator = (id) => {
    if (!id || selectedIndicators.includes(id)) return
    const nextIndicators = [...selectedIndicators, id]
    setSelectedIndicators(nextIndicators)
    updatePlan({ indicatorIds: nextIndicators })
  }
  const selectedStandardItem = verifiedStandards.find((item) => itemKey(item) === selectedStandard)
  const selectedIndicatorItems = referenceData.indicators.filter((item) => selectedIndicators.includes(itemKey(item)))
  const teachingModel = referenceData.learningModels.find((item) => item.id === selectedTeachingModel) || referenceData.learningModels[0]
  const updateListItem = (field, index, value) => updatePlan({ [field]: plan[field].map((item, itemIndex) => itemIndex === index ? value : item) })
  const updateMatrixItem = (field, row, column, value) => updatePlan({ [field]: plan[field].map((item, rowIndex) => rowIndex === row ? item.map((cell, columnIndex) => columnIndex === column ? value : cell) : item) })
  const semesterPlans = activeSemester
    ? Object.entries(editablePlans)
      .filter(([key, item]) => key.startsWith(`${activeSemester.id}:`) || item.semesterId === activeSemester.id)
      .map(([, item]) => ({ id: item.id, title: item.title || 'แผนการจัดการเรียนรู้ใหม่', status: 'ฉบับร่าง' }))
      .sort((a, b) => a.id - b.id)
    : initialPlans.map((item) => ({ ...item, title: editablePlans[item.id]?.title || item.title }))
  const visiblePlans = semesterPlans.length ? semesterPlans : [planInfo]
  const addPlan = () => {
    if (!activeSemester) {
      onNotify('สร้างรายวิชาก่อนเพิ่มแผนใหม่', 'error')
      return
    }
    const nextId = Math.max(0, ...semesterPlans.map((item) => Number(item.id) || 0)) + 1
    const nextPlan = createSemesterPlan(activeSemester, nextId)
    const nextKey = `${activeSemester.id}:${nextId}`
    setEditablePlans((current) => ({ ...current, [nextKey]: nextPlan }))
    onSelectPlan(nextId)
    onNotify(`เพิ่มแผนที่ ${nextId} สำหรับ${activeSemester.course_name}แล้ว`)
  }
  const generateDraft = () => {
    const topic = plan.title.trim()
    if (!topic || topic === 'แผนการจัดการเรียนรู้ใหม่') {
      onNotify('กรุณาพิมพ์ชื่อเรื่องที่จะสอนก่อนสร้างร่างอัตโนมัติ', 'error')
      return
    }
    if (!selectedStandardItem) {
      onNotify('กรุณาเลือกมาตรฐานการเรียนรู้ให้ตรงกับเรื่องที่จะสอน', 'error')
      return
    }
    if (!selectedIndicatorItems.length) {
      onNotify('กรุณาเลือกตัวชี้วัดอย่างน้อย 1 รายการก่อนสร้างร่าง', 'error')
      return
    }
    const indicatorCodes = selectedIndicatorItems.map((item) => item.code || item.indicator_code).filter(Boolean).join(', ')
    const kpa = analyzeIndicatorsToKpa(selectedIndicatorItems, topic)
    const steps = teachingModel?.steps?.length ? teachingModel.steps : ['นำเข้าสู่บทเรียน', 'จัดกิจกรรมการเรียนรู้', 'สรุปและประเมินผล']
    const parsedHours = Number.parseFloat(String(plan.duration).replace(/[^0-9.]/g, '')) || 1
    const totalMinutes = Math.max(40, Math.round(parsedHours * 60))
    const edgeMinutes = Math.min(10, Math.max(5, Math.round(totalMinutes * .15)))
    const middleMinutes = Math.max(5, Math.round((totalMinutes - (edgeMinutes * 2)) / Math.max(1, steps.length - 2)))
    const describeActivity = (step, index) => {
      const normalized = step.toLowerCase()
      if (/ทบทวน|เตรียม|สร้างความสนใจ|กำหนดปัญหา|สำรวจความสนใจ|engagement/.test(normalized)) {
        return `ครูนำเสนอภาพ ข่าว เหตุการณ์ หรือคำถามใกล้ตัวที่เชื่อมโยงกับเรื่อง “${topic}” ให้นักเรียนสังเกตและแสดงความคิดเห็น จากนั้นใช้คำถามปลายเปิดตรวจสอบความรู้เดิม รวบรวมคำตอบบนกระดาน และร่วมกันกำหนดประเด็นที่ต้องการเรียนรู้ให้สอดคล้องกับตัวชี้วัด ${indicatorCodes}`
      }
      if (/แสวงหา|สำรวจ|ค้นหา|ทดลอง|ลงมือ|ดำเนินการ|exploration/.test(normalized)) {
        return `ครูแบ่งนักเรียนเป็นกลุ่มย่อย มอบใบกิจกรรมและชี้แจงภาระงานเรื่อง “${topic}” นักเรียนแบ่งหน้าที่ สืบค้นหรือทดลอง เก็บข้อมูลและบันทึกหลักฐานลงในใบงาน ครูเดินสังเกต ใช้คำถามกระตุ้นการคิด และช่วยเหลือเฉพาะจุดโดยไม่บอกคำตอบโดยตรง`
      }
      if (/วางแผน|จุดมุ่งหมาย|สมมติฐาน|แยกปัญหา/.test(normalized)) {
        return `นักเรียนร่วมกันวิเคราะห์ภาระงานเรื่อง “${topic}” ตั้งคำถามหรือสมมติฐาน กำหนดเป้าหมาย เกณฑ์ความสำเร็จ ขั้นตอน เครื่องมือ และหน้าที่ของสมาชิกแต่ละคน แล้วนำเสนอแผนสั้น ๆ ให้ครูตรวจสอบความเป็นไปได้ก่อนลงมือปฏิบัติ`
      }
      if (/อธิบาย|เสนอ|แลกเปลี่ยน|อภิปราย|สัมพันธ์|เปรียบเทียบ|explanation/.test(normalized)) {
        return `ตัวแทนกลุ่มนำเสนอผลการศึกษา วิธีคิด และหลักฐานที่ค้นพบเกี่ยวกับ “${topic}” เพื่อนร่วมชั้นซักถามและเปรียบเทียบคำตอบ ครูช่วยจัดระบบแนวคิด แก้ความเข้าใจคลาดเคลื่อน และเชื่อมข้อสรุปของผู้เรียนกับสาระของมาตรฐาน ${selectedStandardItem.code || ''}`
      }
      if (/ขยาย|ประยุกต์|นำไปใช้|ปฏิบัติ|แสดงผลงาน|elaboration/.test(normalized)) {
        return `นักเรียนนำความรู้เรื่อง “${topic}” ไปแก้โจทย์หรือสถานการณ์ใหม่ที่แตกต่างจากตัวอย่างเดิม ออกแบบชิ้นงาน คำตอบ หรือแนวทางของตนเอง พร้อมอธิบายเหตุผลและตรวจสอบผลงานตามเกณฑ์ที่กำหนด ครูให้ข้อมูลย้อนกลับเพื่อให้นักเรียนปรับปรุงผลงาน`
      }
      if (/ประเมิน|สรุป|จัดระเบียบ|กฎ|evaluation/.test(normalized) || index === steps.length - 1) {
        return `นักเรียนร่วมกันสรุปสาระสำคัญเรื่อง “${topic}” เป็นแผนผังความคิดหรือข้อความสั้น ครูตรวจความเข้าใจด้วยคำถามตามตัวชี้วัด ${indicatorCodes} ประเมินผลงานด้วยเกณฑ์ที่แจ้งไว้ และให้นักเรียนทำ Exit Ticket ระบุสิ่งที่เรียนรู้ สิ่งที่ยังสงสัย และการนำไปใช้`
      }
      return `ครูชี้แจงกิจกรรมในขั้น “${step}” และจัดสื่อให้พร้อม นักเรียนปฏิบัติงานเกี่ยวกับ “${topic}” อย่างเป็นลำดับ แลกเปลี่ยนความคิดเห็น บันทึกผล และตรวจสอบคำตอบจากหลักฐาน ครูสังเกตกระบวนการ ให้คำแนะนำ และเชื่อมโยงผลการทำงานกลับสู่ตัวชี้วัด ${indicatorCodes}`
    }
    const activities = steps.map((step, index) => {
      const time = index === 0 || index === steps.length - 1 ? edgeMinutes : middleMinutes
      return [step, describeActivity(step, index), `${time} นาที`]
    })
    updatePlan({
      unit: plan.unit === 'หน่วยการเรียนรู้ที่ 1' ? `หน่วยการเรียนรู้เรื่อง ${topic}` : plan.unit,
      concept: `${topic}ช่วยให้ผู้เรียนเข้าใจแนวคิดสำคัญ และนำความรู้ไปใช้ในสถานการณ์ที่เกี่ยวข้องได้อย่างเหมาะสม`,
      objectives: kpa.objectives,
      pObjectives: kpa.pObjectives,
      aObjectives: kpa.aObjectives,
      content: [`${topic}`, `ความหมายและแนวคิดสำคัญ`, `วิธีการหรือขั้นตอนที่เกี่ยวข้อง`, `การนำความรู้ไปใช้ในสถานการณ์ใกล้ตัว`].join('\n- '),
      competencies: { communication: true, thinking: true, problemSolving: true, technology: false },
      activities,
      media: `1. หนังสือเรียนรายวิชา${plan.subject} ระดับ${plan.grade}\n2. สื่อภาพ สไลด์ หรือคลิปสั้นเรื่อง${topic}\n3. ใบความรู้และใบกิจกรรมที่เชื่อมโยงตัวชี้วัด ${indicatorCodes}\n4. บัตรคำ วัสดุ หรืออุปกรณ์สำหรับกิจกรรมตาม${teachingModel.name}\n5. แบบประเมินผลงาน แบบสังเกต และ Exit Ticket`,
      assessments: kpa.assessments,
    })
    onNotify(`สร้างร่างแผนเรื่อง “${topic}” พร้อมวิเคราะห์ KPA และการประเมินที่เชื่อมกับตัวชี้วัดแล้ว`)
  }
  const removeCurrentPlan = async () => {
    if (!activeSemester) return
    if (semesterPlans.length <= 1) {
      onNotify('รายวิชาต้องมีอย่างน้อย 1 แผน หากไม่ใช้รายวิชานี้ให้ลบจากหน้าภาคเรียนของฉัน', 'error')
      return
    }
    if (!window.confirm(`ต้องการลบแผน “${plan.title}” ใช่หรือไม่?`)) return
    try {
      await deleteLessonPlan(planKey)
      const remainingPlans = semesterPlans.filter((item) => item.id !== planInfo.id)
      setEditablePlans((current) => {
        const next = { ...current }
        delete next[planKey]
        localStorage.setItem(editablePlansStorageKey, JSON.stringify(next))
        return next
      })
      onSelectPlan(remainingPlans[0].id)
      onNotify(`ลบแผน “${plan.title}” แล้ว`)
    } catch {
      onNotify('ลบแผนไม่สำเร็จ กรุณาลองใหม่', 'error')
    }
  }
  const savePlan = async () => {
    localStorage.setItem(editablePlansStorageKey, JSON.stringify(editablePlans))
    try {
      const result = await saveLessonPlan({ externalId: planKey, plan, teachingModelId: selectedTeachingModel, standardId: selectedStandard, indicatorIds: selectedIndicators, semesterId: null, roomId, subjectId: selectedSubject, planNumber: planInfo.id })
      onNotify(result.source === 'supabase' ? 'บันทึกและอัปเดตแผนใน Supabase แล้ว' : result.reason === 'auth_required' ? 'บันทึกในเครื่องแล้ว · เข้าสู่ระบบเพื่อซิงก์ Supabase' : 'บันทึกข้อมูลในเครื่องแล้ว')
    } catch (error) {
      onNotify(`บันทึกในเครื่องแล้ว แต่ซิงก์ Supabase ไม่สำเร็จ: ${error?.message || 'ไม่ทราบสาเหตุ'}`, 'error')
    }
  }

  const downloadImage = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      const pages = [...exportRef.current.querySelectorAll('.plan-export-page')]
      for (const [index, page] of pages.entries()) {
        const dataUrl = await toPng(page, { pixelRatio: 2, cacheBust: true, backgroundColor: '#f5f4f8' })
        const link = document.createElement('a')
        link.download = `แผนการสอน-${planInfo.title}-หน้า-${index + 1}.png`
        link.href = dataUrl
        link.click()
      }
      onNotify(`ดาวน์โหลดแผนการสอนเป็น PNG แยก ${pages.length} หน้าแล้ว`)
    } catch {
      onNotify('ส่งออกรูปไม่สำเร็จ กรุณาลองใหม่', 'error')
    } finally {
      setExporting(false)
    }
  }
  const downloadWord = () => {
    if (!exportRef.current) return
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${planInfo.title}</title><style>body{font-family:"TH Sarabun New","Noto Sans Thai",sans-serif;font-size:16pt;color:#202126}h1,h2,h3{color:#17433f}section{margin:18px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:8px;vertical-align:top}p{white-space:pre-wrap;line-height:1.5}</style></head><body>${exportRef.current.innerHTML}</body></html>`
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `แผนการสอน-${planInfo.title}.doc`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    onNotify('ดาวน์โหลดแผนการสอนเป็น Word แล้ว')
  }
  return (
    <div className="mx-auto max-w-[1540px] px-4 py-6 sm:px-7 lg:px-9 lg:py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><button onClick={onBack} className="mb-2 text-sm font-semibold text-slate-500 hover:text-slate-900">← กลับหน้าห้อง</button><p className="eyebrow">แผนการจัดการเรียนรู้ · {activeSemester?.course_name || 'ค21101'}</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-[#181a1d]">{planInfo.title}</h1><p className="mt-2 text-sm text-slate-500">กรอกข้อมูลหลักแล้วกด “สร้างแผนอัตโนมัติ” จากนั้นแก้ไขทุกช่องได้ก่อนบันทึกหรือดาวน์โหลด</p></div>
        <div className="flex flex-wrap gap-2"><button onClick={generateDraft} className="btn-secondary"><Sparkles size={17} /> สร้างแผนอัตโนมัติ</button><button onClick={() => setExportOpen(true)} className="btn-secondary"><ImageDown size={17} /> ดาวน์โหลด / พิมพ์</button>{activeSemester && <button onClick={removeCurrentPlan} className="btn-secondary text-rose-600 hover:border-rose-200 hover:bg-rose-50"><Trash2 size={17} /> ลบแผน</button>}<button onClick={savePlan} className="btn-primary"><Save size={17} /> บันทึก / อัปเดต</button></div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="card h-fit overflow-hidden">
          <div className="border-b border-slate-100 p-4"><h2 className="font-bold text-[#181a1d]">แผนในห้องนี้</h2><p className="mt-1 text-xs text-slate-400">{activeSemester ? `${activeSemester.course_name} · ${activeSemester.grade} · ปี ${activeSemester.schoolYear}` : 'ค21101 · ภาคเรียนที่ 1'}</p></div>
          <div className="divide-y divide-slate-100">{visiblePlans.map((item, index) => <button key={item.id} onClick={() => onSelectPlan(item.id)} className={`w-full p-4 text-left transition ${item.id === planInfo.id ? 'bg-[#f0f1ef]' : 'hover:bg-slate-50'}`}><div className="flex gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold ${item.id === planInfo.id ? 'bg-[#1b1d20] text-white' : 'bg-slate-100 text-slate-500'}`}>{index + 1}</span><div><p className="text-sm font-semibold text-slate-800">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.status}</p></div></div></button>)}</div>
          <button onClick={addPlan} className="m-4 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Plus size={16} /> เพิ่มแผนใหม่</button>
        </aside>

        <article className="lesson-board overflow-hidden">
          <div className="lesson-board-hero"><div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">แผนการจัดการเรียนรู้ที่ {planInfo.id}</p><input aria-label="ชื่อเรื่องที่จะสอน" placeholder="พิมพ์ชื่อเรื่องที่จะสอน" className="editable-plan-title" value={plan.title} onChange={(event) => updatePlan({ title: event.target.value })} /><input aria-label="หน่วยการเรียนรู้" className="editable-plan-unit" value={plan.unit} onChange={(event) => updatePlan({ unit: event.target.value })} /></div><label className="editable-duration"><span>จำนวนชั่วโมง</span><input value={plan.duration} onChange={(event) => updatePlan({ duration: event.target.value })} /></label></div></div>
          <div className="lesson-meta-grid"><div><p>กลุ่มสาระ / รายวิชา</p><div className="relative mt-1"><select aria-label="เลือกกลุ่มสาระการเรียนรู้" className="teaching-model-select" value={selectedSubject} onChange={(event) => { const subjectId = event.target.value; const subject = curriculumCatalog.subjects.find((item) => item.id === subjectId); setSelectedSubject(subjectId); setSelectedStandard(''); setSelectedIndicators([]); updatePlan({ subject: subject?.name || '', standardId: '', indicatorIds: [] }) }}>{curriculumCatalog.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1 text-slate-400" size={16} /></div></div><div><p>ระดับชั้น</p><div className="relative mt-1"><select aria-label="เลือกระดับชั้น" className="teaching-model-select" value={selectedGrade} onChange={(event) => { setSelectedGrade(event.target.value); setSelectedStandard(''); setSelectedIndicators([]); updatePlan({ grade: event.target.value, standardId: '', indicatorIds: [] }) }}>{curriculumCatalog.grades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1 text-slate-400" size={16} /></div></div><div><p>ภาคเรียน</p><input className="editable-meta-input" value={plan.semester} onChange={(event) => updatePlan({ semester: event.target.value })} /></div><div><p>รูปแบบการสอน</p><div className="relative mt-1"><select aria-label="เลือกรูปแบบการสอน" className="teaching-model-select" value={selectedTeachingModel} onChange={(event) => { setSelectedTeachingModel(event.target.value); updatePlan({ teachingModelId: event.target.value }) }}>{referenceData.learningModels.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-0 top-1 text-slate-400" size={16} /></div></div></div>
          <div className="teaching-model-summary"><div><span>รูปแบบที่เลือก · {referenceData.source === 'supabase' ? 'Supabase' : referenceData.source === 'cache' ? 'แคชข้อมูล' : 'JSON สำรอง'}</span><strong>{teachingModel.name}</strong><p>{teachingModel.description}</p></div><ol>{teachingModel.steps.map((step, index) => <li key={step}><b>{index + 1}</b>{step}</li>)}</ol></div>
          <div className="lesson-card-grid">
            <section><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="plan-heading"><span>1</span> มาตรฐานการเรียนรู้ / ตัวชี้วัด</h3><span className={`status ${verifiedStandards.length ? 'status-green' : 'status-amber'}`}>{verifiedStandards.length ? 'พร้อมให้ครูเลือก' : 'รอตรวจสอบเอกสารทางการ'}</span></div><div className="mt-4 grid gap-4 lg:grid-cols-2"><label className="block"><span className="field-label">มาตรฐานการเรียนรู้</span><div className="relative mt-2"><select className="field appearance-none pr-10" value={selectedStandard} onChange={(event) => { setSelectedStandard(event.target.value); setSelectedIndicators([]); updatePlan({ standardId: event.target.value, indicatorIds: [] }) }} disabled={!verifiedStandards.length}><option value="">{verifiedStandards.length ? 'เลือกมาตรฐานการเรียนรู้' : 'ยังไม่มีมาตรฐานที่ยืนยันแล้วใน JSON'}</option>{verifiedStandards.map((item) => <option key={itemKey(item)} value={itemKey(item)}>{itemLabel(item)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={18} /></div></label><label className="block"><span className="field-label">เพิ่มตัวชี้วัด</span><div className="relative mt-2"><select className="field appearance-none pr-10" value="" onChange={(event) => addIndicator(event.target.value)} disabled={!verifiedIndicators.length}><option value="">{verifiedIndicators.length ? 'เลือกตัวชี้วัด (เลือกได้หลายรายการ)' : 'ยังไม่มีตัวชี้วัดที่ยืนยันแล้วใน JSON'}</option>{verifiedIndicators.filter((item) => !selectedIndicators.includes(itemKey(item))).map((item) => <option key={itemKey(item)} value={itemKey(item)}>{itemLabel(item)}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={18} /></div></label></div>{selectedIndicators.length > 0 && <div className="mt-4 space-y-2">{selectedIndicators.map((id) => { const item = verifiedIndicators.find((candidate) => itemKey(candidate) === id); return <div key={id} className="flex items-start gap-3 rounded-xl bg-[#eff8f5] p-3 text-sm text-[#215f54]"><Check className="mt-0.5 shrink-0" size={16} /><span className="flex-1">{item ? itemLabel(item) : id}</span><button onClick={() => { const nextIndicators = selectedIndicators.filter((value) => value !== id); setSelectedIndicators(nextIndicators); updatePlan({ indicatorIds: nextIndicators }) }} className="text-slate-400 hover:text-rose-600" aria-label="ลบตัวชี้วัด"><X size={16} /></button></div>})}</div>}<p className="mt-3 text-xs leading-5 text-slate-400">อ่านจาก standards.json และ indicators.json โดยแสดงเฉพาะข้อมูลที่ยืนยันจากเอกสารทางการแล้ว พบ {verifiedStandards.length} มาตรฐาน และ {verifiedIndicators.length} ตัวชี้วัดสำหรับระดับชั้นนี้</p></section>

            <section><h3 className="plan-heading"><span>2</span> สาระสำคัญ</h3><textarea className="plan-textarea" rows={essentialIdeaMaxLines} maxLength={essentialIdeaMaxLength} value={plan.concept} onChange={(event) => updatePlan({ concept: limitEssentialIdea(event.target.value) })} aria-describedby="concept-guidance" /><p id="concept-guidance" className="mt-2 text-xs text-slate-400">สรุปเฉพาะแก่นสำคัญ ไม่เกิน 8 บรรทัด</p></section>

            <section><h3 className="plan-heading"><span>3</span> จุดประสงค์การเรียนรู้</h3><p className="mt-2 text-xs leading-5 text-slate-400">เมื่อสร้างร่างอัตโนมัติ ระบบจะวิเคราะห์คำกริยาและพฤติกรรมที่ซ่อนอยู่ในตัวชี้วัด แล้วแยกเป็น K–P–A พร้อมระบุรหัสตัวชี้วัดกำกับทุกข้อ</p><div className="mt-4 grid gap-4"><div className="objective-card"><strong>K · ด้านความรู้</strong>{plan.objectives.map((objective, index) => <label key={`k-${index}`} className="mt-2 flex items-start gap-3"><span>{index + 1}</span><input value={objective} onChange={(event) => updateListItem('objectives', index, event.target.value)} /></label>)}</div><div className="objective-card"><strong>P · ด้านทักษะ / กระบวนการ</strong>{plan.pObjectives.map((objective, index) => <label key={`p-${index}`} className="mt-2 flex items-start gap-3"><span>{index + 1}</span><input value={objective} onChange={(event) => updateListItem('pObjectives', index, event.target.value)} /></label>)}</div><div className="objective-card"><strong>A · ด้านคุณลักษณะ</strong>{plan.aObjectives.map((objective, index) => <label key={`a-${index}`} className="mt-2 flex items-start gap-3"><span>{index + 1}</span><input value={objective} onChange={(event) => updateListItem('aObjectives', index, event.target.value)} /></label>)}</div></div></section>

            <section><h3 className="plan-heading"><span>4</span> สาระการเรียนรู้</h3><textarea className="plan-textarea" value={plan.content} onChange={(event) => updatePlan({ content: event.target.value })} /></section>

            <section><h3 className="plan-heading"><span>5</span> สมรรถนะสำคัญของผู้เรียน</h3><div className="mt-4 grid gap-3 sm:grid-cols-2">{[['communication', 'ความสามารถในการสื่อสาร'], ['thinking', 'ความสามารถในการคิด'], ['problemSolving', 'ความสามารถในการแก้ปัญหา'], ['technology', 'ความสามารถในการใช้เทคโนโลยี']].map(([key, label]) => <label key={key} className="check-card"><input type="checkbox" checked={plan.competencies[key]} onChange={(event) => updatePlan({ competencies: { ...plan.competencies, [key]: event.target.checked } })} /> {label}</label>)}</div></section>

            <section><h3 className="plan-heading"><span>6</span> กิจกรรมการเรียนรู้</h3><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="editable-table w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">ขั้นการจัดการเรียนรู้</th><th className="px-4 py-3">กิจกรรมของครูและผู้เรียน</th><th className="px-4 py-3">เวลา</th></tr></thead><tbody className="divide-y divide-slate-100">{plan.activities.map(([step, activity, time], index) => <tr key={`activity-${index}`}><td><input aria-label={`ชื่อขั้นที่ ${index + 1}`} value={step} onChange={(event) => updateMatrixItem('activities', index, 0, event.target.value)} /></td><td><textarea aria-label={`กิจกรรมที่ ${index + 1}`} value={activity} onChange={(event) => updateMatrixItem('activities', index, 1, event.target.value)} /></td><td><input aria-label={`เวลาขั้นที่ ${index + 1}`} value={time} onChange={(event) => updateMatrixItem('activities', index, 2, event.target.value)} /></td></tr>)}</tbody></table></div></section>

            <section><h3 className="plan-heading"><span>7</span> สื่อการเรียนรู้ / แหล่งการเรียนรู้</h3><textarea className="plan-textarea" value={plan.media} onChange={(event) => updatePlan({ media: event.target.value })} /></section>

            <section><h3 className="plan-heading"><span>8</span> การวัดและประเมินผล</h3><p className="mt-2 text-xs leading-5 text-slate-400">แต่ละแถวอ้างถึงจุดประสงค์ K, P หรือ A โดยตรง พร้อมเลือกวิธีการ เครื่องมือ และเกณฑ์ให้เหมาะกับพฤติกรรมที่ต้องการวัด</p><div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200"><table className="editable-table w-full min-w-[680px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3">จุดประสงค์ที่ประเมิน (K/P/A)</th><th className="px-4 py-3">วิธีการ</th><th className="px-4 py-3">เครื่องมือ</th><th className="px-4 py-3">เกณฑ์ผ่าน</th></tr></thead><tbody className="divide-y divide-slate-100">{plan.assessments.map((row, rowIndex) => <tr key={`assessment-${rowIndex}`}>{row.map((cell, columnIndex) => <td key={columnIndex}><textarea aria-label={`ข้อมูลประเมินแถว ${rowIndex + 1} ช่อง ${columnIndex + 1}`} value={cell} onChange={(event) => updateMatrixItem('assessments', rowIndex, columnIndex, event.target.value)} /></td>)}</tr>)}</tbody></table></div></section>

            <section><h3 className="plan-heading"><span>9</span> บันทึกหลังการสอน</h3><textarea className="plan-textarea min-h-28" value={plan.reflection} onChange={(event) => updatePlan({ reflection: event.target.value })} placeholder="บันทึกผลการจัดการเรียนรู้ ปัญหา อุปสรรค และแนวทางปรับปรุง..." /></section>

            <section className="grid gap-5 border-t border-slate-200 pt-8 lg:grid-cols-2"><div className="approval-card"><h3>ความเห็นหัวหน้ากลุ่มบริหารงานวิชาการ</h3><textarea value={plan.academicComment} onChange={(event) => updatePlan({ academicComment: event.target.value })} placeholder="บันทึกความคิดเห็น..." /><p>ลงชื่อ ............................................................</p><input aria-label="ชื่อหัวหน้ากลุ่มบริหารงานวิชาการ" value={plan.academicName} onChange={(event) => updatePlan({ academicName: event.target.value })} placeholder="ชื่อ-นามสกุล" /></div><div className="approval-card"><h3>ความเห็นผู้อำนวยการโรงเรียน</h3><textarea value={plan.principalComment} onChange={(event) => updatePlan({ principalComment: event.target.value })} placeholder="บันทึกความคิดเห็น..." /><p>ลงชื่อ ............................................................</p><input aria-label="ชื่อผู้อำนวยการโรงเรียน" value={plan.principalName} onChange={(event) => updatePlan({ principalName: event.target.value })} placeholder="ชื่อ-นามสกุล" /></div></section>
          </div>
        </article>
      </div>
      {exportOpen && <div className="print-export-overlay fixed inset-0 z-[70] overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:p-8"><div className="mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-xl"><div className="pl-2"><p className="font-bold text-slate-800">ดาวน์โหลดแผนการสอน</p><p className="text-xs text-slate-400">เลือก Word, PDF หรือรูปภาพ PNG ได้ทันที</p></div><div className="flex flex-wrap gap-2"><button onClick={() => setExportOpen(false)} className="btn-secondary">ปิด</button><button onClick={downloadWord} className="btn-secondary"><FileText size={17} /> Word</button><button onClick={() => window.print()} className="btn-secondary"><Printer size={17} /> PDF / พิมพ์</button><button onClick={downloadImage} disabled={exporting} className="btn-primary"><ImageDown size={17} /> {exporting ? 'กำลังสร้างภาพ...' : 'รูปภาพ PNG'}</button></div></div><div className="mx-auto w-fit shadow-2xl"><PlanExportSheet sheetRef={exportRef} planInfo={planInfo} plan={plan} standard={selectedStandardItem} indicators={selectedIndicatorItems} teachingModel={teachingModel} /></div></div>}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, note, color }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${color}`}><Icon size={23} /></div>
      <div><p className="text-sm text-slate-500">{label}</p><div className="mt-0.5 flex items-end gap-2"><strong className="text-2xl text-slate-800">{value}</strong><span className="mb-0.5 text-xs text-slate-400">{note}</span></div></div>
    </div>
  )
}

function NewSemesterModal({ open, onClose, onSaved }) {
  const [subjectId, setSubjectId] = useState('math')
  const [grade, setGrade] = useState('ม.1')
  const [weeks, setWeeks] = useState(20)
  const [saving, setSaving] = useState(false)
  const selectedSubject = curriculumCatalog.subjects.find((item) => item.id === subjectId)
  const standardCount = standardsData.standards.filter((item) => item.subject_id === subjectId && item.grades.includes(grade)).length
  const indicatorCount = indicatorsData.indicators.filter((item) => item.subject_id === subjectId && item.grade === grade).length

  if (!open) return null

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    const record = {
      id: crypto.randomUUID(),
      schoolYear: '2569',
      weeks: Number(weeks),
      createdAt: new Date().toISOString(),
      subject_id: subjectId,
      course_code: selectedSubject?.prefix || '',
      course_name: selectedSubject?.name || '',
      grade,
      semester: 1,
    }
    try {
      const result = await saveSemesterRecord(record)
      onSaved(record, result.source === 'supabase')
      onClose()
    } catch (error) {
      onSaved(null, false, error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="semester-title" className="w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between"><div><p className="eyebrow">เริ่มต้นวางแผน</p><h2 id="semester-title" className="mt-1 text-2xl font-bold text-slate-900">สร้างภาคเรียนใหม่</h2></div><button onClick={onClose} className="icon-btn"><X size={20} /></button></div>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="field-label">เลือกกลุ่มสาระ / รายวิชา</span><div className="relative mt-2"><select value={subjectId} onChange={(event) => setSubjectId(event.target.value)} className="field appearance-none pr-10">{curriculumCatalog.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={18} /></div></label><label className="block"><span className="field-label">เลือกระดับชั้น</span><div className="relative mt-2"><select value={grade} onChange={(event) => setGrade(event.target.value)} className="field appearance-none pr-10">{curriculumCatalog.grades.map((item) => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={18} /></div></label></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="field-label">ปีการศึกษา</span><input className="field mt-2" value="2569" readOnly /></label>
            <label><span className="field-label">จำนวนสัปดาห์</span><input className="field mt-2" type="number" min="1" max="25" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></label>
          </div>
          <div className="rounded-2xl bg-[#eff8f5] p-4 text-sm text-[#226759]"><div className="flex items-center gap-2 font-semibold"><Check size={17} /> พบข้อมูลหลักสูตรสำหรับ {grade}</div><p className="mt-1.5 pl-6 text-[#477b71]">{standardCount} มาตรฐาน · {indicatorCount} ตัวชี้วัด · พร้อมใช้สร้างแผน</p></div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">ยกเลิก</button><button disabled={saving} className="btn-primary">{saving ? 'กำลังบันทึก...' : 'สร้างภาคเรียน'}</button></div>
        </form>
      </section>
    </div>
  )
}

function WorkspaceApp({ user, profile }) {
  const semesterStorageKey = `kruplan:${user.id}:semesters-v1`
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [activeCourse, setActiveCourse] = useState('M1-S1')
  const [notice, setNotice] = useState(null)
  const [detail, setDetail] = useState(null)
  const [activeNav, setActiveNav] = useState('ภาพรวม')
  const [search, setSearch] = useState('')
  const [activePlanId, setActivePlanId] = useState(1)
  const [semesters, setSemesters] = useState(() => {
    try { return JSON.parse(localStorage.getItem(semesterStorageKey) || '[]') }
    catch { return [] }
  })
  const [activeSemesterId, setActiveSemesterId] = useState(() => {
    try { return JSON.parse(localStorage.getItem(semesterStorageKey) || '[]')[0]?.id || '' }
    catch { return '' }
  })
  const selectedCourse = courses.find((item) => item.id === activeCourse)
  const activeSemester = semesters.find((item) => item.id === activeSemesterId) || null
  const topics = useMemo(() => curriculum.courses.find((item) => item.grade === selectedCourse.grade)?.semesters.find((item) => item.semester === selectedCourse.semester)?.topics || [], [selectedCourse])
  const filteredPlans = initialPlans.filter((plan) => plan.title.toLowerCase().includes(search.toLowerCase()))

  const showNotice = (text, type = 'success') => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 4200)
  }

  useEffect(() => {
    let active = true
    const hydrateSemesters = async () => {
      const localRecords = JSON.parse(localStorage.getItem(semesterStorageKey) || '[]')
      await Promise.all(localRecords.map((record) => saveSemesterRecord(record)))
      const remote = await loadSemesters()
      if (!active || !remote?.length) return
      setSemesters((current) => {
        const merged = [...new Map([...remote, ...current].map((item) => [item.id, item])).values()]
        localStorage.setItem(semesterStorageKey, JSON.stringify(merged))
        return merged
      })
      setActiveSemesterId((current) => current || remote[0].id)
    }
    hydrateSemesters().catch(() => {})
    return () => { active = false }
  }, [])

  const navigate = (label) => {
    setActiveNav(label)
    setMenuOpen(false)
    if (label === 'ภาพรวม') window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (label === 'ภาคเรียนของฉัน') {
      if (semesters.length) document.getElementById('my-semesters')?.scrollIntoView({ behavior: 'smooth' })
      else setModalOpen(true)
    }
    else if (label === 'แผนการสอน') window.scrollTo({ top: 0, behavior: 'smooth' })
    else if (label === 'คลังหลักสูตร') document.getElementById('course-library')?.scrollIntoView({ behavior: 'smooth' })
    else if (label === 'ตรวจ PA') setDetail({ type: 'pa' })
  }

  const notify = (record, synced, error) => {
    if (error) setNotice({ type: 'error', text: error })
    else {
      setSemesters((current) => {
        const next = [record, ...current.filter((item) => item.id !== record.id)]
        localStorage.setItem(semesterStorageKey, JSON.stringify(next))
        return next
      })
      setActiveSemesterId(record.id)
      setNotice({ type: 'success', text: synced ? `บันทึก ${record.course_name} ลง Supabase แล้ว` : `สร้าง ${record.course_name} ในเครื่องแล้ว · เข้าสู่ระบบเพื่อซิงก์` })
      window.setTimeout(() => document.getElementById('my-semesters')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
    }
    window.setTimeout(() => setNotice(null), 4200)
  }

  const openSemester = (semester) => {
    setActiveSemesterId(semester.id)
    setActivePlanId(1)
    setActiveNav('แผนการสอน')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const removeSemester = async (semester) => {
    if (!window.confirm(`ต้องการลบรายวิชา “${semester.course_name} ${semester.grade}” และแผนทั้งหมดในรายวิชานี้ใช่หรือไม่?`)) return
    try {
      await deleteSemesterRecord(semester.id)
      setSemesters((current) => {
        const next = current.filter((item) => item.id !== semester.id)
        localStorage.setItem(semesterStorageKey, JSON.stringify(next))
        return next
      })
      const editablePlansStorageKey = `kruplan:${user.id}:editable-plans-v2`
      const savedPlans = JSON.parse(localStorage.getItem(editablePlansStorageKey) || '{}')
      const remainingPlans = Object.fromEntries(Object.entries(savedPlans).filter(([key]) => !key.startsWith(`${semester.id}:`)))
      localStorage.setItem(editablePlansStorageKey, JSON.stringify(remainingPlans))
      Object.keys(localStorage).filter((key) => key.startsWith(`kruplan:${user.id}:plan-${semester.id}:`)).forEach((key) => localStorage.removeItem(key))
      if (activeSemesterId === semester.id) setActiveSemesterId('')
      showNotice(`ลบรายวิชา ${semester.course_name} ${semester.grade} แล้ว`)
    } catch {
      showNotice('ลบรายวิชาไม่สำเร็จ กรุณาลองใหม่', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#eefaf6] text-slate-800">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} activeNav={activeNav} onNavigate={navigate} onAction={(type) => setDetail({ type })} profile={profile} />
      <main className="min-h-screen lg:pl-[104px]">
        <header className="sticky top-0 z-20 flex h-[74px] items-center border-b border-black/5 bg-[#fffdfb]/90 px-4 backdrop-blur sm:px-7 lg:px-9">
          <button onClick={() => setMenuOpen(true)} className="icon-btn mr-2 lg:hidden"><Menu size={21} /></button>
          <div className="relative hidden max-w-md flex-1 md:block"><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="ค้นหาแผนการสอน" className="w-full rounded-xl bg-slate-100 py-2.5 pl-10 pr-4 text-sm outline-none ring-[#287568] transition focus:ring-2" placeholder="ค้นหาแผนการสอน..." /></div>
          <div className="ml-auto flex items-center gap-3"><button onClick={() => setDetail({ type: 'settings' })} className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${isSupabaseConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><Database size={14} />{isSupabaseConfigured ? 'Supabase พร้อมเชื่อมต่อ' : 'โหมดในเครื่อง'}</button><button onClick={() => setDetail({ type: 'notifications' })} className="icon-btn relative" aria-label="การแจ้งเตือน"><span className="absolute right-2 top-2 size-1.5 rounded-full bg-orange-500" /><Cloud size={19} /></button></div>
        </header>

        {activeNav === 'แผนการสอน' ? <LessonPlanWorkspace activePlanId={activePlanId} activeSemester={activeSemester} onSelectPlan={setActivePlanId} onBack={() => setActiveNav('ภาพรวม')} onNotify={showNotice} onCheckPa={() => setDetail({ type: 'pa' })} userId={user.id} /> : <div className="mx-auto max-w-[1400px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
          <section className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="eyebrow">พื้นที่ทำงานของคุณครู</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-[34px]">สวัสดีครับ {profile.display_name}</h1><p className="mt-2 text-[15px] text-slate-500">วันนี้มาวางแผนการสอนให้เป็นเรื่องง่ายกันครับ</p></div>
            <button onClick={() => setModalOpen(true)} className="btn-primary self-start sm:self-auto"><Plus size={18} /> สร้างภาคเรียนใหม่</button>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={BookOpen} label="แผนการสอนทั้งหมด" value="12" note="แผน" color="bg-emerald-50 text-emerald-700" />
            <StatCard icon={FileText} label="ฉบับร่าง" value="3" note="รอตรวจ" color="bg-amber-50 text-amber-700" />
            <StatCard icon={Check} label="พร้อมใช้งาน" value="8" note="แผน" color="bg-blue-50 text-blue-700" />
            <StatCard icon={Sparkles} label="ความครบถ้วน PA" value="86%" note="เฉลี่ย" color="bg-violet-50 text-violet-700" />
          </section>

          <section id="my-semesters" className="card mt-7 scroll-mt-24 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="section-title">ภาคเรียนของฉัน</h2><p className="mt-1 text-sm text-slate-400">รายวิชาที่สร้างไว้สำหรับเริ่มจัดทำแผนการสอน</p></div><button onClick={() => setModalOpen(true)} className="btn-secondary self-start sm:self-auto"><Plus size={17} /> เพิ่มรายวิชา</button></div>
            {semesters.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">{semesters.map((semester) => <article key={semester.id} className="rounded-2xl border border-slate-200 bg-[#fbfcfc] p-4"><div className="flex items-start gap-3"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e7f3ef] text-[#236a5e]"><BookOpen size={20} /></div><div className="min-w-0 flex-1"><h3 className="font-bold text-slate-800">{semester.course_name}</h3><p className="mt-1 text-sm text-slate-500">{semester.grade} · ปีการศึกษา {semester.schoolYear}</p><p className="mt-1 text-xs text-slate-400">{semester.weeks} สัปดาห์</p></div></div><div className="mt-4 grid grid-cols-[1fr_auto] gap-2"><button onClick={() => openSemester(semester)} className="btn-primary w-full">เปิดสร้างแผน</button><button onClick={() => removeSemester(semester)} className="grid size-11 place-items-center rounded-xl border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50" aria-label={`ลบรายวิชา ${semester.course_name} ${semester.grade}`} title="ลบรายวิชา"><Trash2 size={18} /></button></div></article>)}</div> : <div className="px-6 py-8 text-center"><p className="text-sm text-slate-500">ยังไม่มีรายวิชาในภาคเรียนนี้</p><button onClick={() => setModalOpen(true)} className="mt-3 text-sm font-bold text-[#217064]">สร้างรายวิชาแรก</button></div>}
          </section>

          <section className="mt-7 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
            <div id="recent-plans" className="card scroll-mt-24 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5 sm:px-6"><div><h2 className="section-title">แผนที่แก้ไขล่าสุด</h2><p className="mt-1 text-sm text-slate-400">กลับไปทำงานต่อจากจุดที่ค้างไว้</p></div><button onClick={() => { setSearch(''); showNotice('แสดงแผนการสอนทั้งหมดแล้ว') }} className="text-sm font-semibold text-[#217064]">ดูทั้งหมด</button></div>
              <div className="divide-y divide-slate-100">
                {filteredPlans.map((plan) => <button key={plan.id} onClick={() => { setActivePlanId(plan.id); setActiveNav('แผนการสอน'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:px-6"><div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf6f3] text-[#246b5f]"><FileText size={20} /></div><div className="min-w-0 flex-1"><h3 className="truncate text-[15px] font-semibold text-slate-800">{plan.title}</h3><p className="mt-1 text-xs text-slate-400">{plan.course} · {plan.updated}</p></div><span className={`status status-${plan.tone}`}>{plan.status}</span><MoreHorizontal size={19} className="hidden text-slate-400 sm:block" /></button>)}
                {filteredPlans.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-400">ไม่พบแผนการสอนที่ค้นหา</p>}
              </div>
            </div>

            <div className="overflow-hidden rounded-[22px] bg-gradient-to-br from-[#155b4e] to-[#0a3f36] p-6 text-white shadow-sm">
              <div className="flex items-start justify-between"><div className="grid size-11 place-items-center rounded-2xl bg-white/12"><Sparkles className="text-[#ffd16d]" size={22} /></div><span className="rounded-full bg-white/10 px-3 py-1 text-xs text-emerald-100">คำแนะนำวันนี้</span></div>
              <h2 className="mt-5 text-xl font-bold">ตรวจความเชื่อมโยงก่อนใช้จริง</h2><p className="mt-2 text-sm leading-6 text-emerald-50/70">แผน “จำนวนเต็มและการนำไปใช้” ยังขาดหลักฐานการประเมินที่เชื่อมกับจุดประสงค์ 1 รายการ</p>
              <button onClick={() => setDetail({ type: 'pa' })} className="mt-6 rounded-xl bg-[#f5bd4a] px-4 py-2.5 text-sm font-bold text-[#173f37] transition hover:bg-[#ffca5b]">เปิด PA Checker</button>
            </div>
          </section>

          <section id="course-library" className="card mt-7 scroll-mt-24 overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="section-title">โครงสร้างรายวิชา</h2><p className="mt-1 text-sm text-slate-400">ข้อมูลอ้างอิงจาก KruPlan AI Starter v0.2</p></div><div className="relative"><select value={activeCourse} onChange={(e) => setActiveCourse(e.target.value)} className="field min-w-[245px] appearance-none pr-9 text-sm font-medium">{courses.map((course) => <option key={course.id} value={course.id}>{course.course_code} · {course.course_name}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-slate-400" size={17} /></div></div>
            <div className="grid border-b border-slate-100 bg-[#fbfcfc] sm:grid-cols-3"><div className="info-cell"><span>ระดับชั้น / ภาคเรียน</span><strong>{selectedCourse.grade} / {selectedCourse.semester}</strong></div><div className="info-cell"><span>เวลาเรียน</span><strong>{selectedCourse.total_hours} ชั่วโมง</strong></div><div className="info-cell border-r-0"><span>หน่วยกิต</span><strong>{selectedCourse.credits} หน่วยกิต</strong></div></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="text-xs font-semibold uppercase tracking-wide text-slate-400"><th className="px-6 py-4">ลำดับ</th><th className="px-4 py-4">หน่วยการเรียนรู้</th><th className="px-4 py-4">สถานะข้อมูล</th><th className="px-6 py-4 text-right">การจัดการ</th></tr></thead><tbody className="divide-y divide-slate-100">{topics.map((topic) => <tr key={topic.sequence} className="text-sm"><td className="px-6 py-4 text-slate-400">{String(topic.sequence).padStart(2, '0')}</td><td className="px-4 py-4 font-semibold text-slate-700">{topic.name}</td><td className="px-4 py-4"><span className="status status-blue">รอตรวจสอบทางการ</span></td><td className="px-6 py-4 text-right"><button onClick={() => setDetail({ type: 'topic', data: { topic, course: selectedCourse } })} className="font-semibold text-[#217064]">เปิดดู</button></td></tr>)}</tbody></table></div>
          </section>

          <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between"><p>ข้อมูลหลักสูตรที่ยังไม่ผ่านการยืนยัน ใช้เพื่อเตรียมโครงสร้างเท่านั้น</p><p>เวอร์ชัน 0.2.0 · Supabase ready</p></footer>
        </div>}
      </main>
      <NewSemesterModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={notify} />
      <DetailModal detail={detail} onClose={() => setDetail(null)} onNotify={showNotice} />
      {notice && <div role="status" className={`fixed bottom-5 right-5 z-[60] max-w-sm rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-xl ${notice.type === 'error' ? 'bg-rose-600' : 'bg-[#14594d]'}`}>{notice.text}</div>}
    </div>
  )
}

export default function App() {
  return <AuthGate>{({ user, profile }) => <WorkspaceApp user={user} profile={profile} />}</AuthGate>
}
