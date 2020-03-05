module.exports = {
    preset: 'jest-expo',
    transform: {},
    transformIgnorePatterns: [
        'node_modules/(?!(react-native|pouchdb-adapter-asyncstorage)/)'
    ]
};
