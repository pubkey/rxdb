import { RxHeroDocumentType } from 'src/types/hero';
import { RxJsonSchema } from 'rxdb';

export const HeroSchema = {
  title: 'hero schema',
  description: 'describes a simple hero',
  version: 0,
  keyCompression: false,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      require: true,
      maxLength: 36,
    },
    slug: {
      type: 'string',
      default: '',
      maxLength: 100,
    },
    name: {
      type: 'string',
      default: '',
      maxLength: 100,
    },
    color: {
      type: 'string',
      default: '',
    },
    maxHP: {
      type: 'number',
      minimum: 0,
      maximum: 1000,
    },
    hp: {
      type: 'number',
      minimum: 0,
      maximum: 100,
      default: 100,
    },
    team: {
      type: ['string', 'null'],
      description: 'color of the team this hero belongs to',
    },
    updatedAt: {
      type: 'number',
    },
    _deleted: {
      type: 'boolean',
    },
  },
  required: ['name', 'slug', 'color', 'hp', 'maxHP'],
} as const;

export const RxHeroSchema: RxJsonSchema<RxHeroDocumentType> = {
  ...HeroSchema,
};
