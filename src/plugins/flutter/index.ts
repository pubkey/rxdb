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
    setCustomDatabaseCreator,
    setCustomStorage
} from './flutter-handlers.ts';
import type {
    CreateRxDatabaseFunctionType,
    FlutterBridgeOptions
} from './flutter-types.ts';

export * from './flutter-types.ts';
export * from './flutter-bridge.ts';
export * from './flutter-sqlite.ts';
export {
    FLUTTER_DATABASES,
    FLUTTER_REPLICATIONS,
    FLUTTER_SUBSCRIPTIONS
} from './flutter-handlers.ts';

/**
 * Code of a custom bundle, like creating the RxDB Premium storage,
 * runs before startRxDBFlutterBridge() is called and may already log.
 * So the runtime is patched when this module is evaluated, but only
 * inside a runtime that was prepared by the rxdb Dart package.
 */
if (typeof (globalThis as any).__rxdbFlutterSend === 'function') {
    patchFlutterJavaScriptRuntime();
}

let started = false;

/**
 * Starts the bridge so that the rxdb Dart package can
 * communicate with RxDB inside of the JavaScript runtime.
 * The prebuilt bundle that ships with the Dart package calls this
 * without arguments and uses the SQLite trial storage.
 * In a custom bundle you can pass a different RxStorage,
 * like the RxDB Premium SQLite storage, or a function
 * that creates the RxDatabase.
 */
export function startRxDBFlutterBridge(
    options?: FlutterBridgeOptions | CreateRxDatabaseFunctionType
) {
    const useOptions: FlutterBridgeOptions = typeof options === 'function' ? { createDatabase: options } : (options || {});
    if (useOptions.storage) {
        setCustomStorage(useOptions.storage);
    }
    if (useOptions.createDatabase) {
        setCustomDatabaseCreator(useOptions.createDatabase);
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
