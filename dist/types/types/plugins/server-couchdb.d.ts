export type CouchDBServerResponse = {
    app: any;
    pouchApp: any;
    server: any;
};


/**
 * Options that can be passed to express-pouchdb
 * @link https://github.com/pouchdb/pouchdb-server#api
 */
export type PouchDBExpressServerOptions = {
    // a path to the configuration file to use. Defaults to './config.json'.
    configPath?: string;
    // a path to the log file to use. Defaults to './rxdb-server-log.txt' in the tmp folder of the os.
    logPath?: string;
    // If true (=default) the config file is not written to configPath but stored in memory.
    inMemoryConfig?: boolean;
    // determines which parts of the HTTP API express-pouchdb offers are enabled
    mode?: 'fullCouchDB' | 'minimumForPouchDB' | 'custom';
    // Sometimes the preprogrammed modes are insufficient for your needs
    overrideMode?: {
        // a javascript array that specifies parts to include on top of the ones specified by opts.mode
        include?: any[];
        // a javascript array that specifies parts to exclude from the ones specified by opts.mode
        exclude?: any[];
    };
};
