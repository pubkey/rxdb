// Mock for expo-sqlite to avoid expo-modules-core native module initialization in Jest
// Tests use STORAGE_MEMORY so no actual SQLite is needed
module.exports = {
    openDatabaseAsync: jest.fn(),
    openDatabaseSync: jest.fn(),
};
