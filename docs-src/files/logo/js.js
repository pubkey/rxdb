const opentype = require('opentype.js');

const blockSize = 14;
const squareHeight = 60;
const squareWidth = 190;
const color = {
    top: '#e6008d',
    middle: '#8d2089',
    bottom: '#5f2688'
};

const blocks = [
    //      [blockSize, 0],
    //      [0, blockSize * 2],
    //      [blockSize * 3, blockSize * 2],
    //      [blockSize, blockSize * 3],
    //      [blockSize * 4, blockSize * 4],
    [blockSize * 2, blockSize * 5],
    [0, blockSize * 6],
    [blockSize * 2, blockSize * 6],
    [blockSize * 3, blockSize * 6],
    [blockSize * 5, blockSize * 6],
    [0, blockSize * 7],
    [blockSize * 1, blockSize * 7],
    [blockSize * 2, blockSize * 7],
    [blockSize * 3, blockSize * 7],
    [blockSize * 5, blockSize * 7],
    [blockSize * 7, blockSize * 7],

];
const padding = 50;
const svgHeight = squareHeight * 3 + blockSize * 18;




window.renderLogo = function(selector, showText = true) {

    let viewBox = '-' + padding * 2 + ' ' + padding / 2 + ' ' + squareWidth * 2 + ' ' + squareWidth * 2;
    let width = 200;
    if (showText) {
        width = 275;
        viewBox = padding / 2 + ' ' + padding / 2 + ' ' + squareWidth * 2 + ' ' + squareWidth * 2;
    }

    const svg = d3.select(selector).append('svg')
        .attr('width', width)
        .attr('height', 200)
        .attr(':xmlns:dc', 'http://purl.org/dc/elements/1.1/')
        .attr(':xmlns:cc', 'http://creativecommons.org/ns#')
        .attr(':xmlns:rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
        .attr(':xmlns:svg', 'http://www.w3.org/2000/svg')
        .attr(':xmlns', 'http://www.w3.org/2000/svg')
        .attr(':xmlns:sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd')
        .attr(':xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape')
        .attr('viewBox', viewBox);



    function addBlock(x, y, color) {
        svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', blockSize)
            .attr('height', blockSize)
            .attr('shape-rendering', 'crispEdges')
            .style('fill', color);
    }

    function addSquare(x, y, color) {
        svg.append('rect')
            .attr('x', x)
            .attr('y', y)
            .attr('width', squareWidth)
            .attr('height', squareHeight)
            .attr('shape-rendering', 'crispEdges')
            .style('fill', color);
    }

    // top
    addSquare(0, blockSize * 8, color.top);
    blocks.forEach(b => addBlock(b[0], b[1], color.top));

    // middle
    addSquare(0, blockSize * 8 + blockSize + squareHeight, color.middle);

    // bottom
    addSquare(0, blockSize * 8 + (blockSize + squareHeight) * 2, color.bottom);
    const bottomRightX = squareWidth - blockSize;
    const bottomRightY = blockSize * 8 + (blockSize + squareHeight) * 2 + squareHeight + blockSize * 7;

    // addBlock(bottomRightX, bottomRightY, 'red');
    blocks
        .map(b => {
            const blockX = b[0] * -1 + bottomRightX;
            const blockY = b[1] * -1 + bottomRightY;
            return [blockX, blockY];
        })
        .forEach(b => addBlock(b[0], b[1], color.bottom));


    // TEXT
    if (showText) {
        getTextPaths(function(paths) {
            paths.forEach(path => {
                svg.append('svg:path')
                    .attr('d', path)
                    .attr('transform', 'scale(1,1.1755)')
                    .style('fill', color.middle);
            });
        });
    }
};

/**
 * get array with path for each letter
 * @param {Function(string[])} cb
 */
function getTextPaths(cb) {
    console.log('.getTextSVGPaths():');
    opentype.load('https://cdn.rawgit.com/google/fonts/278aaad9/ofl/kanit/Kanit-Bold.ttf', function(err, font) {
        if (err) alert('Could not load font: ' + err);

        console.log('font: ');
        console.dir(font);

        const paths = font.getPaths('RxDB', 200, 209.3, 79, {});
        console.log('paths:');
        console.dir(paths);

        const datas = paths.map(path => path.toPathData(5));
        console.log('svg-data:');
        console.dir(datas);

        cb(datas);

    });
}
