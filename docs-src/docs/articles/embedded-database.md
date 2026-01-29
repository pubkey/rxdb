---
title: Embedded Database, Real-time Speed - RxDB
slug: embedded-database.html
description: Unleash the power of embedded databases with RxDB. Explore real-time replication, offline access, and reactive queries for modern JavaScript apps.
---

# Using RxDB as an Embedded Database
In modern UI applications, efficient data storage is a crucial aspect for seamless user experiences. One powerful solution for achieving this is by utilizing an embedded database. In this article, we will explore the concept of an embedded database and delve into the benefits of using [RxDB](https://rxdb.info/) as an embedded database in UI applications. We will also discuss why RxDB stands out as a robust choice for real-time applications with embedded database functionality.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Embedded Database" width="220" />
    </a>
</center>

## What is an Embedded Database?
An embedded database refers to a client-side database system that is integrated directly within an application. It is designed to operate within the client environment, such as a web browser or a [mobile](./mobile-database.md) app. This approach eliminates the need for a separate database server and allows the database to run locally on the client device.

## Embedded Database in UI Applications
In the context of UI applications, an embedded database serves as a local data storage solution. It enables applications to efficiently manage data, facilitate real-time updates, and enhance performance. Let's explore some of the benefits of using an embedded database compared to a traditional server database:

- Replicating the database state becomes easier: Implementing real-time data synchronization and replication is simpler with an embedded database compared to complex REST routes. The embedded nature allows for efficient replication of the database state across multiple instances of the application.
- Using the database for caching: An embedded database can be utilized for caching frequently accessed data. This caching mechanism enhances performance and reduces the need for repeated network requests, resulting in faster data retrieval.
- Building real-time applications is easier with local data: By leveraging local data storage, real-time applications can easily update the user interface in response to data changes. This approach simplifies the development of real-time features and enhances the responsiveness of the application.
- Store local data with [encryption](../encryption.md): Embedded databases, like RxDB, offer the ability to store local data with encryption. This ensures that sensitive information remains protected even when stored locally on the client device.
- Data is accessible offline: With an embedded database, data remains accessible even when the application is offline. Users can continue to interact with the application and access their data seamlessly, irrespective of their internet connectivity.
- Faster initial application start time: Since the data is already stored locally, there is no need for initial data fetching from a remote server. This significantly reduces the application's startup time and allows users to engage with the application more quickly.
- Improved scalability with local queries: Embedded databases, such as RxDB, perform queries locally on the client device instead of relying on server round-trips. This reduces latency and enhances scalability, particularly when dealing with large datasets or high query volumes.
- Seamless integration with JavaScript frameworks: Embedded databases, including RxDB, integrate seamlessly with popular JavaScript frameworks like Angular, React.js, [Vue.js](./vue-database.md), and Svelte. This compatibility allows developers to leverage the capabilities of these frameworks while benefiting from embedded database functionality.
- Running queries locally has low latency: With an embedded database, queries are executed locally on the client device, resulting in minimal latency. This improves the overall performance and responsiveness of the application.
- Data is portable and always accessible by the user: Embedded databases enable data portability, allowing users to seamlessly transition between devices while maintaining their data and application state. This ensures that data is always accessible and available to the user.
- Using a [local database](./local-database.md) for state management: Instead of relying on additional state management libraries like Redux or NgRx, an embedded database can be used for local state management. This simplifies state management and ensures data consistency within the application.

## Why RxDB as an Embedded Database for Real-time Applications
RxDB is a JavaScript-based embedded database that offers numerous advantages for building real-time applications. Let's explore why RxDB is a compelling choice:

- [Observable Queries](../rx-query.md) (RxJS): RxDB leverages the power of Observables through RxJS, enabling developers to create queries that automatically update the user interface on data changes. This reactive approach simplifies UI updates and ensures real-time synchronization of data.
- [NoSQL JSON Documents](./json-database.md) for UIs: RxDB utilizes NoSQL (JSON) documents as its data model, aligning seamlessly with the requirements of modern UI development. JavaScript's native support for JSON objects makes NoSQL documents a natural fit for UI-driven applications.
- Better TypeScript Support Compared to SQL: RxDB's NoSQL approach provides excellent TypeScript support. The flexibility of working with JSON objects enables robust typing and enhanced development experiences, ensuring type safety and reducing runtime errors.
- [Observable Document Fields](../rx-document.md): RxDB allows developers to observe individual fields within documents. This granularity enables efficient tracking of specific data changes and facilitates targeted UI updates, enhancing performance and responsiveness.
- Made in JavaScript, Optimized for JavaScript Applications: Being built entirely in JavaScript, RxDB is optimized for JavaScript applications. It leverages JavaScript's capabilities and integrates seamlessly with JavaScript frameworks and libraries, making it a natural choice for JavaScript developers.
- Optimized Observed Queries with the [EventReduce Algorithm](https://github.com/pubkey/event-reduce): RxDB incorporates the EventReduce algorithm to optimize observed queries. This algorithm reduces the number of emitted events during query execution, resulting in enhanced query performance and reduced overhead.
- Built-in Multi-tab Support: RxDB provides built-in multi-tab support, allowing multiple instances of an application to share and synchronize data seamlessly. This feature enables collaborative and real-time scenarios across multiple browser tabs or windows.
- Handling of Schema Changes across Multiple Client Devices: With RxDB, handling schema changes across multiple client devices becomes straightforward. RxDB's schema [migration capabilities](../migration-schema.md) ensure that applications can seamlessly adapt to evolving data structures, providing a consistent experience across different devices.
- Storing Documents Compressed: RxDB offers the ability to store documents in a compressed format. This reduces the storage footprint and improves performance, especially when dealing with large datasets.
- Flexible Storage Layer and Cross-Platform Compatibility: RxDB provides a flexible storage layer that can be reused across various platforms, including [Electron.js](../electron-database.md), [React Native](../react-native-database.md), hybrid apps (via Capacitor.js), and browsers. This cross-platform compatibility simplifies development and enables code reuse across different environments.
- Replication Algorithm for Backend Compatibility: RxDB's replication algorithm is open-source and can be made compatible with various backend solutions, such as self-hosted servers, Firebase, [CouchDB](../replication-couchdb.md), NATS, WebSockets, and more. This flexibility allows developers to choose their preferred backend infrastructure while benefiting from RxDB's embedded database capabilities.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Embedded Database" width="220" />
    </a>
</center>


## Follow Up
To further explore [RxDB](https://rxdb.info/) and leverage its capabilities as an embedded database, the following resources can be helpful:

- [RxDB GitHub Repository](https://github.com/pubkey/rxdb): Visit the official GitHub repository of RxDB to access the source code, documentation, and community support.
- [RxDB Quickstart](../quickstart.md): Get started quickly with RxDB by following the provided quickstart guide, which offers step-by-step instructions for setting up and using RxDB in your projects.

By utilizing [RxDB](https://rxdb.info/) as an embedded database in UI applications, developers can harness the power of efficient data management, real-time updates, and enhanced user experiences. RxDB's features and benefits make it a compelling choice for building modern, responsive, and scalable applications.
