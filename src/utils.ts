export function add(a: number, b: number): number {
  return a + b;
}

export function divide(dividend: number, divisor: number): number {
  if (divisor === 0) {
    throw new Error("Division by zero is not allowed");
  }
  return dividend / divisor;
}

export function greet(name: string): string {
  return `Hello, ${name}!`;
}
