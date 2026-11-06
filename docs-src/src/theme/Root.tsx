import React, { useEffect, useState } from 'react';
import { AD_CLICK_STORAGE_ID, getUtmCampaign, setTrackingConsent, triggerTrackingEvent } from '../components/trigger-event';
import { isLikelyEuUser } from './eu-consent';
import { type ConsentState, initEuConsentBanner, updateGoogleConsent } from './consent-manager';

type CallToActionModule = typeof import('../components/call-to-action-popup');
let callToActionModule: Promise<CallToActionModule> | undefined;
let loadedCallToActionModule: CallToActionModule | undefined;
function loadCallToActionModule(): Promise<CallToActionModule> {
    if (!callToActionModule) {
        callToActionModule = import('../components/call-to-action-popup');
    }
    return callToActionModule;
}
const CallToActionPopup = React.lazy(loadCallToActionModule);

type TrackerSuiteModule = typeof import('../components/tracker-suite');
let trackerSuiteModule: Promise<TrackerSuiteModule> | undefined;
function loadTrackerSuiteModule(): Promise<TrackerSuiteModule> {
    if (!trackerSuiteModule) {
        trackerSuiteModule = import('../components/tracker-suite');
    }
    return trackerSuiteModule;
}

function logLoadError(err: unknown) {
    console.log('# Error while loading a lazy module:');
    console.dir(err);
}

/**
 * Runs the callback after the window load event
 * when the browser is idle. Returns a function that cancels it.
 */
function whenPageIsIdle(callback: () => void): () => void {
    let canceled = false;
    const run = () => {
        if (canceled) {
            return;
        }
        if (typeof window.requestIdleCallback === 'function') {
            window.requestIdleCallback(() => !canceled && callback(), { timeout: 5000 });
        } else {
            setTimeout(() => !canceled && callback(), 1000);
        }
    };
    if (document.readyState === 'complete') {
        run();
    } else {
        window.addEventListener('load', run, { once: true });
    }
    return () => {
        canceled = true;
        window.removeEventListener('load', run);
    };
}


/**
 * Guards so the tracker suite and the marketing pixels are each started only
 * once, even when the visitor changes the consent multiple times.
 */
let trackerSuiteStarted = false;
let marketingPixelsLoaded = false;
let gtagLoaded = false;

const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
let hasInteracted = false;
const interactionCallbacks: (() => void)[] = [];
function onInteraction(event: Event) {
    /**
     * Only scrolling the page counts. Elements like the slider on the
     * homepage scroll themselves without any input of the visitor.
     */
    if (hasInteracted || (event.type === 'scroll' && event.target !== document)) {
        return;
    }
    hasInteracted = true;
    INTERACTION_EVENTS.forEach(name => window.removeEventListener(name, onInteraction, true));
    interactionCallbacks.splice(0).forEach(callback => callback());
}
if (typeof window !== 'undefined') {
    INTERACTION_EVENTS.forEach(name => window.addEventListener(name, onInteraction, { capture: true, passive: true }));
}

/**
 * Runs the callback on the first interaction of the visitor (pointer, key,
 * touch, scroll or wheel) or 3 seconds after the window load event,
 * whatever happens first. When the visitor already interacted, for example by
 * clicking the consent banner, the callback runs directly.
 */
function onFirstInteractionOrAfterLoad(callback: () => void) {
    let done = false;
    const run = () => {
        if (done) {
            return;
        }
        done = true;
        callback();
    };
    if (hasInteracted) {
        run();
        return;
    }
    interactionCallbacks.push(run);
    const startFallback = () => setTimeout(run, 3000);
    if (document.readyState === 'complete') {
        startFallback();
    } else {
        window.addEventListener('load', startFallback, { once: true });
    }
}

/**
 * Loads gtag.js for Google Analytics 4. The consent defaults and the
 * gtag('config') command are already queued on the dataLayer by the inline
 * script in docusaurus.config.ts and are processed when the script boots.
 * It is only loaded after the visitor granted the analytics consent, so EU/EEA
 * visitors without a decision do not send any request to Google.
 * The script blocks the main thread for a few hundred milliseconds on mobile,
 * so it is loaded on the first interaction or 3 seconds after the page load
 * instead of directly during the initial load.
 */
function loadGtag() {
    if (gtagLoaded || process.env.NODE_ENV !== 'production') {
        return;
    }
    gtagLoaded = true;
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-62D63SY3S0';
    document.head.appendChild(script);
}

/**
 * Applies a consent decision: updates Google Consent Mode, unlocks the
 * in-app tracking guard and starts the trackers that match the granted
 * categories. Called for every consent change and, for non-EU visitors,
 * once with everything granted.
 */
function applyConsent(state: ConsentState): void {
    updateGoogleConsent(state);

    const anyTracking = state.analytics || state.marketing;
    setTrackingConsent(anyTracking);

    if (state.analytics && !gtagLoaded) {
        onFirstInteractionOrAfterLoad(loadGtag);
    }

    if (anyTracking && !trackerSuiteStarted) {
        trackerSuiteStarted = true;
        loadedCallToActionModule?.addCallToActionButton();
        whenPageIsIdle(() => {
            loadTrackerSuiteModule().then(mod => mod.startTrackerSuite()).catch(logLoadError);
        });
    }

    if (state.marketing && !marketingPixelsLoaded) {
        marketingPixelsLoaded = true;
        whenPageIsIdle(() => {
            loadTrackerSuiteModule().then(mod => mod.loadMarketingPixels()).catch(logLoadError);
        });
    }
}

// Default implementation, that you can customize
export default function Root({ children }) {
    const [showCallToAction, setShowCallToAction] = useState(false);
    useEffect(() => {
        // addCommunityChatButton();
        storeAdClickId();
        /**
         * Persist the utm_campaign of the landing URL so later events on
         * other pages still attribute to the campaign (used for the a/b-test
         * event prefix and the sem-page variation keying).
         */
        getUtmCampaign();

        /**
         * EU/EEA visitors only get trackers after they accepted them in the
         * consent banner. Everyone else keeps the previous behavior where
         * everything starts right away.
         */
        if (isLikelyEuUser()) {
            initEuConsentBanner(applyConsent).catch(err => {
                console.log('# Error while starting the consent banner:');
                console.dir(err);
            });
        } else {
            applyConsent({ analytics: true, marketing: true });
        }

        /**
         * The call-to-action popup shows up after 30 seconds at the earliest,
         * so its code is loaded when the page is idle instead of being part
         * of the main bundle.
         */
        const cancelLoad = whenPageIsIdle(() => {
            loadCallToActionModule().then(mod => {
                loadedCallToActionModule = mod;
                if (trackerSuiteStarted) {
                    mod.addCallToActionButton();
                }
                setShowCallToAction(true);
            }).catch(err => {
                console.log('# Error while loading the call-to-action popup:');
                console.dir(err);
            });
        });
        return cancelLoad;
    }, []);
    return <>
        {children}
        {
            showCallToAction ? <React.Suspense fallback={null}>
                <CallToActionPopup />
            </React.Suspense> : null
        }
    </>;
}


/**
 * Stores the ad click id (gclid and its iOS-privacy variants gbraid/wbraid)
 * in localStorage on every page load so it can be used
 * for conversion tracking later.
 */
function storeAdClickId() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return;
    }
    const p = new URLSearchParams(location.search);
    for (const k of ['gclid', 'gbraid', 'wbraid']) {
        const v = p.get(k);
        if (v) {
            localStorage.setItem(AD_CLICK_STORAGE_ID, JSON.stringify({ k, v, t: Date.now() }));
            triggerTrackingEvent('click_id_' + k, 0.01, 1);
        }
    }
}
