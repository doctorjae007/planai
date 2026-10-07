import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpen, DoorOpen, LogOut, Plus, X } from 'lucide-react'
import AuthGate from './AuthGate'
import { supabase } from './lib/supabase'
import { LessonPlanWorkspace } from './App.jsx'

const blankRoom = { name: '', description: '' }
const blankPlan = {
  title: '',
  subject: '',
  grade: '',
  duration: '',
  objectives: '',
  activities: '',
  assessment: '',
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="my-auto w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="ml-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
          aria-label="ปิด"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}

function Field({ label, children, full = false }) {
  return (
    <label className={full ? 'sm:col-span-2' : ''}>
      <span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function RoomWorkspace({ user, profile }) {
  const [rooms, setRooms] = useState([])
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [plans, setPlans] = useState([])
  const [roomForm, setRoomForm] = useState(blankRoom)
  const [planForm, setPlanForm] = useState(blankPlan)
  const [showRoomForm, setShowRoomForm] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [activePlanId, setActivePlanId] = useState(1)

  useEffect(() => {
    loadRooms()
  }, [])

  async function loadRooms() {
    setBusy(true)
    const { data, error: queryError } = await supabase
      .from('rooms')
      .select('*')
      .order('updated_at', { ascending: false })
    setBusy(false)
    if (queryError) setError(queryError.message)
    else setRooms(data || [])
  }

  async function openRoom(room, openPlanForm = false) {
    setSelectedRoom(room)
    setPlans([])
    setError('')
    const { data, error: queryError } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('room_id', room.id)
      .order('updated_at', { ascending: false })
    if (queryError) setError(queryError.message)
    else {
      setPlans(data || [])
      setActivePlanId(Number(data?.[0]?.plan_number) || 1)
    }
  }

  async function createRoom(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { data, error: mutationError } = await supabase
      .from('rooms')
      .insert({
        name: roomForm.name.trim(),
        description: roomForm.description.trim(),
        owner_id: user.id,
        owner_name: profile?.display_name || user.email,
      })
      .select()
      .single()
    setSaving(false)
    if (mutationError) return setError(mutationError.message)
    setRooms((current) => [data, ...current])
    setRoomForm(blankRoom)
    setShowRoomForm(false)
    await openRoom(data, true)
  }

  async function createPlan(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    const { data, error: mutationError } = await supabase
      .from('lesson_plans')
      .insert({
        user_id: user.id,
        room_id: selectedRoom.id,
        external_id: `room-${selectedRoom.id}-${Date.now()}`,
        title: planForm.title.trim(),
        subject: planForm.subject.trim() || null,
        grade: planForm.grade.trim() || null,
        duration: planForm.duration.trim() || null,
        content: {
          objectives: planForm.objectives.trim(),
          activities: planForm.activities.trim(),
          assessment: planForm.assessment.trim(),
        },
      })
      .select()
      .single()
    setSaving(false)
    if (mutationError) return setError(mutationError.message)
    setPlans((current) => [data, ...current])
    setPlanForm(blankPlan)
    setShowPlanForm(false)
  }

  const isOwner = selectedRoom?.owner_id === user.id
  const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10'

  return (
    <div className="min-h-screen bg-[#f7faf9] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-teal-700 text-white"><BookOpen size={22} /></div>
            <div><h1 className="font-bold">KruPlan AI</h1><p className="text-xs text-slate-500">{profile?.display_name || user.email}</p></div>
          </div>
          <button type="button" onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800">
            <LogOut size={17} /> ออกจากระบบ
          </button>
        </div>
      </header>

      <main className={selectedRoom ? 'w-full' : 'mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14'}>
        {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {notice && <div className="fixed right-5 top-24 z-[80] rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}

        {!selectedRoom ? (
          <>
            <section className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-end">
              <div><p className="mb-2 text-sm font-bold text-teal-700">ขั้นตอนที่ 1</p><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">สร้างห้องของคุณครู</h2><p className="mt-3 text-slate-500">เลือกห้องที่มีอยู่ หรือสร้างห้องใหม่เพื่อเริ่มทำแผนการสอน</p></div>
              <button type="button" onClick={() => setShowRoomForm(true)} className="flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 font-bold text-white shadow-lg shadow-teal-700/15 transition hover:bg-teal-800">
                <Plus size={20} /> สร้างห้อง
              </button>
            </section>

            {busy ? <div className="py-20 text-center text-slate-400">กำลังโหลดห้อง…</div> : rooms.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <button key={room.id} type="button" onClick={() => openRoom(room)} className="group rounded-[24px] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-lg">
                    <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700"><DoorOpen size={23} /></div>
                    <h3 className="text-lg font-bold group-hover:text-teal-700">{room.name}</h3>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">{room.description || 'เข้าไปสร้างแผนการสอนในห้องนี้'}</p>
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" onClick={() => setShowRoomForm(true)} className="grid w-full place-items-center rounded-[28px] border-2 border-dashed border-slate-300 bg-white px-5 py-20 text-center transition hover:border-teal-400 hover:bg-teal-50/40">
                <span className="grid size-14 place-items-center rounded-full bg-teal-50 text-teal-700"><Plus size={25} /></span>
                <strong className="mt-4 text-lg">ยังไม่มีห้อง — สร้างห้องแรก</strong>
              </button>
            )}
          </>
        ) : <LessonPlanWorkspace
          activePlanId={activePlanId}
          activeSemester={{ id: selectedRoom.id, course_name: selectedRoom.name, subject_id: 'math', grade: 'ม.1', semester: 1, schoolYear: '2569' }}
          roomId={selectedRoom.id}
          onSelectPlan={setActivePlanId}
          onBack={() => { setSelectedRoom(null); setPlans([]) }}
          onNotify={(text, type) => {
            if (type === 'error') setError(text)
            else {
              setError('')
              setNotice(text)
              setTimeout(() => setNotice(''), 3200)
            }
          }}
          userId={user.id}
        />}
      </main>

      {showRoomForm && <Modal onClose={() => setShowRoomForm(false)}><form onSubmit={createRoom}><p className="text-sm font-bold text-teal-700">ขั้นตอนที่ 1</p><h2 className="mt-1 text-2xl font-bold">สร้างห้อง</h2><div className="mt-6 space-y-5"><Field label="ชื่อห้อง"><input autoFocus required className={inputClass} placeholder="เช่น คณิตศาสตร์ ม.1" value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} /></Field><Field label="คำอธิบาย (ไม่บังคับ)"><textarea className={`${inputClass} min-h-28 resize-y`} placeholder="รายละเอียดสั้น ๆ ของห้อง" value={roomForm.description} onChange={(event) => setRoomForm({ ...roomForm, description: event.target.value })} /></Field></div><button disabled={saving} className="mt-7 w-full rounded-2xl bg-teal-700 px-5 py-3.5 font-bold text-white disabled:opacity-50">{saving ? 'กำลังสร้าง…' : 'สร้างห้องและไปทำแผนการสอน'}</button></form></Modal>}

      {showPlanForm && <Modal onClose={() => setShowPlanForm(false)}><form onSubmit={createPlan}><p className="text-sm font-bold text-teal-700">ขั้นตอนที่ 2</p><h2 className="mt-1 text-2xl font-bold">สร้างแผนการสอน</h2><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="ชื่อแผนการสอน" full><input autoFocus required className={inputClass} value={planForm.title} onChange={(event) => setPlanForm({ ...planForm, title: event.target.value })} /></Field><Field label="วิชา"><input className={inputClass} value={planForm.subject} onChange={(event) => setPlanForm({ ...planForm, subject: event.target.value })} /></Field><Field label="ระดับชั้น"><input className={inputClass} value={planForm.grade} onChange={(event) => setPlanForm({ ...planForm, grade: event.target.value })} /></Field><Field label="เวลา" full><input className={inputClass} placeholder="เช่น 2 ชั่วโมง" value={planForm.duration} onChange={(event) => setPlanForm({ ...planForm, duration: event.target.value })} /></Field><Field label="จุดประสงค์การเรียนรู้" full><textarea className={`${inputClass} min-h-24 resize-y`} value={planForm.objectives} onChange={(event) => setPlanForm({ ...planForm, objectives: event.target.value })} /></Field><Field label="กิจกรรมการเรียนรู้" full><textarea className={`${inputClass} min-h-28 resize-y`} value={planForm.activities} onChange={(event) => setPlanForm({ ...planForm, activities: event.target.value })} /></Field><Field label="การวัดและประเมินผล" full><textarea className={`${inputClass} min-h-24 resize-y`} value={planForm.assessment} onChange={(event) => setPlanForm({ ...planForm, assessment: event.target.value })} /></Field></div><button disabled={saving} className="mt-7 w-full rounded-2xl bg-teal-700 px-5 py-3.5 font-bold text-white disabled:opacity-50">{saving ? 'กำลังบันทึก…' : 'บันทึกแผนการสอน'}</button></form></Modal>}
    </div>
  )
}

export default function SimpleRoomApp() {
  return <AuthGate>{({ user, profile }) => <RoomWorkspace user={user} profile={profile} />}</AuthGate>
}
