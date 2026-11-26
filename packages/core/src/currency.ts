/**
 * Currency helpers.
 *
 * ASSUMPTION: APPROX_USD_RATES are rough "units per 1 USD" values used only to
 * apply the USD scoring benchmarks to other currencies. They are not live
 * exchange rates; users can override the rate per report in the app.
 */
export const APPROX_USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  PKR: 280,
  INR: 85,
  BDT: 120,
  LKR: 300,
  NPR: 136,
  AFN: 70,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.385,
  BHD: 0.376,
  JOD: 0.709,
  EGP: 49,
  MAD: 10,
  TND: 3.1,
  DZD: 135,
  IQD: 1310,
  ILS: 3.7,
  TRY: 34,
  IRR: 42000,
  CAD: 1.37,
  AUD: 1.53,
  NZD: 1.65,
  CHF: 0.88,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  PLN: 4,
  CZK: 23,
  HUF: 360,
  RON: 4.6,
  BGN: 1.8,
  UAH: 41,
  RUB: 90,
  KZT: 480,
  UZS: 12700,
  JPY: 150,
  CNY: 7.2,
  HKD: 7.8,
  TWD: 32,
  KRW: 1350,
  SGD: 1.35,
  MYR: 4.5,
  THB: 34,
  IDR: 16000,
  PHP: 57,
  VND: 25000,
  MMK: 2100,
  KHR: 4100,
  BRL: 5.5,
  MXN: 18,
  ARS: 950,
  CLP: 930,
  COP: 4000,
  PEN: 3.75,
  UYU: 40,
  DOP: 59,
  ZAR: 18,
  NGN: 1550,
  KES: 129,
  GHS: 15,
  UGX: 3700,
  TZS: 2650,
  ETB: 120,
  XOF: 605,
  XAF: 605,
  RWF: 1350,
  ZMW: 26,
};

/** Currencies whose amounts are close enough to USD to use the benchmarks as-is. */
export const USD_LIKE_CURRENCIES = new Set(["USD", "EUR", "GBP", "CAD", "AUD", "NZD", "CHF", "SGD"]);

/** Popular currencies shown at the top of pickers. */
export const POPULAR_CURRENCIES = [
  "USD",
  "PKR",
  "INR",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "BDT",
  "CAD",
  "AUD",
  "NGN",
  "EGP",
  "TRY",
  "BRL",
  "MXN",
  "IDR",
  "PHP",
  "MYR",
  "ZAR",
];

export function isValidCurrency(code: string): boolean {
  if (!/^[A-Z]{3}$/.test(code)) return false;
  try {
    new Intl.NumberFormat("en-US", { style: "currency", currency: code });
    return true;
  } catch {
    return false;
  }
}

/** Units of `currency` per 1 USD: the report's own rate, else the built-in approximation. */
export function usdRateFor(currency: string | null, override?: number | null): number | null {
  if (override && override > 0) return override;
  if (!currency) return 1;
  return APPROX_USD_RATES[currency] ?? null;
}
