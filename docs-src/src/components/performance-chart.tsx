import React, { Suspense } from 'react';
import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

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

export default function PerformanceChart({ data, metrics, title, skipMetrics, logScale }: PerformanceChartProps) {
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

    // Recharts only renders properly in the browser
    if (!ExecutionEnvironment.canUseDOM) {
        return (
            <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                Loading chart...
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div style={{ width: '100%', height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--ifm-color-emphasis-300)' }}>
                Loading chart...
            </div>
        }>
            <PerformanceChartImpl title={title} data={data} metrics={metrics} logScale={logScale} />
            {process.env.NODE_ENV === 'development' && (
                <div style={{ display: 'none' }}>
                    {/* Example value 1 */} <span>Example Dummy Metric 1</span>
                    {/* Example value 2 */} <span>Example Dummy Metric 2</span>
                    {/* Example value 3 */} <span>Example Dummy Metric 3</span>
                </div>
            )}
        </Suspense>
    );
}
