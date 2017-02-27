
#terminal 1
nohup android avd &
adb logcat *:S ReactNative:V ReactNativeJS:V

# terminal 2
npm start -- --reset-cache

#terminal 3
react-native run-android
