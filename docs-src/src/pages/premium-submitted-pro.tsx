import React from 'react';
import { PremiumSubmitted } from '../components/premium-submitted';
import { PRICE_PRO_MONTHLY } from '../constants';

/**
 * Thank-you page for the Pro tier form.
 */
export default function PremiumSubmittedPro() {
    return <PremiumSubmitted
        tierEventId='pro'
        yearlyPrice={PRICE_PRO_MONTHLY * 12}
    />;
}
