import standardsJson from '../../data/standards.json'
import indicatorsJson from '../../data/indicators.json'
import learningModelsJson from '../../data/learning_models.json'
import { isSupabaseConfigured, supabase } from './supabase'

const REFERENCE_CACHE_KEY = 'kruplan-reference-cache-v1'
const REFERENCE_CACHE_TTL = 12 * 60 * 60 * 1000

const jsonFallback = {
  standards: standardsJson.standards,
  indicators: indicatorsJson.indicators,
  learningModels: learningModelsJson.models,
  source: 'json',
}

function readReferenceCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(REFERENCE_CACHE_KEY) || 'null')
    if (!cached || Date.now() - cached.savedAt > REFERENCE_CACHE_TTL) return null
    return { ...cached.data, source: 'cache' }
  } catch {
    return null
  }
}

function writeReferenceCache(data) {
  localStorage.setItem(REFERENCE_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
}

function mergeReferenceRows(localRows, remoteRows) {
  const rows = new Map(localRows.map((item) => [item.id || item.code, item]))
  remoteRows.forEach((item) => {
    const key = item.id || item.code
    rows.set(key, { ...(rows.get(key) || {}), ...item })
  })
  return [...rows.values()]
}

export async function loadReferenceData() {
  const cached = readReferenceCache()
  if (cached) return cached
  if (!isSupabaseConfigured) return jsonFallback

  try {
    const [standardsResult, indicatorsResult, modelsResult] = await Promise.all([
      supabase.from('standards').select('*').order('code'),
      supabase.from('indicators').select('*').order('code'),
      supabase.from('learning_models').select('*').order('sort_order'),
    ])
    const error = standardsResult.error || indicatorsResult.error || modelsResult.error
    if (error) throw error
    const remoteStandards = standardsResult.data || []
    const remoteIndicators = indicatorsResult.data || []
    const data = {
      standards: mergeReferenceRows(standardsJson.standards, remoteStandards),
      indicators: mergeReferenceRows(indicatorsJson.indicators, remoteIndicators),
      learningModels: (modelsResult.data || []).map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        steps: item.steps || [],
      })),
    }
    if (!data.standards.length || !data.indicators.length || !data.learningModels.length) return jsonFallback
    writeReferenceCache(data)
    return { ...data, source: 'supabase' }
  } catch {
    return jsonFallback
  }
}

export async function saveSemesterRecord(record) {
  if (!isSupabaseConfigured) return { source: 'local' }
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return { source: 'local', reason: 'auth_required' }

  const payload = {
    id: record.id,
    user_id: user.id,
    subject_id: record.subject_id,
    course_code: record.course_code || '',
    course_name: record.course_name,
    grade: record.grade,
    school_year: String(record.schoolYear),
    semester_number: Number(record.semester || 1),
    weeks: Number(record.weeks),
  }
  const { error } = await supabase.from('semesters').upsert(payload)
  if (error) throw error
  return { source: 'supabase' }
}

export async function loadSemesters() {
  if (!isSupabaseConfigured) return null
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return null
  const { data, error } = await supabase.from('semesters').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((item) => ({
    id: item.id,
    subject_id: item.subject_id,
    course_code: item.course_code,
    course_name: item.course_name,
    grade: item.grade,
    schoolYear: item.school_year,
    semester: item.semester_number,
    weeks: item.weeks,
    createdAt: item.created_at,
  }))
}

export async function deleteSemesterRecord(id) {
  if (!isSupabaseConfigured) return { source: 'local' }
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return { source: 'local', reason: 'auth_required' }
  const { error } = await supabase.from('semesters').delete().eq('id', id)
  if (error) throw error
  return { source: 'supabase' }
}

export async function saveLessonPlan({ externalId, plan, teachingModelId, standardId, indicatorIds, semesterId, roomId, subjectId, planNumber }) {
  if (!isSupabaseConfigured) return { source: 'local', reason: 'auth_required' }
  const { data: authData } = await supabase.auth.getUser()
  const user = authData?.user
  if (!user) return { source: 'local', reason: 'auth_required' }
  localStorage.setItem(`kruplan:${user.id}:plan-${externalId}`, JSON.stringify({ plan, teachingModelId, standardId, indicatorIds, savedAt: new Date().toISOString() }))

  const payload = {
    user_id: user.id,
    external_id: String(externalId),
    title: plan.title,
    subject: plan.subject,
    grade: plan.grade,
    semester: plan.semester,
    duration: plan.duration,
    semester_id: semesterId || null,
    room_id: roomId || null,
    subject_id: subjectId || null,
    plan_number: Number(planNumber || 1),
    teaching_model_id: teachingModelId || null,
    standard_id: standardId || null,
    indicator_ids: indicatorIds,
    content: plan,
  }
  let { error } = await supabase.from('lesson_plans').upsert(payload, { onConflict: 'user_id,external_id' })
  let referencesStoredInContent = false

  // The app can work from verified JSON reference data before the optional
  // standards/indicators/learning_models seed has been pushed to Supabase.
  // Preserve those selections inside `content` and retry without FK columns.
  if (error?.code === '23503') {
    const fallbackPayload = {
      ...payload,
      teaching_model_id: null,
      standard_id: null,
      indicator_ids: [],
    }
    const retry = await supabase.from('lesson_plans').upsert(fallbackPayload, { onConflict: 'user_id,external_id' })
    error = retry.error
    referencesStoredInContent = !error
  }

  if (error) throw error
  return { source: 'supabase', referencesStoredInContent }
}

export async function loadLessonPlans() {
  if (!isSupabaseConfigured) return null
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return null
  const { data, error } = await supabase.from('lesson_plans').select('external_id,content,teaching_model_id,standard_id,indicator_ids')
  if (error) throw error
  return data
}

export async function deleteLessonPlan(externalId) {
  if (!isSupabaseConfigured) return { source: 'local', reason: 'auth_required' }
  const { data: authData } = await supabase.auth.getUser()
  if (!authData?.user) return { source: 'local', reason: 'auth_required' }
  localStorage.removeItem(`kruplan:${authData.user.id}:plan-${externalId}`)
  const { error } = await supabase.from('lesson_plans').delete().eq('external_id', String(externalId))
  if (error) throw error
  return { source: 'supabase' }
}
