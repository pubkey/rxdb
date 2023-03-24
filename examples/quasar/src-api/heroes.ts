import { HookContext, Params } from '@feathersjs/feathers'
import { KnexService, KnexAdapterParams, KnexAdapterOptions } from '@feathersjs/knex'
import { HeroSchema } from 'src/schemas/hero'
import { faker } from '@faker-js/faker'
import { comb } from 'src/utils/uuid'
import { delay } from 'src/utils/promise'
import { Application, FeathersApp } from './index'
import { resolve, hooks, FromSchema, querySyntax } from '@feathersjs/schema'
import { QueryParam, resolveBoolean, resolveInt } from 'src/utils/resolve'
import db from './sqlite'

const HeroSchemaSchema = {
  ...HeroSchema,
  $id: 'HeroQuery',
  properties: querySyntax(HeroSchema.properties)
} as const

type Hero = FromSchema<typeof HeroSchema>
type HeroQuery = FromSchema<typeof HeroSchemaSchema>

const heroResolve = resolve<HeroQuery, HookContext>({
  _deleted (value: QueryParam) {
    return resolveBoolean(value);
  },
  updatedAt (value: QueryParam) {
    return resolveInt(value)
  },
  maxHP (value: QueryParam) {
    return resolveInt(value)
  },
  hp (value: QueryParam) {
    return resolveInt(value)
  },
});

export type HeroesParams = KnexAdapterParams<HeroQuery>
export class HeroesService<ServiceParams extends Params = HeroesParams> extends KnexService<Hero, Hero, ServiceParams> {}

export async function migrate (): Promise<void> {
  const exists = await db.schema.hasTable('heroes');
  if (!exists) {
    await db.schema.createTable('heroes', function (table) {
      table.uuid('id').primary();
      table.string('slug', 255).index('IX_heroes_slug');
      table.string('name', 255);
      table.string('color', 9);
      table.integer('maxHP');
      table.integer('hp');
      table.string('team', 255);
      table.integer('updatedAt');
      table.boolean('_deleted');
    });
  }
}

export function setup (app: Application | FeathersApp): void {
  const options: KnexAdapterOptions = {
    id: 'id',
    Model: db,
    name: 'heroes'
  }

  const handler = new HeroesService(options);
  app.use('api/heroes', Object.assign(handler, {
    docs: {
      description: 'Hero',
      definition: HeroSchema
    }
  }));

  const service = app.service('api/heroes');
  service.hooks({
    before: {
      find: [(ctx: HookContext) => hooks.resolveQuery(heroResolve)(ctx)]
    }
  })
}

export async function seed (app: Application): Promise<void> {
  const service = app.service('api/heroes');
  const heroes: Hero[] = [];

  const result = await service.find({ query: { $limit: 1 } })
  if (!result.total) {
    external:
    for (let i = 0; i < 64; i++) {
      let name = faker.name.fullName();
      let attempts = 0
      while (heroes.some(hero => hero.name === name)) {
        attempts++;
        if (attempts == 5) {
          break external;
        }
        name = faker.name.fullName();;
      }
  
      await service.create({
        id: comb(),
        name: name,
        slug: faker.helpers.slugify(name).toLocaleLowerCase().replace(/\W-/gi, ''),
        color: faker.color.rgb(),
        maxHP: faker.datatype.number({ min: 100, max: 1000 }),
        hp: 100,
        updatedAt: new Date().getTime(),
        _deleted: false
      });
      await delay(1);
    }
  }
}