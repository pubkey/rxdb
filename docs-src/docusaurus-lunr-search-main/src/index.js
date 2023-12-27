const fs = require('fs')
const os = require('os')
const path = require('path')
const lunr = require('lunr')
const { Worker } = require('worker_threads')
const Guage = require('gauge')

// local imports
const utils = require('./utils')

module.exports = function (context, options) {
  options = options || {};
  let languages

  const guid = String(Date.now())
  const fileNames = {
    searchDoc: `search-doc-${guid}.json`,
    lunrIndex: `lunr-index-${guid}.json`,
  }

  return {
    name: 'docusaurus-lunr-search',
    getThemePath() {
      return path.resolve(__dirname, './theme');
    },
    configureWebpack(config) {
      // Multilingual issue fix
      const generatedFilesDir = config.resolve.alias['@generated']
      languages = utils.generateLunrClientJS(generatedFilesDir, options.languages);
      return {};
    },
    async contentLoaded({ actions }) {
      actions.setGlobalData({ "fileNames": fileNames })
    },
    async postBuild({ routesPaths = [], outDir, baseUrl, plugins }) {
      console.log('docusaurus-lunr-search:: Building search docs and lunr index file')
      console.time('docusaurus-lunr-search:: Indexing time')

      const docsPlugin = plugins.find((plugin) => plugin.name == 'docusaurus-plugin-content-docs');

      const [files, meta] = utils.getFilePaths(routesPaths, outDir, baseUrl, options)
      if (meta.excludedCount) {
        console.log(`docusaurus-lunr-search:: ${meta.excludedCount} documents were excluded from the search by excludeRoutes config`)
      }


      const searchDocuments = []
      const lunrBuilder = lunr(function (builder) {
        if (languages) {
          this.use(languages)
        }
        this.ref('id')
        this.field('title', { boost: 200 })
        this.field('content', { boost: 2 })
        this.field('keywords', { boost: 100 })
        this.metadataWhitelist = ['position']

        const { build } = builder
        builder.build = () => {
          builder.build = build
          return builder
        }
      })

      const loadedVersions = docsPlugin && !docsPlugin.options.disableVersioning && !(options.disableVersioning ?? false)
        ? docsPlugin.content.loadedVersions.reduce(function (accum, currentVal) {
          accum[currentVal.versionName] = currentVal.label;
          return accum;
        }, {})
        : null;

      if (options.stopWords) {
        const customStopWords = lunr.generateStopWordFilter(options.stopWords)
        lunrBuilder.pipeline.before(lunr.stopWordFilter, customStopWords);
        lunrBuilder.pipeline.remove(lunr.stopWordFilter);
      }
      const addToSearchData = (d) => {
        if (options.excludeTags && options.excludeTags.includes(d.tagName)) {
          return;
        }
        lunrBuilder.add({
          id: searchDocuments.length,
          title: d.title,
          content: d.content,
          keywords: d.keywords
        });
        searchDocuments.push(d);
      }

      const indexedDocuments = await buildSearchData(files, addToSearchData, loadedVersions)
      const lunrIndex = lunrBuilder.build()
      console.timeEnd('docusaurus-lunr-search:: Indexing time')
      console.log(`docusaurus-lunr-search:: indexed ${indexedDocuments} documents out of ${files.length}`)

      const searchDocFileContents = JSON.stringify({ searchDocs: searchDocuments, options })
      console.log('docusaurus-lunr-search:: writing search-doc.json')
      // This file is written for backwards-compatibility with components swizzled from v2.1.12 or earlier.
      fs.writeFileSync(
        path.join(outDir, 'search-doc.json'),
        searchDocFileContents
      )
      console.log(`docusaurus-lunr-search:: writing ${fileNames.searchDoc}`)
      fs.writeFileSync(
        path.join(outDir, fileNames.searchDoc),
        searchDocFileContents
      )

      const lunrIndexFileContents = JSON.stringify(lunrIndex);
      console.log('docusaurus-lunr-search:: writing lunr-index.json')
      // This file is written for backwards-compatibility with components swizzled from v2.1.12 or earlier.
      fs.writeFileSync(
        path.join(outDir, 'lunr-index.json'),
        lunrIndexFileContents
      )
      console.log(`docusaurus-lunr-search:: writing ${fileNames.lunrIndex}`)
      fs.writeFileSync(
        path.join(outDir, fileNames.lunrIndex),
        lunrIndexFileContents
      )
      console.log('docusaurus-lunr-search:: End of process')
    },
  };
};

function buildSearchData(files, addToSearchData, loadedVersions) {
  if (!files.length) {
    return Promise.resolve()
  }
  let activeWorkersCount = 0
  const workerCount = Math.max(2, os.cpus().length)

  console.log(`docusaurus-lunr-search:: Start scanning documents in ${Math.min(workerCount, files.length)} threads`)
  const gauge = new Guage()
  gauge.show('scanning documents...')
  let indexedDocuments = 0 // Documents that have added at least one value to the index

  return new Promise((resolve, reject) => {
    let nextIndex = 0

    const handleMessage = ([isDoc, payload], worker) => {
      gauge.pulse()
      if (isDoc) {
        addToSearchData(payload)
      } else {
        indexedDocuments += payload
        gauge.show(`scanned ${nextIndex} files out of ${files.length}`, nextIndex / files.length)

        if (nextIndex < files.length) {
          worker.postMessage(files[nextIndex++])
        } else {
          worker.postMessage(null)
        }
      }
    }

    for (let i = 0; i < workerCount; i++) {
      if (nextIndex >= files.length) {
        break
      }
      const worker = new Worker(path.join(__dirname, 'html-to-doc.js'), {
        workerData: {
          loadedVersions: loadedVersions
        },
      })
      worker.on('error', reject)
      worker.on('message', (message) => {
        handleMessage(message, worker)
      })
      worker.on('exit', code => {
        if (code !== 0) {
          reject(new Error(`Scanner stopped with exit code ${code}`));
        } else {
          // Worker #${i} completed their work in worker pool
          activeWorkersCount--
          if (activeWorkersCount <= 0) {
            // No active workers left, we are done
            gauge.hide()
            resolve(indexedDocuments)
          }
        }
      })

      activeWorkersCount++
      worker.postMessage(files[nextIndex++])
      gauge.pulse()
    }
  })
}
