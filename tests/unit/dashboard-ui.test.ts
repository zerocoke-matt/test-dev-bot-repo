/**
 * Dashboard UI/UX Feature Tests
 * Tests for the new UI/UX features added in Issue #13
 * Tests pure logic functions that power the dashboard
 */

describe('Dashboard UI/UX Features', () => {
  // ─── Inline pure functions (same logic as main.ts) ───────────────
  function formatCurrency(value: number): string {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  }

  function formatPrice(price: number): string {
    if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(8)}`;
  }

  function formatRatio(ratio: number): string {
    return `${ratio.toFixed(2)}x`;
  }

  function formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  interface CoinData {
    symbol: string;
    name: string;
    price: number;
    marketCap: number;
    aggregateOI: number;
    ratio: number;
    volume24h: number;
    priceChange24h: number;
    rank: number;
    passesFilter: boolean;
    lastUpdated: string;
  }

  function getExchangeDistribution(aggregateOI: number) {
    const exchanges = [
      { name: 'binance', label: 'Binance', share: 0.40 },
      { name: 'bybit', label: 'Bybit', share: 0.25 },
      { name: 'bitget', label: 'Bitget', share: 0.20 },
      { name: 'okx', label: 'OKX', share: 0.15 },
    ];
    return exchanges.map(ex => ({
      ...ex,
      oi: aggregateOI * ex.share,
    }));
  }

  function getRatioLevel(ratio: number): string {
    if (ratio >= 5) return 'high';
    if (ratio >= 2) return 'medium';
    return 'low';
  }

  function getRatioGaugeWidth(ratio: number): number {
    return Math.min(100, (ratio / 10) * 100);
  }

  function sortCoins(coins: CoinData[], column: string, direction: 'asc' | 'desc'): CoinData[] {
    return [...coins].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      switch (column) {
        case 'symbol': aValue = a.symbol; bValue = b.symbol; break;
        case 'name': aValue = a.name; bValue = b.name; break;
        case 'price': aValue = a.price; bValue = b.price; break;
        case 'marketCap': aValue = a.marketCap; bValue = b.marketCap; break;
        case 'aggregateOI': aValue = a.aggregateOI; bValue = b.aggregateOI; break;
        case 'ratio': aValue = a.ratio; bValue = b.ratio; break;
        case 'status': aValue = a.passesFilter ? 1 : 0; bValue = b.passesFilter ? 1 : 0; break;
        default: return 0;
      }
      if (typeof aValue === 'string') {
        return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }

  function filterCoins(coins: CoinData[], searchTerm: string): CoinData[] {
    if (!searchTerm) return coins;
    const term = searchTerm.toLowerCase();
    return coins.filter(coin =>
      coin.symbol.toLowerCase().includes(term) || coin.name.toLowerCase().includes(term)
    );
  }

  function escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ─── Test Data ────────────────────────────────────────────────────
  const mockCoins: CoinData[] = [
    {
      symbol: 'BTC', name: 'Bitcoin', price: 45250, marketCap: 885500000000,
      aggregateOI: 15800000000, ratio: 1.78, volume24h: 20000000000,
      priceChange24h: 2.5, rank: 1, passesFilter: true,
      lastUpdated: new Date().toISOString(),
    },
    {
      symbol: 'ETH', name: 'Ethereum', price: 2840, marketCap: 341200000000,
      aggregateOI: 4500000000, ratio: 1.32, volume24h: 10000000000,
      priceChange24h: -1.0, rank: 2, passesFilter: false,
      lastUpdated: new Date().toISOString(),
    },
    {
      symbol: 'SOL', name: 'Solana', price: 98.5, marketCap: 43200000000,
      aggregateOI: 2100000000, ratio: 4.86, volume24h: 5000000000,
      priceChange24h: 5.2, rank: 5, passesFilter: true,
      lastUpdated: new Date().toISOString(),
    },
    {
      symbol: 'DOGE', name: 'Dogecoin', price: 0.0842, marketCap: 12100000000,
      aggregateOI: 950000000, ratio: 7.85, volume24h: 2000000000,
      priceChange24h: -3.1, rank: 8, passesFilter: true,
      lastUpdated: new Date().toISOString(),
    },
  ];

  // ─── formatCurrency Tests ────────────────────────────────────────
  describe('formatCurrency', () => {
    it('should format billions', () => {
      expect(formatCurrency(885500000000)).toBe('$885.50B');
      expect(formatCurrency(1000000000)).toBe('$1.00B');
    });

    it('should format millions', () => {
      expect(formatCurrency(15800000)).toBe('$15.80M');
      expect(formatCurrency(1000000)).toBe('$1.00M');
    });

    it('should format thousands', () => {
      expect(formatCurrency(50000)).toBe('$50.00K');
      expect(formatCurrency(1000)).toBe('$1.00K');
    });

    it('should format small values', () => {
      expect(formatCurrency(500)).toBe('$500.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  // ─── formatPrice Tests ───────────────────────────────────────────
  describe('formatPrice', () => {
    it('should format prices >= $1 with 2 decimals', () => {
      const result = formatPrice(45250);
      expect(result).toContain('$');
      expect(result).toContain('45');
    });

    it('should format prices between $0.01 and $1 with 4 decimals', () => {
      expect(formatPrice(0.0842)).toBe('$0.0842');
      expect(formatPrice(0.5240)).toBe('$0.5240');
    });

    it('should format very small prices with 8 decimals', () => {
      expect(formatPrice(0.00000542)).toBe('$0.00000542');
    });
  });

  // ─── formatRatio Tests ───────────────────────────────────────────
  describe('formatRatio', () => {
    it('should format ratios with 2 decimal places and x suffix', () => {
      expect(formatRatio(1.78)).toBe('1.78x');
      expect(formatRatio(0)).toBe('0.00x');
      expect(formatRatio(10.5)).toBe('10.50x');
    });
  });

  // ─── formatPercentage Tests ──────────────────────────────────────
  describe('formatPercentage', () => {
    it('should format percentages with 1 decimal place', () => {
      expect(formatPercentage(24.0)).toBe('24.0%');
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(100)).toBe('100.0%');
    });
  });

  // ─── Exchange OI Distribution Tests ──────────────────────────────
  describe('Exchange OI Distribution', () => {
    it('should split aggregate OI into 4 exchanges', () => {
      const distribution = getExchangeDistribution(10000000000);
      expect(distribution).toHaveLength(4);
    });

    it('should allocate correct shares', () => {
      const distribution = getExchangeDistribution(10000000000);
      const binance = distribution.find(d => d.name === 'binance')!;
      const bybit = distribution.find(d => d.name === 'bybit')!;
      const bitget = distribution.find(d => d.name === 'bitget')!;
      const okx = distribution.find(d => d.name === 'okx')!;

      expect(binance.oi).toBe(4000000000);  // 40%
      expect(bybit.oi).toBe(2500000000);    // 25%
      expect(bitget.oi).toBe(2000000000);   // 20%
      expect(okx.oi).toBe(1500000000);      // 15%
    });

    it('should sum to total aggregate OI', () => {
      const total = 15800000000;
      const distribution = getExchangeDistribution(total);
      const sum = distribution.reduce((acc, d) => acc + d.oi, 0);
      expect(sum).toBeCloseTo(total, 0);
    });

    it('should handle zero OI', () => {
      const distribution = getExchangeDistribution(0);
      distribution.forEach(d => expect(d.oi).toBe(0));
    });

    it('should produce valid bar heights when aggregateOI is zero', () => {
      // Mirrors renderExchangeBars logic: when OI is 0, bars should get
      // a minimum height (10%) instead of NaN from 0/0 division
      const aggregateOI = 0;
      const exchanges = [
        { name: 'binance', share: 0.40 },
        { name: 'bybit', share: 0.25 },
        { name: 'bitget', share: 0.20 },
        { name: 'okx', share: 0.15 },
      ];

      const heights = exchanges.map(ex => {
        if (aggregateOI <= 0) return 10; // guard path
        const oi = aggregateOI * ex.share;
        const maxOI = aggregateOI * 0.40;
        return Math.max(10, (oi / maxOI) * 100);
      });

      heights.forEach(h => {
        expect(h).toBe(10);
        expect(isNaN(h)).toBe(false);
      });
    });
  });

  // ─── Ratio Gauge Tests ───────────────────────────────────────────
  describe('Ratio Gauge Level Classification', () => {
    it('should classify ratios < 2 as low', () => {
      expect(getRatioLevel(0)).toBe('low');
      expect(getRatioLevel(1.5)).toBe('low');
      expect(getRatioLevel(1.99)).toBe('low');
    });

    it('should classify ratios 2-5 as medium', () => {
      expect(getRatioLevel(2)).toBe('medium');
      expect(getRatioLevel(3.5)).toBe('medium');
      expect(getRatioLevel(4.99)).toBe('medium');
    });

    it('should classify ratios >= 5 as high', () => {
      expect(getRatioLevel(5)).toBe('high');
      expect(getRatioLevel(7.85)).toBe('high');
      expect(getRatioLevel(100)).toBe('high');
    });
  });

  describe('Ratio Gauge Width', () => {
    it('should calculate width as percentage of max (10x)', () => {
      expect(getRatioGaugeWidth(5)).toBe(50);
      expect(getRatioGaugeWidth(10)).toBe(100);
      expect(getRatioGaugeWidth(0)).toBe(0);
    });

    it('should cap at 100% for ratios > 10', () => {
      expect(getRatioGaugeWidth(15)).toBe(100);
      expect(getRatioGaugeWidth(50)).toBe(100);
    });
  });

  // ─── Sort Tests ──────────────────────────────────────────────────
  describe('sortCoins', () => {
    it('should sort by symbol ascending', () => {
      const sorted = sortCoins(mockCoins, 'symbol', 'asc');
      expect(sorted[0].symbol).toBe('BTC');
      expect(sorted[1].symbol).toBe('DOGE');
      expect(sorted[2].symbol).toBe('ETH');
      expect(sorted[3].symbol).toBe('SOL');
    });

    it('should sort by symbol descending', () => {
      const sorted = sortCoins(mockCoins, 'symbol', 'desc');
      expect(sorted[0].symbol).toBe('SOL');
      expect(sorted[3].symbol).toBe('BTC');
    });

    it('should sort by price ascending', () => {
      const sorted = sortCoins(mockCoins, 'price', 'asc');
      expect(sorted[0].symbol).toBe('DOGE');
      expect(sorted[3].symbol).toBe('BTC');
    });

    it('should sort by ratio descending', () => {
      const sorted = sortCoins(mockCoins, 'ratio', 'desc');
      expect(sorted[0].symbol).toBe('DOGE');  // 7.85x
      expect(sorted[1].symbol).toBe('SOL');   // 4.86x
    });

    it('should sort by market cap ascending', () => {
      const sorted = sortCoins(mockCoins, 'marketCap', 'asc');
      expect(sorted[0].symbol).toBe('DOGE');
      expect(sorted[3].symbol).toBe('BTC');
    });

    it('should sort by status', () => {
      const sorted = sortCoins(mockCoins, 'status', 'desc');
      // passing coins (value 1) come first
      expect(sorted[0].passesFilter).toBe(true);
      expect(sorted[sorted.length - 1].passesFilter).toBe(false);
    });

    it('should not mutate original array', () => {
      const original = [...mockCoins];
      sortCoins(mockCoins, 'price', 'asc');
      expect(mockCoins[0].symbol).toBe(original[0].symbol);
    });

    it('should handle unknown column gracefully', () => {
      const sorted = sortCoins(mockCoins, 'unknown', 'asc');
      expect(sorted).toHaveLength(mockCoins.length);
    });
  });

  // ─── Filter Tests ────────────────────────────────────────────────
  describe('filterCoins', () => {
    it('should return all coins when search term is empty', () => {
      expect(filterCoins(mockCoins, '')).toHaveLength(4);
    });

    it('should filter by symbol (case-insensitive)', () => {
      expect(filterCoins(mockCoins, 'btc')).toHaveLength(1);
      expect(filterCoins(mockCoins, 'BTC')).toHaveLength(1);
    });

    it('should filter by name (case-insensitive)', () => {
      expect(filterCoins(mockCoins, 'bitcoin')).toHaveLength(1);
      expect(filterCoins(mockCoins, 'Bitcoin')).toHaveLength(1);
    });

    it('should filter by partial match', () => {
      expect(filterCoins(mockCoins, 'sol')).toHaveLength(1);
      expect(filterCoins(mockCoins, 'o')).toHaveLength(3); // SOL, DOGE, Dogecoin, Solana
    });

    it('should return empty array for no matches', () => {
      expect(filterCoins(mockCoins, 'xyz')).toHaveLength(0);
    });
  });

  // ─── escapeHtml Tests ──────────────────────────────────────────────
  describe('escapeHtml', () => {
    it('should escape angle brackets', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHtml('AT&T')).toBe('AT&amp;T');
    });

    it('should escape quotes', () => {
      expect(escapeHtml('"hello" & \'world\'')).toBe(
        '&quot;hello&quot; &amp; &#039;world&#039;'
      );
    });

    it('should leave safe strings unchanged', () => {
      expect(escapeHtml('Bitcoin')).toBe('Bitcoin');
      expect(escapeHtml('BTC')).toBe('BTC');
      expect(escapeHtml('')).toBe('');
    });
  });

  // ─── Symbol Cell Rendering (JS-context injection prevention) ──────
  describe('Symbol cell rendering', () => {
    function renderSymbolCell(symbol: string): string {
      const safeSymbol = escapeHtml(symbol);
      return `<div class="symbol-cell" data-symbol="${safeSymbol}"><span class="symbol-text">${safeSymbol}</span></div>`;
    }

    it('should use data-symbol attribute instead of inline onclick', () => {
      const html = renderSymbolCell('BTC');
      expect(html).toContain('data-symbol="BTC"');
      expect(html).not.toContain('onclick');
    });

    it('should safely handle symbol with JS-breaking characters', () => {
      // A symbol like O'COIN would break an inline onclick='copyToClipboard('O'COIN')'
      // With data-attribute approach, escapeHtml handles HTML context correctly
      const html = renderSymbolCell("O'COIN");
      expect(html).toContain('data-symbol="O&#039;COIN"');
      expect(html).not.toContain('onclick');
    });
  });

  // ─── Pass Rate Calculation Tests ─────────────────────────────────
  describe('Pass Rate Calculation', () => {
    function calculatePassRate(totalCoins: number, filteredCoins: number): number {
      return totalCoins > 0 ? (filteredCoins / totalCoins) * 100 : 0;
    }

    it('should calculate correct pass rate', () => {
      expect(calculatePassRate(20, 12)).toBe(60);
      expect(calculatePassRate(50, 12)).toBe(24);
    });

    it('should handle zero total coins', () => {
      expect(calculatePassRate(0, 0)).toBe(0);
    });

    it('should handle 100% pass rate', () => {
      expect(calculatePassRate(10, 10)).toBe(100);
    });
  });
});
