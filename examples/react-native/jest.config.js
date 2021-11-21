module.exports = {
    preset: 'jest-expo',
    transform: {},
    globals: {
        'ts-jest': {
            babelConfig: true,
        },
    },
    testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
    cacheDirectory: '.jest/cache',
    testEnvironment: 'jsdom',
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|pouchdb-adapter-asyncstorage|@react-native)/)',
    ],
};
