import React, { Suspense } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';
import { JsonLd } from './json-ld';

// Lazy load the chart implementation so recharts isn't in the main bundle
const PerformanceChartImpl = React.lazy(() => import('./performance-chart-impl'));

type PerformanceDataPoint = {
    name: string;
    [key: string]: number | string;
};

type PerformanceChartProps = {
    data: PerformanceDataPoint[];
    metrics?: { key: string; name: string; color: string; }[];
    title: string;
    skipMetrics?: string[];
    logScale?: boolean;
};

// Visually hidden but still readable by search engine crawlers and screen readers.
// The sighted user already sees the rendered chart, so the table is hidden from them.
const srOnlyStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
};

// Renders the chart data as a real HTML table so it is present in the static HTML.
// Hidden from sighted users via srOnlyStyle, but read by crawlers and screen readers.
function AccessibleDataTable({ data, metrics, title }: { data: PerformanceDataPoint[]; metrics: { key: string; name: string; color: string; }[]; title: string; }) {
    return (
        <table style={srOnlyStyle}>
            <caption>{title} (values in milliseconds, lower is better)</caption>
            <thead>
                <tr>
                    <th scope="col">Storage</th>
                    {metrics.map(metric => (
                        <th key={metric.key} scope="col">{metric.name}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map(row => (
                    <tr key={String(row.name)}>
                        <th scope="row">{String(row.name)}</th>
                        {metrics.map(metric => (
                            <td key={metric.key}>{String(row[metric.key])}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

// Builds a schema.org Dataset so the benchmark is machine-readable for SEO.
// Rendered server-side as a static <script> tag, independent of canUseDOM.
function DatasetJsonLd({ data, metrics, title }: { data: PerformanceDataPoint[]; metrics: { key: string; name: string; color: string; }[]; title: string; }) {
    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: title,
        description: title + ' - performance benchmark measured in milliseconds where lower is better. Reproducible in the RxDB repository.',
        creator: {
            '@type': 'Organization',
            name: 'RxDB',
            url: 'https://rxdb.info/'
        },
        isAccessibleForFree: true,
        variableMeasured: metrics.map(metric => ({
            '@type': 'PropertyValue',
            name: metric.name,
            unitText: 'MILLISECOND',
            value: data.map(row => ({ storage: String(row.name), value: row[metric.key] }))
        }))
    };
    return <JsonLd data={jsonLd} />;
}

export function PerformanceChart({ data, metrics, title, skipMetrics, logScale }: PerformanceChartProps) {
    if (!metrics && data && data.length > 0) {
        // Auto-generate metrics from the first data object if not provided
        const keys = Object.keys(data[0]).filter(k => k !== 'name');
        const defaultColors = ['#FF8BE0', '#ED168F', '#FFB3DF', '#DE48B8', '#b2218b', '#DA93E5', '#A94FBE', '#FF59B9', '#8a2be2', '#9370db', '#ba55d3'];
        metrics = keys.map((key, index) => ({
            key,
            name: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), // default readable name
            color: defaultColors[index % defaultColors.length]
        }));
    }

    if (metrics && skipMetrics && skipMetrics.length > 0) {
        metrics = metrics.filter(m => !skipMetrics.includes(m.name) && !skipMetrics.includes(m.key));
    }

    // The JSON-LD and the accessible table render both on the server and the client,
    // so the benchmark data is always in the static HTML for crawlers and screen readers.
    const seoContent = metrics && data && data.length > 0
        ? (
            <>
                <DatasetJsonLd data={data} metrics={metrics} title={title} />
                <AccessibleDataTable data={data} metrics={metrics} title={title} />
            </>
        )
        : null;

    // Recharts only renders properly in the browser
    if (!ExecutionEnvironment.canUseDOM) {
        return (
            <>
                {seoContent}
                <div aria-hidden="true" style={{ width: '100%', height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                    Loading chart...
                </div>
            </>
        );
    }

    return (
        <>
            {seoContent}
            <Suspense fallback={
                <div aria-hidden="true" style={{ width: '100%', height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                    Loading chart...
                </div>
            }>
                <div aria-hidden="true">
                    <PerformanceChartImpl title={title} data={data} metrics={metrics} logScale={logScale} />
                </div>
            </Suspense>
        </>
    );
}
