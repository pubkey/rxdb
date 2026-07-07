import React from 'react';
import { PremiumSubmitted } from '../components/premium-submitted';
import { PRICE_PRO_PLUS_MONTHLY } from '../constants';

/**
 * Thank-you page for the Pro Plus tier form.
 */
export default function PremiumSubmittedProPlus() {
    return <PremiumSubmitted
        tierEventId='pro_plus'
        yearlyPrice={PRICE_PRO_PLUS_MONTHLY * 12}
    />;
}
