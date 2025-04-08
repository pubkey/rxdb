import { SemPage } from '../pages';

import { Tabs } from 'antd';


function ObserveCodeExampleParent(props: {
    dark: boolean;
    children, name
}) {
    return <>
        <fieldset
            className="samp-wrapper"
            style={{ backgroundColor: props.dark ? 'var(--bg-color)' : 'var(--bg-color-dark)' }}
        >
            <legend>Write</legend>
            <samp>
                <span className="cm-keyword">await </span>
                <span className="cm-variable">collection</span>.
                <span className="cm-method">upsert</span>({'{'}
                <br />
                <span className="cm-property">&nbsp; id</span>: <span className="cm-string">'foobar'</span>,<br />
                <span className="cm-property">&nbsp; color</span>: <span className="cm-string">
                    '
                    <span className="beating-color-string beating-color">
                        #e6008d
                    </span>
                    '
                </span>
                <br />
                {'}'});
            </samp>
        </fieldset>
        <br />
        <br />
        <fieldset
            className="samp-wrapper"
            style={{ backgroundColor: props.dark ? 'var(--bg-color)' : 'var(--bg-color-dark)' }}
        >
            <legend>Observe with {props.name}</legend>
            <samp style={{ backgroundColor: props.dark ? 'var(--bg-color)' : 'var(--bg-color-dark)' }}>
                {props.children}
            </samp>
        </fieldset>
    </>;
}

export function ObserveCodeExample(props: {
    dark: boolean;
    sem?: SemPage;
}) {


    const items = [
        {
            key: 'RxJS',
            label: 'RxJS',
            icon: <img src="/files/icons/rxjs.svg" loading='lazy' alt="rxjs observable" />,
            children: <ObserveCodeExampleParent dark={props.dark} name="RxJS Observable">
                <span className="cm-keyword">await </span>
                <span className="cm-variable">collection</span>.
                <span className="cm-method">
                    findOne(<span className="cm-string">'foobar'</span>)
                </span>
                <br />
                &nbsp;.<span className="cm-property">$</span>
                <span className="cm-comment"> // get observable</span>
                <br />
                &nbsp;.<span className="cm-method">subscribe</span>(
                <span className="cm-def">d</span>
                <span className="cm-operator"> =&gt;</span> {'{'}
                <br />
                <span className="cm-variable">&nbsp;&nbsp; screen</span>.
                <span className="cm-property">backgroundColor</span>
                <span className="cm-operator"> = </span>
                <span className="cm-variable">d</span>.
                <span className="cm-property beating-color">color</span>;<br />
                &nbsp;{'}'});
            </ObserveCodeExampleParent>
        },
        {
            key: 'Angular',
            label: 'Angular',
            icon: <img src="/files/icons/angular.svg" loading='lazy' alt="Angular async pipe" />,
            children: <ObserveCodeExampleParent dark={props.dark} name="Angular Async Pipe">
                <span className="cm-html">&lt;body</span><br />
                <span className="cm-html">&emsp;[style.backgroundColor]=</span>&quot;(<br />
                &emsp;&emsp;<span className="cm-variable">collection</span><br />
                &emsp;&emsp;&emsp;.<span className="cm-method">findOne(<span className="cm-string">&#39;foobar&#39;</span>)</span><br />
                &emsp;&emsp;&emsp;.<span className="cm-property">$</span> <span className="cm-comment"> // get observable</span><br />
                &emsp;&emsp;&emsp;.<span className="cm-method">pipe(<span className="cm-variable">doc</span> =&gt; <span className="cm-variable">doc</span>.<span className="cm-property beating-color">color</span>)</span><br />
                &emsp;&emsp;| <span className="cm-keyword">async</span><br />
                &emsp;)&quot;<br />
                <span className="cm-html">&gt;&lt;/body&gt;</span>
            </ObserveCodeExampleParent>
        },
        {
            key: 'React',
            label: 'React',
            icon: <img src="/files/icons/react.svg" loading='lazy' alt="React signals" />,
            children: <ObserveCodeExampleParent dark={props.dark} name="React Signal">
                <span className="cm-keyword">export default function</span> <span className="cm-method">Component</span>() &#123;<br />
                &emsp;<span className="cm-keyword">const</span> [<span className="cm-variable">doc</span>, <span className="cm-variable">setDoc</span>] = <span className="cm-method">useState</span>();<br />
                &emsp;<span className="cm-method">useEffect</span>(<span className="cm-keyword">async</span> () =&gt; <span className="cm-method">setDoc</span>(<br />
                &emsp;&emsp;<span className="cm-keyword">await</span> <span className="cm-variable">collection</span>.<span className="cm-method">findOne</span>(<span className="cm-string">&#39;foobar&#39;</span>).<span className="cm-method">exec</span>()<br />
                &emsp;), []);<br />
                &emsp;<span className="cm-keyword">return</span> <span className="cm-variable">doc</span> &amp;&amp; (<br />
                &emsp;&emsp;<span className="cm-html">&lt;body</span> <br />
                &emsp;&emsp;&emsp;style=&#123;&#123; backgroundColor: <span className="cm-variable">doc</span>.<span className="cm-property">color$$</span>.<span className="cm-property beating-color">value</span> &#125;&#125;<br />
                &emsp;&emsp;<span className="cm-html">&gt;&lt;/body&gt;<br /></span>
                &emsp;);<br />
                &#125;
            </ObserveCodeExampleParent>
        },
        {
            key: 'Vue.js',
            label: 'Vue.js',
            icon: <img src="/files/icons/vuejs.svg" loading='lazy' alt="Vue Refs" />,
            children: <ObserveCodeExampleParent dark={props.dark} name="Vue Refs">
                <span className="cm-html">&lt;template&gt;</span><br />
                &emsp;<span className="cm-html">&lt;body</span> v-if=&quot;<span className="cm-variable">doc</span>&quot; :style=&quot;&#123;<br />
                &emsp;&emsp;<span className="cm-property">backgroundColor</span>: <span className="cm-variable">doc</span>.<span className="cm-property">color$$</span>.<span className="cm-property beating-color">value</span><br />
                &emsp;&#125;&quot;&gt;<br />
                &emsp;<span className="cm-html">&lt;/body&gt;</span><br />
                <span className="cm-html">&lt;/template&gt;</span><br />

                <span className="cm-html">&lt;script setup&gt;</span><br />
                &emsp;<span className="cm-keyword">const</span> <span className="cm-variable">doc</span> = <span className="cm-method">ref</span>()<br />
                &emsp;<span className="cm-method">onMounted</span>(<span className="cm-keyword">async</span>() =&gt; <span className="cm-variable">doc</span>.<span className="cm-property">value</span> = <span className="cm-keyword">await</span> <span className="cm-variable">collection</span>.<span className="cm-method">findOne</span>(<span className="cm-string">&#39;foobar&#39;</span>)).<span className="cm-method">exec</span>()<br />
                <span className="cm-html">&lt;/script&gt;</span><br />
            </ObserveCodeExampleParent>
        },
        {
            key: 'Svelte',
            label: 'Svelte',
            icon: <img src="/files/icons/svelte.svg" loading='lazy' alt="Svelte Store" />,
            children: <ObserveCodeExampleParent dark={props.dark} name="Svelte">
                <span className="cm-html">&lt;script&gt;</span><br />
                &emsp;<span className="cm-keyword">let</span> <span className="cm-variable">doc</span>;<br />
                &emsp;<span className="cm-method">onMount</span>(<br />
                &emsp;&emsp;<span className="cm-keyword">async</span>() =&gt; (<br />
                &emsp;&emsp;&emsp;<span className="cm-variable">doc</span> = <span className="cm-keyword">await</span> <span className="cm-variable">collection</span>.<span className="cm-method">findOne</span>(<span className="cm-string">&#39;foobar&#39;</span>).<span className="cm-method">exec</span>()<br />
                &emsp;&emsp;)<br />
                &emsp;);<br />
                <span className="cm-html">&lt;/script&gt;</span><br />

                &#123;#if doc&#125;<br />
                &emsp;<span className="cm-html">&lt;body</span> style=&quot;background-color: &#123;<span className="cm-variable">$doc</span>.<span className="cm-property beating-color">color$$</span>&#125;&quot;&gt;<br />
                &emsp;<span className="cm-html">&lt;/body&gt;</span><br />
                &#123;/if&#125;
            </ObserveCodeExampleParent>
        }
    ];

    let activeTab = 'RxJS';
    if (props.sem && props.sem.appName) {
        activeTab = props.sem.appName;
        if (props.sem.appName === 'React Native' || props.sem.appName === 'Expo') {
            activeTab = 'React';
        }
    }

    return <Tabs className='observe-code-example-tabs' type="line" defaultActiveKey={activeTab} items={items} style={{ minHeight: 650 }} />;
}




