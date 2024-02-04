# RxDB Angular example

This is an example usage of RxDB with Angular.
It implements a simple heroes-list which can be filled by the user.
Also it uses **angular-universal** to enable server side rendering.

## Try it out
1. clone the whole [RxDB-repo](https://github.com/pubkey/rxdb)
2. go into project `cd rxdb`
3. run `npm install`
4. go to this folder `cd examples/angular`
5. run `npm run preinstall && npm install`
6. run `npm start`
7. Open [http://127.0.0.1:4200/](http://127.0.0.1:4200/) **IMPORTANT: do not use localhost**

## Important parts when using RxDB with angular:
- Make sure you have the `window` polyfills added that are needed for some plugins.
```ts
// in polyfills.ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
    nextTick: (fn, ...args) => setTimeout(() => fn(...args)),
};
```

- Make sure you have used the rxjs-zone.js patch otherwise the change detection will not work properly. For that you should put the following code into your `app.component.ts`:
```ts
//> app.component.ts
/**
 * IMPORTANT: RxDB creates rxjs observables outside of angulars zone
 * So you have to import the rxjs patch to ensure changedetection works correctly.
 * @link https://www.bennadel.com/blog/3448-binding-rxjs-observable-sources-outside-of-the-ngzone-in-angular-6-0-2.htm
 */
import 'zone.js/plugins/zone-patch-rxjs';
```


## Screenshot

![angular2](docfiles/angular2.gif)

Read more about using [RxDB as Angular Database](https://rxdb.info/articles/angular-database.html)
