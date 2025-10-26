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

- FIX the broken docs searchbar on [desktop](https://github.com/pubkey/rxdb/blob/master/docs-src/src/theme/DocSidebar/Desktop/Content/index.tsx) and [mobile](https://github.com/pubkey/rxdb/blob/master/docs-src/src/theme/DocSidebar/Mobile/index.tsx)
- Change the docusuaurs config to use server rendered codeblocks instead of loading the big prismjs into the main.js javascript bundle (use sth like Shiki instead).
- Create a `rxdb/plugins/react` plugins with a `useRxDatabase` provider and similiar functions like `useRxQuery`, `useRxCollection` and TypeScript support. (Should later replace the outdated [rxdb-hooks](https://github.com/cvara/rxdb-hooks) library).
- Add server-side-rendering to the angular example, this was disabled when upgrading from angular v16 to v17: https://github.com/pubkey/rxdb/pull/5800
- Find a way to correctly type [custom-reactivity adapters](https://rxdb.info/reactivity.html) (aka signals) so that they know the correct document type:
```ts
const signal = myRxDocument.get$$('foobar'); // <- This has the type Signal<any> but should have Signal<MyDocumentType>
const signal = collection.find().$$; // <- This has the type Signal<any[]> but should have Signal<MyDocumentType[]>
```
- Add granular [binary operations to expo-file-system](https://expo.canny.io/feature-requests/p/add-granular-binary-operations-to-expo-file-system)
- 📢 Give an in-person talk about RxDB at a conference or meetup with at least 25 real, physically present attendees (no online-only events)

## Tasks already in progress (do no work on these!)

- [#3935](https://github.com/pubkey/rxdb/pull/3935) Fix [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) in the `is-my-json-valid` library, AND enable the unit tests for the plugin `rxdb/plugins/validate-is-my-json-valid`
