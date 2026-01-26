# Premium Tasks

If you are a **single developer** and you use RxDB in your **side project**, you can get free 2 years access to the [RxDB Premium](https://rxdb.info/premium/) package by solving one Task of this list.

This list will be regularly updated with new Tasks, all updates will be posted on [discord](https://rxdb.info/chat).

## How to claim and solve a task

To ensure there are not multiple people working on the same task, before you start working on that task, [create an issue](https://github.com/pubkey/rxdb/issues/new) where you tell about the estimated time to finish the task.
- To solve a task, you must do it fully on your own.
- The maintainer might answer your questions but will not do the work.
- The CI must still be green afterwards. Commenting out broken tests is not allowed.
- Your PR must be complete or it will not be merged. Do not expect to have the maintainer finish your work or asking you each week about the progress.


## Open Tasks (pick one and work on it)

- Change the docusuaurs config to use server rendered codeblocks instead of loading the big prismjs into the main.js javascript bundle (use sth like Shiki instead).
- Rework the [RxStorage Interface](https://github.com/pubkey/rxdb/blob/master/src/types/rx-storage.d.ts#L149) do consume attachments data directly as `Blob` instead of a base64 string to improve performance.
- Find a way to correctly type [custom-reactivity adapters](https://rxdb.info/reactivity.html) (aka signals) so that they know the correct document type:
    ```ts
    const signal = myRxDocument.get$$('foobar'); // <- This has the type Signal<any> but should have Signal<MyDocumentType>
    const signal = collection.find().$$; // <- This has the type Signal<any[]> but should have Signal<MyDocumentType[]>
    ```
- To improve vibe-coding with RxDB, all [error-messages](https://github.com/pubkey/rxdb/blob/master/src/plugins/dev-mode/error-messages.ts) must:
  - Be added to an `ERROR-MESSAGES.md` that is generated on build time into the package root folder
  - Must contain `cause`, `fix` and `docs` properties like:
    ```js
        const error = {
          "code": "RXDB_MISSING_INDEX",
          "message": "object does not match schema",
          "cause": "RxCollection.insert()",
          "fix": "Do not store data that does not match the collections schema",
          "docs": "https://rxdb.info/schema-validation.html"
        }
    ```

- 📢 Give an in-person talk about RxDB at a conference or meetup with at least 25 real, physically present attendees (no online-only events)

## Tasks already in progress (do no work on these!)

- [#3935](https://github.com/pubkey/rxdb/pull/3935) Fix [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) in the `is-my-json-valid` library, AND enable the unit tests for the plugin `rxdb/plugins/validate-is-my-json-valid`
