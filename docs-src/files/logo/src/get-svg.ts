import { load } from 'opentype.js';
import * as path from 'path';

const blockSize = 14;
const squareHeight = 60;
const squareWidth = 190;
const color = {
    top: '#e6008d',
    middle: '#8d2089',
    bottom: '#5f2688'
};

const blocks = [
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
const withoutTextWidth = 200;
const withiTextWidth = 275;
const height = 200;

function getSvgMainTagProperties(withText: boolean) {
    let viewBox = '-' + padding * 2 + ' ' + padding / 2 + ' ' + squareWidth * 2 + ' ' + squareWidth * 2;

    const width = withText ? withiTextWidth : withoutTextWidth;
    if (withText) {
        viewBox = padding / 2 + ' ' + padding / 2 + ' ' + squareWidth * 2 + ' ' + squareWidth * 2;
    }


    return [
        'width="' + width + '"',
        'height="' + height + '"',
        'xmlns:dc="http://purl.org/dc/elements/1.1/"',
        'xmlns:cc="http://creativecommons.org/ns#"',
        'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"',
        'xmlns:svg="http://www.w3.org/2000/svg"',
        'xmlns="http://www.w3.org/2000/svg"',
        'xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"',
        'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"',
        'xmlns:xlink="http://www.w3.org/1999/xlink"',
        'viewBox="' + viewBox + '"'
    ].join(' ');
}

export async function getSvg(withText: boolean, backgroundColor?: string): Promise<string> {
    const width = withText ? withiTextWidth : withoutTextWidth;
    let backgroundRect: string = '';
    if (backgroundColor) {
        backgroundRect = `<rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}" />`
    }

    const borderedGroup: string[] = [];
    const normalGroup: string[] = [];
    const groups = [borderedGroup, normalGroup];

    function getShapeRendering(idx) {
        if (idx === 0) {
            return 'crispEdges';
        } else {
            return 'geometricPrecision';
        }
    }

    function addBlock(x, y, color) {
        groups.forEach((g, idx) => {
            g.push(
                `
                    <rect 
                        x="${x}"
                        y="${y}"
                        width="${blockSize}"
                        height="${blockSize}"
                        shape-rendering="${getShapeRendering(idx)}"
                        style="fill: ${color}"
                    ></rect>
                `
            );
        });
    }

    function addSquare(x, y, color) {
        groups.forEach((g, idx) => {
            g.push(
                `
                <rect 
                    x="${x}"
                    y="${y}"
                    width="${squareWidth}"
                    height="${squareHeight}"
                    shape-rendering="${getShapeRendering(idx)}"
                    style="fill: ${color}"
                > </rect>                    
                `
            );
        });
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


    const borderedGroupSvg = `<g
        stroke-width="7px"
        stroke="rgb(255 255 255)"
        stroke-linejoin="round"
    >${borderedGroup.join('')}</g>`
    const normalGroupSvg = `<g
    >${normalGroup.join('')}</g>`;

    if (withText) {
        const textPaths: string[] = await getTextPaths() as any;
        textPaths.forEach(path => {
            groups.forEach(g => {
                g.push(`
                        <path
                            d="${path}"
                            transform="scale(1,1.1755)"
                            shape-rendering="geometricPrecision"
                            style="fill: ${color.middle}"
                        ></path>
                    `);
            });
        });
    }

    const ret: string = `
        <svg ${getSvgMainTagProperties(withText)}>
            ${backgroundRect}
            ${borderedGroupSvg}
            ${normalGroupSvg}
        </svg>
    `;
    return ret;


}


/**
 * get array with path for each letter
 * @param {Function(string[])} cb
 */
async function getTextPaths() {
    console.log('.getTextSVGPaths():');
    const fontPath = path.join(
        __dirname,
        '../Kanit-Bold.ttf',
    );
    const font = await load(fontPath);
    console.log('font: ');
    console.dir(font);

    const paths = font.getPaths('RxDB', 200, 209.3, 79, {});
    console.log('paths:');
    console.dir(paths);

    const datas = paths.map(path => path.toPathData(5));
    console.log('svg-data:');
    console.dir(datas);

    return datas;
}
