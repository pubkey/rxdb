import React from 'react';
import { PremiumSubmitted } from '../components/premium-submitted';

/**
 * Generic thank-you page, used as fallback for form redirects
 * that do not point to a tier specific page yet.
 * Uses the Pro tier price as conservative lead value.
 */
export default function PremiumSubmittedGeneric() {
    return <PremiumSubmitted
        tierEventId='generic'
        yearlyPrice={99 * 12}
    />;
}
