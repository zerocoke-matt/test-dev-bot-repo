import assert from 'assert';
import { modulo } from './utils';

console.log('Running modulo function tests...\n');

// Basic Operations
console.log('Testing Basic Operations...');
assert.strictEqual(modulo(10, 3), 1, 'modulo(10, 3) should equal 1');
console.log('✓ modulo(10, 3) = 1');

assert.strictEqual(modulo(7, 4), 3, 'modulo(7, 4) should equal 3');
console.log('✓ modulo(7, 4) = 3');

assert.strictEqual(modulo(15, 15), 0, 'modulo(15, 15) should equal 0');
console.log('✓ modulo(15, 15) = 0');

// Zero Cases
console.log('\nTesting Zero Cases...');
assert.strictEqual(modulo(0, 5), 0, 'modulo(0, 5) should equal 0');
console.log('✓ modulo(0, 5) = 0');

assert.throws(
  () => modulo(5, 0),
  { message: 'Cannot perform modulo operation with divisor of zero' },
  'modulo(5, 0) should throw an error'
);
console.log('✓ modulo(5, 0) throws Error with correct message');

// Negative Numbers
console.log('\nTesting Negative Numbers...');
assert.strictEqual(modulo(-17, 5), -2, 'modulo(-17, 5) should equal -2');
console.log('✓ modulo(-17, 5) = -2');

assert.strictEqual(modulo(17, -5), 2, 'modulo(17, -5) should equal 2');
console.log('✓ modulo(17, -5) = 2');

assert.strictEqual(modulo(-17, -5), -2, 'modulo(-17, -5) should equal -2');
console.log('✓ modulo(-17, -5) = -2');

// Decimal Numbers
console.log('\nTesting Decimal Numbers...');
assert.strictEqual(modulo(5.5, 2), 1.5, 'modulo(5.5, 2) should equal 1.5');
console.log('✓ modulo(5.5, 2) = 1.5');

assert.strictEqual(modulo(10, 3.5), 3, 'modulo(10, 3.5) should equal 3');
console.log('✓ modulo(10, 3.5) = 3');

// Large Numbers
console.log('\nTesting Large Numbers...');
assert.strictEqual(modulo(1000000, 7), 1, 'modulo(1000000, 7) should equal 1');
console.log('✓ modulo(1000000, 7) = 1');

// Additional Error Handling Tests
console.log('\nTesting Additional Error Cases...');
assert.throws(
  () => modulo(0, 0),
  { message: 'Cannot perform modulo operation with divisor of zero' },
  'modulo(0, 0) should throw an error'
);
console.log('✓ modulo(0, 0) throws Error with correct message');

assert.throws(
  () => modulo(-5, 0),
  { message: 'Cannot perform modulo operation with divisor of zero' },
  'modulo(-5, 0) should throw an error'
);
console.log('✓ modulo(-5, 0) throws Error with correct message');

console.log('\n✅ All tests passed!');
