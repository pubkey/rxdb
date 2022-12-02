module.exports = {
    "projects": [
       { "preset": "jest-expo/ios" },
       { "preset": "jest-expo/android" }
    ],
    transform: {},
    globals: {
        'ts-jest': {
            babelConfig: true,
        },
    },
    testRegex: '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$',
    transformIgnorePatterns: [
        "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
    ],
};
