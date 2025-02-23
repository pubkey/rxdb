import * as schemaObjects from './schema-objects.ts';
import { RxJsonSchema, RxCollection, RxDatabase, MigrationStrategies, RxAttachmentCreator, RxStorage, RxConflictHandler } from '../../index.ts';
import { HumanDocumentType } from './schemas.ts';
export declare function create(size?: number, collectionName?: string, multiInstance?: boolean, eventReduce?: boolean, storage?: RxStorage<any, any>): Promise<RxCollection<HumanDocumentType, {}, {}>>;
export declare function createBySchema<RxDocumentType = {}>(schema: RxJsonSchema<RxDocumentType>, name?: string, storage?: RxStorage<any, any>, migrationStrategies?: MigrationStrategies): Promise<RxCollection<RxDocumentType, {}, {}>>;
export declare function createAttachments(size?: number, name?: string, multiInstance?: boolean): Promise<RxCollection<HumanDocumentType, {}, {}>>;
export declare function createNoCompression(size?: number, name?: string): Promise<RxCollection<HumanDocumentType>>;
export declare function createAgeIndex(amount?: number): Promise<RxCollection<HumanDocumentType>>;
export declare function multipleOnSameDB(size?: number): Promise<{
    db: RxDatabase<{
        human: RxCollection<HumanDocumentType>;
        human2: RxCollection<HumanDocumentType>;
    }>;
    collection: RxCollection<HumanDocumentType>;
    collection2: RxCollection<HumanDocumentType>;
}>;
export declare function createNested(amount?: number): Promise<RxCollection<schemaObjects.NestedHumanDocumentType>>;
export declare function createDeepNested(amount?: number): Promise<RxCollection<schemaObjects.DeepNestedHumanDocumentType>>;
export declare function createMultiInstance(name: string, amount?: number, password?: undefined, storage?: RxStorage<any, any>): Promise<RxCollection<HumanDocumentType, {}, {}>>;
export declare function createPrimary(amount?: number, name?: string): Promise<RxCollection<schemaObjects.SimpleHumanDocumentType>>;
export declare function createHumanWithTimestamp(amount?: number, databaseName?: string, multiInstance?: boolean, storage?: RxStorage<any, any>, conflictHandler?: RxConflictHandler<any>): Promise<RxCollection<schemaObjects.HumanWithTimestampDocumentType>>;
export declare function createMigrationCollection(amount?: number, addMigrationStrategies?: MigrationStrategies, name?: string, autoMigrate?: boolean, attachment?: RxAttachmentCreator): Promise<RxCollection<schemaObjects.SimpleHumanV3DocumentType>>;
export declare function createRelated(name?: string): Promise<RxCollection<schemaObjects.RefHumanDocumentType>>;
export declare function createRelatedNested(name?: string): Promise<RxCollection<schemaObjects.RefHumanNestedDocumentType>>;
export declare function createIdAndAgeIndex(amount?: number): Promise<RxCollection<schemaObjects.HumanWithIdAndAgeIndexDocumentType>>;
export declare function createHumanWithOwnership(amount?: number, databaseName?: string, multiInstance?: boolean, owner?: string, storage?: RxStorage<any, any>, conflictHandler?: RxConflictHandler<any>): Promise<RxCollection<schemaObjects.HumanWithOwnershipDocumentType>>;
