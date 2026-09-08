const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function recruitmentYear(): string {
  const raw = process.env.RECRUITMENT_YEAR ?? "2026";
  return /^\d{4}$/.test(raw) ? raw : "2026";
}

export function generateApplicationCodeSuffix(length = 6): string {
  let suffix = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * CODE_ALPHABET.length);
    suffix += CODE_ALPHABET[index];
  }
  return suffix;
}

export function formatApplicationCode(suffix: string): string {
  return `AP-${recruitmentYear()}-${suffix}`;
}

export function generateApplicationCode(): string {
  return formatApplicationCode(generateApplicationCodeSuffix());
}
