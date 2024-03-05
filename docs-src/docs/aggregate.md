# Aggregate


## Supported Storages

Not all [RxStorage](./rx-storage.md) implementations support the aggregate functionality. The reason is that using the aggregation only makes sense when run outside of the main JavaScript process, like when the storages runs inside of a [WebWorker](./rx-storage-worker.md).
