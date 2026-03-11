import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL)

const [total] = await sql`SELECT COUNT(*)::int AS count FROM uploads`
const [flagged] = await sql`SELECT COUNT(*)::int AS count FROM uploads WHERE flagged = true`
const [last7] = await sql`SELECT COUNT(*)::int AS count FROM uploads WHERE created_at > NOW() - INTERVAL '7 days'`
const [last30] = await sql`SELECT COUNT(*)::int AS count FROM uploads WHERE created_at > NOW() - INTERVAL '30 days'`
const [storage] = await sql`SELECT COALESCE(SUM(size_bytes), 0)::bigint AS bytes FROM uploads WHERE flagged = false`
const recent = await sql`SELECT id, created_at, size_bytes, width, height, flagged FROM uploads ORDER BY created_at DESC LIMIT 5`

console.log(JSON.stringify({ total: total.count, flagged: flagged.count, last7: last7.count, last30: last30.count, storageBytes: Number(storage.bytes), recent }))
