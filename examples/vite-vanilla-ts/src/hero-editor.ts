import { db } from './db';

export function setupHeroEditor({
  heroNameElement,
  heroColorElement,
  saveElement,
}: {
  heroNameElement: HTMLInputElement;
  heroColorElement: HTMLInputElement;
  saveElement: HTMLButtonElement;
}) {
  let heroName: string;
  let heroColor: string;

  const resetForm = () => {
    heroNameElement.value = '';
    heroColorElement.value = '';
  };

  const saveHeroe = async (name: string, color: string) => {
    const db$ = await db();
    await db$.heroes
      .insert({
        name,
        color,
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      })
      .then(resetForm);
  };

  saveElement.addEventListener('click', () => {
    heroName = heroNameElement.value;
    heroColor = heroColorElement.value;
    if (heroName.length > 0 && heroColor.length > 0) {
      saveHeroe(heroName, heroColor);
    } else {
      alert('Please fill all the fields');
    }
  });

}
