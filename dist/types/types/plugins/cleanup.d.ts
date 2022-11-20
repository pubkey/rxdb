export type RxCleanupPolicy = {
    /**
     * The minimum time in milliseconds
     * of how long a document must have been deleted
     * until it is purged by the cleanup.
     * This should be higher then the time you expect
     * your user to be offline for.
     * If this is too low, deleted documents might not
     * replicate their deletion state.
     */
    minimumDeletedTime: number;
    /**
     * The minimum amount of that that the RxCollection must have existed.
     * This ensures that at the initial page load, more important
     * tasks are not slowed down because a cleanup process is running.
     */
    minimumCollectionAge: number;
    /**
     * After the initial cleanup is done,
     * a new cleanup is started after [runEach] milliseconds
     */
    runEach: number;
    /**
     * If set to true,
     * RxDB will await all running replications
     * to not have a replication cycle running.
     * This ensures we do not remove deleted documents
     * when they might not have already been replicated.
     */
    awaitReplicationsInSync: boolean;
    /**
     * If true, it will only start the cleanup
     * when the current instance is also the leader.
     * This ensures that when RxDB is used in multiInstance mode,
     * only one instance will start the cleanup.
     */
    waitForLeadership: boolean;
};
