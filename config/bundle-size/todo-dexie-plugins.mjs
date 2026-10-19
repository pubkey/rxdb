/**
 * The todo app with the plugins that most apps add.
 */
import { addRxPlugin } from '../../plugins/core/index.mjs';
import { RxDBLeaderElectionPlugin } from '../../plugins/leader-election/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';
import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';

addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

await import('./todo-dexie.mjs');
