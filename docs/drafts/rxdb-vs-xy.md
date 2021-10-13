<!--
TODOs:
  - Link to chat-app repo
-->

# A comparison of offline first databases

So after reading all these [pros](offline-first.md) and [cons](./downsides-of-offline-first.md) about offline first, you may have finally decided that your new application will be build of the offline first paradigm. Since you have landed here, on the [RxDB docs](https://rxdb.info/), I assume you want to build something with web technologies like a website, a PWA, an electron app, or a hybrid mobile app.

> Which tech stack?

Before you start looking up all possible libraries and evaluate them against each other, let me tell you what I know.
I have created and maintained RxDB for several years. I have written a master thesis where I compared all these technologies for realtime replicated offline first web applications. I have implemented the **exact same** chat app (like WhatsApp web) with all of these libraries. So yes, I can talk about this topic.

**Disclaimer:** This text your are reading at the moment, is written by [the maintainer](https://github.com/pubkey) of RxDB and published in the **opinions** section of the documentation. Everything written here is heavily biased. Take it as an opinion, not as the final truth. I am open to any discussion or pull requests to this document.



## The test application

To ensure we are looking at the same direction, let's say we want to implement a realtime, offline first, chat application.
Users can write messages with other users. And these messages get replicated to and from a server. Users can write messages while they are offline, and when they are online again, the missing data gets pulled from the server and the local changes are pushed. We build everything with the **angular** framework together with the given database library and deploy it as a website for the **browser** where the data is stored inside of **IndexedDB**. The app is developed in a way that makes it easy to switch out the database technologie. For that, each acccess to the data layer is abstracted into a `DataHandlerInterface`. We then implement the required methods for each library that make everything work.

<p align="center">
  <img src="../files/chat-app.png" alt="chat app like WhatsApp Web" width="350" />
</p>

## Evaluation criterias
Depending on the use case, there can be a big variation of factors to compare technologies. In this article only some metrics will be compared.

Some criterias are objectively measureable:

  - **Bundle Size:** How big is the final JavaScript bundle?
  - **First Meaningfull Paint:** How long does it take the website for the first full rendering?
  - **Initial Sync Time:** How long does it take for the first replication of all messages?
  - **Replication Latency:** How long does it take until the reciever of a message can view it?
  - **Query speed:** How fast do database queries run once or when observed?
  - **Storage Size:** How much disc space does stored data need?

Other criterias a subjective. It depends on who is looking on them:

  - **Configuration complexity:** How complex is it configure everything (frontend+backend)?
  - **Implementation speed:** How fast can our prototype chat app be implemented?
  - **Implementation complexity:** How complex is the implementation result?
  - **Documentation:** How good is the documentation of the technology?
  - **Interoperability:** How good does the evaluated technology work together with other technologies?


### Firebase & Firestore

### Meteor & Minimongo

### WatermelonDB


### AWS Datastore & AWS Amplify
### RethinkDB & Horizon

### PouchDB & CouchDB

### 

### Gundb



### What do you know?

Is there something missing? Is there something wrong?
 Submit a **pull request** to this markdown document and `make the world a better place`.
