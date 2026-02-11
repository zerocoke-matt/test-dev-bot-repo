export function add(a: number, b: number): number {
  return a + b;
}

export function greet(name: string): string {
  return `Hello, ${name}!`;
}

export function modulo(a: number, b: number): number {
  if (b === 0) {
    throw new Error("Cannot perform modulo operation with divisor of zero");
  }
  return a % b;
}
