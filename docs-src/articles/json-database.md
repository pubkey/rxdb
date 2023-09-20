# RxDB - JSON Database for JavaScript


Storing data as **JSON documents** in a **NoSQL** database is not just a trend; it's a practical choice. JSON data is highly compatible with various tools and is human-readable, making it an excellent fit for modern applications. JSON documents offer more flexibility compared to traditional SQL table rows, as they can contain nested data structures. This article introduces [RxDB](https://rxdb.info/), an open-source, flexible, performant, and battle-tested NoSQL JSON database specifically designed for **JavaScript** applications.

<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JSON Database" width="220">
    </a>
</center>

## Why Choose a JSON Database?
- **JavaScript Friendliness**: JavaScript, a prevalent language for web development, naturally uses JSON for data representation. Using a JSON database aligns seamlessly with JavaScript's native data format.

- **Compatibility**: JSON is widely supported across different programming languages and platforms. Storing data in JSON format ensures compatibility with a broad range of tools and systems. All modern programming ecosystems have packages to parse, validate and process JSON data.

- **Flexibility**: JSON documents can accommodate complex and nested data structures, allowing developers to store data in a more intuitive and hierarchical manner compared to SQL table rows. Nested data can be just stored in-document instead of having related tables.

- **Human-Readable**: JSON is easy to read and understand, simplifying debugging and data inspection tasks.

## Storage and Access Options for JSON Documents
When incorporating JSON documents into your application, you have several storage and access options to consider:

- **Local In-App Database with In-Memory Storage**: Ideal for lightweight applications or temporary data storage, this option keeps data in memory, ensuring fast read and write operations. However, data is not persisted beyond the current application session, making it suitable for temporary data storage. With RxDB, the [memory RxStorage](../rx-storage-memory.md) can be utilized to create an in-memory database.

- **Local In-App Database with Persistent Storage**: Suitable for applications requiring data retention across sessions. Data is stored on the user's device or inside of the Node.js application, offering persistence between application sessions. It balances speed and data retention, making it versatile for various applications. With RxDB, a whole range of persistend storages is available. As example, for browser there is the [IndexedDB storage](../rx-storage-indexeddb.md). For server side applications, the [Node.js Filesystem storage](../rx-storage-filesystem-node.md) can be used. There are [many more storages](../rx-storage.md) for React-Native, Flutter, Capacitors.js and others.

- **Server Database Connected to the Application**: For applications requiring data synchronization and accessibility from multiple processes, a server-based database is the preferred choice. Data is stored on a **remote server**, facilitating data sharing, synchronization, and accessibility across multiple processes. It's suitable for scenarios requiring centralized data management and enhanced security and backup capabilities on the server. RxDB supports the [FoundationDB](../rx-storage-foundationdb.md) and [MongoDB](../rx-storage-mongodb.md) as a remote database server.

## Compression Storage for JSON Documents

Compression storage for JSON documents is made effortless with RxDB's [key-compression plugin](../key-compression.md). This feature enables the efficient storage of compressed document data, reducing storage requirements while maintaining data integrity. Queries on compressed documents remain seamless, ensuring that your application benefits from both space-saving advantages and optimal query performance, making RxDB a compelling choice for managing JSON data efficiently. The compression happens inside of the [RxDatabase](../rx-database.md) and does not affect the API usage. The only limitation is that encrypted fields themself cannot be used inside a query.


## Schema Validation and Data Migration on Schema Changes
Storing JSON documents inside of an application, can cause a problem when the format of the data changes. Instead of having a single server where the data must be migrated, many client devices are out there that have to run a migration.
When your application's schema evolves, RxDB provides [migration strategies](../data-migration.md) to facilitate the transition, ensuring data consistency throughout schema updates.

**JSONSchema Validation Plugins**: RxDB supports multiple JSONSchema validation [plugins](../schema-validation.md), guaranteeing that only valid data is stored in the database.

## Store JSON with RxDB in Browser Applications
RxDB offers versatile storage solutions for browser-based applications:

- **Multiple Storage Plugins**: RxDB supports various storage backends, including [IndexedDB](../rx-storage-indexeddb.md), [Dexie.js](../rx-storage-dexie.md), [In-Memory](../rx-storage-memory.md), and [Loki.js](../rx-storage-lokijs.md), catering to a range of browser environments.

- **Observable Queries**: With RxDB, you can create observable [queries](../rx-query.md) that work seamlessly across multiple browser tabs, providing real-time updates and synchronization.

<p align="center">
  <img src="../files/multiwindow.gif" alt="multi tab support" width="450" />
</p>


## RxDB Database Performance

Certainly! Let's delve deeper into the performance aspects of RxDB when it comes to working with JSON data.

1. **Efficient Querying:** RxDB is engineered for rapid and efficient querying of JSON data. It employs a well-optimized indexing system that allows for lightning-fast retrieval of specific data points within your JSON documents. Whether you're fetching individual values or complex nested structures, RxDB's query performance is designed to keep your application responsive, even when dealing with large datasets.

2. **Scalability:** As your application grows and your JSON dataset expands, RxDB scales gracefully. Its performance remains consistent, enabling you to handle increasingly larger volumes of data without compromising on speed or responsiveness. This scalability is essential for applications that need to accommodate growing user bases and evolving data needs.

3. **Reduced Latency:** RxDB's streamlined data access mechanisms significantly reduce latency when working with JSON data. Whether you're reading from the database, making updates, or synchronizing data between clients and servers, RxDB's optimized operations help minimize the delays often associated with data access. Observed queris are optimized with the [EventReduce algorithm](https://github.com/pubkey/event-reduce) to provide nearly-instand UI updates on data changes.

## RxDB in Node.js
Node.js developers can also benefit from RxDB's capabilities. By integrating RxDB into your Node.js applications, you can harness the power of a NoSQL JSON database to efficiently manage your data on the server-side. RxDB's flexibility, performance, and essential features are equally valuable in server-side development. [Read more about RxDB+Node.js](../nodejs-database.md).

## RxDB to store JSON documents in React Native

For mobile app developers working with React Native, RxDB offers a convenient solution for handling JSON data. Whether you're building Android or iOS applications, RxDB's compatibility with JavaScript and its ability to work with JSON documents make it a natural choice for data management within your React Native apps. [Read more about RxDB+React-Native](../react-native-database.md).


## Using SQLite as a JSON Database
In some cases, you might want to use SQLite as a backend storage solution for your JSON data. RxDB can be configured [to work with SQLite](../rx-storage-sqlite.md), providing the benefits of both a relational database system and JSON document storage. This hybrid approach can be advantageous when dealing with complex data relationships while retaining the flexibility of JSON data representation.


## Follow up
In conclusion, RxDB is a powerful tool for JavaScript developers who need to work with JSON data. Its flexibility, performance, and support for essential features make it a valuable asset for a wide range of applications, whether you're building web applications in Node.js, mobile apps in React Native, or hybrid solutions using SQLite. With RxDB, you have the means to efficiently manage and leverage JSON data, taking your applications to the next level of data-driven functionality.

## Follow Up
To further explore RxDB and get started with using it in your frontend applications, consider the following resources:

- [RxDB Quickstart](../quickstart.md): A step-by-step guide to quickly set up RxDB in your project and start leveraging its features.
- [RxDB GitHub Repository](https://github.com/pubkey/rxdb): The official repository for RxDB, where you can find the code, examples, and community support.


By embracing [RxDB](https://rxdb.info/) as your **JSON database** solution, you can tap into the extensive capabilities of JSON data storage. This empowers your applications with offline accessibility, caching, enhanced performance, and effortless data synchronization. RxDB's focus on JavaScript and its robust feature set render it the perfect selection for frontend developers in pursuit of efficient and scalable data storage solutions.
