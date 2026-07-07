import React from 'react';
import { PremiumSubmitted } from '../components/premium-submitted';

/**
 * Thank-you page for the Pro tier form.
 * Pro costs $99 per month, billed annually.
 */
export default function PremiumSubmittedPro() {
    return <PremiumSubmitted
        tierEventId='pro'
        yearlyPrice={99 * 12}
    />;
}
