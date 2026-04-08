# Changelog Entries

Add one file per changelog entry to this folder. Each file should contain one or more changelog lines starting with `- `.

**File naming**: Use a descriptive filename ending in `.md`, for example:
- `fix-count-query-with-limit.md`
- `add-supabase-attachment-support.md`

**File content example**:
```
- FIX memory storage `count()` returning incorrect results when the selector is not fully satisfied by the index and the query has a `limit` set
```

On release, all `.md` files in this folder (except this README) are merged into `CHANGELOG.md` and deleted automatically by the `scripts/set-version.mjs` script.

This approach prevents merge conflicts in `CHANGELOG.md` when multiple PRs are open at the same time.
