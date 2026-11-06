import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { matchRoutes, type RouteConfig } from 'react-router-config';
import type { Plugin } from '@docusaurus/types';

type ClientManifest = {
    origins: { [chunkName: string]: string[]; };
    assets: { [chunkId: string]: { js?: { publicPath: string; }[]; }; };
};

/**
 * The HTML that Docusaurus generates only contains the script tags of the
 * runtime and main chunk. The chunks of the current route (layout components,
 * sidebar data, page content) are only requested after main.js has been
 * downloaded and executed, and React can only hydrate the page when they are
 * loaded. So they are downloaded one after the other instead of in parallel.
 *
 * This plugin adds a <link rel="preload" as="script"> for every chunk of the
 * route to the HTML of each page, so the browser downloads them together with
 * main.js. It uses the same data as the client side preload() of Docusaurus:
 * the route tree (routes.js), the chunk names of each route
 * (routesChunkNames.json) and the files of each chunk (client-manifest.json).
 */
export default function preloadRouteChunksPlugin(): Plugin {
    return {
        name: 'preload-route-chunks',
        postBuild({ generatedFilesDir, outDir, routesPaths }) {
            const routes = readRoutes(path.join(generatedFilesDir, 'routes.js'));
            const routesChunkNames: { [routeKey: string]: unknown; } = JSON.parse(
                readFileSync(path.join(generatedFilesDir, 'routesChunkNames.json'), 'utf8')
            );
            const manifest: ClientManifest = JSON.parse(
                readFileSync(path.join(generatedFilesDir, 'client-manifest.json'), 'utf8')
            );

            for (const routePath of routesPaths) {
                const htmlFile = findHtmlFile(outDir, routePath);
                if (!htmlFile) {
                    continue;
                }
                const files = new Set<string>();
                for (const { route } of matchRoutes(routes, routePath)) {
                    for (const chunkName of collectChunkNames(routesChunkNames[(route as any).routeKey])) {
                        for (const chunkId of manifest.origins[chunkName] ?? []) {
                            for (const js of manifest.assets[chunkId]?.js ?? []) {
                                files.add(js.publicPath);
                            }
                        }
                    }
                }
                addPreloadLinks(htmlFile, files);
            }
        },
    };
}

/**
 * routes.js is an ES module that calls ComponentCreator(path, hash) for each
 * route. The key in routesChunkNames.json is `${path}-${hash}`, so the
 * ComponentCreator is replaced by a function that only returns that key.
 */
function readRoutes(routesFile: string): RouteConfig[] {
    const code = readFileSync(routesFile, 'utf8')
        .replace(/^import .*$/gm, '')
        .replace('export default', 'module.exports =');
    const sandbox = {
        module: { exports: [] as RouteConfig[] },
        ComponentCreator: (routePath: string, hash: string) => ({ routeKey: `${routePath}-${hash}` }),
    };
    vm.runInNewContext(code, sandbox);
    const withRouteKeys = (routes: any[]): RouteConfig[] => routes.map(route => ({
        ...route,
        routeKey: route.component.routeKey,
        routes: route.routes ? withRouteKeys(route.routes) : undefined,
    }));
    return withRouteKeys(sandbox.module.exports);
}

/**
 * The chunk names of a route are the string values of a nested object like
 * { __comp: '5e95c892', __context: { plugin: 'aba21aa0' } }.
 */
function collectChunkNames(value: unknown): string[] {
    if (typeof value === 'string') {
        return [value];
    }
    if (value && typeof value === 'object') {
        return Object.values(value).flatMap(collectChunkNames);
    }
    return [];
}

function findHtmlFile(outDir: string, routePath: string): string | undefined {
    const candidates = routePath.endsWith('.html') ?
        [routePath] :
        [path.join(routePath, 'index.html'), routePath.replace(/\/$/, '') + '.html'];
    return candidates
        .map(candidate => path.join(outDir, candidate))
        .find(file => existsSync(file));
}

/**
 * The links are added after the script tag of main.js, so main.js is still
 * requested first. Chunks that already have a script tag are skipped.
 */
function addPreloadLinks(htmlFile: string, files: Set<string>) {
    const html = readFileSync(htmlFile, 'utf8');
    const mainScript = html.match(/<script src="[^"]*\/main\.[0-9a-f]+\.js"[^>]*><\/script>/);
    if (!mainScript || mainScript.index === undefined) {
        return;
    }
    const links = [...files]
        .filter(file => !html.includes(`src="${file}"`))
        .map(file => `<link rel="preload" href="${file}" as="script">`)
        .join('');
    const insertAt = mainScript.index + mainScript[0].length;
    writeFileSync(htmlFile, html.slice(0, insertAt) + links + html.slice(insertAt));
}
