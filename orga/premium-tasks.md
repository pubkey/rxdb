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

- Publish an article about RxDB on the english wikipedia. (Must not be long, anything that is not deleted by the moderators is ok).
- Create a `rxdb/plugins/react` plugins with a `useRxDatabase` provider and similiar functions like `useRxQuery`, `useRxCollection` and TypeScript support. (Should later replace the outdated [rxdb-hooks](https://github.com/cvara/rxdb-hooks) library).
- Add server-side-rendering to the angular example, this was disabled when upgrading from angular v16 to v17: https://github.com/pubkey/rxdb/pull/5800
- Find a way to correctly type [custom-reactivity adapters](https://rxdb.info/reactivity.html) (aka signals) so that they know the correct document type:
```ts
const signal = myRxDocument.get$$('foobar'); // <- This has the type Signal<any> but should have Signal<MyDocumentType>
const signal = collection.find().$$; // <- This has the type Signal<any[]> but should have Signal<MyDocumentType[]>
```
- Add granular [binary operations to expo-file-system](https://expo.canny.io/feature-requests/p/add-granular-binary-operations-to-expo-file-system)

## Tasks already in progress (do no work on these!)

- [#3935](https://github.com/pubkey/rxdb/pull/3935) Fix [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) in the `is-my-json-valid` library, AND enable the unit tests for the plugin `rxdb/plugins/validate-is-my-json-valid`

## Solved Tasks (do no work on these!)

- Add a [local search](https://github.com/cmfcmf/docusaurus-search-local) plugin to the docusaurus docs. The search-bar must only appear on the documentation pages, not on the landingpage https://github.com/pubkey/rxdb/pull/5429https://github.com/pubkey/rxdb/pull/5429
- Fix the flaky tests for the "example-supabase" CI task. This randomly fails, it should be fixed either by analyzing+fixing the current problem or updating to the newest supabase version. https://github.com/pubkey/rxdb/pull/5469
- UPDATE node.js in the `.nvmrc` file to version 22 and fix all CI issues that come with that. [#6231](https://github.com/pubkey/rxdb/pull/6231)
- Update eslint to the latest version [#6115](https://github.com/pubkey/rxdb/pull/6115) solved at [#6353](https://github.com/pubkey/rxdb/pull/6353)
