// Mock for expo-crypto to avoid expo-modules-core native module initialization in Jest
const crypto = require('crypto');

module.exports = {
    digest: async (algorithm, data) => {
        const alg = algorithm.replace('-', '').toLowerCase();
        return crypto.createHash(alg).update(Buffer.from(data)).digest();
    },
    getRandomValues: (array) => crypto.getRandomValues(array),
    randomUUID: () => crypto.randomUUID(),
};
