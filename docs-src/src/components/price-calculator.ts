import type { RxLocalDocument } from '../../../plugins/core';
import { FormValueDocData } from '../pages/premium';



/**
 * Prices are in percent of average salary.
 */
export const PACKAGE_PRICE: { [k in PackageName]: number; } = {
    browser: 0.30,
    native: 0.40,
    performance: 0.35,
    server: 0.20,
    // source-code access and others have no base price but only adds x% to the total.
    sourcecode: 0
};

/**
 * @link https://www.statista.com/statistics/256598/global-inflation-rate-compared-to-previous-year/
 */
export const INFLATION_RATE = 0.05;

export type PackageName = 'sourcecode' | 'browser' | 'native' | 'performance' | 'server';
export type PriceCalculationInput = {
    teamSize: number;
    packages: PackageName[];
};

/**
 * All prices are in Euro €
 */
export function calculatePrice(input: PriceCalculationInput) {

    console.log('-------------------- calculatePrice:');
    console.dir(input);

    const baseFee = 200;
    const developerSalary = 60_000;

    let aimInPercent = 0;
    input.packages.forEach(packageKey => {
        const priceInPercent = PACKAGE_PRICE[packageKey];
        aimInPercent = aimInPercent + priceInPercent;
    });
    console.log('aimInPercent: ' + aimInPercent);


    let totalPrice = baseFee + ((developerSalary) * (aimInPercent / 100));

    /**
     * Discount if more then one package
     */
    if (input.packages.length === 2) {
        totalPrice = totalPrice * 0.95;
    } else if (input.packages.length > 2) {
        totalPrice = totalPrice * 0.90;
    }

    /**
     * Increase price for bigger companies
     * @link https://www.geogebra.org/graphing
     */

    // let companySizeIncrease = 1 + ((Math.pow((input.teamSize * 2) - 1, 0.5) / 100) * 4.5);
    const pricePerDeveloper = Math.pow(input.teamSize, -0.4);
    console.log('input.teamSize (' + totalPrice + ') ' + input.teamSize + ' - pricePerDeveloper: ' + pricePerDeveloper);
    totalPrice = totalPrice * (pricePerDeveloper * input.teamSize);

    /**
     * Add price for source-code read access
     */
    if (input.packages.includes('sourcecode')) {
        totalPrice = totalPrice * 1.75;

        /**
         * Providing source code access is complex,
         * so there is a minimum price.
         */
        const minPriceForSourceCodeAccess = 1520;
        if (totalPrice < minPriceForSourceCodeAccess) {
            totalPrice = minPriceForSourceCodeAccess;
        }
    }

    /**
     * Respect the inflation rate
     */
    const baseYear = 2022;
    const currentYear = new Date().getFullYear();
    const yearsDiff = currentYear - baseYear;
    const inflationMultiplier = Math.pow((1 + INFLATION_RATE), yearsDiff);
    console.log('inflationMultiplier: ' + inflationMultiplier);
    totalPrice = totalPrice * inflationMultiplier;

    totalPrice = Math.ceil(totalPrice);


    /**
     * Stripe does not allow to create abos on flexibles prices
     * so we just round the value so we can use precreated stripe products.
     */
    if (totalPrice > 1200) {
        totalPrice = Math.floor(totalPrice / 100) * 100;
    } else {
        totalPrice = Math.floor(totalPrice / 50) * 50;
    }

    return {
        totalPrice
    };
}


export function calculatePriceFromFormValueDoc(formValueDoc: RxLocalDocument<any, FormValueDocData>): ReturnType<typeof calculatePrice> {
    const formData = formValueDoc.getLatest()._data.data;

    const priceCalculationInput: PriceCalculationInput = {
        teamSize: formData.developers,
        // projectAmount: '1', // formData['project-amount'] as any,
        // licensePeriod: 1, // parseInt(formData['license-period'] as any, 10) as any,
        // homeCountryCode: homeCountryObject.code,
        packages: formData.packages
    };
    const priceResult = calculatePrice(priceCalculationInput);
    return priceResult;
}

