export function contains<T>(arr1: T[], arr2: T[]): boolean {
  return arr2.some((item) => arr1.includes(item));
}

export const filterNull = <T>(v: T): v is NonNullable<T> => v != null;
