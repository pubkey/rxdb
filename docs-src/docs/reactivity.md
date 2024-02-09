---
title: Signals $ Co. - Custom reactivity adapters instead of RxJS Observables
slug: reactivity.html
---

# Signals $ Co. - Custom reactivity adapters instead of RxJS Observables

RxDB interally uses the [rxjs library](https://rxjs.dev/) for observables and streams. All functionalities of RxDB that expose values  that change over time, return a rxjs Observable that allows you to observe the values and update your UI accordingly.

However there are many reasons to use other reactivity libraries that use a different datatype to represent changing values. For example when you use signals in angular or react, the template refs of vue or state libraries like MobX and redux.

RxDB allows you to pass a custom reactivity factory on [RxDatabase](./rx-database.md) creation so that you can easily access values wrapped with your custom datatype.





## Functions that support custom reactivity

RxDocument.get$$();
RxDocument.$$;
RxDocument.deleted$$;
RxDocument.foobar$$;
RxLocalDocument.get$$()
RxQuery.$$


## Limitations

- Custom reactivity is in beta mode, it might have breaking changes without a major RxDB release.
- TypeScript typings are not fully implemented, make a PR if you need that.
- Currently not all observables things in RxDB are implemented to work with custom reactivity. Please make a PR if you have the need for any missing one.
