import { createClient } from '@supabase/supabase-js'
import standardsJson from '../data/standards.json' with { type: 'json' }
import indicatorsJson from '../data/indicators.json' with { type: 'json' }
import learningModelsJson from '../data/learning_models.json' with { type: 'json' }

const url = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('ตั้งค่า SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY ก่อนรัน seed')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } })

const standards = standardsJson.standards.map((item) => ({
  id: item.id,
  code: item.code,
  subject_id: item.subject_id,
  strand: item.strand,
  text: item.text,
  verification_status: item.verification_status,
  source: item.source,
}))
const indicators = indicatorsJson.indicators.map((item) => ({
  id: item.id,
  standard_id: item.standard_id,
  code: item.code,
  subject_id: item.subject_id,
  grade: item.grade,
  text: item.text,
  content_topics: item.content_topics || [],
  verification_status: item.verification_status,
  source: item.source,
}))
const models = learningModelsJson.models.map((item, index) => ({
  id: item.id,
  name: item.name,
  description: item.description,
  steps: item.steps,
  sort_order: index + 1,
  source_url: learningModelsJson.source,
}))

for (const [table, rows] of [['standards', standards], ['indicators', indicators], ['learning_models', models]]) {
  const { error } = await supabase.from(table).upsert(rows)
  if (error) throw error
  console.log(`Seeded ${table}: ${rows.length}`)
}
