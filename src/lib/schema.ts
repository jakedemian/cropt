import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core'

export const uploads = pgTable('uploads', {
  id:          text('id').primaryKey(),                          // nanoid, 10 chars
  createdAt:   timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  r2Key:       text('r2_key').notNull(),                        // e.g. "uploads/V1StGXR8.png"
  sizeBytes:   integer('size_bytes'),
  width:       integer('width'),
  height:      integer('height'),
  mimeType:    text('mime_type').default('image/png'),
  flagged:     boolean('flagged').default(false).notNull(),
  reportCount: integer('report_count').default(0).notNull(),
})

export type Upload = typeof uploads.$inferSelect
export type NewUpload = typeof uploads.$inferInsert
