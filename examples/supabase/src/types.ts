import { RxCollection, RxDocument } from 'rxdb';
import { RxHeroDocumentType } from './hero.schema';

export type RxHeroDocument = RxDocument<RxHeroDocumentType, {}>;
export type RxHeroCollection = RxCollection<RxHeroDocumentType, {}, {}>;
export type RxHeroesCollections = {
    heroes: RxHeroCollection;
};
export type CheckpointType = {
    name: string;
    updatedAt: number;
};
