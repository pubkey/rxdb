import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * Remark plugin that renders every page under docs/articles/ like a blog post.
 * It inserts the <ArticleByline /> component directly below the H1 and passes
 * the publish date, the last modification date and the reading time.
 *
 * The dates come from git so they never have to be maintained by hand:
 * - published: the author date of the commit that added the file (following renames)
 * - modified: the author date of the last commit that touched the file
 *
 * In a shallow clone the oldest available commit is not the real one, so the
 * publish date is left out instead of rendering a wrong one. The docs:build
 * script unshallows the repository before building.
 */

const ARTICLES_DIR = path.sep + path.join('docs', 'articles') + path.sep;
const WORDS_PER_MINUTE = 200;

type MdastNode = {
    type: string;
    depth?: number;
    value?: string;
    children?: MdastNode[];
    [key: string]: unknown;
};

type VFileLike = {
    path?: string;
    history?: string[];
};

let isShallowRepository: boolean | undefined;
function isShallow(cwd: string): boolean {
    if (typeof isShallowRepository === 'undefined') {
        try {
            isShallowRepository = git(cwd, ['rev-parse', '--is-shallow-repository']) === 'true';
        } catch {
            isShallowRepository = true;
        }
    }
    return isShallowRepository;
}

function git(cwd: string, args: string[]): string {
    return execFileSync('git', args, {
        cwd,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
}

function toIsoDay(gitDate: string | undefined): string | undefined {
    if (!gitDate) {
        return undefined;
    }
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(gitDate);
    return match ? match[1] : undefined;
}

export function getArticleDates(filePath: string): { published?: string; modified?: string; } {
    const cwd = path.dirname(filePath);
    const fileName = path.basename(filePath);
    try {
        const modified = toIsoDay(git(cwd, ['log', '-1', '--format=%aI', '--', fileName]));
        let published: string | undefined;
        if (!isShallow(cwd)) {
            const added = git(cwd, ['log', '--follow', '--diff-filter=A', '--format=%aI', '--', fileName])
                .split('\n')
                .filter(Boolean);
            published = toIsoDay(added[added.length - 1]);
        }
        return { published, modified };
    } catch {
        return {};
    }
}

function countWords(node: MdastNode): number {
    let words = 0;
    if (typeof node.value === 'string' && (node.type === 'text' || node.type === 'inlineCode' || node.type === 'code')) {
        words += node.value.split(/\s+/).filter(Boolean).length;
    }
    if (node.children) {
        for (const child of node.children) {
            words += countWords(child);
        }
    }
    return words;
}

function attribute(name: string, value: string) {
    return { type: 'mdxJsxAttribute', name, value };
}

export default function remarkArticleByline() {
    return (tree: MdastNode, file: VFileLike) => {
        const filePath = file.path ?? file.history?.[0];
        if (!filePath || !filePath.includes(ARTICLES_DIR) || !tree.children) {
            return;
        }

        const { published, modified } = getArticleDates(filePath);
        const wordCount = countWords(tree);
        const readingMinutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));

        const attributes = [
            attribute('readingMinutes', String(readingMinutes)),
            attribute('wordCount', String(wordCount)),
        ];
        if (published) {
            attributes.push(attribute('published', published));
        }
        if (modified) {
            attributes.push(attribute('modified', modified));
        }

        const bylineNode: MdastNode = {
            type: 'mdxJsxFlowElement',
            name: 'ArticleByline',
            attributes,
            children: [],
        };

        const h1Index = tree.children.findIndex(node => node.type === 'heading' && node.depth === 1);
        tree.children.splice(h1Index === -1 ? 0 : h1Index + 1, 0, bylineNode);
    };
}
