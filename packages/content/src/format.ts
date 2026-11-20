import type { HalfSeasonId, StatChange } from '@emperor/core';
import { gameText, uiText } from './index';

const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

/** Chinese numerals for 1 to 199. */
export function formatChineseNumber(n: number): string {
  if (n < 10) return DIGITS[n] as string;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return (tens === 1 ? '' : DIGITS[tens]) + '十' + (ones === 0 ? '' : DIGITS[ones]);
  }
  const rest = n - 100;
  if (rest === 0) return '一百';
  if (rest < 10) return '一百零' + DIGITS[rest];
  return '一百' + formatChineseNumber(rest).replace(/^十/, '一十');
}

export function formatDate(eraName: string, reignYear: number, halfSeason: HalfSeasonId): string {
  const year = reignYear === 1 ? '元' : formatChineseNumber(reignYear);
  return `${eraName}${year}年 ${gameText.halfSeasonLabels[halfSeason]}`;
}

export function formatAge(age: number): string {
  return `${formatChineseNumber(age)}歲`;
}

export function formatChanges(changes: readonly StatChange[]): string {
  if (changes.length === 0) return uiText.noChange;
  return changes
    .map((c) => `${gameText.statLabels[c.stat]} ${c.amount < 0 ? '−' : '+'}${Math.abs(c.amount)}`)
    .join('，');
}

export function formatReign(years: number): string {
  return `在位${formatChineseNumber(years)}年`;
}

export function formatLifespan(age: number): string {
  return `享年${formatChineseNumber(age)}歲`;
}
