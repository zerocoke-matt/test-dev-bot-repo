import { add, subtract, multiply, greet } from './utils';

describe('add', () => {
  test('should add two positive numbers', () => {
    expect(add(2, 3)).toBe(5);
  });

  test('should handle zero identity', () => {
    expect(add(5, 0)).toBe(5);
  });

  test('should add two negative numbers', () => {
    expect(add(-2, -3)).toBe(-5);
  });

  test('should add numbers with mixed signs', () => {
    expect(add(5, -3)).toBe(2);
  });

  test('should add decimal numbers', () => {
    expect(add(1.5, 2.5)).toBe(4);
  });

  test('should add large numbers', () => {
    expect(add(1000000, 2000000)).toBe(3000000);
  });
});

describe('subtract', () => {
  test('should subtract two positive numbers', () => {
    expect(subtract(5, 3)).toBe(2);
  });

  test('should handle zero identity', () => {
    expect(subtract(5, 0)).toBe(5);
  });

  test('should return negative result when second number is larger', () => {
    expect(subtract(3, 5)).toBe(-2);
  });

  test('should subtract negative number (double negative)', () => {
    expect(subtract(5, -3)).toBe(8);
  });

  test('should subtract two negative numbers', () => {
    expect(subtract(-2, -3)).toBe(1);
  });

  test('should subtract decimal numbers', () => {
    expect(subtract(5.5, 2.5)).toBe(3);
  });

  test('should return zero when subtracting equal numbers', () => {
    expect(subtract(7, 7)).toBe(0);
  });
});

describe('multiply', () => {
  test('should multiply two positive numbers', () => {
    expect(multiply(3, 4)).toBe(12);
  });

  test('should return zero when multiplying by zero', () => {
    expect(multiply(5, 0)).toBe(0);
  });

  test('should handle identity property with one', () => {
    expect(multiply(5, 1)).toBe(5);
  });

  test('should return negative when multiplying mixed signs', () => {
    expect(multiply(-3, 4)).toBe(-12);
  });

  test('should return positive when multiplying two negative numbers', () => {
    expect(multiply(-3, -4)).toBe(12);
  });

  test('should multiply decimal numbers', () => {
    expect(multiply(2.5, 4)).toBe(10);
  });

  test('should multiply small decimal numbers', () => {
    expect(multiply(0.5, 0.5)).toBe(0.25);
  });

  test('should multiply large numbers', () => {
    expect(multiply(1000, 2000)).toBe(2000000);
  });
});

describe('greet', () => {
  test('should greet with a basic name', () => {
    expect(greet('Alice')).toBe('Hello, Alice!');
  });

  test('should greet with a single letter name', () => {
    expect(greet('A')).toBe('Hello, A!');
  });

  test('should greet with a long name', () => {
    expect(greet('Alexander')).toBe('Hello, Alexander!');
  });

  test('should preserve the exact name provided', () => {
    expect(greet('John')).toBe('Hello, John!');
  });
});
