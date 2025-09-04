## Prerequisites
- `primaryKey` must be a string.
- deletes must be soft-deletes with `_deleted` field


## Limitations

- Currently no nested properties supported
- nullable values might have to be converted to undefined with the pull.modifier
