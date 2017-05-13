const colors = [
    'bgBlack',
    'bgRed',
    'bgGreen',
    'bgYellow',
    'bgBlue',
    'bgMagenta',
    'bgCyan',
    'bgWhite'
];

const randomColor = () => {
    const randomNumber = Math.floor(Math.random()*colors.length);
    return colors[randomNumber];
};
module.exports = randomColor;
