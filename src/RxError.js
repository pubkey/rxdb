export function pluginMissing(key) {
    return new Error(`RxDB: plugin missing, please use RxDB.plugin(require(\'rxdb/${key}\'))`);
};

export default {
    pluginMissing
};
