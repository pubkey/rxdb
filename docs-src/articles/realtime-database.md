# What is a realtime database?

I have been building [RxDB](https://rxdb.info/), a NoSQL **realtime** JavaScript database for many years.
Often people get confused by the word **realtime database**, because the word **realtime** is so vaguely defined that it can mean everything and nothing at the same time.

In this article we will explore what a realtime database is, and more important, what it is not.


<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="JavaScript Realtime Database" width="150">
    </a>
</center>

## Realtime as in **realtime computing**

When "normal" developers hear the word "realtime", they think of **Real-time computing (RTC)**. Real-time computing is a type of computer processing that **guarantees specific response times** for tasks or events, crucial in applications like industrial control, automotive systems, and aerospace. It relies on specialized operating systems (RTOS) to ensure predictability and low latency. Hard real-time systems must never miss deadlines, while soft real-time systems can tolerate occasional delays. Real-time responses are often understood to be in the order of milliseconds, and sometimes microseconds.

For example, real-time computing in car airbags involves sensors detecting a collision's force, rapid processing of this data, and immediate decision-making to inflate the airbags within milliseconds to protect occupants during a crash. This quick response is critical for passenger safety. Therefore the chip that controls the airbag has to **guarantee a specific response time**, it has to respond in "realtime".

But when people talk about **realtime databases**, especially in the web-development world, they almost never mean realtime, as in **realtime computing**, they mean something else.
In fact, with any programming language that run on end users devices, it is not even possible to built a "real" realtime database. A programm, like a JavaScript ([browser](./browser-database.md) or [Node.js](../nodejs-database.md)) process, can be halted by the operating systems task manager at any time and therefore it will never be able to guarantee specific response times. To build a realtime computing database, you would need a realtime capable operating system.

## Realtime as in **realtime replication**

When talking about realtime databases, most people refer to realtime, as in realtime replication.
Often they mean a very specific product which is the **Firebase Realtime Database**.


<p align="center">
  <img src="../files/alternatives/firebase.svg" alt="firebase realtime replication" width="100" />
</p>

In the context of the Firebase Realtime Database, "realtime" means that data changes are synchronized and delivered to all connected clients or devices as soon as they occur, typically within milliseconds. This means that when any client updates, adds, or removes data in the database, all other clients that are connected to the same database instance receive those updates instantly, without the need for manual polling or frequent HTTP requests.

In short, when replicating data between databases, instead of polling, we use a [websocket connection](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API) to live-stream all changes between the server and the clients, this is labeled as "realtime database". A similar thing can be done with RxDB and the [RxDB Replication Plugins](../replication.md).

<p align="center">
    <a href="https://rxdb.info/replication.html">
        <img src="../files/database-replication.png" alt="database replication" width="100" />
    </a>
</p>

## Realtime as in **realtime applications**

In the context of realtime client-side applications, "realtime" refers to the immediate or near-instantaneous processing and response to events or data inputs. When data changes, the application must directly update to reflect the new data state, without any user interaction or delay. Notice that the change to the data could have come from any source, like a user action, an operation in another browser tab, or even an operation from another device that has been replicated to the client.

<p align="center">
  <img src="../files/multiwindow.gif" alt="realtime applications" width="400" />
</p>

In contrast to push-pull based databases, like a MySQL or MongoDB server, a realtime database contains **features which make it easy to build realtime applications**. For example with RxDB you can not only fetch query results once, but instead you can subscribe to a query and direclty update the HTML dom tree whenever the query has a new result set:

```ts
await db.heroes.find({
  selector: {
    healthpoints: {
      $gt: 0
    }
  }
})
.$ // the $ returns an observable that emits each time the result set of the query changes
.subscribe(aliveHeroes => {
    // update the html list each time the query results change
    const newContent = aliveHeroes.map(doc => '<li>' + doc.name + '</li>');
    document.getElementById('#myList').innerHTML = newContent;
});

// you can even subscribe to fields of any RxDB document
myDocument.firstName$.subscribe(newName => console.log('name is: ' + newName));
```

A good realtime applications is designed to handle and provide feedback or results in a timeframe that is imperceptible to the human senses, typically within milliseconds to microseconds. Ideally a change to the data must be processed in less than **16 milliseconds** (1 second / 60 frames = 16.66ms) so that the human user can not perceive a time delay from input to re-render. RxDB uses the [EventReduce algorithm](https://github.com/pubkey/event-reduce) to process changes in CPU, in even shorted timespans than 16ms. But it will never be able to "guarantee" any response time limits, like a "realtime computing database" could do.




## Follow Up

- Try out the [RxDB Quickstart](https://rxdb.info/quickstart.html)
- Read more about the [RxDB realtime replication protocol](../replication.md)
- Join the [RxDB Chat](https://rxdb.info/chat.html)




