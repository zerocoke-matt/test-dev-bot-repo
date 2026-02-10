import { subtract, multiply } from './utils.js';

// Simple test runner
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error)
    });
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertEquals(actual: any, expected: any, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`
    );
  }
}

console.log('\n=== Testing subtract function ===\n');

// Basic functionality with positive numbers
test('subtract: basic positive numbers (5 - 3)', () => {
  assertEquals(subtract(5, 3), 2);
});

test('subtract: larger positive numbers (100 - 25)', () => {
  assertEquals(subtract(100, 25), 75);
});

test('subtract: same numbers return zero (10 - 10)', () => {
  assertEquals(subtract(10, 10), 0);
});

// Negative numbers
test('subtract: positive minus negative (5 - (-3))', () => {
  assertEquals(subtract(5, -3), 8);
});

test('subtract: negative minus positive (-5 - 3)', () => {
  assertEquals(subtract(-5, 3), -8);
});

test('subtract: negative minus negative (-5 - (-3))', () => {
  assertEquals(subtract(-5, -3), -2);
});

test('subtract: both negative numbers (-10 - (-15))', () => {
  assertEquals(subtract(-10, -15), 5);
});

// Zero cases
test('subtract: zero minus positive number (0 - 5)', () => {
  assertEquals(subtract(0, 5), -5);
});

test('subtract: positive number minus zero (5 - 0)', () => {
  assertEquals(subtract(5, 0), 5);
});

test('subtract: zero minus zero (0 - 0)', () => {
  assertEquals(subtract(0, 0), 0);
});

test('subtract: zero minus negative number (0 - (-5))', () => {
  assertEquals(subtract(0, -5), 5);
});

// Edge cases
test('subtract: decimal numbers (5.5 - 2.3)', () => {
  const result = subtract(5.5, 2.3);
  // Use approximate equality for floating point
  if (Math.abs(result - 3.2) > 0.0001) {
    throw new Error(`Expected approximately 3.2 but got ${result}`);
  }
});

test('subtract: very small numbers (0.1 - 0.2)', () => {
  const result = subtract(0.1, 0.2);
  // Allow for floating point precision issues
  if (Math.abs(result - (-0.1)) > 0.0001) {
    throw new Error(`Expected approximately -0.1 but got ${result}`);
  }
});

test('subtract: large numbers (1000000 - 999999)', () => {
  assertEquals(subtract(1000000, 999999), 1);
});

console.log('\n=== Testing multiply function ===\n');

// Basic functionality with positive numbers
test('multiply: basic positive numbers (5 * 3)', () => {
  assertEquals(multiply(5, 3), 15);
});

test('multiply: larger positive numbers (12 * 8)', () => {
  assertEquals(multiply(12, 8), 96);
});

test('multiply: multiply by one (7 * 1)', () => {
  assertEquals(multiply(7, 1), 7);
});

// Negative numbers
test('multiply: positive by negative (5 * -3)', () => {
  assertEquals(multiply(5, -3), -15);
});

test('multiply: negative by positive (-5 * 3)', () => {
  assertEquals(multiply(-5, 3), -15);
});

test('multiply: negative by negative (-5 * -3)', () => {
  assertEquals(multiply(-5, -3), 15);
});

test('multiply: both negative numbers (-4 * -6)', () => {
  assertEquals(multiply(-4, -6), 24);
});

// Zero cases
test('multiply: zero times positive number (0 * 5)', () => {
  assertEquals(multiply(0, 5), 0);
});

test('multiply: positive number times zero (5 * 0)', () => {
  assertEquals(multiply(5, 0), 0);
});

test('multiply: zero times zero (0 * 0)', () => {
  assertEquals(multiply(0, 0), 0);
});

test('multiply: zero times negative number (0 * -5)', () => {
  assertEquals(multiply(0, -5), 0);
});

test('multiply: negative number times zero (-5 * 0)', () => {
  assertEquals(multiply(-5, 0), 0);
});

// Edge cases
test('multiply: decimal numbers (2.5 * 4)', () => {
  assertEquals(multiply(2.5, 4), 10);
});

test('multiply: two decimal numbers (1.5 * 2.5)', () => {
  assertEquals(multiply(1.5, 2.5), 3.75);
});

test('multiply: very small numbers (0.1 * 0.1)', () => {
  const result = multiply(0.1, 0.1);
  // Allow for floating point precision issues
  if (Math.abs(result - 0.01) > 0.0001) {
    throw new Error(`Expected approximately 0.01 but got ${result}`);
  }
});

test('multiply: large numbers (1000 * 1000)', () => {
  assertEquals(multiply(1000, 1000), 1000000);
});

test('multiply: commutative property (3 * 5 === 5 * 3)', () => {
  assertEquals(multiply(3, 5), multiply(5, 3));
});

// Summary
console.log('\n=== Test Summary ===\n');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`Total tests: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  console.log('\nFailed tests:');
  results.filter(r => !r.passed).forEach(r => {
    console.log(`  - ${r.name}: ${r.error}`);
  });
  process.exit(1);
} else {
  console.log('\n✓ All tests passed!');
  process.exit(0);
}
