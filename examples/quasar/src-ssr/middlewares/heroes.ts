import { ssrMiddleware } from 'quasar/wrappers'
import { rest } from '@feathersjs/express'
import { MemoryService } from '@feathersjs/memory'
// import { Hero, RxHeroDocumentType as HeroData } from 'src/types/hero'
import HeroSchema from 'src/schemas/hero'
import { faker } from '@faker-js/faker'
import { comb } from 'src/utils/uuid'
import { delay } from 'src/utils/promise'
import { Application } from '../server'
import { FromSchema } from '@feathersjs/schema'

type Hero = FromSchema<typeof HeroSchema>;
export class HeroService extends MemoryService<Hero, HeroData> {}

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
      get (hook) {
        console.log(hook.data)
      },
      find (hook) {
        for (const entry of hook.arguments) {
          if (!entry || !entry.query) {
            continue;
          }

          function parse<T> (key: string, parse: (val: string) => T) {
            const _type = typeof entry.query[key];
            switch (_type) {
              case 'string':
                entry.query[key] = parse(entry.query[key]);
                break;
              case 'object':
                const _keys = Object.keys(entry.query[key]);
                for (const _key of _keys) {
                  entry.query[key][_key] = parse(entry.query[key][_key]);
                }
                break;
            }
          }
          const keys = Object.keys(entry.query);
          for (const key of keys) {
            if (!entry.query[key]) {
              delete entry.query[key];
              continue;
            }
            if (key.startsWith('_deleted')) {
              parse(key, (val) => val === 'true');
            }
            if (key.startsWith('maxHP')) {
              parse(key, parseInt);
            }
            if (key.startsWith('hp')) {
              parse(key, parseInt);
            }
            if (key.startsWith('updatedAt')) {
              parse(key, parseInt);
            }
          }
        }
      },
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

    const hero = await service.create({
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
