export function formatIndianCurrencyWords(amountCents: number) {
  if (!Number.isInteger(amountCents)) {
    throw new Error("Currency amount must be an integer number of paise.");
  }
  const absolute = Math.abs(amountCents);
  const rupees = Math.floor(absolute / 100);
  const paise = absolute % 100;
  const sign = amountCents < 0 ? "Minus " : "";
  const paiseWords = paise
    ? ` and ${twoDigitWords(paise)} ${paise === 1 ? "Paisa" : "Paise"}`
    : "";
  return `${sign}Rupees ${indianNumberWords(rupees)}${paiseWords} Only`;
}

function indianNumberWords(value: number) {
  if (value === 0) return "Zero";
  if (value > 999_999_999) return value.toLocaleString("en-IN");
  const parts: string[] = [];
  const crore = Math.floor(value / 10_000_000);
  const lakh = Math.floor((value % 10_000_000) / 100_000);
  const thousand = Math.floor((value % 100_000) / 1_000);
  const remainder = value % 1_000;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`);
  if (remainder) parts.push(threeDigitWords(remainder));
  return parts.join(" ");
}

function threeDigitWords(value: number) {
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return [
    hundreds ? `${smallNumberWords[hundreds]} Hundred` : "",
    remainder ? twoDigitWords(remainder) : "",
  ].filter(Boolean).join(" ");
}

function twoDigitWords(value: number) {
  if (value < 20) return smallNumberWords[value];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return `${tensWords[tens]}${units ? ` ${smallNumberWords[units]}` : ""}`;
}

const smallNumberWords = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];

const tensWords = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
