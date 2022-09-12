const chalk = require('chalk');

const intro = () => {
    console.log(chalk.green('########################################################'));
    console.log(chalk.green('RXDB node example'));
    console.log(chalk.green('########################################################\n \n'));
};

const explanation = () => {
    console.log('Press "Enter" to insert random hero. "CTRL + C" to exit. \n \n');
};

const error = e => {
    console.log(chalk.red(e));
};

const createdDB = () => {
    console.log('Created Database. \n \n');
};

const heroCollectionUpdate = () => {
    console.log(chalk.yellow('########################################################'));
    console.log(chalk.yellow('Updated data in DB: '));
};

const logHero = hero => {
    console.log(
        '# color: '+ chalk.black[hero.color](hero.color) + ', name: ' + hero.name
    );
};

const Log = {
    intro: intro,
    explanation: explanation,
    error: error,
    createdDB: createdDB,
    heroCollectionUpdate: heroCollectionUpdate,
    logHero: logHero
};

module.exports = Log;
