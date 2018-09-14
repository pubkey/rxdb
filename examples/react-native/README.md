# RxDB React example

This is an example usage of RxDB with React-native. It implements a simple heroes-list which can be filled by the user.

## Syncing

For database replication and syncing you will need to input a public ip address as the app simulators will have a different context for `localhost`. One simple way is to run a server locally and expose the port via [ngrok](https://ngrok.com/).

## Try it out

1. [follow installation instructions](https://facebook.github.io/react-native/docs/getting-started.html#content) to setup your react-native environment
1. clone the whole [RxDB-repo](https://github.com/pubkey/rxdb)
1. go into project `cd rxdb`
1. run `npm install`
1. go to this folder `cd examples/react-native`
1. run `npx yarn install`
1. run `npm start`
   * to run on ios or android specific emulators use `npm run ios` and `npm run android` respectively

## Screenshot

![Screenshot](docfiles/screenshot.png?raw=true)
![Android](docfiles/android.png?raw=true)
