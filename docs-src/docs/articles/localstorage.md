---
title: Using localStorage in Modern Applications - A Comprehensive Guide
slug: localstorage.html
description: This guide explores localStorage in JavaScript web apps, detailing its usage, limitations, and alternatives like IndexedDB and AsyncStorage.
---


# Using localStorage in Modern Applications: A Comprehensive Guide

When it comes to client-side storage in web applications, the localStorage API stands out as a simple and widely supported solution. It allows developers to store key-value pairs directly in a user's browser. In this article, we will explore the various aspects of the localStorage API, its advantages, limitations, and alternative storage options available for modern applications.


<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Database" width="220" />
    </a>
</center>


## What is the localStorage API?

The localStorage API is a built-in feature of web browsers that enables web developers to store small amounts of data persistently on a user's device. It operates on a simple key-value basis, allowing developers to save strings, numbers, and other simple data types. This data remains available even after the user closes the browser or navigates away from the page. The API provides a convenient way to maintain state and store user preferences without relying on server-side storage.

## Exploring local storage Methods: A Practical Example

Let's dive into some hands-on code examples to better understand how to leverage the power of localStorage. The API offers several methods for interaction, including setItem, getItem, removeItem, and clear. Consider the following code snippet:

```js
// Storing data using setItem
localStorage.setItem('username', 'john_doe');

// Retrieving data using getItem
const storedUsername = localStorage.getItem('username');

// Removing data using removeItem
localStorage.removeItem('username');

// Clearing all data
localStorage.clear();
```

## Storing Complex Data in JavaScript with JSON Serialization

While js localStorage excels at handling simple key-value pairs, it also supports more intricate data storage through JSON serialization. By utilizing JSON.stringify and JSON.parse, you can store and retrieve structured data like objects and arrays. Here's an example of storing a document:

```js
const user = {
  name: 'Alice',
  age: 30,
  email: 'alice@example.com'
};

// Storing a user object
localStorage.setItem('user', JSON.stringify(user));

// Retrieving and parsing the user object
const storedUser = JSON.parse(localStorage.getItem('user'));
```

## Understanding the Limitations of local storage

Despite its convenience, localStorage does come with a set of limitations that developers should be aware of:

- **Non-Async Blocking API**: One significant drawback is that js localStorage operates as a non-async blocking API. This means that any operations performed on localStorage can potentially block the main thread, leading to slower application performance and a less responsive user experience.
- **Limited Data Structure**: Unlike more advanced databases, localStorage is limited to a simple key-value store. This restriction makes it unsuitable for storing complex data structures or managing relationships between data elements.
- **Stringification Overhead**: Storing [JSON data](./json-based-database.md) in localStorage requires stringifying the data before storage and parsing it when retrieved. This process introduces performance overhead, potentially slowing down operations by up to 10 times.
- **Lack of Indexing**: localStorage lacks indexing capabilities, making it challenging to perform efficient searches or iterate over data based on specific criteria. This limitation can hinder applications that rely on complex data retrieval.
- **Tab Blocking**: In a multi-tab environment, one tab's localStorage operations can impact the performance of other tabs by monopolizing CPU resources. You can reproduce this behavior by opening [this test file](https://pubkey.github.io/client-side-databases/database-comparison/index.html) in two browser windows and trigger localstorage inserts in one of them. You will observe that the indication spinner will stuck in both windows.
- **Storage Limit**: Browsers typically impose a storage limit of [around 5 MiB](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria#web_storage) for each origin's localStorage.

## Reasons to Still Use localStorage

### Is localStorage Slow?

Contrary to concerns about performance, the localStorage API in JavaScript is surprisingly fast when compared to alternative storage solutions like [IndexedDB or OPFS](./localstorage-indexeddb-cookies-opfs-sqlite-wasm.md). It excels in handling small key-value assignments efficiently. Due to its simplicity and direct integration with browsers, accessing and modifying localStorage data incur minimal overhead. For scenarios where quick and straightforward data storage is required, localStorage remains a viable option. For example RxDB uses localStorage in the [localStorage meta optimizer](../rx-storage-localstorage-meta-optimizer.md) to manage simple key values pairs while storing the "normal" documents inside of another storage like IndexedDB.

## When Not to Use localStorage

While localStorage offers convenience, it may not be suitable for every use case. Consider the following situations where alternatives might be more appropriate:

- **Data Must Be Queryable**: If your application relies heavily on querying data based on specific criteria, localStorage might not provide the necessary querying capabilities. Complex data retrieval might lead to inefficient code and slow performance.
- **Big JSON Documents**: Storing large JSON documents in localStorage can consume a significant amount of memory and degrade performance. It's essential to assess the size of the data you intend to store and consider more robust solutions for handling substantial datasets.
- **Many Read/Write Operations**: Excessive read and write operations on localStorage can lead to performance bottlenecks. Other storage solutions might offer better performance and scalability for applications that require frequent data manipulation.
- **Lack of Persistence**: If your application can function without persistent data across sessions, consider using in-memory data structures like `new Map()` or `new Set()`. These options offer speed and efficiency for transient data.


## What to use instead of the localStorage API in JavaScript

### localStorage vs IndexedDB

While **localStorage** serves as a reliable storage solution for simpler data needs, it's essential to explore alternatives like **IndexedDB** when dealing with more complex requirements. **IndexedDB** is designed to store not only key-value pairs but also JSON documents. Unlike localStorage, which usually has a storage limit of around 5-10MB per domain, IndexedDB can handle significantly larger datasets. IndexDB with its support for indexing facilitates efficient querying, making range queries possible. However, it's worth noting that IndexedDB lacks observability, which is a feature unique to localStorage through the `storage` event. Also, 
complex queries can pose a challenge with IndexedDB, and while its performance is acceptable, IndexedDB can be [too slow](../slow-indexeddb.md) for some use cases.

```js
// localStorage can observe changes with the storage event.
// This feature is missing in IndexedDB
addEventListener("storage", (event) => {});
```

For those looking to harness the full power of IndexedDB with added capabilities, using wrapper libraries like [RxDB](https://rxdb.info/) is recommended. These libraries augment IndexedDB with features such as complex queries and observability, enhancing its usability for modern applications by providing a real database instead of only a key-value store.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="RxDB" width="220" />
    </a>
</center>

In summary when you compare IndexedDB vs localStorage, IndexedDB will win at any case where much data is handled while localStorage has better performance on small key-value datasets.


### File System API (OPFS)
Another intriguing option is the OPFS (File System API). This API provides direct access to an origin-based, sandboxed filesystem which is highly optimized for performance and offers in-place write access to its content.
OPFS offers impressive performance benefits. However, working with the OPFS API can be complex, and it's only accessible within a **WebWorker**. To simplify its usage and extend its capabilities, consider using a wrapper library like [RxDB's OPFS RxStorage](../rx-storage-opfs.md), which builds a comprehensive database on top of the OPFS API. This abstraction allows you to harness the power of the OPFS API without the intricacies of direct usage.

### localStorage vs Cookies
Cookies, once a primary method of client-side data storage, have fallen out of favor in modern web development due to their limitations. While they can store data, they are about **100 times slower** when compared to the localStorage API. Additionally, cookies are included in the HTTP header, which can impact network performance. As a result, cookies are not recommended for data storage purposes in contemporary web applications.

### localStorage vs WebSQL
WebSQL, despite offering a SQL-based interface for client-side data storage, is a **deprecated technology** and should be avoided. Its API has been phased out of modern browsers, and it lacks the robustness of alternatives like IndexedDB. Moreover, WebSQL tends to be around 10 times slower than IndexedDB, making it a suboptimal choice for applications that demand efficient data manipulation and retrieval.

### localStorage vs sessionStorage
In scenarios where data persistence beyond a session is unnecessary, developers often turn to sessionStorage. This storage mechanism retains data only for the duration of a tab or browser session. It survives page reloads and restores, providing a handy solution for temporary data needs. However, it's important to note that sessionStorage is limited in scope and may not suit all use cases.

### AsyncStorage for React Native
For React Native developers, the [AsyncStorage API](https://reactnative.dev/docs/asyncstorage) is the go-to solution, mirroring the behavior of localStorage but with asynchronous support. Since not all JavaScript runtimes support localStorage, AsyncStorage offers a seamless alternative for data persistence in React Native applications.

### `node-localstorage` for Node.js

Because native localStorage is absent in the **Node.js** JavaScript runtime, you will get the error `ReferenceError: localStorage is not defined` in Node.js or node based runtimes like Next.js. The [node-localstorage npm package](https://github.com/lmaccherone/node-localstorage) bridges the gap. This package replicates the browser's localStorage API within the Node.js environment, ensuring consistent and compatible data storage capabilities.

## localStorage in browser extensions

While browser extensions for chrome and firefox support the localStorage API, it is not recommended to use it in that context to store extension-related data. The browser will clear the data in many scenarios like when the users clear their browsing history.

Instead the [Extension Storage API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage#properties) should be used for browser extensions.
In contrast to localStorage, the storage API works `async` and all operations return a Promise. Also it provides automatic sync to replicate data between all instances of that browser that the user is logged into. The storage API is even able to storage JSON-ifiable objects instead of plain strings.

```ts
// Using the storage API in chrome

await chrome.storage.local.set({ foobar: {nr: 1} });

const result = await chrome.storage.local.get('foobar');
console.log(result.foobar); // {nr: 1}
```

## localStorage in Deno and Bun

The **Deno** JavaScript runtime has a working localStorage API so running `localStorage.setItem()` and the other methods, will just work and the locally stored data is persisted across multiple runs.

**Bun** does not support the localStorage JavaScript API. Trying to use `localStorage` will error with `ReferenceError: Can't find variable: localStorage`. To store data locally in Bun, you could use the `bun:sqlite` module instead or directly use a in-JavaScript database with Bun support like [RxDB](https://rxdb.info/).


## Conclusion: Choosing the Right Storage Solution
In the world of modern web development, **localStorage** serves as a valuable tool for lightweight data storage. Its simplicity and speed make it an excellent choice for small key-value assignments. However, as application complexity grows, developers must assess their storage needs carefully. For scenarios that demand advanced querying, complex data structures, or high-volume operations, alternatives like IndexedDB, wrapper libraries with additional features like [RxDB](../), or platform-specific APIs offer more robust solutions. By understanding the strengths and limitations of various storage options, developers can make informed decisions that pave the way for efficient and scalable applications.


## Follow up

- Learn how to store and query data with RxDB in the [RxDB Quickstart](../quickstart.md)
- [Why IndexedDB is slow and how to fix it](../slow-indexeddb.md)
- [RxStorage performance comparison](../rx-storage-performance.md)
