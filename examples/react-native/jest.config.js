module.exports = {
    preset: 'jest-expo',
    transform: {
        '\\.js$': '<rootDir>/node_modules/react-native/jest/preprocessor.js',
    },
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|pouchdb-adapter-asyncstorage)/)'
    ]
};
