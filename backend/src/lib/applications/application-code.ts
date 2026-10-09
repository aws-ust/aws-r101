export function recruitmentYearInt(): number {
  const raw = process.env.RECRUITMENT_YEAR ?? "2026";
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2000 && year <= 9999 ? year : 2026;
}

export function generateApplicationCodeSuffix(length = 6): string {
  const max = 10 ** length;
  const value = Math.floor(Math.random() * max);
  return value.toString().padStart(length, "0");
}

/** Codes carry the year the application belongs to, which the officer hunt sets to its term. */
export function formatApplicationCode(suffix: string, year = recruitmentYearInt()): string {
  return `AP-${year}-${suffix}`;
}

export function generateApplicationCode(year = recruitmentYearInt()): string {
  return formatApplicationCode(generateApplicationCodeSuffix(), year);
}
