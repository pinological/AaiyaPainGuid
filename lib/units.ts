// Height is asked in feet and inches, weight in kg or lb; the app stores cm and kg.
export const ftInToCm = (ft: number, inch: number) => Math.round((ft * 12 + inch) * 2.54);
export const lbToKg = (lb: number) => Math.round(lb * 0.45359237 * 10) / 10;
export const kgToLb = (kg: number) => Math.round(kg / 0.45359237);

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const total = Math.round(cm / 2.54);
  return { ft: Math.floor(total / 12), inch: total % 12 };
}

export function formatHeight(cm: number): string {
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
}
