const { parentPort, workerData } = require('worker_threads')

// unified imports
const unified = require('unified')
const parse = require('rehype-parse')
const select = require('hast-util-select').select
const selectAll = require('hast-util-select').selectAll
const toText = require('hast-util-to-text')
const is = require('unist-util-is')
const toVfile = require('to-vfile')

// Build search data for a html
function* scanDocuments({ path, url }) {
  let vfile
  try {
    vfile = toVfile.readSync(path)
  } catch (e) {
    if (e.code !== 'ENOENT') {
      console.error(`docusaurus-lunr-search:: unable to read file ${path}`)
      console.error(e)
    }
    return
  }

  const hast = unified().use(parse, { emitParseErrors: false }).parse(vfile)

  const article = select('article', hast)
  if (!article) {
    return
  }
  const markdown = select('.markdown', article)
  if (!markdown) {
    return
  }

  const pageTitleElement = select('h1', article)
  if (!pageTitleElement) {
    return
  }
  const pageTitle = toText(pageTitleElement)
  const sectionHeaders = getSectionHeaders(markdown)

  const keywords = selectAll('meta[name="keywords"]', hast)
    .reduce((acc, metaNode) => {
      if (metaNode.properties.content) {
        return acc.concat(metaNode.properties.content.replace(/,/g, ' '))
      }
      return acc
    }, [])
    .join(' ')

  let version = null
  if (workerData.loadedVersions) {
    const docsearchVersionElement = select(
      'meta[name="docsearch:version"]',
      hast
    )

    version = docsearchVersionElement
      ? workerData.loadedVersions[docsearchVersionElement.properties.content]
      : null
  }

  yield {
    title: pageTitle,
    type: 0,
    sectionRef: '#',
    url,
    // If there is no sections then push the complete content under page title
    content: sectionHeaders.length === 0 ? getContent(markdown) : '',
    keywords,
    version
  }

  for (const sectionDesc of sectionHeaders) {
    const { title, content, ref, tagName } = sectionDesc
    yield {
      title,
      type: 1,
      pageTitle,
      url: `${url}#${ref}`,
      content,
      version,
      tagName
    }
  }
}

function getContent(element) {
  return toText(element)
    .replace(/\s\s+/g, ' ')
    .replace(/(\r\n|\n|\r)/gm, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getSectionHeaders(element) {
  const isHeadingNodeTest = ({ tagName }) => ['h2', 'h3'].includes(tagName)
  const shouldIndexChildrenTest = ({ properties }) =>
    properties && properties.dataSearchChildren

  const headerDocs = []

  const trackHeadingNode = (node) => {
    const ref = select('.anchor', node)
    const searchDoc = {
      title: toText(node).replace(/^#+/, '').replace(/#$/, ''),
      ref: ref ? ref.properties.id : '#',
      tagName: node.tagName || '#',
      content: ''
    }
    headerDocs.push(searchDoc)
    return searchDoc;
  }

  function traverseNodeAndIndex(
    element,
    isIndexingChildren = false,
    searchDoc = null
  ) {


    for (const node of element.children) {
      if (is(node, isHeadingNodeTest)) {
        searchDoc = trackHeadingNode(node)
      } else if (is(node, shouldIndexChildrenTest)) {
        traverseNodeAndIndex(node, true, searchDoc)
      } else if (isIndexingChildren && node.children && node.tagName !== 'p') {
        traverseNodeAndIndex(node, true, searchDoc)
      } else if (searchDoc) {
        searchDoc.content +=  `${getContent(node)} `
      }
    }
  }

  traverseNodeAndIndex(element)

  return headerDocs;
}

function processFile(file) {
  let scanned = 0
  for (const doc of scanDocuments(file)) {
    scanned = 1
    parentPort.postMessage([true, doc])
  }
  parentPort.postMessage([null, scanned])
}

parentPort.on('message', (maybeFile) => {
  if (maybeFile) {
    processFile(maybeFile)
  } else {
    parentPort.close()
  }
})
