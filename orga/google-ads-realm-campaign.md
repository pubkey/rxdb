# Google Ads Campaign: Realm Alternative (RxDB)

Target audience: developers and teams currently using MongoDB Realm / Atlas Device SDK who are searching for an alternative after the deprecation of Atlas Device Sync.

Landing page: https://rxdb.info/articles/mongodb-realm-alternative.html

## Research Summary: Why RxDB Replaces Realm

### The trigger event
In September 2024 MongoDB announced the deprecation of the **Atlas Device SDKs** (formerly "Realm") and **Atlas Device Sync**. The cloud sync service, which was Realm's main selling point, reaches **end of life on 30 September 2025**. New project sign-ups are already closed. The local Realm SDK stays open source, but versions 20.x and later drop cloud synchronization. This forces every team that relied on Realm sync to migrate.

Sources:
- [MongoDB: Atlas Device Sync End-of-Life and Deprecation](https://www.mongodb.com/community/forums/t/atlas-device-sync-end-of-life-and-deprecation/296687)
- [realm-swift Discussion #8680: Realm is Deprecated/Dead](https://github.com/realm/realm-swift/discussions/8680)
- [Realm is Deprecated. What now? (Loop Cafe)](https://loopcafe.substack.com/p/realm-is-deprecated-what-now)

### How RxDB maps onto former Realm use cases

| Realm capability | What teams lose at EOL | RxDB equivalent |
| --- | --- | --- |
| Offline-first local store | Nothing immediately, but no updates | IndexedDB, OPFS, SQLite, Memory storage adapters |
| Two-way Atlas Device Sync | Shuts down Sep 2025 | Pluggable replication: HTTP, GraphQL, WebRTC, CouchDB, Firestore, Supabase, NATS, MongoDB-backed HTTP |
| Change listeners | Gone with SDK | RxJS observable queries and documents |
| Realm filter strings | Gone with SDK | MongoDB-style selectors (`$gt`, `$in`, `$regex`, `$elemMatch`) |
| Native C++ bindings per platform | Maintenance burden, RN upgrade breakage | Pure TypeScript, no native bindings of its own |
| File-level encryption | Gone with SDK | Per-field AES encryption plugin |
| Atlas-only backend | Vendor lock-in | Bring your own backend, fully self-hostable |

### Core selling points for ad copy
1. **Hard deadline**: Realm sync dies September 2025. Urgency drives action.
2. **No vendor lock-in**: RxDB syncs to any backend the team controls, including a MongoDB-backed HTTP endpoint.
3. **Pure JavaScript / TypeScript**: no native bindings that break on every React Native or Electron upgrade.
4. **Same offline-first model**: local reads and writes, background replication, the fast UX Realm users expect.
5. **Active and maintained**: regular releases, free Apache 2.0 core, optional Premium plugins.
6. **Familiar API**: MongoDB-style queries and reactive subscriptions feel natural to the MongoDB/Realm crowd.

## Google Ads Format Constraints (validated)

These are the limits every entry below respects:
- **Headlines**: up to 15 per ad, max **30 characters** each.
- **Descriptions**: up to 4 per ad, max **90 characters** each.
- **Sitelink (quicklink) text**: max **25 characters**.
- **Sitelink description lines**: 2 lines, max **35 characters** each.

All copy in this file was checked with a length validator. Longest headline used is 29 characters, longest description is 84 characters.

---

## Ad 1: High CTR

Goal: maximize click-through rate. Punchy, brand-name driven, urgency and curiosity.

### Headlines (15, max 30 chars)
1. Realm Alternative for JS
2. Migrate Off Realm Easily
3. RxDB: The Realm Successor
4. Realm Is Dead. Try RxDB
5. Replace Realm in Days
6. Your Realm Exit Plan
7. Best Realm Alternative
8. Open Source Realm Swap
9. Sync After Realm Sunset
10. Realm EOL? Switch to RxDB
11. Drop-in Realm Upgrade
12. Local-First JS Database
13. Future-Proof Your App
14. Realm Shutting Down 2025
15. Free Realm Replacement

### Descriptions (4, max 90 chars)
1. Atlas Device Sync is shutting down. Move your app to RxDB before September 2025.
2. RxDB is the local-first JavaScript database that replaces Realm on every platform.
3. Offline-first, reactive queries, flexible sync. Free and open source. Start today.
4. Same offline experience as Realm without the vendor lock-in. Bring your own backend.

---

## Ad 2: Attracts Good RxDB Users

Goal: qualify serious developers who fit RxDB. Technical terms filter out unqualified clicks and pull in offline-first, reactive, TypeScript, and cross-platform builders.

### Headlines (15, max 30 chars)
1. Local-First DB for TypeScript
2. Reactive RxJS Queries
3. Offline-First JS Database
4. NoSQL Sync for React Native
5. IndexedDB, SQLite, OPFS
6. MongoDB-Style Queries
7. Realtime Replication
8. Browser, Node, RN, Electron
9. Type-Safe Local Database
10. Pluggable Sync Backends
11. Sync to Any Backend
12. Bring Your Own Backend
13. Multi-Tab Reactive Data
14. Per-Field AES Encryption
15. Conflict-Free Replication

### Descriptions (4, max 90 chars)
1. Pure TypeScript database with reactive RxJS queries and pluggable storage adapters.
2. Runs in browser, Node.js, Electron and React Native from one shared codebase.
3. MongoDB-style selectors, $gt, $in, $regex and $elemMatch on the client.
4. Replicate over HTTP, GraphQL, WebRTC, CouchDB, Firestore or Supabase.

---

## Ad 3: Solves People's Problems

Goal: speak directly to the pain points Realm users face. Lost sync, hard deadline, vendor lock-in, native binding breakage, and migration fear.

### Headlines (15, max 30 chars)
1. Realm Sync Ends Sep 2025
2. Keep Your App in Sync
3. No More Vendor Lock-In
4. Migrate Realm Data Safely
5. Don't Lose Your Sync
6. End Native Binding Pain
7. Avoid Realm EOL Outage
8. Self-Host Your Sync
9. Step-by-Step Migration
10. Beat the 2025 Deadline
11. No Atlas Lock-In
12. Own Your Data Again
13. Stable Long-Term Support
14. Map Realm Classes to RxDB
15. Migration Guide Included

### Descriptions (4, max 90 chars)
1. Atlas Device Sync reaches end of life in 2025. Move now and keep your data flowing.
2. Replace native bindings that break on every React Native upgrade with pure JS.
3. Follow our migration guide: map schemas, export data, bulk insert, wire up sync.
4. Sync to any backend you control. No single cloud vendor, no forced shutdowns.

---

## Sitelinks / Quicklinks (shared across all 3 ads)

Sitelink text max 25 chars, each description line max 35 chars.

| Link text | Description line 1 | Description line 2 | URL |
| --- | --- | --- | --- |
| Realm Migration Guide | Step-by-step Realm to RxDB | Migrate without data loss | https://rxdb.info/articles/mongodb-realm-alternative.html |
| Live Demo & Examples | Try RxDB in your browser | React, Angular, Vue, RN | https://rxdb.info/quickstart.html |
| Replication Options | HTTP, GraphQL, WebRTC, more | Sync to any backend | https://rxdb.info/replication.html |
| Quickstart Guide | Set up RxDB in minutes | Free and open source | https://rxdb.info/quickstart.html |
| RxDB vs Realm | Full feature comparison | See why teams switch | https://rxdb.info/articles/mongodb-realm-alternative.html |
| Pricing & Premium | Open-source core is free | Premium plugins available | https://rxdb.info/premium/ |

## Target keyword list

Match type guide: `[exact]` = exact match, `"phrase"` = phrase match, `broad` = broad match. Group A and B keywords carry the highest intent and should get the most budget. Every keyword here is Realm-specific on purpose: generic category terms like `javascript database`, `offline first database`, or `react native local database` are handled by the separate RxDB feature campaigns, so they are intentionally left out to avoid overlap and internal bidding competition.

### Group A: Direct alternative and replacement intent

These searchers have already decided to leave Realm and are comparing options. Highest commercial intent, lowest funnel, best conversion rate.

| Keyword | Match type | Why it matters |
| --- | --- | --- |
| realm alternative | "phrase" | The core money term. The searcher wants to leave Realm and is shopping for a replacement right now. |
| realm database alternative | "phrase" | Same intent, slightly more specific to the database rather than the platform. Filters out non-database Realm meanings. |
| mongodb realm alternative | "phrase" | Captures people who know Realm as the MongoDB product. Matches the landing page title exactly, so high relevance and Quality Score. |
| atlas device sdk alternative | "phrase" | Uses the current official product name. These are well-informed devs who know the SDK was rebranded, a strong RxDB fit. |
| realm replacement | "phrase" | Replacement implies a committed switch, not casual research. High intent. |
| alternative to realm js | "phrase" | `realm-js` is the JavaScript binding. These users are exactly RxDB's audience: JS/TS developers. |
| best realm alternative | "phrase" | Comparison intent. Pairs with the "Best Realm Alternative" headline and the RxDB vs Realm sitelink. |

### Group B: Deprecation and end-of-life awareness

These searchers know about the shutdown and feel time pressure. They are motivated to act, which is the campaign's main lever.

| Keyword | Match type | Why it matters |
| --- | --- | --- |
| realm deprecated | "phrase" | The searcher just learned Realm is going away and is looking for what to do. Maps to the urgency in Ad 1 and Ad 3. |
| realm end of life | "phrase" | Explicit EOL awareness. These users have a hard deadline (Sep 2025) and need a destination. |
| atlas device sync deprecated | "phrase" | Names the exact deprecated service. Highly qualified, knows the sync layer is the part that breaks. |
| atlas device sync end of life | "phrase" | Same as above with stronger urgency wording. |
| realm shutting down | broad | Catches worried searches in many phrasings. Broad match widens reach for an emotionally charged, time-sensitive query. |
| is realm still maintained | broad | Doubt-stage searcher. Reachable with a clear "active, regular releases" message before a competitor catches them. |
| realm sync alternative | "phrase" | Sync is the capability they are about to lose, and RxDB's replication is the direct answer. |

### Group C: Migration intent

Searchers ready to do the work. They want a path, not a pitch. The migration guide sitelink and Ad 3 serve these directly.

| Keyword | Match type | Why it matters |
| --- | --- | --- |
| migrate off realm | "phrase" | Action verb signals a committed, in-progress migration. Very high intent. |
| realm migration | "phrase" | Broad migration research. Send to the step-by-step migration guide. |
| realm to rxdb | [exact] | Branded comparison search. Cheap, near-certain conversion, defends the brand term. |
| how to replace realm database | broad | How-to phrasing indicates someone scoping the work. Good for capturing long-tail variants. |
| export data from realm | broad | Practical migration step. Signals an active migration where RxDB `bulkInsert` is the next move. |

### Group D: Platform-specific Realm intent

Realm's largest user base is React Native, where native-binding breakage on every upgrade is the most acute pain point. Only the Realm-specific variant is kept here; the generic RN/Electron/Expo database terms live in the separate platform campaigns.

| Keyword | Match type | Why it matters |
| --- | --- | --- |
| react native realm alternative | "phrase" | RN is where most Realm pain lives (native binding breakage on upgrades). Direct fit for RxDB's pure-JS pitch. |
| realm react native deprecated | "phrase" | Combines the platform with the deprecation trigger. Very high intent and unambiguously Realm-the-database. |

### Negative keywords

The word "realm" is heavily used by consumer products, so a tight negative list is essential. The largest single source of junk traffic is **Minecraft Realms**, Mojang's paid server-hosting subscription (Realms Core at $3.99/mo and Realms Plus at $7.99/mo). It has enormous search volume from players, none of whom are developers, so it would otherwise drain budget against high-volume broad and phrase matches.

Add these as campaign-level negatives:

- **Minecraft Realms** (highest priority): `-minecraft` `-mojang` `-bedrock` `-"realms plus"` `-"realms core"` `-xbox` `-server` `-survival` `-mods` `-skins` `-"realm code"` `-aternos`
- **Other games**: `-game` `-gaming` `-mmorpg` `-rune` (Realm of the Mad God), `-tarkov` (Escape from Tarkov realm servers)
- **VR / Meta products**: `-vr` `-meta` `-quest`
- **Fantasy / unrelated**: `-fantasy` `-kingdom` `-spiritual` `-anime`
- **Low commercial intent**: `-jobs` `-salary` `-"tutorial pdf"` `-free download` `-cheats`

Note on `-server`: Minecraft Realms are marketed as private servers, so `-server` blocks a large junk segment. A former Realm-database user who needs a backend would search "realm sync alternative" or "self-host realm", neither of which contains "server", so the keep-list above is unaffected. Review the search-terms report after the first week and promote any new Minecraft or gaming phrasings (for example specific server names or map titles) to negatives.

Sources for the Minecraft Realms research:
- [Realms Servers for Bedrock & Java (Minecraft.net)](https://www.minecraft.net/en-us/realms)
- [Realms Plus (Minecraft Wiki)](https://minecraft.fandom.com/wiki/Realms_Plus)
- [What are Minecraft Realms (Minecraft.net)](https://www.minecraft.net/en-us/article/what-are-minecraft-realms)
