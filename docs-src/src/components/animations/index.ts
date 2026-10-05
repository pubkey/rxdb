import type { ComponentType } from 'react';
import { AttachmentsMail } from './attachments-mail';
import { BackupCopy } from './backup-copy';
import { CleanupSweep } from './cleanup-sweep';
import { ConflictHandling } from './conflict-handling';
import { CrdtMerge } from './crdt-merge';
import { DocumentSwarm } from './document-swarm';
import { EncryptionLogo } from './encryption-logo';
import { FulltextSearchLens } from './fulltext-search-lens';
import { GlitchLogo } from './glitch-logo';
import { HeroMark } from './hero-mark';
import { IsometricStack } from './isometric-stack';
import { KeyCompressionLogo } from './key-compression-logo';
import { LeaderElectionTabs } from './leader-election-tabs';
import { LocalDocuments } from './local-documents';
import { LogoBuildIn } from './logo-build-in';
import { LogoLoader } from './logo-loader';
import { MiddlewareHook } from './middleware-hook';
import { OfflineQueue } from './offline-queue';
import { P2pReplicationMesh } from './p2p-replication-mesh';
import { PartialSyncChunks } from './partial-sync-chunks';
import { Population } from './population';
import { QueryCacheScan } from './query-cache-scan';
import { ReactiveStream } from './reactive-stream';
import { ReplicationPushPull } from './replication-push-pull';
import { RevisionsLogo } from './revisions-logo';
import { RxPipelineFlow } from './rx-pipeline-flow';
import { RxQueryLogo } from './rx-query-logo';
import { RxServerRack } from './rx-server-rack';
import { RxStateBars } from './rx-state-bars';
import { SchemaMigrationLogo } from './schema-migration-logo';
import { SchemaValidationLogo } from './schema-validation-logo';
import { ShardingSplit } from './sharding-split';
import { StorageSwap } from './storage-swap';
import { VectorDatabase } from './vector-database';
import { WordmarkColorSweep } from './wordmark-color-sweep';
import { WordmarkReactiveX } from './wordmark-reactive-x';
import { WordmarkReveal } from './wordmark-reveal';
import { WordmarkTypewriter } from './wordmark-typewriter';
import { WorkerStorage } from './worker-storage';

export type AnimationEntry = {
    title: string;
    description: string;
    /**
     * Exported name of the component.
     */
    name: string;
    /**
     * File name in src/components/animations without the extension.
     */
    file: string;
    component: ComponentType;
};

export type AnimationGroup = {
    title: string;
    animations: AnimationEntry[];
};

/**
 * All logo animations, grouped like they are shown on the brand guidelines page.
 */
export const ANIMATION_GROUPS: AnimationGroup[] = [
    {
        title: 'Logo and Wordmark',
        animations: [
            { title: 'Hero', name: 'HeroMark', file: 'hero-mark', component: HeroMark, description: 'The three layers extend into the feature list and the runtime name cycles below.' },
            { title: 'Wordmark Reveal', name: 'WordmarkReveal', file: 'wordmark-reveal', component: WordmarkReveal, description: 'The letters of the wordmark build up next to the logo, followed by the claim.' },
            { title: 'Typewriter', name: 'WordmarkTypewriter', file: 'wordmark-typewriter', component: WordmarkTypewriter, description: 'The wordmark is typed and deleted letter by letter.' },
            { title: 'Reactive x', name: 'WordmarkReactiveX', file: 'wordmark-reactive-x', component: WordmarkReactiveX, description: 'A wave runs through the letters of the wordmark and into the layers of the icon.' },
            { title: 'Color Sweep', name: 'WordmarkColorSweep', file: 'wordmark-color-sweep', component: WordmarkColorSweep, description: 'The three layer colors sweep through the letters of the wordmark.' },
            { title: 'Glitch', name: 'GlitchLogo', file: 'glitch-logo', component: GlitchLogo, description: 'An RGB split glitch that plays every few seconds.' },
            { title: 'Document Swarm', name: 'DocumentSwarm', file: 'document-swarm', component: DocumentSwarm, description: 'The logo built from small documents that scatter on pointer movement and spring back.' }
        ]
    },
    {
        title: 'Motion That Explains the Database',
        animations: [
            { title: 'Build-in', name: 'LogoBuildIn', file: 'logo-build-in', component: LogoBuildIn, description: 'The outline is drawn, then the layers slide in like documents written to storage.' },
            { title: 'Reactive Stream', name: 'ReactiveStream', file: 'reactive-stream', component: ReactiveStream, description: 'Query results stream to the UI on every write.' },
            { title: 'Replication', name: 'ReplicationPushPull', file: 'replication-push-pull', component: ReplicationPushPull, description: 'An RxDB client pushes and pulls documents with any server.' },
            { title: 'Offline-First', name: 'OfflineQueue', file: 'offline-queue', component: OfflineQueue, description: 'Writes are queued while offline and flushed when the connection returns.' },
            { title: 'Storage Swap', name: 'StorageSwap', file: 'storage-swap', component: StorageSwap, description: 'The bottom layer swaps between different RxStorage implementations.' },
            { title: 'Loader', name: 'LogoLoader', file: 'logo-loader', component: LogoLoader, description: 'The logo as a loading indicator while the first sync runs.' },
            { title: 'Isometric Stack', name: 'IsometricStack', file: 'isometric-stack', component: IsometricStack, description: 'The logo tilts and its layers lift off like a stack of storage layers.' },
            { title: 'Conflict Handling', name: 'ConflictHandling', file: 'conflict-handling', component: ConflictHandling, description: 'Two offline edits of the same document are resolved into one revision.' },
            { title: 'Encryption', name: 'EncryptionLogo', file: 'encryption-logo', component: EncryptionLogo, description: 'The corner locks, the layers fill with ciphertext and decrypt back.' },
            { title: 'Key Compression', name: 'KeyCompressionLogo', file: 'key-compression-logo', component: KeyCompressionLogo, description: 'Long JSON keys shrink into short tokens.' },
            { title: 'Leader Election', name: 'LeaderElectionTabs', file: 'leader-election-tabs', component: LeaderElectionTabs, description: 'One browser tab is elected as the leader.' }
        ]
    },
    {
        title: 'One Animation per Core Feature',
        animations: [
            { title: 'Schema Validation', name: 'SchemaValidationLogo', file: 'schema-validation-logo', component: SchemaValidationLogo, description: 'An invalid document is rejected by the schema.' },
            { title: 'Schema Migration', name: 'SchemaMigrationLogo', file: 'schema-migration-logo', component: SchemaMigrationLogo, description: 'Stored documents are migrated to a new schema version.' },
            { title: 'RxQuery', name: 'RxQueryLogo', file: 'rx-query-logo', component: RxQueryLogo, description: 'MongoDB-style queries highlight the matching parts of the logo.' },
            { title: 'Revisions', name: 'RevisionsLogo', file: 'revisions-logo', component: RevisionsLogo, description: 'Every write to a layer increments its revision.' },
            { title: 'Attachments', name: 'AttachmentsMail', file: 'attachments-mail', component: AttachmentsMail, description: 'Binary files are attached to a document.' },
            { title: 'CRDT', name: 'CrdtMerge', file: 'crdt-merge', component: CrdtMerge, description: 'Concurrent increments merge without a conflict.' },
            { title: 'Fulltext Search', name: 'FulltextSearchLens', file: 'fulltext-search-lens', component: FulltextSearchLens, description: 'A magnifying lens scans the layers and stops on the match.' },
            { title: 'Vector Database', name: 'VectorDatabase', file: 'vector-database', component: VectorDatabase, description: 'Similarity search by cosine distance between vectors.' },
            { title: 'Sharding', name: 'ShardingSplit', file: 'sharding-split', component: ShardingSplit, description: 'One collection is split across multiple shards.' },
            { title: 'P2P Replication', name: 'P2pReplicationMesh', file: 'p2p-replication-mesh', component: P2pReplicationMesh, description: 'Peers replicate directly with each other over WebRTC.' },
            { title: 'Cleanup', name: 'CleanupSweep', file: 'cleanup-sweep', component: CleanupSweep, description: 'Deleted documents are removed by the cleanup.' },
            { title: 'Backup', name: 'BackupCopy', file: 'backup-copy', component: BackupCopy, description: 'Documents are copied into backup files.' },
            { title: 'Middleware', name: 'MiddlewareHook', file: 'middleware-hook', component: MiddlewareHook, description: 'A preInsert hook changes a document before it is stored.' },
            { title: 'Partial Sync', name: 'PartialSyncChunks', file: 'partial-sync-chunks', component: PartialSyncChunks, description: 'A voxel game only syncs the chunks near the player.' },
            { title: 'Worker Storage', name: 'WorkerStorage', file: 'worker-storage', component: WorkerStorage, description: 'The storage runs in a worker, off the main thread.' },
            { title: 'Population', name: 'Population', file: 'population', component: Population, description: 'Referenced documents are populated from another collection.' },
            { title: 'RxState', name: 'RxStateBars', file: 'rx-state-bars', component: RxStateBars, description: 'Reactive state values are updated with set().' },
            { title: 'Local Documents', name: 'LocalDocuments', file: 'local-documents', component: LocalDocuments, description: 'Local documents stay on the device and are not replicated.' },
            { title: 'RxServer', name: 'RxServerRack', file: 'rx-server-rack', component: RxServerRack, description: 'Clients replicate and query through RxServer endpoints.' },
            { title: 'RxPipeline', name: 'RxPipelineFlow', file: 'rx-pipeline-flow', component: RxPipelineFlow, description: 'Documents are processed from a source into a destination collection.' },
            { title: 'Query Cache', name: 'QueryCacheScan', file: 'query-cache-scan', component: QueryCacheScan, description: 'The first query scans the storage, the second one is served from the cache.' }
        ]
    }
];
