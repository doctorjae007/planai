import { useEffect, useState } from 'react'
import { Eye, EyeOff, GraduationCap, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

function AuthShell({ children }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#eefaf6] p-4">
      <section className="w-full max-w-md rounded-[30px] border border-black/5 bg-[#fffdfb] p-7 shadow-[0_24px_70px_rgba(37,66,59,.12)] sm:p-9">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-[#17171a] text-white"><GraduationCap size={25} /></div>
          <div><h1 className="text-xl font-black text-slate-900">KruPlan <span className="text-[#de8693]">AI</span></h1><p className="text-xs text-slate-500">พื้นที่สร้างแผนการสอนของคุณครู</p></div>
        </div>
        {children}
      </section>
    </main>
  )
}

function authErrorMessage(error) {
  const message = error?.message || ''
  const normalized = message.toLowerCase()

  if (normalized.includes('invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (normalized.includes('email not confirmed')) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'
  if (normalized.includes('user already registered')) return 'อีเมลนี้ถูกสมัครสมาชิกแล้ว กรุณาเข้าสู่ระบบ'
  if (normalized.includes('password should be')) return 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
  if (normalized.includes('rate limit')) return 'ดำเนินการบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  if (normalized.includes('failed to fetch')) return 'เชื่อมต่อระบบสมาชิกไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'
  return message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState('sign-in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadProfile = async (user) => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    const { data, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (profileError) setError(profileError.message)
    setProfile(data || null)
    setName(data?.display_name || user.user_metadata?.display_name || '')
    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return undefined
    }

    supabase.auth.getSession()
      .then(({ data, error: sessionError }) => {
        if (sessionError) setError(authErrorMessage(sessionError))
        setSession(data.session)
        loadProfile(data.session?.user)
      })
      .catch((sessionError) => {
        setError(authErrorMessage(sessionError))
        setLoading(false)
      })

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(true)
      window.setTimeout(() => loadProfile(nextSession?.user), 0)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const changeMode = (nextMode) => {
    setMode(nextMode)
    setError('')
    setNotice('')
    setPassword('')
    setConfirmPassword('')
  }

  const authenticate = async (event) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()
    const displayName = name.trim()

    setError('')
    setNotice('')

    if (!normalizedEmail) return setError('กรุณากรอกอีเมล')
    if (password.length < 6) return setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    if (mode === 'sign-up' && !displayName) return setError('กรุณากรอกชื่อที่ต้องการแสดง')
    if (mode === 'sign-up' && password !== confirmPassword) return setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')

    setSubmitting(true)
    try {
      if (mode === 'sign-up') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        })
        if (signUpError) return setError(authErrorMessage(signUpError))

        if (!data.session) {
          setNotice('สมัครสมาชิกสำเร็จ กรุณาเปิดอีเมลและกดลิงก์ยืนยันก่อนเข้าสู่ระบบ')
          setMode('sign-in')
          setPassword('')
          setConfirmPassword('')
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (signInError) setError(authErrorMessage(signInError))
      }
    } catch (authError) {
      setError(authErrorMessage(authError))
    } finally {
      setSubmitting(false)
    }
  }

  const completeProfile = async (event) => {
    event.preventDefault()
    const displayName = name.trim()
    if (!displayName) return setError('กรุณาตั้งชื่อที่ต้องการให้แสดงในระบบ')
    setSaving(true)
    setError('')
    const { data, error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, display_name: displayName }, { onConflict: 'id' })
      .select()
      .single()
    setSaving(false)
    if (saveError) return setError(saveError.message)
    setProfile(data)
  }

  if (!isSupabaseConfigured) return <AuthShell><div className="mt-7 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">ยังไม่ได้ตั้งค่า Supabase กรุณาเพิ่ม VITE_SUPABASE_URL และ VITE_SUPABASE_PUBLISHABLE_KEY ในไฟล์ .env</div></AuthShell>
  if (loading) return <AuthShell><div className="mt-10 flex items-center justify-center gap-3 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={20} /> กำลังตรวจสอบบัญชี...</div></AuthShell>

  if (!session) {
    const isSignUp = mode === 'sign-up'
    return (
      <AuthShell>
        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-900">{isSignUp ? 'สร้างบัญชีคุณครู' : 'เข้าสู่ระบบ'}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{isSignUp ? 'สมัครสมาชิกด้วยอีเมล เพื่อบันทึกแผนการสอนแยกเป็นบัญชีส่วนตัว' : 'ใช้อีเมลและรหัสผ่านที่สมัครไว้เพื่อเริ่มวางแผน'}</p>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="เลือกรูปแบบการเข้าใช้งาน">
          <button type="button" role="tab" aria-selected={!isSignUp} onClick={() => changeMode('sign-in')} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${!isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>เข้าสู่ระบบ</button>
          <button type="button" role="tab" aria-selected={isSignUp} onClick={() => changeMode('sign-up')} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition ${isSignUp ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>สมัครสมาชิก</button>
        </div>

        <form onSubmit={authenticate} className="mt-6 space-y-4">
          {isSignUp && <div><label className="field-label" htmlFor="register-name">ชื่อที่แสดง</label><input id="register-name" autoComplete="name" maxLength="80" value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" placeholder="เช่น ครูพิมพ์ใจ" /></div>}

          <div>
            <label className="field-label" htmlFor="auth-email">อีเมล</label>
            <div className="relative mt-2"><Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="field pl-10" placeholder="teacher@example.com" /></div>
          </div>

          <div>
            <label className="field-label" htmlFor="auth-password">รหัสผ่าน</label>
            <div className="relative mt-2"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength="6" required value={password} onChange={(event) => setPassword(event.target.value)} className="field px-10" placeholder="อย่างน้อย 6 ตัวอักษร" /><button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700" aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </div>

          {isSignUp && <div><label className="field-label" htmlFor="confirm-password">ยืนยันรหัสผ่าน</label><input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="6" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="field mt-2" placeholder="กรอกรหัสผ่านอีกครั้ง" /></div>}

          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700" role="alert">{error}</p>}
          {notice && <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-800" role="status">{notice}</p>}

          <button disabled={submitting} className="btn-primary flex w-full items-center justify-center gap-2" type="submit">{submitting && <LoaderCircle className="animate-spin" size={18} />}{submitting ? 'กำลังดำเนินการ...' : isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}</button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-slate-400">ข้อมูลบัญชีและแผนการสอนของคุณจะถูกจัดเก็บแยกจากผู้ใช้อื่นอย่างปลอดภัย</p>
      </AuthShell>
    )
  }

  if (!profile?.display_name?.trim()) return (
    <AuthShell>
      <div className="mt-8"><p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-700">เข้าสู่ระบบสำเร็จ</p><h2 className="mt-2 text-2xl font-black text-slate-900">ยืนยันชื่อที่ใช้ในระบบ</h2><p className="mt-2 text-sm leading-6 text-slate-500">ชื่อนี้จะแสดงบนหน้าแผนและพื้นที่ทำงานของคุณครู</p></div>
      <form onSubmit={completeProfile} className="mt-6">
        <label className="field-label" htmlFor="display-name">ชื่อที่แสดง</label>
        <input id="display-name" autoFocus maxLength="80" value={name} onChange={(event) => setName(event.target.value)} className="field mt-2" placeholder="เช่น ครูพิมพ์ใจ" />
        <p className="mt-2 text-xs text-slate-400">บัญชี: {session.user.email}</p>
        {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button disabled={saving || !name.trim()} className="btn-primary mt-6 w-full">{saving ? 'กำลังบันทึก...' : 'เริ่มใช้งาน KruPlan AI'}</button>
      </form>
    </AuthShell>
  )

  return children({ user: session.user, profile })
}
