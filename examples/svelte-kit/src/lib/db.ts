import noteSchema from './noteSchema';
import { dev } from '$app/env';

const _create = async () => {
	// Imports are here so they don't run during SSR
	const { createRxDatabase, addRxPlugin } = await import('rxdb');
	const { addPouchPlugin, getRxStoragePouch } = await import('rxdb/plugins/pouchdb');

	await Promise.all([
		import('rxdb/plugins/query-builder').then((module) =>
			addRxPlugin(module.RxDBQueryBuilderPlugin)
		),
		import('rxdb/plugins/replication-couchdb').then((module) =>
			addRxPlugin(module.RxDBReplicationCouchDBPlugin)
		),
		import('rxdb/plugins/update').then((module) => addRxPlugin(module.RxDBUpdatePlugin)),
		import('rxdb/plugins/leader-election').then((module) =>
			addRxPlugin(module.RxDBLeaderElectionPlugin)
		),
		import('pouchdb-adapter-idb').then((PouchdbAdapterIdb) =>
			addPouchPlugin(PouchdbAdapterIdb)
		),
		import('pouchdb-adapter-http').then((PouchdbAdapterHttp) =>
			addPouchPlugin(PouchdbAdapterHttp)
		)
	]);

	/**
	 * to reduce the build-size,
	 * we use some modules in dev-mode only
	 */
	if (dev) {
		const { PouchDB } = await import('rxdb/plugins/pouchdb');
		await Promise.all([
			/**
			 * Enable the dev mode plugin
			 */
			import('rxdb/plugins/dev-mode').then((module) => addRxPlugin(module.RxDBDevModePlugin)),

			// we use the schema-validation only in dev-mode
			// this validates each document if it is matching the jsonschema
			import('rxdb/plugins/validate').then((module) =>
				addRxPlugin(module.RxDBValidatePlugin)
			),

			// enable debug to detect slow queries
			import('pouchdb-debug').then((module) => addPouchPlugin(module['default']))
		]);
		PouchDB.debug.enable('pouchdb:find');
	}
	// Create DB
	const db = await createRxDatabase({
		name: 'noteskit',
		storage: getRxStoragePouch('idb'),
		multiInstance: true
	});

	// create collections
	const collections = { notes: { schema: noteSchema } };
	await db.addCollections(collections);

	// Sync
	const syncURL = `http://${window.location.hostname}:5984/`;

	Object.keys(collections).forEach((name) => {
		db[name].syncCouchDB({
			remote: syncURL + name + '/',
			waitForLeadership: true
		});
	});

	return db;
};

// DB is shared singleton
let dbPromise;
export const getDb = () => {
	if (!dbPromise) dbPromise = _create();
	return dbPromise;
};
