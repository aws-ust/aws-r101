const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function recruitmentYearString(): string {
  return String(recruitmentYearInt());
}

export function recruitmentYearInt(): number {
  const raw = process.env.RECRUITMENT_YEAR ?? "2026";
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2000 && year <= 9999 ? year : 2026;
}

export function generateApplicationCodeSuffix(length = 8): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    suffix += CODE_ALPHABET[index];
  }
  return suffix;
}

export function formatApplicationCode(suffix: string): string {
  return `AP-${recruitmentYearString()}-${suffix}`;
}

export function generateApplicationCode(): string {
  return formatApplicationCode(generateApplicationCodeSuffix());
}
