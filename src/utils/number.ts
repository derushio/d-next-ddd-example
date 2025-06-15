import { lo } from '@/utils/lo';

export function numly(numly?: string, def: number | null | undefined = 0) {
  const numlyNumber = numly == null ? def : Number(numly);
  return Number.isNaN(numlyNumber) ? def : numlyNumber;
}

export function nanzero(n: number) {
  return Number.isNaN(n) ? 0 : n;
}

export function randomMisalignment(
  base: number,
  misalignmentRate: number,
  float = false,
): number {
  // baseの値に対してmisalignmentRate%の範囲でランダムな誤差を加える
  const misalignmentBase =
    base * lo.random(-misalignmentRate, misalignmentRate, true);
  const misalignment =
    0 <= base ? Math.max(0, misalignmentBase) : Math.min(0, misalignmentBase);
  const res = base + misalignment;
  return float ? res : lo.round(res);
}

/**
 * ゼロ付近の登場をさらに多くする
 */
export function randomPow(
  pow: number,
  start: number,
  end?: number,
  reverse = false,
  float = false,
) {
  if (end == null) {
    end = start;
    start = 0;
  }

  if (start === end) {
    return start;
  }

  const p = reverse
    ? 1 - Math.pow(Math.random(), pow)
    : Math.pow(Math.random(), pow);

  const res = (end - start) * p + start;
  return float ? res : lo.round(res);
}

/**
 * 正規乱数を生成する
 */
export function randomNormal(
  /** 基本は6 */
  stdDevBase: number,
  start: number,
  end?: number,
  /** 指定なければ (start + end) / 2 */
  _mean?: number,
  float = false,
) {
  if (end == null) {
    end = start;
    start = 0;
  }

  if (start === end) {
    return start;
  }

  const stdDev = (end - start) / stdDevBase;
  const mean = _mean != null ? _mean : (start + end) / 2;

  function calcNormal() {
    // 正規乱数
    const r1 = Math.random();
    const r2 = Math.random();
    let value = Math.sqrt(-2.0 * Math.log(r1)) * Math.sin(2.0 * Math.PI * r2);
    // 値を平均0、標準偏差1に正規化する
    value = value * stdDev + mean;
    return value;
  }

  let value: number;
  while (true) {
    value = calcNormal();
    if (start <= value && value < end) {
      break;
    }
  }

  return float ? value : Math.round(value);
}

export function mathBetween(value: number, min: number, max: number) {
  return Math.max(Math.min(value, min), max);
}

export function randomProb(probability: number) {
  // 0 ~ 1の間でランダムな数値を生成
  const randomNumber = Math.random();

  // 受け取った確率と比較して、当選か不当選かを判定
  return randomNumber <= probability;
}

export function convertNumberToFullWidth(num: number): string {
  // 数字を文字列に変換
  const numStr = num.toString();
  // 全角数字への変換
  let fullWidthStr = '';

  for (let i = 0; i < numStr.length; i++) {
    const char = numStr.charAt(i);
    if (char >= '0' && char <= '9') {
      // 全角数字はUnicodeで0xFF10（'０'）から始まる
      fullWidthStr += String.fromCharCode(char.charCodeAt(0) + 0xfee0);
    } else {
      // 数字以外の文字はそのまま追加
      fullWidthStr += char;
    }
  }

  return fullWidthStr;
}
