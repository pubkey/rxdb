# RxDB Premium

To make RxDB a sustainable Project, some plugins are not part of the RxDB open source project. Instead they are part of the `rxdb-premium` package.


## Premium plugins

- [RxStorage IndexedDB](./rx-storage-indexeddb.md) a really fast [RxStorage](./rx-storage.md) implementation based on **IndexedDB**. Made to be used in browsers.
- [RxStorage SQLite](./rx-storage-sqlite.md) a really fast [RxStorage](./rx-storage.md) implementation based on **SQLite**. Made to be used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**.
- [RxStorage Sharding](./rx-storage-sharding.md) a wrapper around any other [RxStorage](./rx-storage.md) that improves performance by applying the sharding technique.
- [Storage migration](./storage-migration.md) A plugins that migrates data from one storage to another. Use this when you want to change the used RxStorage or to migrate data from an older RxDB major version.
- [RxStorage Memory Synced](./rx-storage-memory-synced.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications.
- [Query Optimizer](./query-optimizer.md) A tool to find the best index for a given query. You can use this during build time to find the best index and then use that index during runtime.
- [RxStorage Localstorage Meta Optimizer](./rx-storage-localstorage-meta-optimizer.md) is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses localstorage to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers.

## Premium FAQ (click to toggle)

<details>
<summary>
    Do I need the Premium Plugins?
</summary>
    When you start using RxDB, you do not need access to the premium plugins. Most use cases can be implemented with the Open Core part of RxDB. There are many <a href="./rx-storage.html">RxStorage</a> options and all core plugins that are required for replication, schema validation, encryption and so on, are totally free.<br />
    The main benefit of the Premium Plugins is <b>performance</b>. The Premium RxStorage implementations have a better performance
    so reading and writing data is much faster especially on low-end devices. You can find a performance comparison <a href="./rx-storage.html#performance-comparison">here</a>.
    Also there are additional Premium Plugins that can be used to further optimize the performance of your application like the <a href="./query-optimizer.html">Query Optimizer</a> or the <a href="./rx-storage-sharding.html">Sharding</a> plugin.
</details>

<details>
<summary>
    Why is it not for free?
</summary>
    The development of RxDB started in 2016 and after all these years it became clear that big implementation and improvement steps will not be done by the RxDB community. While the community submits valuable pull requests, they are mostly small improvements or bugfixes for specific edge case. Big rewrites and optimizations that require a bug effort have only be done my the RxDB maintainer.<br />
    Selling RxDB Premium for money ensures that there will be always an incentive for someone to add features, keep everything up to date and to further improve and optimize the codebase. This gives the user the confidence that RxDB is a future proof tech stack to build on.
</details>

<details>
<summary>
    Why is there no free trial period?
</summary>
    <ul>
        <li>
            RxDB is written in JavaScript and the code of the Premium Plugins does not contain any tracking or measurement code. As soon as someone has the code on his computer, the maintainer has no chance to really ensure that after a free trial period the code is no longer used and deleted.
        </li>
        <li>
            Before you can use the Premium Plugins you have to debate and sign a license agreement with the maintainer. This is a sophisticated process that creates overhead which distracts the maintainer from writing RxDB code. So handling trial period users is just not manageable. For this reason there is also no monthly subscriptions. Premium access must be payd <b>per year</b>.
        </li>
    </ul>
</details>

<details>
<summary>
    Why is it not cheaper?
</summary>
    The price of the Premium Plugins is choosen in way that ensures that there can be always one person that develops RxDB <b>full time</b>.
    Compared to other JavaScript frameworks and developer tools, RxDB satisfies an edge use case for people that want to store data inside of their application on the users device. Most web developers do not need to do that and rely on the traditional client-server stack. So RxDB cannot be sold to that many people which increases the price.
</details>

<details>
<summary>
    Can I install/build the premium plugins in my CI?
</summary>
    <b>Yes</b> you can safely install and use the Premium Plugins in your CI without additional payment.
</details>


<!-- 
<details>
<summary>
</summary>
</details>
-->



## Getting Premium

### As a company

If you use RxDB in your company project, you can purchase access by filling out this form:

<center>
    <a
        href="./form-premium.html"
        onclick="window.trigger('premium_request', 1)"
        target="_blank"
        style="
            background-color: #e6008d;
            color: white;
            padding: 10px;
            padding-left: 38px;
            padding-right: 38px;
            border-radius: 10px;
            font-size: 37px;
            text-align: center;
            font-weight: bold;
            user-select: none;
            vertical-align: middle;
        "
    >Request RxDB Premium Form</a>
</center>

### For your side project

If you are a **single developer** and you use RxDB in your **side project**, you can get 5 years access to the premium package by solving one Task of the [Premium Tasks](https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md) list.

**Notice:** It is not possible to get premium access via github sponsorships.

