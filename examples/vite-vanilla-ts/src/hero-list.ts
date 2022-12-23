import { db } from './db';

export async function setupHeroList({
  heroListElement,
}: {
  heroListElement: HTMLUListElement;
}) {
  const getHeroesList = async () => {
    const db$ = await db();
    db$.heroes
      .find()
      .sort({ updatedAt: 'desc' })
      .$.subscribe((heroes) => {
        let result = '';
        heroListElement.innerHTML = '';
        heroes.forEach((hero) => {
          result += `<li> ${hero.name} - ${hero.color} - ${new Date(hero.createdAt).toLocaleDateString('en-US')}</li>`;
        });
        heroListElement.innerHTML = result;
      });
  };
  await getHeroesList();
}
