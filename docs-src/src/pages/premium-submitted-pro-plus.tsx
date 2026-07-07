import React from 'react';
import { PremiumSubmitted } from '../components/premium-submitted';

/**
 * Thank-you page for the Pro Plus tier form.
 * Pro Plus costs $239 per month, billed annually.
 */
export default function PremiumSubmittedProPlus() {
    return <PremiumSubmitted
        tierEventId='pro_plus'
        yearlyPrice={239 * 12}
    />;
}
