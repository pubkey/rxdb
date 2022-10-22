# Backup

With the backup plugin you can write the current database state and ongoing changes into folders on the filesystem.
The files are written in plain json together with their attachments.

This is useful to:
  - Consume the database content with other software that cannot replicate with RxDB
  - Write a backup of the database to a remote server by mounting the backup folder on the other server.


## import

The backup plugin works only in node.js, not in browser.
This means we have to import it to RxDB before it can be used.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBBackupPlugin } from 'rxdb/plugins/backup';
addRxPlugin(RxDBBackupPlugin);
```


## one-time backup

Write the whole database to the filesystem **once**.
When called multiple times, it will continue from the last checkpoint and not start all over again.


```javascript
const backupOptions = {
    // if false, a one-time backup will be written
    live: false,
    // the folder where the backup will be stored
    directory: '/my-backup-folder/,
    // if true, attachments will also be saved
    attachments: true
}
const backupState = myDatabase.backup(backupOptions);
await backupState.awaitInitialBackup();

// call again to run from the last checkpoint
const backupState2 = myDatabase.backup(backupOptions);
await backupState2.awaitInitialBackup();
```

## live backup

When `live: true` is set, the backup will write all ongoing changes to the backup directory.

```javascript
const backupOptions = {
    // set live: true to have an ongoing backup
    live: true,
    directory: '/my-backup-folder/,
    attachments: true
}
const backupState = myDatabase.backup(backupOptions);

// you can still await the initial backup write, but further changes will still be processed.
await backupState.awaitInitialBackup();
```

## writeEvents$

You can listen to the `writeEvents$` Observable to get notified about written backup files.

```javascript
const backupOptions = {
    live: false,
    directory: '/my-backup-folder/,
    attachments: true
}
const backupState = myDatabase.backup(backupOptions);

const subscription = backupState.writeEvents$.subscribe(writeEvent => console.dir(writeEvent));
/*
> {
    collectionName: 'humans',
    documentId: 'foobar',
    files: [
        '/my-backup-folder/foobar/document.json'
    ],
    deleted: false
}
*/
```

## Import backup

It is currently not possible to import from a written backup. If you need this functionality, please make a pull request.
