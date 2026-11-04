export interface NameLines {
  firstLine: string;
  secondLine: string;
}

/** "Томас-Георг Арктойський" → first name(s) on top, surname below (Neurotree style). */
export function splitNameIntoTwoLines(fullName: string): NameLines {
  const words = fullName.trim().split(/\s+/);
  const surname = words.length > 1 ? words.at(-1) : undefined;
  return surname === undefined
    ? { firstLine: words[0] ?? '', secondLine: '' }
    : { firstLine: words.slice(0, -1).join(' '), secondLine: surname };
}
