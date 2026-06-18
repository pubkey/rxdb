const transformIgnorePatterns = [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|mingo)"
  ];
  
  module.exports = {
    preset: "@react-native/jest-preset",
    transformIgnorePatterns,
    testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
    moduleNameMapper: {
      '^expo-crypto$': '<rootDir>/__mocks__/expo-crypto.js',
      '^expo-sqlite$': '<rootDir>/__mocks__/expo-sqlite.js',
    },
  };
  