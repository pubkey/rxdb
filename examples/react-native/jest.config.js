const transformIgnorePatterns = [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|mingo)"
  ];
  
  module.exports = {
    projects: [
      {
        preset: "jest-expo/ios",
        transformIgnorePatterns,
      },
      {
        preset: "jest-expo/android",
        transformIgnorePatterns,
      },
    ],
  
    testRegex: "(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$",
  };
  