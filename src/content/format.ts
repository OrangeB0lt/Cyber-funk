/** Number formatting shared by content and UI. */

/** Doubloons as the game prints them: Ð1,250. */
export const fmtDoubloons = (n: number): string => 'Ð' + Math.round(n).toLocaleString('en-US');
