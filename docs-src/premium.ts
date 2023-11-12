import {
    ensureNotFalsy,
    lastOfArray
} from '../';
import { getDatabase } from './database';
import { AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY } from './salaries';

const dbPromise = getDatabase();

const FORM_VALUE_DOCUMENT_ID = 'premium-price-form-value';
type FormValueDocData = {
    homeCountry: string;
    companySize: number;
    projectAmount: ProjectAmount;
    licensePeriod: LicensePeriod;
    packages: PackageName[];
};

if (typeof window !== 'undefined') {
    window.onload = async function () {
        const $homeCountry = ensureNotFalsy(document.getElementById('home-country'));
        const $priceCalculatorForm: HTMLFormElement = ensureNotFalsy(document.getElementById('price-calculator-form')) as any;
        const $priceCalculatorSubmit = ensureNotFalsy(document.getElementById('price-calculator-submit'));

        const $priceCalculatorResult = ensureNotFalsy(document.getElementById('price-calculator-result'));
        const $priceCalculatorResultPerMonth = ensureNotFalsy(document.getElementById('total-per-project-per-month'));
        const $priceCalculatorResultPerYear = ensureNotFalsy(document.getElementById('total-per-year'));
        const $priceCalculatorResultTotal = ensureNotFalsy(document.getElementById('total-price'));

        AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
            .sort((a, b) => a.code >= b.code ? 1 : -1)
            .forEach(country => {
                const option = document.createElement('option');

                /**
                 * Do not use the country.code as option.value
                 * because it would create a broken datalist on
                 * iOS safari.
                 */
                option.value = country.name;

                option.innerHTML = country.name;
                $homeCountry.appendChild(option);
            });


        const database = await dbPromise;

        const formValueDoc = await database.getLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID);
        if (formValueDoc) {
            console.log('formValueDoc:');
            console.dir(formValueDoc);

            setToInput('home-country', formValueDoc._data.data.homeCountry);
            setToInput('company-size', formValueDoc._data.data.companySize);
            setToInput('project-amount', formValueDoc._data.data.projectAmount);
            setToInput('license-period', formValueDoc._data.data.licensePeriod);

            Object.keys(PACKAGE_PRICE).forEach(packageName => {
                setToInput('package-' + packageName, false);
            });
            formValueDoc._data.data.packages.forEach(packageName => {
                setToInput('package-' + packageName, true);
            });
        }

        $priceCalculatorSubmit.onclick = async () => {
            (window as any).trigger('calculate_premium_price', 3);

            const isValid = ($priceCalculatorForm as any).reportValidity();
            if (!isValid) {
                console.log('form not valid');
                return;
            }
            const formDataPlain = new FormData($priceCalculatorForm);
            const formData = Object.fromEntries(formDataPlain.entries());

            console.log('formData:');
            console.dir(formData);


            const homeCountry = AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
                .find(o => o.name.toLowerCase() === (formData['home-country'] as string).toLowerCase());
            if (!homeCountry) {
                return;
            }

            const packageFields = Object.entries(formData)
                .filter(([k, _v]) => k.startsWith('package-'));
            const packages: PackageName[] = packageFields
                .map(([k]) => lastOfArray(k.split('-')) as any);


            /**
             * Save the input
             * so we have to not re-insert manually on page reload.
             */
            await database.upsertLocal<FormValueDocData>(FORM_VALUE_DOCUMENT_ID, {
                companySize: formData['company-size'] as any,
                projectAmount: formData['project-amount'] as any,
                licensePeriod: formData['license-period'] as any,
                homeCountry: homeCountry.name,
                packages
            });


            const priceCalculationInput: PriceCalculationInput = {
                companySize: formData['company-size'] as any,
                teamSize: formData['developer-count'] as any,
                projectAmount: formData['project-amount'] as any,
                licensePeriod: parseInt(formData['license-period'] as any, 10) as any,
                homeCountryCode: homeCountry.code,
                packages
            };

            const priceResult = calculatePrice(priceCalculationInput);
            console.log('priceResult:');
            console.log(JSON.stringify(priceResult, null, 4));

            const getConverterUrl = (price: number) => {
                return 'https://www.xe.com/en/currencyconverter/convert/?Amount=' + price + '&From=EUR&To=USD';
            };
            const setPrice = (element: typeof $priceCalculatorResultPerMonth, price: number) => {
                console.log('setPrice:');
                console.dir(price);
                element.innerHTML = Math.ceil(price).toString() + ' &euro; (EUR)';
                (element as any).href = getConverterUrl(Math.ceil(price));
            };
            const pricePerYear: number = (priceResult.totalPrice / priceCalculationInput.licensePeriod);
            if (priceCalculationInput.projectAmount !== 'infinity') {
                setPrice($priceCalculatorResultPerMonth, pricePerYear / parseInt(priceCalculationInput.projectAmount, 10) / 12);
            } else {
                setPrice($priceCalculatorResultPerMonth, 0);
            }
            setPrice($priceCalculatorResultPerYear, pricePerYear);
            setPrice($priceCalculatorResultTotal, priceResult.totalPrice);
            $priceCalculatorResult.style.display = 'block';
        };
    };
}



/**
 * Prices are in percent of average salary.
 */
export const PACKAGE_PRICE: { [k in PackageName]: number; } = {
    browser: 0.40,
    native: 0.40,
    performance: 0.35,
    // source-code access and others have no base price but only adds x% to the total.
    sourcecode: 0,
    perpetual: 0
};

/**
 * @link https://www.statista.com/statistics/256598/global-inflation-rate-compared-to-previous-year/
 */
export const INFLATION_RATE = 0.05;

export type PackageName = 'perpetual' | 'sourcecode' | 'browser' | 'native' | 'performance';
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
        totalPrice = totalPrice * 0.90;
    }
    if (input.packages.length > 2) {
        totalPrice = totalPrice * 0.85;
    }

    /**
     * Increase price for bigger companies
     * @link https://www.geogebra.org/graphing
     */
    if (input.companySize > 1) {
        const companySizeIncrease = 1 + ((Math.pow(input.companySize - 1, 0.55) / 100) * 1.5);
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

    if (input.packages.includes('perpetual')) {
        totalPrice = totalPrice * 1.45;
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

    totalPrice = Math.ceil(totalPrice);
    return {
        totalPrice
    };
}

function setToInput(name: string, value: any) {
    if (typeof value === 'undefined') {
        return;
    }
    const element = ensureNotFalsy(document.querySelector('[name=' + name + ']')) as any;


    if (element.type && element.type === 'checkbox') {
        element.checked = value;
        return;
    }

    (element as any).value = value;
}
