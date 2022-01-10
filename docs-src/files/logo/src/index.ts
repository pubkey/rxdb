import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';
const rimraf = require('@alexbinary/rimraf');
const minifyXML = require('minify-xml').minify;

import { getSvg } from './get-svg';

const distFolder = path.join(
    __dirname,
    '..',
    'dist'
);

const HEX_WHITE = '#ffffff';

/**
 * Height in PX in what we need the logo
 */
const SIZES: number[] = [
    /**
     * 32px is used for the favicon.ico
     */
    32,
    128,
    256,
    512,
    1024
];

async function run() {
    // recreate dist folder
    await rimraf(distFolder);
    fs.mkdirSync(distFolder);


    const promises: Promise<any>[] = [];
    [true, false].forEach(withText => {
        [true, false].forEach(whiteBgOrTransparent => {
            SIZES.forEach(height => {
                const promise = (async () => {

                    const filePrefixes: string[] = [height + ''];
                    if (withText) {
                        filePrefixes.push('text');
                    }
                    if (whiteBgOrTransparent) {
                        filePrefixes.push('white');
                    }

                    let svg = await getSvg(
                        withText,
                        whiteBgOrTransparent ? HEX_WHITE : undefined
                    );
                    svg = minifyXML(svg, {
                        removeUnusedNamespaces: false,
                        removeUnusedDefaultNamespace: false,
                        shortenNamespaces: false
                    });
                    const logoSharp = sharp(Buffer.from(svg));

                    // write svg file
                    const svgFileLocation = path.join(distFolder, filePrefixes.join('-') + '-logo.svg');
                    fs.writeFileSync(
                        svgFileLocation,
                        svg
                    );

                    // write png files
                    for (const size of SIZES) {
                        await logoSharp.clone()
                            .png()
                            .resize({
                                height: size
                            })
                            .toFile(
                                path.join(
                                    distFolder,
                                    filePrefixes.join('-') + '-logo.png'
                                )
                            )
                    }
                })();
                promises.push(promise);
            });
        });
    });
    await Promise.all(promises);
}
run();
