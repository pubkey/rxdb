# Changelog Entries

Add one JSON file per changelog entry to this folder. Each file must match the JSON schema in [schema.json](./schema.json). The CI validates all entries with `node ./scripts/check-changelog-entries.js`.

**File naming**: Use a descriptive filename ending in `.json`, for example:
- `fix-count-query-with-limit.json`
- `add-supabase-attachment-support.json`

**File content example**:
```json
{
    "$schema": "./schema.json",
    "text": "FIX memory storage `count()` returning incorrect results when the selector is not fully satisfied by the index and the query has a `limit` set",
    "links": [
        {
            "url": "https://github.com/pubkey/rxdb/issues/1234",
            "linkText": "#1234"
        }
    ],
    "priority": 6
}
```

**Fields**:
- `text`: The markdown text of the change, without the leading `- ` and without the links. Starts with the type of the change like `FIX`, `ADD`, `CHANGE` or `PERFORMANCE`.
- `links`: Linked URLs, for example the root issue or pull request, each with `url` and `linkText`. They are rendered as markdown links behind the text. Use `[]` when there is nothing to link.
- `priority`: How important the change is for RxDB users, from `1` to `10`. In the release notes and in `CHANGELOG.md` the entries with the highest priority are shown first. Rough guide:
  - `1`: lint fixes, flaky tests, internal tooling
  - `2-3`: typos, error message and docs fixes
  - `4-6`: bugfixes and small behavior changes
  - `7-8`: performance improvements, new features of existing plugins, breaking changes
  - `9-10`: new plugins, new storages, new replication plugins

On release, all entry files in this folder are merged into `CHANGELOG.md`, sorted by priority, and deleted automatically by the `scripts/set-version.mjs` script.

This approach prevents merge conflicts in `CHANGELOG.md` when multiple PRs are open at the same time.
