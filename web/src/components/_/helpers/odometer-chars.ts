import { DIGIT_CELL, DIGIT_DELAY, DIGIT_GLYPHS, DIGIT_OFFSET, GAP_CELL } from '../constants/odometer';
import type { OdometerChar } from '../types/odometer-char';

const DIGIT = /^\d$/;
const GAP = ' ';

function staticChar(key: string, char: string): OdometerChar {
  const gap = char === GAP;
  return {
    key,
    glyphs: [gap ? '' : char],
    cellClassName: gap ? GAP_CELL : '',
    offsetClassName: DIGIT_OFFSET[0],
    delayClassName: DIGIT_DELAY[0],
  };
}

export function odometerChars(value: string): OdometerChar[] {
  let order = 0;
  const reversed = [...value].reverse().map((char, position): OdometerChar => {
    const key = String(position);
    if (!DIGIT.test(char)) return staticChar(key, char);
    const delay = DIGIT_DELAY[Math.min(order, DIGIT_DELAY.length - 1)];
    order += 1;
    return { key, glyphs: DIGIT_GLYPHS, cellClassName: DIGIT_CELL, offsetClassName: DIGIT_OFFSET[Number(char)], delayClassName: delay };
  });
  return reversed.reverse();
}
