const opentype = require('opentype.js');

const blockSize = 14;
const squareHeight = 60;
const squareWidth = 190;
const color = {
    top: '#e6008d',
    middle: '#8d2089',
    bottom: '#5f2688'
};
const colorsByIndex = {
    0: color.top,
    1: color.middle,
    2: color.bottom
};

const blocks = [
    //      [blockSize, 0],
    //      [0, blockSize * 2],
    //      [blockSize * 3, blockSize * 2],
    //      [blockSize, blockSize * 3],
    //      [blockSize * 4, blockSize * 4],
    [blockSize * 2, blockSize * 1],
    [0, blockSize * 2],
    [blockSize * 2, blockSize * 2],
    [blockSize * 3, blockSize * 2],
    [blockSize * 5, blockSize * 2],
    [0, blockSize * 3],
    [blockSize * 1, blockSize * 3],
    [blockSize * 2, blockSize * 3],
    [blockSize * 3, blockSize * 3],
    [blockSize * 5, blockSize * 3],
    [blockSize * 7, blockSize * 3],
];
// const svgHeight = squareHeight * 3 + blockSize * 18;



const modes = [
    'normal',
    'no-text',
    'mini',
    'subtext'
];

window.renderLogo = async function (selector, mode) {
    let strokeWidth = 26;
    if (
        mode === 'subtext' ||
        mode === 'mini'
    ) {
        strokeWidth = 42;
    }

    console.log('renderLogo(' + mode + ')');

    if (!modes.includes(mode)) {
        throw new Error('mode (' + mode + ') not known');
    }

    const viewBoxWidth = 318;
    let viewBox = '-' + (strokeWidth / 2) + ' ' + (strokeWidth + 1) + ' ' + 220 + ' ' + viewBoxWidth;
    if (mode === 'normal') {
        viewBox = '-' + (strokeWidth / 2) + ' ' + (strokeWidth + 1) + ' ' + 421 + ' ' + viewBoxWidth;
        // viewBox = '-21 35 697 334';
    } else if (mode === 'subtext') {
        viewBox = '-21 35 697 334';
    } else if (mode === 'mini') {
        viewBox = '-21 35 640 334';
    } else if (mode === 'no-text') {
        viewBox = '-13 27 216 318';
    }


    const svg = window.d3.select(selector).append('svg')
        .attr(':xmlns:dc', 'http://purl.org/dc/elements/1.1/')
        .attr(':xmlns:cc', 'http://creativecommons.org/ns#')
        .attr(':xmlns:rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#')
        .attr(':xmlns:svg', 'http://www.w3.org/2000/svg')
        .attr(':xmlns', 'http://www.w3.org/2000/svg')
        .attr(':xmlns:sodipodi', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd')
        .attr(':xmlns:inkscape', 'http://www.inkscape.org/namespaces/inkscape')
        .attr('preserveAspectRatio', 'xMidYMin meet')
        .attr('viewBox', viewBox);


    /**
     * All elements have to be added to both groups,
     * so we can add the stroke the the bordered group
     * and overlay it with the non-bordered group.
     * This ensure we have to ugly stroke blinking through
     * and we do not have to work with svg masks.
     */
    const borderedGroup = svg
        .append('g')
        .style('stroke-width', strokeWidth + 'px')
        .style('stroke', 'rgb(255 255 255)')
        .style('stroke-linejoin', 'round');
    const normalGroup = svg
        .append('g')
        .attr('id', 'normal-group');
    const groups = [normalGroup, borderedGroup];


    function getShapeRendering(idx) {
        if (idx === 0) {
            return 'crispEdges';
        } else {
            return 'geometricPrecision';
        }
    }

    function addBlock(x, y, blockColor) {
        groups.forEach((g, idx) => {
            g.append('rect')
                .attr('x', x)
                .attr('y', y + strokeWidth)
                .attr('width', blockSize)
                .attr('height', blockSize)
                .attr('shape-rendering', getShapeRendering(idx))
                .style('fill', blockColor);
        });
    }

    function addSquare(x, y, squareColor) {
        groups.forEach((g, idx) => {
            g.append('rect')
                .attr('x', x)
                .attr('y', y + strokeWidth)
                .attr('width', squareWidth)
                .attr('height', squareHeight)
                .attr('shape-rendering', getShapeRendering(idx))
                .style('fill', squareColor);
        });
    }

    // top
    addSquare(0, blockSize * 4, color.top);
    blocks.forEach(b => addBlock(b[0], b[1], color.top));

    // middle
    addSquare(0, blockSize * 4 + blockSize + squareHeight, color.middle);

    // bottom
    addSquare(0, blockSize * 4 + (blockSize + squareHeight) * 2, color.bottom);
    const bottomRightX = squareWidth - blockSize;
    const bottomRightY = blockSize * 4 + (blockSize + squareHeight) * 2 + squareHeight + blockSize * 7;

    // addBlock(bottomRightX, bottomRightY, 'red');
    blocks
        .map(b => {
            const blockX = b[0] * -1 + bottomRightX;
            const blockY = b[1] * -1 + bottomRightY - (blockSize * 4);
            return [blockX, blockY];
        })
        .forEach(b => addBlock(b[0], b[1], color.bottom));


    // TEXT
    if (mode === 'normal') {
        const paths = await getTextPaths();
        paths.forEach(path => {
            groups.forEach(g => {
                g.append('svg:path')
                    .attr('d', path)
                    .attr('transform', 'scale(1,1.1755)')
                    .attr('shape-rendering', 'geometricPrecision')
                    .style('fill', color.middle);
            });
        });
    }
    if (mode === 'mini') {
        const paths = await getMiniTextPaths();
        paths.forEach(path => {
            groups.forEach(g => {
                g.append('svg:path')
                    .attr('d', path)
                    .attr('transform', 'scale(1,1.1755)')
                    .attr('shape-rendering', 'geometricPrecision')
                    .style('fill', color.middle);
            });
        });
    }
    if (mode === 'subtext') {
        const pathBlocks = await getSubtextPathBlocks();
        pathBlocks.forEach((paths, idx) => {
            paths.forEach((path) => {
                groups.forEach((g) => {
                    g.append('svg:path')
                        .attr('d', path)
                        // .attr('transform', 'scale(1,1.1755)')
                        .attr('shape-rendering', 'geometricPrecision')
                        .style('fill', colorsByIndex[idx]);
                });
            });
        });
    }

};



function loadFont() {
    return new Promise((res, rej) => {
        opentype.load('https://cdn.rawgit.com/google/fonts/278aaad9/ofl/kanit/Kanit-Bold.ttf', function (err, font) {
            if (err) {
                rej(err);
            } else {
                res(font);
            }
        });
    });
}



/**
 * get array with path for each letter
 */
async function getTextPaths() {
    console.log('.getTextSVGPaths():');
    const font = await loadFont();

    console.log('font: ');
    console.dir(font);

    const paths = font.getPaths('RxDB', 200, (blockSize * 13) + 1.7, 79.1, {});
    console.log('paths:');
    console.dir(paths);

    const data = paths.map(path => path.toPathData(5));
    console.log('svg-data:');
    console.dir(data);
    return data;
}

async function getMiniTextPaths() {
    console.log('.getTextSVGPaths():');
    const font = await loadFont();

    console.log('font: ');
    console.dir(font);

    const paths = font.getPaths('RxDB', 205, (blockSize * 16) + 1.7, 160, {});
    console.log('paths:');
    console.dir(paths);

    const data = paths.map(path => path.toPathData(5));
    console.log('svg-data:');
    console.dir(data);
    return data;
}

async function getSubtextPathBlocks() {
    console.log('.getSubtextPaths():');
    const font = await loadFont();

    const fontSize = 93.2;
    const xPosition = 205;
    const paths1 = font.getPaths('RxDB', xPosition, (blockSize * 10) + 18, fontSize, {});
    const paths2 = font.getPaths('JavaScript', xPosition, (blockSize * 16) + 8, fontSize, {});
    const paths3 = font.getPaths('Database', xPosition, (blockSize * 21) + 12, fontSize, {});

    return [
        paths1.map(path => path.toPathData(5)),
        paths2.map(path => path.toPathData(5)),
        paths3.map(path => path.toPathData(5))
    ];
}
