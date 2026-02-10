import { divide } from './utils';

describe('divide', () => {
  // Core functionality
  test('should divide two positive numbers correctly', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('should return decimal results', () => {
    expect(divide(10, 3)).toBeCloseTo(3.333, 2);
  });

  // Negative numbers
  test('should handle negative divisor', () => {
    expect(divide(10, -2)).toBe(-5);
  });

  test('should handle negative dividend', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  test('should handle both negative', () => {
    expect(divide(-10, -2)).toBe(5);
  });

  // Zero cases
  test('should handle zero as dividend', () => {
    expect(divide(0, 5)).toBe(0);
  });

  test('should throw error when divisor is zero', () => {
    expect(() => divide(10, 0)).toThrow(Error);
    expect(() => divide(10, 0)).toThrow('Division by zero is not allowed');
  });

  // Decimal inputs
  test('should handle decimal inputs', () => {
    expect(divide(10.5, 2.5)).toBeCloseTo(4.2, 1);
  });

  // Additional edge cases
  test('should handle very small divisors', () => {
    expect(divide(1, 0.0001)).toBe(10000);
  });
});
