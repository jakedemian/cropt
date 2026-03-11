CREATE TABLE "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"r2_key" text NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"mime_type" text DEFAULT 'image/png',
	"flagged" boolean DEFAULT false NOT NULL,
	"report_count" integer DEFAULT 0 NOT NULL
);
