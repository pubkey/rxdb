
# docusaurus-lunr-search
Offline Search for Docusaurus V2

[Demo Website](https://praveenn77.github.io/docusaurus-lunr-search-demo/)

 [![MIT Licence](https://img.shields.io/github/license/lelouch77/docusaurus-lunr-search)](#)

[![npm version](https://badge.fury.io/js/docusaurus-lunr-search.svg)](https://www.npmjs.com/package/docusaurus-lunr-search)

## Sample
<p align="center">
<img width="548" alt="image" src="https://github.com/praveenn77/docusaurus-lunr-search/assets/20218070/dbc54b61-077f-4e11-af27-8798cae8a572.gif">
</p>


## Prerequisites
- Docusaurus V2 or V3
- Node.js >= 12.X

## How to Use ?
1. Install this package
```
yarn add docusaurus-lunr-search
```
or
```
npm i docusaurus-lunr-search  --save
```
If npm install fails to install with error `unable to resolve dependency tree`, run `npm i --legacy-peer-deps`

2. Some time npm fails to install `lunr` package, in that case install `lunr` package manually
```
npm i lunr --save
```

3. Add the docusaurus-lunr-search plugin to your `docusaurus.config.js`
```
module.exports = {
  // ...
    plugins: [require.resolve('docusaurus-lunr-search')],
}
```

4. Then build your Docusaurus project
```
yarn build
```
or
```
npm run build
```

5. Serve your application
```
yarn serve
```
or
```
npm run serve 
```

Note: Docusaurus search information can only be generated from a production build. Local development is currently not supported.

## Using an option (eg. `languages`) in the plugin
```
module.exports = {
  // ...
    plugins: [[ require.resolve('docusaurus-lunr-search'), {
      languages: ['en', 'de'] // language codes
    }]],
}
```
Supports all the language listed here https://github.com/MihaiValentin/lunr-languages

## Options available

| Option              | Type      | Default  | Description                                                                                                               |
| ------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| `languages`         | `Array`   | `['en']` | Language codes to use for stemming, Supports all the language listed here https://github.com/MihaiValentin/lunr-languages |
| `indexBaseUrl`      | `Boolean` | `false`  | Base url will not indexed by default, if you want to index the base url set this option to `true`                         |
| `excludeRoutes`     | `Array`   | `[]`     | Exclude certain routes from the search                                                                                    |
| `includeRoutes`     | `Array`   | `[]`     | Include only specific routes for search                                                                                   |
| `stopWords`         | `Array`   | `[]`     | Add stop words(words that are exclude from search result) to the search index                                             |
| `excludeTags`       | `Array`   | `[]`     | Exclude certain tags from the search      
| `highlightResult`   | `Boolean` | `false`  | Enable it to highlight the searched word in the result page. Used `mark.js` for highlighting. <br /> You can customize the highlight color using css <br /> ``` mark  { background-color: red !important; color: green !important }```                                                                                |
| `disableVersioning` | `Boolean` | `false`  | Docs versions are displayed by default. If you want to hide it, set this plugin option to `true`                          |
| `assetUrl`     | `string`   | `\`     | Url from which the generated search doc files to be loaded, check [issue #122](https://github.com/praveenn77/docusaurus-lunr-search/issues/122) |
| `maxHits`           | `string`  | `5`      | Maximum number of hits shown |

## Indexing non-direct children headings of `.markdown`
By default, this library will only search for headings that are
**direct children** of the `.markdown` element. 

If you would like to render content inside the `.markdown` element on
a swizzled DocItem component, and want this library to **index the
headings inside those custom elements even if they are not direct
children of the `.markdown` element**, then add the attribute
`data-search-children` to a parent element of the headings you want to
index.

The `data-search-children` attribute will cause this library to look
for all headings inside that element, including both direct and
indirect children (E.g. 'grandchildren' nodes).

Check this [issue #115](https://github.com/praveenn77/docusaurus-lunr-search/issues/115) for more details.

## Upgrading from docusaurus V2 to V3
Update the `docusaurus-lunr-search` version to `3.3.0` or higher in `package.json` file

Remove `src/theme/SearchBar` folder if you swizzled it before, if the folder does not exist then ignore this step.

Do `yarn install` or `npm install` 

If npm install fails to install with error `unable to resolve dependency tree`, run `npm i --legacy-peer-deps`

## Credits

Thanks to [`algolia/docsearch.js`](https://github.com/algolia/docsearch), I modified it to create this search component 

And thanks [cmfcmf](https://github.com/cmfcmf), I used the code from his library [docusaurus-search-local](https://github.com/cmfcmf/docusaurus-search-local) for multi-language support.

## Changelog
Checkout the [releases](https://github.com/lelouch77/docusaurus-lunr-search/releases) page for changelog. 
