import { addRxPlugin } from '../../plugin.ts';
import { RXDB_VERSION } from '../utils/utils-rxdb-version.ts';
import { RxDBLocalDocumentsPlugin } from '../local-documents/index.ts';
import { RxDBMigrationSchemaPlugin } from '../migration-schema/index.ts';
import { RxDBJsonDumpPlugin } from '../json-dump/index.ts';
import { RxDBUpdatePlugin } from '../update/index.ts';
import {
    patchFlutterJavaScriptRuntime,
    receiveFromFlutter,
    sendToFlutter
} from './flutter-bridge.ts';
import {
    registerFlutterMethodHandlers,
    setCustomDatabaseCreator
} from './flutter-handlers.ts';
import type { CreateRxDatabaseFunctionType } from './flutter-types.ts';

export * from './flutter-types.ts';
export * from './flutter-bridge.ts';
export * from './flutter-sqlite.ts';
export {
    FLUTTER_DATABASES,
    FLUTTER_REPLICATIONS,
    FLUTTER_SUBSCRIPTIONS
} from './flutter-handlers.ts';

let started = false;

/**
 * Starts the bridge so that the rxdb Dart package can
 * communicate with RxDB inside of the JavaScript runtime.
 * The prebuilt bundle that ships with the Dart package calls this
 * without arguments. In a custom bundle you can pass a function
 * that creates the RxDatabase, for example to use additional plugins
 * or a different RxStorage.
 */
export function startRxDBFlutterBridge(createDB?: CreateRxDatabaseFunctionType) {
    if (createDB) {
        setCustomDatabaseCreator(createDB);
    }
    if (started) {
        return;
    }
    started = true;
    patchFlutterJavaScriptRuntime();
    addRxPlugin(RxDBLocalDocumentsPlugin);
    addRxPlugin(RxDBMigrationSchemaPlugin);
    addRxPlugin(RxDBJsonDumpPlugin);
    addRxPlugin(RxDBUpdatePlugin);
    registerFlutterMethodHandlers();
    (globalThis as any).__rxdbFlutterReceive = receiveFromFlutter;
    sendToFlutter({
        t: 'ready',
        version: RXDB_VERSION
    });
}
