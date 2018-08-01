export interface RxPlugin {
    readonly rxdb: true;
    prototypes?: {
        RxSchema?: Function,
        Crypter?: Function,
        RxDocument?: Function,
        RxQuery?: Function,
        RxCollection?: Function,
        RxDatabase?: Function
    };
    overwritable?: {
        validatePassword?: Function,
        createKeyCompressor?: Function,
        createLeaderElector?: Function,
        checkAdapter?: Function,
        tunnelErrorMessage?: Function
    };
    hooks?: {
        createRxDatabase?: Function,
        createRxCollection?: Function,
        preCreateRxSchema?: Function,
        createRxSchema?: Function,
        createRxQuery?: Function,
        createRxDocument?: Function,
        postCreateRxDocument?: Function,
        preCreatePouchDb?: Function,
        preMigrateDocument?: Function,
        postMigrateDocument?: Function
    }
}
