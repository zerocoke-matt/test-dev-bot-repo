# Coinglass OI vs MC Filter - Test Suite

This directory contains comprehensive unit and integration tests for the Coinglass OI vs MC filtering feature.

## Test Structure

```
tests/
├── unit/                      # Unit tests for individual services
│   ├── filter.service.test.ts     # Filter logic tests (67 tests)
│   ├── cache.service.test.ts      # Caching functionality tests (35 tests)
│   └── coinglass-client.test.ts   # API client tests (37 tests)
├── integration/               # Integration tests for complete flows
│   ├── aggregator.service.test.ts # End-to-end service tests (15 tests)
│   └── api.test.ts                # REST API endpoint tests (25 tests)
└── helpers/                   # Test utilities and mock data
    └── test-utils.ts              # Mock generators and helpers
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Generate coverage report
npm run test:coverage
```

## Test Coverage

Current coverage: **81.52%** overall

- **Statements**: 81.52%
- **Branches**: 70.4%
- **Functions**: 83.33%
- **Lines**: 81.73%

### Coverage by Module

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| Filter Service | 98.48% | 96.29% | 100% | 98.43% |
| Cache Service | 96.15% | 87.5% | 100% | 96.15% |
| Aggregator Service | 98.43% | 80% | 100% | 98.38% |
| Coinglass Client | 100% | 100% | 100% | 100% |
| API Routes | 87.27% | 61.11% | 100% | 87.27% |

## Test Categories

### 1. Filter Service Unit Tests (67 tests)

**Main Filter Logic**
- ✅ Filter passes when (OI * 0.5) > MC
- ✅ Filter fails when (OI * 0.5) <= MC
- ✅ Exact equality edge case

**Edge Cases**
- ✅ Zero market cap handling
- ✅ Zero OI handling
- ✅ Both zero values
- ✅ Negative market cap
- ✅ Negative OI
- ✅ Very large numbers (billions/trillions)
- ✅ Very small numbers (decimals)

**Custom Multipliers**
- ✅ Multiplier 0.3
- ✅ Multiplier 0.8
- ✅ Multiplier 1.0
- ✅ Multiplier 0 (edge case)

**Optional Filters**
- ✅ Minimum market cap filter
- ✅ Maximum market cap filter
- ✅ Minimum OI filter
- ✅ Specific symbols filter
- ✅ Case-insensitive symbol matching

**Sorting & Pagination**
- ✅ Sort by all fields (OI/MC ratio, market cap, OI, volume, price change)
- ✅ Ascending and descending order
- ✅ Pagination with limit and offset
- ✅ Edge cases (offset exceeds length, large limit)

**Validation**
- ✅ Valid config returns no errors
- ✅ Invalid multiplier bounds
- ✅ Negative value validation
- ✅ Min/max consistency checks
- ✅ Multiple validation errors

### 2. Cache Service Unit Tests (35 tests)

**Basic Operations**
- ✅ Set and get values
- ✅ Handle different data types
- ✅ Complex object handling
- ✅ Value overwriting

**TTL Management**
- ✅ Values expire after TTL
- ✅ Custom TTL per key
- ✅ No premature expiration

**Cache Control**
- ✅ Key existence check
- ✅ Delete operations
- ✅ Clear all cache
- ✅ Get cache statistics

**Advanced Features**
- ✅ getOrSet pattern (cache-aside)
- ✅ Bulk get (mget)
- ✅ Bulk set (mset)
- ✅ TTL inspection
- ✅ Key enumeration
- ✅ Active status check

### 3. Coinglass Client Unit Tests (37 tests)

**API Calls**
- ✅ Fetch coin list successfully
- ✅ Fetch open interest for symbol
- ✅ Fetch market cap for symbol
- ✅ Symbol case normalization

**Batch Operations**
- ✅ Batch fetch OI for multiple symbols
- ✅ Batch fetch market cap
- ✅ Partial failure handling
- ✅ Empty array handling

**Error Handling**
- ✅ API error responses (4xx, 5xx)
- ✅ Network errors
- ✅ Timeout errors
- ✅ Malformed responses
- ✅ Rate limiting

**Authentication**
- ✅ API key inclusion in headers
- ✅ Header validation

### 4. Aggregator Service Integration Tests (15 tests)

**End-to-End Flow**
- ✅ Complete fetch → filter → return flow
- ✅ API error handling
- ✅ Data enrichment accuracy

**Cache Integration**
- ✅ Cache hit scenario
- ✅ Cache miss scenario
- ✅ Force refresh bypass
- ✅ Cache statistics tracking
- ✅ Cache expiration handling

**Concurrent Operations**
- ✅ Multiple concurrent requests
- ✅ Race condition handling

**Error Recovery**
- ✅ Partial API failure recovery
- ✅ Graceful degradation

**Special Operations**
- ✅ Get coin by symbol
- ✅ Symbol caching
- ✅ Invalid symbol handling
- ✅ Statistics calculation
- ✅ Empty results handling
- ✅ Data refresh

### 5. API Endpoint Integration Tests (25 tests)

**Health Check (GET /api/health)**
- ✅ Returns 200 with status
- ✅ Includes uptime
- ✅ Reports cache status

**Get Filtered Coins (GET /api/coins)**
- ✅ Returns filtered coins
- ✅ Accepts multiplier parameter
- ✅ Accepts minMarketCap parameter
- ✅ Accepts sortBy/sortOrder parameters
- ✅ Accepts limit/offset parameters
- ✅ Accepts symbols parameter
- ✅ Error handling (500)

**Get Specific Coin (GET /api/coins/:symbol)**
- ✅ Returns coin by symbol
- ✅ Returns 404 for non-existent coin
- ✅ Handles lowercase symbols
- ✅ Error handling

**Get Statistics (GET /api/statistics)**
- ✅ Returns valid statistics
- ✅ Accepts filter parameters
- ✅ Error handling

**Refresh Data (POST /api/refresh)**
- ✅ Refreshes data successfully
- ✅ Returns proper response format
- ✅ Error handling

**Error Handling**
- ✅ 404 for invalid routes
- ✅ Malformed JSON handling

**Response Format**
- ✅ Always includes success field
- ✅ Includes error details on failure
- ✅ Returns JSON content type

## Testing Strategy

### Arrange-Act-Assert Pattern
All tests follow the AAA pattern for clarity:
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the function under test
3. **Assert**: Verify the expected outcome

### Test Isolation
- Each test is independent
- Mocks are reset before each test
- Cache is cleared after each test
- No shared state between tests

### Mock External Dependencies
- HTTP client is mocked for all API tests
- Coinglass API responses are simulated
- No actual network calls in tests

### Edge Case Coverage
- Zero values
- Negative values
- Very large numbers
- Very small decimals
- Empty arrays
- Null/undefined values
- Boundary conditions

## Key Testing Principles Applied

1. **Comprehensive Coverage**: >80% code coverage target
2. **Clear Test Names**: Describe what is being tested
3. **Independent Tests**: Can run in any order
4. **Fast Execution**: ~10 seconds for full suite
5. **Meaningful Assertions**: Test behavior, not implementation
6. **Error Scenarios**: Test both success and failure paths
7. **Edge Cases**: Cover boundary conditions
8. **Real-World Scenarios**: Integration tests mirror production usage

## Test Fixtures and Helpers

The `test-utils.ts` file provides:

- `createMockCoin()`: Generate mock coin data
- `createMockCoins()`: Generate multiple coins
- `createMockFilterConfig()`: Create filter configurations
- `createMockApiResponse()`: Mock Coinglass API responses
- `createMockAggregateOI()`: Mock open interest data
- `createMockMarketCap()`: Mock market cap data
- `wait()`: Async delay utility
- `assertCoinPassesFilter()`: Filter validation helper
- `calculateOIToMCRatio()`: Ratio calculation helper

## CI/CD Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test

- name: Check coverage
  run: npm run test:coverage
```

## Continuous Improvement

To maintain and improve test quality:

1. Add tests for new features immediately
2. Update tests when requirements change
3. Monitor coverage trends
4. Refactor tests when they become brittle
5. Keep test execution time under 15 seconds
6. Review failing tests promptly

## Notes

- Tests use Jest as the test framework
- ts-jest enables TypeScript support
- supertest is used for API endpoint testing
- Mock implementations use jest.mock()
- Async tests properly await promises
- Console logs are captured (can be silenced if needed)
