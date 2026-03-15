# Hosting & Feed — Plans & Notes

Bugs, features, and enhancements are tracked in [GitHub Issues](https://github.com/jakedemian/cropt/issues).

---

## Design Decisions

### Feed pagination strategy
The feed uses timestamp-based cursor pagination (not offset) via `createdAt`. Offset pagination drifts when new items are inserted while the user is scrolling. Cursor pagination is stable — the next page always starts after the last seen item's timestamp.

### Why flagged items are filtered at query time
Flagged uploads are hidden from the feed immediately via a `WHERE flagged = false` clause, not via a deletion. This preserves the row for admin review and DMCA compliance before permanent removal.

### R2 for image storage
Images are stored in Cloudflare R2 (not in Postgres) and served via a public R2 URL. R2 has no egress fees, which matters for a public image feed that could have high bandwidth.
