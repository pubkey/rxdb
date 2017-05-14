export class Hero {

  id: number;
  name: string;
  teamColor: string;
  skills: Object[];

  constructor(id: number,
              name: string,
              teamColor: string,
              skills: Object[]) {
    this.id = id;
    this.name = name;
    this.teamColor = teamColor;
    this.skills = skills;
  }

  /**
   * create the hero from the doc
   * @return {Hero}     [description]
   */
  static fromDoc(doc): Hero {
    const hero = new Hero(
      parseInt(doc.get('id')),
      doc.get('name'),
      doc.get('team'),
      doc.get('skills')
    );
    return hero;
  }
}
