/**
 * Ghana Statutory Tax Engine (GRA - Ghana Revenue Authority Compliant)
 * 
 * Provides official statutory tax bracket calculations for:
 * 1. Individual PAYE (Pay-As-You-Earn) Graduated Income Tax
 * 2. SSNIT (Social Security and National Insurance Trust) Tiers 1, 2, and 3
 * 3. Indirect Taxes (VAT, NHIL, GETFund, COVID-19 Health Recovery Levy)
 * 4. Withholding Taxes (WHT) on Goods, Services, Works, and Rent
 */

// Monthly GRA Graduated PAYE Tax Brackets (Effective GRA Ghana Standards)
export const GRA_PAYE_BRACKETS_MONTHLY = [
  { limit: 490.00, rate: 0.00, label: 'First GHS 490' },
  { limit: 110.00, rate: 0.05, label: 'Next GHS 110' },
  { limit: 130.00, rate: 0.10, label: 'Next GHS 130' },
  { limit: 3166.67, rate: 0.175, label: 'Next GHS 3,166.67' },
  { limit: 52000.00, rate: 0.25, label: 'Next GHS 52,000' },
  { limit: 20000.00, rate: 0.30, label: 'Next GHS 20,000' },
  { limit: Infinity, rate: 0.35, label: 'Exceeding GHS 75,896.67' },
];

// SSNIT Pension Contributions (Ghana National Pensions Act 766)
export const SSNIT_RATES = {
  EMPLOYEE_CONTRIBUTION_RATE: 0.055, // 5.5% deducted from basic salary
  EMPLOYER_CONTRIBUTION_RATE: 0.135, // 13.5% paid by employer
  TIER_1_MANDATORY_RATE: 0.135,      // 13.5% sent to SSNIT (Basic National Social Security Scheme)
  TIER_2_OCCUPATIONAL_RATE: 0.05,    // 5.0% sent to approved Tier 2 private trustee (split out of total 19.0%)
};

// Indirect Tax & Levy Rates (Ghana Revenue Authority)
export const GHANA_INDIRECT_TAXES = {
  VAT_RATE: 0.15,            // 15.0% Value Added Tax
  NHIL_RATE: 0.025,          // 2.5% National Health Insurance Levy
  GETFUND_RATE: 0.025,       // 2.5% Ghana Education Trust Fund Levy
  COVID_LEVY_RATE: 0.01,     // 1.0% COVID-19 Health Recovery Levy
  VAT_FLAT_RATE: 0.03,       // 3.0% VAT Flat Rate Scheme (VFRS) for retail
};

// Withholding Tax Rates (Ghana Income Tax Act 896)
export const WITHHOLDING_TAX_RATES = {
  GOODS_RESIDENT: 0.03,      // 3% on supply of goods
  SERVICES_RESIDENT: 0.075,  // 7.5% on supply of services
  WORKS_RESIDENT: 0.05,      // 5% on supply of works
  RENT_RESIDENTIAL: 0.08,    // 8% on residential rent
  RENT_COMMERCIAL: 0.15,     // 15% on commercial rent
  NON_RESIDENT_SERVICES: 0.20, // 20% on non-resident service contracts
};

/**
 * Calculates monthly SSNIT pension deductions for an employee.
 * @param {number} basicSalary 
 */
export function calculateSSNIT(basicSalary) {
  const basic = Math.max(0, parseFloat(basicSalary) || 0);
  const employeeContribution = basic * SSNIT_RATES.EMPLOYEE_CONTRIBUTION_RATE;
  const employerContribution = basic * SSNIT_RATES.EMPLOYER_CONTRIBUTION_RATE;
  const totalContribution = employeeContribution + employerContribution;

  // Breakdown across Tier 1 (13.5%) and Tier 2 (5%)
  const tier1Amount = basic * (SSNIT_RATES.TIER_1_MANDATORY_RATE - SSNIT_RATES.TIER_2_OCCUPATIONAL_RATE); // 8.5% net to SSNIT
  const tier2Amount = basic * SSNIT_RATES.TIER_2_OCCUPATIONAL_RATE; // 5% to private trustee

  return {
    basicSalary: basic,
    employeeSSNIT: parseFloat(employeeContribution.toFixed(2)),
    employerSSNIT: parseFloat(employerContribution.toFixed(2)),
    totalSSNIT: parseFloat(totalContribution.toFixed(2)),
    tier1Amount: parseFloat(tier1Amount.toFixed(2)),
    tier2Amount: parseFloat(tier2Amount.toFixed(2)),
  };
}

/**
 * Calculates monthly GRA PAYE Graduated Tax on taxable income.
 * @param {number} taxableIncome - Gross income after SSNIT (5.5%) and allowable tax reliefs.
 */
export function calculatePAYE(taxableIncome) {
  let remainingIncome = Math.max(0, parseFloat(taxableIncome) || 0);
  let totalTax = 0;
  const breakdown = [];

  for (const bracket of GRA_PAYE_BRACKETS_MONTHLY) {
    if (remainingIncome <= 0) {
      breakdown.push({ label: bracket.label, taxable: 0, rate: bracket.rate, tax: 0 });
      continue;
    }

    const taxableInBracket = Math.min(remainingIncome, bracket.limit);
    const taxInBracket = taxableInBracket * bracket.rate;

    totalTax += taxInBracket;
    remainingIncome -= taxableInBracket;

    breakdown.push({
      label: bracket.label,
      taxable: parseFloat(taxableInBracket.toFixed(2)),
      rate: bracket.rate,
      tax: parseFloat(taxInBracket.toFixed(2)),
    });
  }

  return {
    taxableIncome: Math.max(0, parseFloat(taxableIncome) || 0),
    totalPAYETax: parseFloat(totalTax.toFixed(2)),
    breakdown,
  };
}

/**
 * Comprehensive Employee Gross-to-Net Ghana Payroll Tax Calculator.
 * @param {Object} params
 * @param {number} params.basicSalary - Employee base salary
 * @param {number} [params.allowances] - Total cash allowances (cash allowances are taxable in Ghana)
 * @param {number} [params.taxReliefs] - Total approved GRA tax reliefs (e.g. marriage, child education relief)
 * @param {number} [params.voluntaryTier3] - Employee voluntary Tier 3 provident fund contribution (tax exempt up to 16.5%)
 */
export function calculateEmployeeTaxBreakdown({
  basicSalary,
  allowances = 0,
  taxReliefs = 0,
  voluntaryTier3 = 0,
}) {
  const basic = Math.max(0, parseFloat(basicSalary) || 0);
  const totalAllowances = Math.max(0, parseFloat(allowances) || 0);
  const grossPay = basic + totalAllowances;

  // 1. Mandatory SSNIT 5.5% on Basic Salary
  const ssnit = calculateSSNIT(basic);

  // 2. Tier 3 Provident Fund (Tax exempt up to 16.5% of basic salary)
  const maxTaxExemptTier3 = basic * 0.165;
  const actualTier3 = Math.max(0, parseFloat(voluntaryTier3) || 0);
  const taxExemptTier3 = Math.min(actualTier3, maxTaxExemptTier3);
  const nonTaxExemptTier3 = Math.max(0, actualTier3 - taxExemptTier3);

  // 3. Taxable Income = Gross Pay - Employee SSNIT (5.5%) - Tax Exempt Tier 3 - GRA Reliefs
  const totalReliefs = Math.max(0, parseFloat(taxReliefs) || 0);
  const taxableIncome = Math.max(0, grossPay - ssnit.employeeSSNIT - taxExemptTier3 - totalReliefs);

  // 4. GRA PAYE Tax
  const paye = calculatePAYE(taxableIncome);

  // 5. Total Deductions & Net Pay
  const totalEmployeeDeductions = ssnit.employeeSSNIT + paye.totalPAYETax + actualTier3;
  const netPay = Math.max(0, grossPay - totalEmployeeDeductions);

  return {
    basicSalary: basic,
    allowances: totalAllowances,
    grossPay: parseFloat(grossPay.toFixed(2)),
    employeeSSNIT: ssnit.employeeSSNIT,
    employerSSNIT: ssnit.employerSSNIT,
    tier3Contribution: actualTier3,
    taxableIncome: parseFloat(taxableIncome.toFixed(2)),
    payeTax: paye.totalPAYETax,
    payeBreakdown: paye.breakdown,
    totalDeductions: parseFloat(totalEmployeeDeductions.toFixed(2)),
    netPay: parseFloat(netPay.toFixed(2)),
  };
}

/**
 * Calculates Ghana Commercial Indirect Tax on an invoice or sale amount (VAT + Levies).
 * Standard Rate Scheme: NHIL (2.5%) + GETFund (2.5%) + COVID Levy (1%) calculated on base, 
 * then VAT (15%) calculated on (Base + Levies).
 * @param {number} baseAmount 
 * @param {boolean} [isFlatRate=false] 
 */
export function calculateGhanaInvoiceTax(baseAmount, isFlatRate = false) {
  const base = Math.max(0, parseFloat(baseAmount) || 0);

  if (isFlatRate) {
    const flatTax = base * GHANA_INDIRECT_TAXES.VAT_FLAT_RATE;
    return {
      baseAmount: base,
      nhil: 0,
      getFund: 0,
      covidLevy: 0,
      vat: parseFloat(flatTax.toFixed(2)),
      totalTax: parseFloat(flatTax.toFixed(2)),
      totalAmount: parseFloat((base + flatTax).toFixed(2)),
    };
  }

  const nhil = base * GHANA_INDIRECT_TAXES.NHIL_RATE;
  const getFund = base * GHANA_INDIRECT_TAXES.GETFUND_RATE;
  const covidLevy = base * GHANA_INDIRECT_TAXES.COVID_LEVY_RATE;

  const totalLevies = nhil + getFund + covidLevy;
  const vatTaxableBase = base + totalLevies;
  const vat = vatTaxableBase * GHANA_INDIRECT_TAXES.VAT_RATE;

  const totalTax = totalLevies + vat;

  return {
    baseAmount: base,
    nhil: parseFloat(nhil.toFixed(2)),
    getFund: parseFloat(getFund.toFixed(2)),
    covidLevy: parseFloat(covidLevy.toFixed(2)),
    vat: parseFloat(vat.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    totalAmount: parseFloat((base + totalTax).toFixed(2)),
  };
}
