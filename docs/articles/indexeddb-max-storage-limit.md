# IndexedDB Max Storage Size Limit - Detailed Best Practices

> Learn how browsers enforce IndexedDB storage size limits, how to test and handle quota exceeded errors, and best practices for storing large amounts of data offline.

<!--
SEO Keywords:
- "indexeddb storage limit" - 590
- "indexeddb size limit" - 260
- "indexeddb max size" - 590
- "indexeddb limits" - 170
-->

import {VideoBox} from '@site/src/components/video-box';

# IndexedDB Max Storage Size Limit

IndexedDB is widely known as the primary browser-based storage API for large client-side data, particularly valuable for modern offline-first applications. These apps aim to keep everything functional and interactive even without an internet connection, which naturally demands substantial local storage. However, IndexedDB has various size limits depending on the browser, disk space, and user settings. Being aware of these constraints is crucial so you can avoid quota errors and deliver a seamless user experience without unexpected data loss.

Offline-first apps have grown in popularity because they provide immediate feedback, zero-latency interactions, and resilience in poor network conditions. Storing big data sets, or even entire data models, in IndexedDB has become far more common than in the era of small localStorage or cookie usage. But all this local data is subject to quotas, and that’s exactly what this guide will help you understand and manage.

## Why IndexedDB Has a Storage Limit

Browsers need a way to curb runaway disk usage and safeguard user resources. This is accomplished through **quota management** policies, which can vary among Chrome, Firefox, Safari, Edge, and others. Some browsers use a percentage of your total disk space, while others rely on a fixed maximum or dynamic approach per origin. These policies are designed to prevent malicious or poorly optimized web pages from consuming an unreasonable amount of user storage.

Chrome (and Chromium-based browsers) typically allow you to use a percentage of the user’s free disk space, whereas Firefox historically prompts users to allow more than 5 MB in mobile or 50 MB in desktop. Safari often sets tighter maximum caps, especially on iOS devices. Edge aligns closely with Chrome’s rules but can also include enterprise or corporate policy overrides. Understanding these default or dynamic limits prepares you to plan your app’s storage needs appropriately.

## Browser-Specific IndexedDB Limits

IndexedDB size quotas differ significantly across browsers and platforms. While there isn’t a universal rule, the following table summarizes approximate limits and any notes or caveats you should be aware of:

| Browser        | Approx. Limit                               | Notes                                                                                                                        |
|----------------|---------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Chrome/Chromium | Up to ~80% of free disk, per origin cap     | Often cited as 60 GB on a 100 GB drive. Shared pool approach. Quota usage can prompt partial or extended user approvals.     |
| Firefox        | ~2 GB (desktop) or ~5 MB initial for mobile | Older versions asked permission at 50 MB for desktop. Ephemeral/incognito sessions may require repeated user prompts.       |
| Safari (iOS)   | ~1 GB per origin (variable)                 | Historically stricter. iOS devices limit quotas further. Behavior can differ between iOS Safari versions or iPadOS.          |
| Edge           | Similar to Chrome’s 80% of free space        | Can be influenced by Windows enterprise policies. Generally aligned with Chromium approach.                                  |
| iOS Safari     | Typically 1 GB, can be less on older iOS     | Early iOS versions were known for more aggressive quotas and data eviction on low space.                                     |
| Android Chrome | Similar to desktop Chrome                    | May exhibit warnings in especially low-storage devices. The same 80% free space logic generally applies.                     |

Historically, these limits have evolved. For instance, older Firefox versions included `dom.indexedDB.warningQuota`, showing a 50 MB prompt on desktop or a 5 MB prompt on mobile—many developers wrote about these notifications on Stack Overflow. Since around 2015, Firefox has changed its quota approach significantly. Likewise, Safari used to limit data more aggressively on older iOS versions. Some older tutorials suggest comparing IndexedDB to localStorage, but modern browsers allow far larger and more flexible storage with IndexedDB than the old localStorage or cookie-based setups.

---

## Checking Your Current IndexedDB Usage

To assess where your app stands relative to these storage limits, you can use the **Storage Estimation API**. The snippet below shows how to estimate both your used storage and the total space allocated to your origin:

```js
const quota = await navigator.storage.estimate();
const totalSpace = quota.quota;
const usedSpace = quota.usage;
console.log('Approx total allocated space:', totalSpace);
console.log('Approx used space:', usedSpace);
```

[Some browsers (all modern ones)](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist#browser_compatibility) also provide a `navigator.storage.persist()` method to request persistent storage, preventing the browser from automatically clearing your data if the user’s device runs low on space. Note that users might deny such requests, or the request might fail silently on stricter environments. Always handle these outcomes gracefully and design your app to degrade if persistent storage is unavailable.

## Testing Your App’s IndexedDB Quotas

The best way to handle real-world usage is to test for low storage conditions and large data sets in different environments. You can fill up the space manually by writing repetitive test data or running scripts that bulk-insert documents until an error occurs.

Real-time usage monitors or dashboards can keep track of your `navigator.storage.estimate()` results, letting you see how close you are to the max limit in production. Developer tools in Chrome or Firefox can simulate limited storage situations, which is crucial for QA:

<center>
    <VideoBox videoId="Nf37yutU8y4" title="Simulate low storage quota with DevTools " duration="0:42" />
</center>

This short tutorial shows how you can artificially reduce available storage in Google Chrome’s dev tools to see how your app behaves when nearing or exceeding the quota.

## Handling Errors When Limits Are Reached

When the user’s device is too full or your app exceeds the allotted quota, most browsers will throw a **QuotaExceededError** (or similarly named exception) when trying to store additional data. Often, the request to IndexedDB simply fails with an error event. Handling this gracefully is essential to avoid crashes or data corruption.

A typical approach is to wrap your write operations in try/catch blocks or in `onsuccess` / `onerror` event callbacks. If you detect a quota error, you can prompt the user to clear out old items or reduce the scope of offline data. Some apps implement a fallback system that removes less critical documents to free space and then retries the write.

```js
try {
  const tx = db.transaction('largeStore', 'readwrite');
  const store = tx.objectStore('largeStore');
  await store.add(hugeData, someKey);
  await tx.done;
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    console.warn('IndexedDB quota exceeded. Cleanup or prompt user to free space.');
    // Optionally remove older data or show a UI hint:
    // removeOldDocuments();
    // displayStorageFullDialog();
  } else {
    // handle other errors
    console.error('IndexedDB write error:', error);
  }
}
```

## Tricks to Exceed the Storage Size Limitation

Even if you plan well, your app might need more storage than a single origin typically allows. There are a few advanced tactics you can use:

If you store binary data such as images or videos, consider compressing them via the Compression Streams API. For textual or [JSON data](./json-based-database.md), a library like [RxDB](/) supports built-in [key-compression](../key-compression.md) to shorten field names or entire documents. This can be extremely helpful when storing large sets of objects:

```ts
// Example: How key-compression can transform your documents internally
const uncompressed = {
  "firstName": "Corrine",
  "lastName": "Ziemann",
  "shoppingCartItems": [
    {
      "productNumber": 29857,
      "amount": 1
    },
    {
      "productNumber": 53409,
      "amount": 6
    }
  ]
};
const compressed = {
  "|e": "Corrine",
  "|g": "Ziemann",
  "|i": [
    {
      "|h": 29857,
      "|b": 1
    },
    {
      "|h": 53409,
      "|b": 6
    }
  ]
};
```

Sharding data across multiple subdomains or iframes is another trick, though it complicates communication. When you need truly massive offline data, you might store part of the data under `sub1.yoursite.com` and another chunk under `sub2.yoursite.com`, using `postMessage()` to coordinate. This can circumvent single-origin limitations, but it introduces extra complexity. Another effective method is to let data expire automatically—perhaps older records are removed if they haven’t been accessed for a certain period.

<center>
    
        
    
</center>

## IndexedDB Max Size of a Single Object

There is no explicit cap on how large an individual object or record in IndexedDB can be, other than the overall disk quota. If you attempt to store one extremely large object, you will eventually hit browser memory constraints or the global storage quota. In practice, you’ll encounter out-of-memory issues in JavaScript before IndexedDB itself refuses a single large write. A helpful test can be seen in [this JSFiddle experiment](https://jsfiddle.net/sdrqf8om/2/) where you see browsers can crash when creating massive in-memory objects.

## Is There a Time Limit for Data Stored in IndexedDB?

IndexedDB data can remain indefinitely as long as the user does not clear the browser’s data or the origin does not run afoul of automated eviction policies (e.g., Safari or Android might remove large caches for sites unused over a long period when space is needed). Typically, there is no “time limit,” but ephemeral modes or incognito sessions have their own rules. If you rely on permanent offline data, request persistent storage and handle the possibility that the user or the OS could still remove your data under extreme conditions. Especially Safari is known to be very fast in deleting local data.

  

## Follow Up

Learn more by checking the [IndexedDB official docs](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), which detail store design, error handling, and quota usage. If you need a straightforward way to manage large offline data with compression and conflict resolution, explore the [RxDB Quickstart](../quickstart.md). You can also join the community on [GitHub](/code/) to share tips on overcoming the **IndexedDB max storage size limit** in production environments.
