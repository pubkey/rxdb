## Limitations

- Appwrite primary keys only allow for the characters a-z, A-Z, 0-9, and underscore. (Can't start with a leading underscore). Max 36 characters.
- Only works on browsers because the appwrite SDK does not support subscriptions in node.js.
- The appwrite change stream does not provide "previous" document data, so it will call `RESYNC` on each change to switch into [iteration mode](./replication.md#checkpoint-iteration). This is not a problem, other replication plugins do the same, its just a bit slower than it could be.
