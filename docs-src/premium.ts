import {
    ensureNotFalsy, lastOfArray
} from '../';
import { AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY } from './salaries';

window.onload = function () {
    const $homeCountry = ensureNotFalsy(document.getElementById('home-country'));
    const $priceCalculatorForm: HTMLFormElement = ensureNotFalsy(document.getElementById('price-calculator-form')) as any;
    const $priceCalculatorSubmit = ensureNotFalsy(document.getElementById('price-calculator-submit'));

    const $priceCalculatorResult = ensureNotFalsy(document.getElementById('price-calculator-result'));
    const $priceCalculatorResultPerMonth = ensureNotFalsy(document.getElementById('total-per-developer-per-month'));
    const $priceCalculatorResultPerYear = ensureNotFalsy(document.getElementById('total-per-year'));

    AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY
        .sort((a, b) => a.code >= b.code ? 1 : -1)
        .forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.innerHTML = country.name;
            $homeCountry.appendChild(option);
        });

    $priceCalculatorSubmit.onclick = () => {
        const isValid = ($priceCalculatorForm as any).reportValidity();
        if (!isValid) {
            return;
        }
        const formDataPlain = new FormData($priceCalculatorForm);
        const formData = Object.fromEntries(formDataPlain.entries());

        console.log('formData:');
        console.dir(formData);

        const packages: string[] = Object.keys(formData)
            .filter(k => k.startsWith('package-'))
            .map(k => lastOfArray(k.split('-')) as any);

        const priceResult = calculatePrice({
            companyAge: formData['company-age'] as any,
            teamSize: formData['developer-count'] as any,
            homeCountryCode: formData['home-country'] as any,
            packages
        });
        console.log('priceResult:');
        console.log(JSON.stringify(priceResult, null, 4));

        $priceCalculatorResultPerMonth.innerHTML = priceResult.perDeveloperPerMonth + ' &euro;';
        $priceCalculatorResultPerYear.innerHTML = priceResult.totalPerYear + ' &euro;';
        $priceCalculatorResult.style.display = 'block';

    };
};



/**
 * Prices are in percent of averagy salary.
 */
export const PACKAGE_PRICE: { [k: string]: number; } = {
    browser: 0.55,
    native: 0.65,
    performance: 0.20
};

/**
 * @link https://www.statista.com/statistics/256598/global-inflation-rate-compared-to-previous-year/
 */
export const INFLATION_RATE = 0.05;

/**
 * All prices are in Euro €
 */
export function calculatePrice(input: {
    teamSize: number;
    homeCountryCode: string;
    companyAge: 'more-than-3' | 'less-than-3';
    packages: string[];
}) {

    const baseFee = 300;
    const baseFeePerDeveloper = 90;
    const country = ensureNotFalsy(AVERAGE_FRONT_END_DEVELOPER_SALARY_BY_COUNTRY.find(c => c.code === input.homeCountryCode));
    const developerSalary = country.salary;

    let aimInPercent = 0;
    input.packages.forEach(packageKey => {
        const priceInPercent = ensureNotFalsy(PACKAGE_PRICE[packageKey]);
        aimInPercent = aimInPercent + priceInPercent;
    });
    console.log('aimInPercent: ' + aimInPercent);

    let totalPerYear = baseFee +
        (baseFeePerDeveloper * input.teamSize) +
        (developerSalary * (aimInPercent / 100) * input.teamSize);

    /**
     * Discount for 'young' companies.
     */
    if (input.companyAge === 'less-than-3') {
        totalPerYear = totalPerYear * 0.80;
    }

    /**
     * Discount if more then one package
     */
    if (input.packages.length > 1) {
        totalPerYear = totalPerYear * 0.90;
    }

    /**
     * Respect the inflation rate
     */
    const baseYear = 2022;
    const currentYear = new Date().getFullYear();
    const yearsDiff = currentYear - baseYear;
    const inflationMultiplier = Math.pow((1 + INFLATION_RATE), yearsDiff);
    console.log('inflationMultiplier: ' + inflationMultiplier);
    totalPerYear = totalPerYear * inflationMultiplier;

    totalPerYear = Math.ceil(totalPerYear);
    return {
        totalPerYear,
        perDeveloperPerMonth: Math.floor(totalPerYear / 12 / input.teamSize)
    };
}
