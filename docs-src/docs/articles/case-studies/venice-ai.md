---
title: How Venice.ai Uses RxDB for Private, Local-First AI Chat
slug: venice-ai.html
description: Venice.ai keeps every conversation on the user's device instead of on its servers. See how Venice uses RxDB as one shared, reactive data layer for its React web app and React Native mobile app, and how it streams AI responses directly into the database.
---

# How Venice.ai Uses RxDB for Private, Local-First AI Chat

[Venice.ai](https://venice.ai/) is a private and uncensored AI platform for text chat, image generation, video, audio, characters and an [OpenAI-compatible API](https://docs.venice.ai/). It was founded in 2024 by Erik Voorhees and Jesse Proudman. In July 2026 Venice raised a **$65M Series A at a $1B valuation**, led by Dragonfly, and reported more than **3 million active users** and an annualized run-rate above **$70M** ([TechCrunch, July 1, 2026](https://techcrunch.com/2026/07/01/venice-ai-becomes-a-unicorn-with-65m-series-a-as-its-privacy-first-ai-platform-takes-off/)).

The interesting part for developers is where the data lives. Venice states that "your conversation history stays on your device" and that it never stores it on its servers ([venice.ai/privacy](https://venice.ai/privacy)). A product with millions of users and no server-side chat history needs a client-side database that can carry the whole app. Venice uses **RxDB** for that.

## The Requirement: No Conversations on the Server

Most chat products store every message in a backend database and render the UI from API responses. Venice made the opposite decision. Prompts are relayed to the model provider and the response comes back to the client, but the conversation itself is persisted only on the user's device ([How Venice handles your privacy](https://venice.ai/blog/how-venice-handles-your-privacy)).

This moves a lot of responsibility into the client:

- **The client is the source of truth.** Conversations, messages, characters, folders and settings have to be stored, queried and migrated locally.
- **The data model has to survive app updates.** When the schema changes, existing data on millions of devices has to be migrated without a server that can fix things later.
- **Multiple tabs have to stay consistent.** A user with two browser tabs open must not see two different versions of a conversation.
- **Web and mobile have to behave the same.** The same user expects the same features on [venice.ai](https://venice.ai/) and in the iOS and Android apps, which launched in August 2025 ([Venice blog](https://venice.ai/blog)).

## One Data Layer for Web and Mobile

When Venice started the mobile app, the team wanted one unified database layer for both platforms, without a proprietary sync service attached to it. RxDB fits that because the database API is the same on every runtime and only the [storage](../../rx-storage.md) changes: [IndexedDB](../../rx-storage-indexeddb.md) in the browser and [SQLite](../../rx-storage-sqlite.md) in the [React Native](../../react-native-database.md) app.

Venice built a shared library that contains the RxDB database, the API layer that talks to the Venice backend, and the code that brings both together. The [React](../../react.md) and React Native packages are unified on top of it.

> "If you go to the website and you type something into the chat, hit enter and then you go over to the mobile app, it is all the same logic, it is all the same code, it is all the same database. There is one schema for two different devices."
> Staff Engineer, Venice.ai

This means a feature is written once. The schema, the queries and the business logic are shared, and only the storage and the UI shell differ per platform.

## Streaming AI Responses Directly into the Database

An AI chat app has a special write pattern. The model streams the response token by token, so a single message is updated many times per second while the user is watching it. The common advice is to keep the streaming message in an in-memory state store and only write the final result to the database.

Venice does not do that. The app writes each streamed update straight into RxDB and the UI renders it through [reactive queries](../../reactivity.md) with the normal live-query hooks. There is no second state layer.

> "We just use the normal live query hooks to deal with our streaming. I thought we were going to have to be careful about overloading writes to the database and incremental patches. You can just write and read from the database and it is enough to give you the resulting UI smoothly."
> Staff Engineer, Venice.ai

This works because RxDB is built to be the state of the UI. Writes emit change events, and the [EventReduce algorithm](https://github.com/pubkey/event-reduce) updates the results of open queries without running them again. So the database stays the single source of truth, also during streaming. When an app writes even faster than that, the [memory-mapped storage](../../rx-storage-memory-mapped.md) keeps all data in memory and persists writes in the background in batches.

## Media Next to Documents

Venice users create a lot of media: generated images, uploaded photos, and videos that can be hundreds of megabytes. Storing that as base64 strings inside the database is a bad idea because it bloats the documents, slows down every read and fills up the browser's storage quota.

Venice keeps the binary data in the [Origin Private File System (OPFS)](../../rx-storage-opfs.md) and stores only the references and metadata in RxDB, in a dedicated media collection. The OPFS folder structure mirrors the RxDB data, so the media for a message can be located from the message itself without a second query. RxDB's own [attachments](../../rx-attachment.md) follow the same idea: they are stored next to the document instead of inside it and are only loaded when you access them.

## Moving From Dexie to RxDB

Before the mobile app, the Venice web app stored its data in Dexie.js with an encryption add-on. Over time, the encryption layer caused problems that were hard to debug and hard to fix in production, which is why Venice decided to move its data over to RxDB. New features already run on RxDB and the remaining legacy data is being migrated step by step.

With RxDB, encryption is part of the storage layer. The [encryption plugin](../../encryption.md) wraps any storage and encrypts only the fields that are marked as `encrypted` in the schema, so all other fields stay queryable. Together with [leader election](../../leader-election.md) and the multi-instance support of RxDB, every browser tab works on the same consistent state.

## What Comes Next: Encrypted Device-to-Device Sync

Today, Venice users move their history between devices with password-encrypted backups (Pro plan). The data is encrypted on the device, split into chunks and uploaded, and only the user's password can decrypt it ([Venice FAQ](https://venice.ai/faqs/all)). The next step Venice is planning is real device-to-device sync with end-to-end encryption.

The [RxDB replication protocol](../../replication.md) was designed for exactly that kind of setup, because all complex logic, including conflict handling, runs on the client. The server only has to store documents and answer two questions: "what changed since checkpoint X" and "does this document still match the state you assumed". For end-to-end encrypted sync, this means:

1. **Encrypt the full document on the client**, except for the primary key, a hash of the document state and an update timestamp.
2. **The server stores the encrypted blobs** and uses the plaintext hash for conflict detection and the timestamp to sort changes for the checkpoint.
3. **Conflicts are resolved on the client**, where the decryption key exists. The resolved document is pushed again.

The server never sees any content and cannot decrypt it. Because one RxDB collection can run any number of replications at the same time, an opt-in "only sync this conversation" feature can be built by starting one replication per selected conversation and multiplexing them over a single WebSocket connection.

## Key Facts

- **Company**: [Venice.ai](https://venice.ai/), founded 2024, about 55 people (October 2026).
- **Product**: private and uncensored AI chat, image, video, audio and API.
- **Users**: more than 3 million active users ([TechCrunch](https://techcrunch.com/2026/07/01/venice-ai-becomes-a-unicorn-with-65m-series-a-as-its-privacy-first-ai-platform-takes-off/)).
- **Platforms**: web app (React), iOS and Android apps (React Native), one shared data layer.
- **RxDB storages**: [IndexedDB](../../rx-storage-indexeddb.md) on the web, [SQLite](../../rx-storage-sqlite.md) on mobile, binary media in OPFS.
- **Key RxDB features**: [reactive queries](../../reactivity.md) for streaming, [schema migration](../../migration-schema.md), multi-tab support, [encryption](../../encryption.md).

## Follow Up

- Read the [RxDB Quickstart](../../quickstart.md) to build your own local-first app.
- Learn how RxDB works with [React](../../react.md) and [React Native](../../react-native-database.md).
- Read about the [RxDB replication protocol](../../replication.md).
- Want your company listed here? Fill out the success stories form or [contact us](/consulting/).
