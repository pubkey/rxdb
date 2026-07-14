/**
 * Client-side consent management, replaces the hosted Cookiebot CMP.
 *
 * - The banner UI comes from the fully client-side npm package
 *   `vanilla-cookieconsent` (no external server, no cookie scanning service).
 * - Google Analytics / Google Tag Manager are gated through Google Consent
 *   Mode v2. The "denied" default for EU/EEA regions is set in an inline
 *   script in docusaurus.config.ts; here we only send the "update" once the
 *   visitor made a choice.
 * - Trackers that are not Consent-Mode aware (Reddit pixel, Pipedrive, the
 *   conversion worker and the gtag events) are gated in application code via
 *   `setTrackingConsent()` in trigger-event.tsx and the marketing callback.
 */

export type ConsentState = {
    analytics: boolean;
    marketing: boolean;
};

/**
 * Sends the Google Consent Mode v2 update signal. This unlocks (or keeps
 * denied) the storage that GA4 and Google Ads use, both for the gtag script
 * and for tags managed inside the GTM container.
 */
export function updateGoogleConsent(state: ConsentState): void {
    const gtag = (window as any).gtag;
    if (typeof gtag !== 'function') {
        return;
    }
    gtag('consent', 'update', {
        analytics_storage: state.analytics ? 'granted' : 'denied',
        ad_storage: state.marketing ? 'granted' : 'denied',
        ad_user_data: state.marketing ? 'granted' : 'denied',
        ad_personalization: state.marketing ? 'granted' : 'denied',
    });
}

/**
 * Starts the consent banner for EU/EEA visitors and wires the callbacks.
 * `onApply` is invoked with the current consent state on first consent,
 * on every change and once on load if a choice was stored before.
 *
 * The library is imported dynamically so it stays out of the main bundle
 * and never runs during server-side rendering.
 */
export async function initEuConsentBanner(
    onApply: (state: ConsentState) => void,
): Promise<void> {
    const CookieConsent = await import('vanilla-cookieconsent');
    // The library ships its own stylesheet, theming is added in custom.css.
    await import('vanilla-cookieconsent/dist/cookieconsent.css');

    const readState = (): ConsentState => ({
        analytics: CookieConsent.acceptedCategory('analytics'),
        marketing: CookieConsent.acceptedCategory('marketing'),
    });

    await CookieConsent.run({
        guiOptions: {
            consentModal: {
                layout: 'box',
                position: 'bottom left',
            },
            preferencesModal: {
                layout: 'box',
            },
        },
        categories: {
            necessary: {
                enabled: true,
                readOnly: true,
            },
            analytics: {},
            marketing: {},
        },
        onFirstConsent: () => onApply(readState()),
        onConsent: () => onApply(readState()),
        onChange: () => onApply(readState()),
        language: {
            default: 'en',
            translations: {
                en: {
                    consentModal: {
                        title: 'We use cookies',
                        description:
                            'RxDB uses cookies for analytics and advertising. You decide what loads.',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        showPreferencesBtn: 'Manage preferences',
                    },
                    preferencesModal: {
                        title: 'Cookie preferences',
                        acceptAllBtn: 'Accept all',
                        acceptNecessaryBtn: 'Reject all',
                        savePreferencesBtn: 'Save preferences',
                        closeIconLabel: 'Close',
                        sections: [
                            {
                                title: 'Strictly necessary',
                                description:
                                    'Required for the website to function. These cannot be turned off.',
                                linkedCategory: 'necessary',
                            },
                            {
                                title: 'Analytics',
                                description:
                                    'Google Analytics 4 and Google Tag Manager, used to understand how the website is used so we can improve it.',
                                linkedCategory: 'analytics',
                            },
                            {
                                title: 'Marketing',
                                description:
                                    'Reddit Pixel, Pipedrive and Google Ads conversion measurement, used to measure and improve our advertising.',
                                linkedCategory: 'marketing',
                            },
                            {
                                title: 'More information',
                                description:
                                    'For details, see our <a href="/privacy">privacy policy</a>.',
                            },
                        ],
                    },
                },
            },
        },
    });

    /**
     * Let the privacy page (and anyone else) reopen the settings so a given
     * consent can be withdrawn at any time (Art. 7(3) GDPR).
     */
    (window as any).rxdbShowConsentPreferences = () =>
        CookieConsent.showPreferences();
}
