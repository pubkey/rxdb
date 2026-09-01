import React, { type ReactNode } from 'react';
import { TitleFormatterProvider } from '@docusaurus/theme-common/internal';
import { HOME_TITLE, JOBS_TITLE } from '../../../constants';

/**
 * Swizzled title formatter.
 *
 * Docusaurus renders every page title as `<page title> | <siteConfig.title>`.
 * `siteConfig.title` is therefore the sitewide suffix, and it is deliberately
 * kept short (`RxDB`) so titles stay inside Google's ~60 character budget.
 *
 * The default formatter skips the suffix only when the page title is exactly
 * equal to `siteConfig.title`. That is too narrow for us: the homepage and
 * /consulting/ carry the longer descriptive HOME_TITLE, and /jobs/ carries
 * JOBS_TITLE. Both already contain the brand, so appending the suffix would
 * render `RxDB - JavaScript Database | RxDB` and `Jobs & Stellenangebote bei
 * RxDB | RxDB`. Treat them the way Docusaurus treats the site title.
 *
 * This is an explicit list rather than a rule such as `ends with RxDB`, because
 * 13 documentation pages already end with the brand (`Partial Sync with RxDB`
 * and similar) and rely on the suffix being appended.
 *
 * NOTE: `ThemeProvider/TitleFormatter` is a real theme component (shipped by
 * theme-classic at lib/theme/ThemeProvider/TitleFormatter) but it is not in
 * `docusaurus swizzle --list`, so it counts as an unsafe swizzle: a Docusaurus
 * upgrade could move or rename it. If it ever stops being picked up, the
 * symptom is the homepage title rendering as
 * `RxDB - JavaScript Database | RxDB`. The fallback is to drop this file and
 * give the homepage a title that reads correctly with the suffix appended,
 * e.g. `Local-First JavaScript Database` -> `Local-First JavaScript Database | RxDB`.
 *
 * @link https://docusaurus.io/docs/swizzling
 */
const formatter: React.ComponentProps<
    typeof TitleFormatterProvider
>['formatter'] = (params) => {
    const ownTitle = [HOME_TITLE, JOBS_TITLE]
        .find((title) => title === params.title?.trim());
    if (ownTitle) {
        return ownTitle;
    }
    return params.defaultFormatter(params);
};

export default function ThemeProviderTitleFormatter({
    children,
}: {
    children: ReactNode;
}): ReactNode {
    return (
        <TitleFormatterProvider formatter={formatter}>
            {children}
        </TitleFormatterProvider>
    );
}
