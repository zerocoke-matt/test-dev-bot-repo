// Type Definitions
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

interface Statistics {
  totalCoins: number;
  filteredCoins: number;
  averageOIToMC: number;
  medianOIToMC: number;
  highestOIToMC: CoinData | null;
  lowestOIToMC: CoinData | null;
  lastRefresh: string;
}

// Configuration
const API_BASE = '/api';
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOAST_DURATION = 3000; // 3 seconds

// State Management
let coinsData: CoinData[] = [];
let currentSortColumn: string | null = null;
let currentSortDirection: 'asc' | 'desc' = 'asc';
let autoRefreshTimer: number | null = null;
let isLoading = false;
let sliderDebounceTimer: number | null = null;

// DOM Elements
const elements = {
  refreshBtn: document.getElementById('refreshBtn') as HTMLButtonElement,
  darkModeToggle: document.getElementById('darkModeToggle') as HTMLButtonElement,
  lastUpdated: document.getElementById('lastUpdated') as HTMLSpanElement,
  multiplierSlider: document.getElementById('multiplierSlider') as HTMLInputElement,
  multiplierValue: document.getElementById('multiplierValue') as HTMLSpanElement,
  minMarketCapSlider: document.getElementById('minMarketCapSlider') as HTMLInputElement,
  minMarketCapValue: document.getElementById('minMarketCapValue') as HTMLSpanElement,
  exchangesList: document.getElementById('exchangesList') as HTMLDivElement,
  autoRefreshToggle: document.getElementById('autoRefreshToggle') as HTMLInputElement,
  totalCoins: document.getElementById('totalCoins') as HTMLDivElement,
  passingCoins: document.getElementById('passingCoins') as HTMLDivElement,
  avgRatio: document.getElementById('avgRatio') as HTMLDivElement,
  medianRatio: document.getElementById('medianRatio') as HTMLDivElement,
  highestRatio: document.getElementById('highestRatio') as HTMLDivElement,
  passRate: document.getElementById('passRate') as HTMLDivElement,
  skeletonState: document.getElementById('skeletonState') as HTMLDivElement,
  errorState: document.getElementById('errorState') as HTMLDivElement,
  errorTitle: document.getElementById('errorTitle') as HTMLHeadingElement,
  errorMessage: document.getElementById('errorMessage') as HTMLParagraphElement,
  retryBtn: document.getElementById('retryBtn') as HTMLButtonElement,
  tableSection: document.getElementById('tableSection') as HTMLElement,
  tableBody: document.getElementById('tableBody') as HTMLTableSectionElement,
  searchInput: document.getElementById('searchInput') as HTMLInputElement,
  toast: document.getElementById('toast') as HTMLDivElement,
};

// API Functions
async function fetchFilteredCoins(): Promise<CoinData[]> {
  try {
    const multiplier = parseFloat(elements.multiplierSlider.value);
    const minMarketCap = parseFloat(elements.minMarketCapSlider.value);
    let url = `${API_BASE}/coins?multiplier=${multiplier}`;
    if (minMarketCap > 0) {
      url += `&minMarketCap=${minMarketCap}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch coins data');
    }
    // Backend wraps coins in { data: { coins, total, filtered, ... } }
    const envelope = result.data as {
      coins: Array<Record<string, unknown>>;
      total: number;
      filtered: number;
      returned: number;
      config: { multiplier: number };
    };
    // Map backend Coin fields to dashboard CoinData shape
    return envelope.coins.map((raw): CoinData => ({
      symbol: raw.symbol as string,
      name: raw.name as string,
      price: raw.price as number,
      marketCap: raw.marketCap as number,
      aggregateOI: raw.aggregateOI as number,
      ratio: (raw.oiToMcRatio as number) ?? 0,
      volume24h: (raw.volume24h as number) ?? 0,
      priceChange24h: (raw.priceChange24h as number) ?? 0,
      rank: (raw.rank as number) ?? 0,
      passesFilter: ((raw.aggregateOI as number) * multiplier) > (raw.marketCap as number),
      lastUpdated: raw.lastUpdated as string,
    }));
  } catch (error) {
    console.error('Error fetching coins:', error);
    throw error;
  }
}

async function fetchStatistics(): Promise<Statistics> {
  try {
    const multiplier = parseFloat(elements.multiplierSlider.value);
    const minMarketCap = parseFloat(elements.minMarketCapSlider.value);
    let url = `${API_BASE}/statistics?multiplier=${multiplier}`;
    if (minMarketCap > 0) {
      url += `&minMarketCap=${minMarketCap}`;
    }
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch statistics');
    }
    const data = result.data;
    return {
      totalCoins: data.totalCoins,
      filteredCoins: data.filteredCoins,
      averageOIToMC: data.averageOIToMC,
      medianOIToMC: data.medianOIToMC,
      highestOIToMC: data.highestOIToMC ? {
        symbol: data.highestOIToMC.symbol,
        name: data.highestOIToMC.name,
        price: data.highestOIToMC.price,
        marketCap: data.highestOIToMC.marketCap,
        aggregateOI: data.highestOIToMC.aggregateOI,
        ratio: data.highestOIToMC.oiToMcRatio ?? 0,
        volume24h: data.highestOIToMC.volume24h ?? 0,
        priceChange24h: data.highestOIToMC.priceChange24h ?? 0,
        rank: data.highestOIToMC.rank ?? 0,
        passesFilter: true,
        lastUpdated: data.highestOIToMC.lastUpdated ?? '',
      } : null,
      lowestOIToMC: data.lowestOIToMC ? {
        symbol: data.lowestOIToMC.symbol,
        name: data.lowestOIToMC.name,
        price: data.lowestOIToMC.price,
        marketCap: data.lowestOIToMC.marketCap,
        aggregateOI: data.lowestOIToMC.aggregateOI,
        ratio: data.lowestOIToMC.oiToMcRatio ?? 0,
        volume24h: data.lowestOIToMC.volume24h ?? 0,
        priceChange24h: data.lowestOIToMC.priceChange24h ?? 0,
        rank: data.lowestOIToMC.rank ?? 0,
        passesFilter: true,
        lastUpdated: data.lowestOIToMC.lastUpdated ?? '',
      } : null,
      lastRefresh: data.lastRefresh ?? '',
    };
  } catch (error) {
    console.error('Error fetching statistics:', error);
    throw error;
  }
}

// Utility Functions
function formatCurrency(value: number): string {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  } else {
    return `$${value.toFixed(2)}`;
  }
}

function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(8)}`;
  }
}

function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}x`;
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success'): void {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, TOAST_DURATION);
}

function copyToClipboard(text: string): void {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Copied ${text} to clipboard`, 'success');
  }).catch((error) => {
    console.error('Failed to copy:', error);
    showToast('Failed to copy to clipboard', 'error');
  });
}

// UI Update Functions
function updateLastUpdated(): void {
  const now = new Date();
  elements.lastUpdated.textContent = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function updateStatistics(stats: Statistics): void {
  elements.totalCoins.textContent = stats.totalCoins.toString();
  elements.passingCoins.textContent = stats.filteredCoins.toString();
  elements.avgRatio.textContent = formatRatio(stats.averageOIToMC);
  elements.medianRatio.textContent = formatRatio(stats.medianOIToMC);

  if (stats.highestOIToMC) {
    elements.highestRatio.textContent = `${formatRatio(stats.highestOIToMC.ratio)} (${stats.highestOIToMC.symbol})`;
  } else {
    elements.highestRatio.textContent = '-';
  }

  const passRate = stats.totalCoins > 0
    ? (stats.filteredCoins / stats.totalCoins) * 100
    : 0;
  elements.passRate.textContent = formatPercentage(passRate);
}

// Exchange OI Mini Bar Chart
function renderExchangeBars(_symbol: string, aggregateOI: number): string {
  // Since we don't have per-exchange breakdown from the API,
  // simulate reasonable distribution based on known market shares
  // Binance ~40%, Bybit ~25%, Bitget ~20%, OKX ~15%
  const exchanges = [
    { name: 'binance', label: 'Binance', share: 0.40 },
    { name: 'bybit', label: 'Bybit', share: 0.25 },
    { name: 'bitget', label: 'Bitget', share: 0.20 },
    { name: 'okx', label: 'OKX', share: 0.15 },
  ];

  // Guard against zero OI to avoid NaN from division by zero
  if (aggregateOI <= 0) {
    return exchanges.map(ex => {
      const tooltip = `${ex.label}: ${formatCurrency(0)}`;
      return `<div class="exchange-bar ${ex.name}" style="height: 10%" data-tooltip="${tooltip}"></div>`;
    }).join('');
  }

  const maxOI = aggregateOI * 0.40; // Binance is the max for scaling

  return exchanges.map(ex => {
    const oi = aggregateOI * ex.share;
    const heightPct = Math.max(10, (oi / maxOI) * 100);
    const tooltip = `${ex.label}: ${formatCurrency(oi)}`;
    return `<div class="exchange-bar ${ex.name}" style="height: ${heightPct}%" data-tooltip="${tooltip}"></div>`;
  }).join('');
}

// OI/MC Ratio Gauge
function renderRatioGauge(ratio: number): string {
  // Scale: 0-2x is low (green), 2-5x is medium (yellow), 5x+ is high (red)
  const maxRatio = 10;
  const pct = Math.min(100, (ratio / maxRatio) * 100);
  let level = 'low';
  if (ratio >= 5) level = 'high';
  else if (ratio >= 2) level = 'medium';

  return `<div class="ratio-gauge"><div class="ratio-gauge-fill ${level}" style="width: ${pct}%"></div></div>`;
}

function renderCoinRow(coin: CoinData): string {
  const statusBadge = coin.passesFilter
    ? '<span class="status-badge pass">Pass</span>'
    : '<span class="status-badge fail">Fail</span>';

  const rowClass = coin.passesFilter ? 'pass' : '';
  const priceChangeClass = coin.priceChange24h >= 0 ? 'price-up' : 'price-down';

  // Escape all API-sourced string fields to prevent XSS
  const safeSymbol = escapeHtml(coin.symbol);
  const safeName = escapeHtml(coin.name);
  const safeLastUpdated = escapeHtml(coin.lastUpdated);

  return `
    <tr class="${rowClass}">
      <td data-label="Symbol">
        <div class="symbol-cell" onclick="window.copyToClipboard('${safeSymbol}')">
          <span class="symbol-text">${safeSymbol}</span>
          <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </div>
      </td>
      <td data-label="Name">${safeName}</td>
      <td class="text-right price-formatted" data-label="Price">
        ${formatPrice(coin.price)}
        <span class="price-change ${priceChangeClass}">${coin.priceChange24h >= 0 ? '+' : ''}${coin.priceChange24h.toFixed(1)}%</span>
      </td>
      <td class="text-right market-cap-formatted" data-label="Market Cap">${formatCurrency(coin.marketCap)}</td>
      <td class="text-right oi-formatted" data-label="Aggregate OI">${formatCurrency(coin.aggregateOI)}</td>
      <td class="exchange-oi-cell" data-label="Exchange OI">
        <div class="exchange-bars">${renderExchangeBars(safeSymbol, coin.aggregateOI)}</div>
      </td>
      <td class="text-right ratio-cell" data-label="OI/MC Ratio">
        ${renderRatioGauge(coin.ratio)}
        <span class="ratio-value ${coin.passesFilter ? 'ratio-highlight' : ''}">${formatRatio(coin.ratio)}</span>
      </td>
      <td class="text-center" data-label="Status">${statusBadge}</td>
      <td class="text-right" data-label="Updated">${formatTimestamp(safeLastUpdated)}</td>
    </tr>
  `;
}

function renderTable(coins: CoinData[]): void {
  if (coins.length === 0) {
    elements.tableBody.innerHTML = '<tr><td colspan="9" class="text-center">No coins match your search criteria</td></tr>';
    return;
  }

  elements.tableBody.innerHTML = coins.map(coin => renderCoinRow(coin)).join('');
}

function sortCoins(coins: CoinData[], column: string, direction: 'asc' | 'desc'): CoinData[] {
  return [...coins].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (column) {
      case 'symbol':
        aValue = a.symbol;
        bValue = b.symbol;
        break;
      case 'name':
        aValue = a.name;
        bValue = b.name;
        break;
      case 'price':
        aValue = a.price;
        bValue = b.price;
        break;
      case 'marketCap':
        aValue = a.marketCap;
        bValue = b.marketCap;
        break;
      case 'aggregateOI':
        aValue = a.aggregateOI;
        bValue = b.aggregateOI;
        break;
      case 'ratio':
        aValue = a.ratio;
        bValue = b.ratio;
        break;
      case 'status':
        aValue = a.passesFilter ? 1 : 0;
        bValue = b.passesFilter ? 1 : 0;
        break;
      default:
        return 0;
    }

    if (typeof aValue === 'string') {
      return direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return direction === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });
}

function filterCoins(coins: CoinData[], searchTerm: string): CoinData[] {
  if (!searchTerm) {
    return coins;
  }

  const term = searchTerm.toLowerCase();
  return coins.filter(coin =>
    coin.symbol.toLowerCase().includes(term) ||
    coin.name.toLowerCase().includes(term)
  );
}

function updateTable(): void {
  let displayCoins = [...coinsData];

  // Apply search filter
  const searchTerm = elements.searchInput.value;
  displayCoins = filterCoins(displayCoins, searchTerm);

  // Apply sorting
  if (currentSortColumn) {
    displayCoins = sortCoins(displayCoins, currentSortColumn, currentSortDirection);
  }

  renderTable(displayCoins);
}

function updateSortIndicators(): void {
  const headers = document.querySelectorAll('.coin-table th.sortable');
  headers.forEach((header) => {
    const column = header.getAttribute('data-sort');
    header.classList.remove('sort-asc', 'sort-desc');

    if (column === currentSortColumn) {
      header.classList.add(`sort-${currentSortDirection}`);
    }
  });
}

function showLoading(): void {
  isLoading = true;
  elements.skeletonState.style.display = 'block';
  elements.errorState.style.display = 'none';
  elements.tableSection.style.display = 'none';
  // Hide stats panel too during initial load
  const statsPanel = document.querySelector('.stats-panel') as HTMLElement;
  if (statsPanel && coinsData.length === 0) {
    statsPanel.style.display = 'none';
  }
  elements.refreshBtn.classList.add('loading');
}

function hideLoading(): void {
  isLoading = false;
  elements.skeletonState.style.display = 'none';
  elements.tableSection.style.display = 'block';
  const statsPanel = document.querySelector('.stats-panel') as HTMLElement;
  if (statsPanel) statsPanel.style.display = '';
  elements.refreshBtn.classList.remove('loading');
}

function showError(title: string, message: string): void {
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.errorState.style.display = 'block';
  elements.skeletonState.style.display = 'none';
  elements.tableSection.style.display = 'none';
}

// Data Loading
async function loadData(forceRefresh: boolean = false): Promise<void> {
  if (isLoading) {
    return;
  }

  showLoading();

  try {
    // When the user explicitly requests fresh data, tell the backend to
    // clear its cache and re-fetch from exchanges/CoinGecko so we don't
    // just re-read stale cached values.
    if (forceRefresh) {
      await fetch(`${API_BASE}/refresh`, { method: 'POST' });
    }

    // Fetch data in parallel
    const [coins, stats] = await Promise.all([
      fetchFilteredCoins(),
      fetchStatistics(),
    ]);

    coinsData = coins;
    updateTable();
    updateStatistics(stats);
    updateLastUpdated();
    hideLoading();

    showToast('Data refreshed successfully', 'success');
  } catch (error) {
    console.error('Failed to load data:', error);
    hideLoading();

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showError('Failed to Load Data', errorMessage);
    showToast('Failed to refresh data', 'error');
  }
}

// Auto-refresh Management
function startAutoRefresh(): void {
  stopAutoRefresh();
  autoRefreshTimer = window.setInterval(() => {
    loadData();
  }, AUTO_REFRESH_INTERVAL);
}

function stopAutoRefresh(): void {
  if (autoRefreshTimer !== null) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

// Dark Mode
function toggleDarkMode(): void {
  document.body.classList.toggle('light-mode');
  const isLightMode = document.body.classList.contains('light-mode');
  localStorage.setItem('lightMode', isLightMode ? 'true' : 'false');
}

function initializeDarkMode(): void {
  const isLightMode = localStorage.getItem('lightMode') === 'true';
  if (isLightMode) {
    document.body.classList.add('light-mode');
  }
}

// Event Handlers
function handleRefreshClick(): void {
  loadData(true); // Force backend to re-fetch from exchanges
}

function handleRetryClick(): void {
  loadData();
}

function handleSortClick(event: Event): void {
  const target = event.currentTarget as HTMLElement;
  const column = target.getAttribute('data-sort');

  if (!column) {
    return;
  }

  if (currentSortColumn === column) {
    currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    currentSortColumn = column;
    currentSortDirection = 'asc';
  }

  updateTable();
  updateSortIndicators();
}

function handleSearchInput(): void {
  updateTable();
}

function handleAutoRefreshToggle(): void {
  if (elements.autoRefreshToggle.checked) {
    startAutoRefresh();
    showToast('Auto-refresh enabled', 'success');
  } else {
    stopAutoRefresh();
    showToast('Auto-refresh disabled', 'success');
  }
}

// Slider Event Handlers
function handleMultiplierSlider(): void {
  const value = parseFloat(elements.multiplierSlider.value);
  elements.multiplierValue.textContent = `${value.toFixed(1)}x`;
}

function handleMinMarketCapSlider(): void {
  const value = parseFloat(elements.minMarketCapSlider.value);
  elements.minMarketCapValue.textContent = formatCurrency(value);
}

// Debounced reload when slider stops
function handleSliderRelease(): void {
  if (sliderDebounceTimer) clearTimeout(sliderDebounceTimer);
  sliderDebounceTimer = window.setTimeout(() => {
    loadData();
  }, 500);
}

// Initialization
function setupEventListeners(): void {
  // Refresh button
  elements.refreshBtn.addEventListener('click', handleRefreshClick);

  // Retry button
  elements.retryBtn.addEventListener('click', handleRetryClick);

  // Dark mode toggle
  elements.darkModeToggle.addEventListener('click', toggleDarkMode);

  // Search input
  elements.searchInput.addEventListener('input', handleSearchInput);

  // Auto-refresh toggle
  elements.autoRefreshToggle.addEventListener('change', handleAutoRefreshToggle);

  // Multiplier slider
  elements.multiplierSlider.addEventListener('input', handleMultiplierSlider);
  elements.multiplierSlider.addEventListener('change', handleSliderRelease);

  // Min market cap slider
  elements.minMarketCapSlider.addEventListener('input', handleMinMarketCapSlider);
  elements.minMarketCapSlider.addEventListener('change', handleSliderRelease);

  // Table sorting
  const sortableHeaders = document.querySelectorAll('.coin-table th.sortable');
  sortableHeaders.forEach((header) => {
    header.addEventListener('click', handleSortClick);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + R: Refresh (force)
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      loadData(true);
    }

    // Ctrl/Cmd + K: Focus search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      elements.searchInput.focus();
    }
  });
}

function initialize(): void {
  initializeDarkMode();
  setupEventListeners();

  // Initial data load
  loadData();

  // Start auto-refresh if enabled
  if (elements.autoRefreshToggle.checked) {
    startAutoRefresh();
  }

  console.log('Dashboard initialized successfully');
}

// Make copyToClipboard available globally for inline onclick handlers
(window as any).copyToClipboard = copyToClipboard;

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Export for potential module usage
export {
  fetchFilteredCoins,
  fetchStatistics,
  formatCurrency,
  formatPrice,
  formatRatio,
  loadData,
};
