import CodeBlock from '../theme/CodeBlock';
import { Tabs } from './tabs';

/**
 * Package install command shown as tabs for the common
 * package managers.
 *
 * Usage in .md/.mdx files:
 *
 * <InstallTabs packageName="rxdb" />
 * <InstallTabs packageName="rxdb rxjs" dev={false} />
 */
export function InstallTabs(props: {
    packageName: string;
    /**
     * (optional) Install as devDependency. [default=false]
     */
    dev?: boolean;
}) {
    const commands: Array<{ key: string; command: string; }> = [
        { key: 'npm', command: 'npm install ' + (props.dev ? '--save-dev ' : '') + props.packageName },
        { key: 'yarn', command: 'yarn add ' + (props.dev ? '--dev ' : '') + props.packageName },
        { key: 'pnpm', command: 'pnpm add ' + (props.dev ? '--save-dev ' : '') + props.packageName },
        { key: 'bun', command: 'bun add ' + (props.dev ? '--dev ' : '') + props.packageName },
        { key: 'deno', command: 'deno add ' + props.packageName.split(' ').map(p => 'npm:' + p).join(' ') },
    ];
    return (
        <Tabs
            small
            items={commands.map(item => ({
                key: item.key,
                label: item.key,
                children: <CodeBlock>{item.command}</CodeBlock>,
            }))}
        />
    );
}
