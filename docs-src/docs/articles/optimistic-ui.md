---
title: Building an Optimistic UI with RxDB
slug: optimistic-ui.html
description: Learn how to build an Optimistic UI with RxDB for instant and reliable UI updates on user interactions
---


# Building an Optimistic UI with RxDB

An **Optimistic User Interface (UI)** is a design pattern that provides instant feedback to the user by **assuming** that an operation or server call will succeed. Instead of showing loading spinners or waiting for server confirmations, the UI immediately reflects the user's intended action and later reconciles the displayed data with the actual server response. This approach drastically improves perceived performance and user satisfaction.

## Benefits of an Optimistic UI

Optimistic UIs offer a host of advantages, from improving the user experience to streamlining the underlying infrastructure. Below are some key reasons why an optimistic approach can revolutionize your application's performance and scalability.

### Better User Experience with Optimistic UI
- **No loading spinners, [near-zero latency](./zero-latency-local-first.md)**: Users perceive their actions as instant. Any actual network delays or slow server operations can be handled behind the scenes.
- **Offline capability**: Optimistic UI pairs perfectly with offline-first apps. Users can continue to interact with the application even when offline, and changes will be synced automatically once the network is available again.

<p align="center">
  <img src="/files/loading-spinner-not-needed.gif" alt="loading spinner not needed" width="300" />
</p>

### Better Scaling and Easier to Implement
- **Fewer server endpoints**: Instead of sending a separate HTTP request for every single user interaction, you can batch updates and sync them in bulk.
- **Less server load**: By handling changes locally and syncing in batches, you reduce the volume of server round-trips.
- **Automated error handling**: If a request fails or a document is in conflict, RxDB's [replication](../replication.md) mechanism can seamlessly retry and resolve conflicts in the background, without requiring a separate endpoint or manual user intervention.


<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB Database" width="220" />
    </a>
</center>

## Building Optimistic UI Apps with RxDB

Now that we know what an optimistic UI is, lets build one with RxDB.

### Local Database: The Backbone of an Optimistic UI

A local database is the heart of an Optimistic UI. With RxDB, **all application state** is stored locally, ensuring seamless and instant updates. You can choose from multiple storage backends based on your runtime - check out [RxDB Storage Options](../rx-storage.md) to see which engines (IndexedDB, SQLite, or custom) suit your environment best.

- **Instant Writes**: When users perform an action (like clicking a button or submitting a form), the changes are written directly to the local RxDB database. This immediate local write makes the UI feel snappy and removes the dependency on instantaneous server responses.

- [Offline-First](../offline-first.md): Because data is managed locally, your app continues to operate smoothly even without an internet connection. Users can view, create, and update data at any time, assured that changes will sync automatically once they're back online.





### Real-Time UI Changes on Updates

RxDB's core is built around observables that react to any state changes - whether from local writes or incoming replication from the server.

- **Automatic UI refresh**: Any query or document subscription in RxDB automatically notifies your UI layer when data changes. There's no need to manually poll or refetch.
- **Cross-tab updates**: If you have the same RxDB database open in multiple [browser](./browser-database.md) tabs, changes in one tab instantly propagate to the others.

<p align="center">
  <img src="/files/multiwindow.gif" alt="RxDB multi tab" width="450" />
</p>

- **Event-Reduce Algorithm**: Under the hood, RxDB uses the [event-reduce algorithm](https://github.com/pubkey/event-reduce) to minimize overhead. Instead of re-running expensive queries, RxDB calculates the smallest possible updates needed to keep query results accurate - further boosting real-time performance.


### Replication with a Server

While local storage is key to an Optimistic UI, most applications ultimately need to sync with a remote back end. RxDB offers a [powerful replication system](../replication.md) that can sync your local data with virtually any server/database in the background:
- **Incremental and real-time**: RxDB continuously pushes local changes to the server when a network is available and fetches server updates as they happen.
- **Conflict resolution**: If changes happen offline or multiple clients update the same data, RxDB detects conflicts and makes it straightforward to resolve them.
- **Flexible transport**: Beyond simple HTTP polling, you can incorporate WebSockets, Server-Sent Events (SSE), or other protocols for instant, server-confirmed changes broadcast to all connected clients. See [this guide](./websockets-sse-polling-webrtc-webtransport.md) to learn more.

By combining local-first data handling with real-time synchronization, RxDB delivers most of what an Optimistic UI needs - right out of the box. The result is a seamless user experience where interactions never feel blocked by slow networks, and any conflicts or final validations are quietly handled in the background.

<p align="center">
  <img src="/files/animations/realtime.gif" alt="realtime ui updates" width="700" />
</p>

#### Handling Offline Changes and Conflicts
- **Offline-first approach**: All writes are initially stored in the local database. When connectivity returns, RxDB's replication automatically pushes changes to the server.
- **Conflict resolution**: If multiple clients edit the same documents while offline, conflicts are automatically detected and can be resolved gracefully (more on conflicts below).

#### WebSockets, SSE, or Beyond


For truly real-time communication - where server-confirmed changes instantly reach all clients - you can go beyond simple HTTP polling. Use WebSockets, Server-Sent Events (SSE), or other streaming protocols to broadcast updates the moment they occur. This pattern excels in scenarios like chats, collaborative editors, or dynamic dashboards.

To learn more about these protocols and their integration with RxDB, check out [this guide](./websockets-sse-polling-webrtc-webtransport.md).


## Optimistic UI in Various Frameworks

### Angular Example
<center>
        <img src="../files/icons/angular.svg" alt="Angular" width="80" />
</center>


[Angular](./angular-database.md)'s `async` pipe works smoothly with RxDB's observables. Suppose you have a `myCollection` of documents, you can directly subscribe in the template:

```html
<ul *ngIf="(myCollection.find().$ | async) as docs">
  <li *ngFor="let doc of docs">
    {{ doc.name }}
  </li>
</ul>
```
This snippet:

- Subscribes to `myCollection.find().$`, which emits live updates whenever [documents](../rx-document.md) in the [collection](../rx-collection.md) change.
- Passes the emitted array of documents into docs.
- Renders each document in a list item, instantly reflecting any changes.

### React Example
<center>
        <img src="../files/icons/react.svg" alt="React" width="80" />
</center>


In [React](./react-database.md), you can utilize signals or other state management tools. For instance, if we have an [RxDB extension](../reactivity.md) that exposes a **signal**:

```tsx
import React from 'react';

function MyComponent({ myCollection }) {
  // .find().$$ provides a signal that updates whenever data changes
  const docsSignal = myCollection.find().$$;

  return (
    <ul>
      {docs.map((doc) => (
        <li key={doc.id}>{doc.name}</li>
      ))}
    </ul>
  );
}

export default MyComponent;
```

When you call `docsSignal.value` or use a hook like useSignal, it pulls the latest value from the [RxDB query](../rx-query.md). Whenever the collection updates, the signal emits the new data, and React re-renders the component instantly.



## Downsides of Optimistic UI Apps

While Optimistic UIs feel snappy, there are some caveats:

- **Conflict Resolution**:
With an optimistic approach, multiple offline devices might edit the same data. When syncing back, conflicts occur that must be merged. RxDB uses [revisions](../transactions-conflicts-revisions.md) to detect and handle these conflicts.

- **User Confusion**:
Users may see changes that haven't yet been confirmed by the server. If a subsequent server validation fails, the UI must revert to a previous state. Clear visual feedback or user notifications help reduce confusion.

- **Server Compatibility**:
The server must be capable of storing and returning revision metadata (for instance, a timestamp or versioning system). Check out RxDB's [replication docs](../replication.md) for details on how to structure your back end.

- **Storage Limits**:
Storing data in the client has practical [size limits](./indexeddb-max-storage-limit.md). [IndexedDB](../rx-storage-indexeddb.md) or other client-side storages have constraints (though usually quite large). See [storage comparisons](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md).


## Conflict Resolution Strategies
- **Last Write to Server Wins**:
A simplest-possible method: whatever update reaches the server last overrides previous data. Good for non-critical data like “like" counts or ephemeral states.
- **Revision-Based Merges**:
Use revision numbers or timestamps to track concurrent edits. Merge them intelligently by combining fields or choosing the latest sub-document changes. This is ideal for collaborative apps where you don't want to overwrite entire records.
- **User Prompts**:
In certain workflows (e.g., shipping forms, e-commerce checkout), you may need to notify the user about conflicts and let them choose which version to keep.
- **First Write to Server Wins (RxDB Default)**:
RxDB's default approach is to let the first successful push define the latest version. Any incoming push with an outdated revision triggers a conflict that must be resolved on the client side. Learn more at [here](../transactions-conflicts-revisions.md).


## When (and When Not) to Use Optimistic UI
- When to Use
  - [Real-time interactions](./realtime-database.md) like chat apps, social feeds, or “Likes."
Situations where high success rates of operations are expected (most writes don't fail).
  - Apps that need an [offline-first approach](../offline-first.md) or handle intermittent connectivity gracefully.

- When Not to Use
  - Large, complex transactions with high failure rates.
  - Scenarios requiring heavy server validations or approvals (for example, financial transactions with complex rules).
  - Workflows where immediate feedback could mislead users about an operation's success probability.

- Assessing Risk
  - Consider the likelihood that a user's action might fail. If it's very low, optimistic UI is often best.
  - If frequent failures or complex validations occur, consider a hybrid approach: partial optimistic updates for some actions, while more critical operations rely on immediate server confirmation.

## Follow Up

Ready to start building your own Optimistic UI with RxDB? Here are some next steps:

1. **Do the [RxDB Quickstart](https://rxdb.info/quickstart.html)**
   If you're brand new to RxDB, the quickstart guide will walk you through installation and setting up your first project.

2. **Check Out the Demo App**
   A live [RxDB Quickstart Demo](https://pubkey.github.io/rxdb-quickstart/) showcases optimistic updates and real-time syncing. Explore the code to see how it works.

3. **Star the GitHub Repo**
   Show your support for RxDB by starring the [RxDB GitHub Repository](https://github.com/pubkey/rxdb).

By combining RxDB's powerful offline-first capabilities with the principles of an Optimistic UI, you can deliver snappy, near-instant user interactions that keep your users engaged - no matter the network conditions. Get started today and give your users the experience they deserve!
