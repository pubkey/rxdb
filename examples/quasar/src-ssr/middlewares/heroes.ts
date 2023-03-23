import { ssrMiddleware } from 'quasar/wrappers'
import { MemoryService } from '@feathersjs/memory'
// import { Hero, RxHeroDocumentType as HeroData } from 'src/types/hero'
import { HeroSchema } from 'src/schemas/hero'
import { faker } from '@faker-js/faker'
import { comb } from 'src/utils/uuid'
import { delay } from 'src/utils/promise'
import { Application } from '../server'
import { resolve, hooks, FromSchema, querySyntax } from '@feathersjs/schema'
import { QueryParam, resolveBoolean, resolveInt } from 'src/utils/resolve'

const HeroSchemaSchema = {
  ...HeroSchema,
  $id: 'HeroQuery',
  properties: querySyntax(HeroSchema.properties)
} as const

type Hero = FromSchema<typeof HeroSchema>
type HeroQuery = FromSchema<typeof HeroSchemaSchema>

const heroResolve = resolve<HeroQuery, any>({
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

export class HeroService extends MemoryService<Hero, Hero> {}

function setup (app: Application): void {
  const handler = new HeroService({
    id: 'id'
  })
  
  app.use('api/heroes', Object.assign(handler, {
    docs: {
      description: "Hero",
      definition: HeroSchema
    }
  }));

  const service = app.service('api/heroes');
  service.hooks({
    before: {
      find: [(ctx) => hooks.resolveQuery(heroResolve)(ctx)]
    }
  })
}

async function seed (app: Application): Promise<void> {
  const service = app.service('api/heroes');
  const heroes: Hero[] = [];

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
      slug: faker.helpers.slugify(name),
      color: faker.color.rgb(),
      maxHP: faker.datatype.number({ min: 100, max: 1000 }),
      hp: 100,
      skills: [],
      updatedAt: new Date().getTime(),
      _deleted: false
    });
    await delay(1);
  }
}

// "async" is optional;
// more info on params: https://v2.quasar.dev/quasar-cli/developing-ssr/ssr-middlewares
export default ssrMiddleware(async ({ app }) => {
  const _app = app as never as Application
  _app.configure(setup);
  await seed(_app)
})
