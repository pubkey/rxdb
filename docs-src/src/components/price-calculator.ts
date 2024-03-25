import {
    ensureNotFalsy
} from '../../../';
import { AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY } from './salaries';



/**
 * Prices are in percent of average salary.
 */
export const PACKAGE_PRICE: { [k in PackageName]: number; } = {
    browser: 0.40,
    native: 0.40,
    performance: 0.35,
    server: 0.25,
    // source-code access and others have no base price but only adds x% to the total.
    sourcecode: 0,
    perpetual: 0
};

/**
 * @link https://www.statista.com/statistics/256598/global-inflation-rate-compared-to-previous-year/
 */
export const INFLATION_RATE = 0.05;

export type PackageName = 'perpetual' | 'sourcecode' | 'browser' | 'native' | 'performance' | 'server';
export type ProjectAmount = '1' | '2' | 'infinity';
export type LicensePeriod = 1 | 2 | 3;

export type PriceCalculationInput = {
    teamSize: number;
    homeCountryCode: string;
    companySize: number;
    licensePeriod: LicensePeriod;
    projectAmount: ProjectAmount;
    packages: PackageName[];
};

/**
 * All prices are in Euro €
 */
export function calculatePrice(input: PriceCalculationInput) {

    console.log('calculatePrice:');
    console.dir(input);


    if (typeof input.licensePeriod !== 'number') {
        throw new Error('not a number ' + typeof input.licensePeriod);
    }


    const baseFee = 350;
    const country = ensureNotFalsy(AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY.find(c => c.code === input.homeCountryCode));
    const developerSalary = country.salary;

    let aimInPercent = 0;
    input.packages.forEach(packageKey => {
        const priceInPercent = PACKAGE_PRICE[packageKey];
        aimInPercent = aimInPercent + priceInPercent;
    });
    console.log('aimInPercent: ' + aimInPercent);


    let totalPrice = baseFee + ((developerSalary * 1.4) * (aimInPercent / 100));

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
    if (input.companySize > 1) {
        let companySizeIncrease = 1 + ((Math.pow((input.companySize * 1) - 1, 0.45) / 100) * 4.5);

        const companySizeIncreaseMax = 6;
        if (companySizeIncrease > companySizeIncreaseMax) {
            companySizeIncrease = companySizeIncreaseMax;
        }
        console.log('input.companySize ' + input.companySize + ' - ' + companySizeIncrease);
        totalPrice = totalPrice * companySizeIncrease;
    }

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

    /**
     * Add additional multi-project price
     */
    if (input.projectAmount === '2') {
        totalPrice = totalPrice * 1.6;
    } else if (input.projectAmount === 'infinity') {
        totalPrice = totalPrice * 3.0;
    }

    /**
     * Discount for multi-year license
     */
    totalPrice = Math.ceil(totalPrice) * input.licensePeriod;
    if (input.licensePeriod === 2) {
        totalPrice = totalPrice * 0.90;
    } else if (input.licensePeriod === 3) {
        totalPrice = totalPrice * 0.80;
    }

    if (input.packages.includes('perpetual')) {
        // only add the additional cost to the last year in multi-year license
        const additional = (totalPrice / input.licensePeriod) * 0.45;
        totalPrice = totalPrice + additional;
    }

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
