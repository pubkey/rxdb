# RxDB Angular example

This is an example usage of RxDB with Angular.
It implements a simple heroes-list which can be filled by the user.
Also it uses **angular-universal** to enable server side rendering.

## Try it out
1. clone the whole [RxDB-repo](https://github.com/pubkey/rxdb)
2. go into project `cd rxdb`
3. run `npm install`
4. go to this folder `cd examples/angular`
5. run `npm install`
6. run `npm start`
7. Open [http://127.0.0.1:4200/](http://127.0.0.1:4200/) **IMPORTANT: do not use localhost**

## Important parts when using RxDB with angular:
- Make sure you have the `window` polyfills added that are needed for pouchdb
```ts
// in polyfills.ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```

- Make sure you have used the rxjs-zone.js patch otherwise the change detection will not work properly
```ts
// in polyfills.ts
import 'zone.js/dist/zone-patch-rxjs';
```


## Screenshot

![angular2](docfiles/angular2.gif)
