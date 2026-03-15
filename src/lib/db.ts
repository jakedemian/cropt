import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// Lazily initialized so neon() is not called at module load time.
// Next.js loads route modules during the build's static analysis phase,
// and DATABASE_URL is not available then — only at request time.
let _db: ReturnType<typeof drizzle<typeof schema>>

export function getDb() {
  if (!_db) {
    _db = drizzle(neon(process.env.DATABASE_URL!), { schema })
  }
  return _db
}
