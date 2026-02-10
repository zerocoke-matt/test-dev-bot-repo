// Type Definitions
interface CoinData {
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  aggregateOI: number;
  ratio: number;
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

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Configuration
const API_BASE = 'http://localhost:3000/api';
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOAST_DURATION = 3000; // 3 seconds

// State Management
let coinsData: CoinData[] = [];
let filteredCoinsData: CoinData[] = [];
let currentSortColumn: string | null = null;
let currentSortDirection: 'asc' | 'desc' = 'asc';
let autoRefreshTimer: number | null = null;
let isLoading = false;

// DOM Elements
const elements = {
  refreshBtn: document.getElementById('refreshBtn') as HTMLButtonElement,
  darkModeToggle: document.getElementById('darkModeToggle') as HTMLButtonElement,
  lastUpdated: document.getElementById('lastUpdated') as HTMLSpanElement,
  multiplierInput: document.getElementById('multiplierInput') as HTMLInputElement,
  exchangesList: document.getElementById('exchangesList') as HTMLDivElement,
  autoRefreshToggle: document.getElementById('autoRefreshToggle') as HTMLInputElement,
  totalCoins: document.getElementById('totalCoins') as HTMLDivElement,
  passingCoins: document.getElementById('passingCoins') as HTMLDivElement,
  avgRatio: document.getElementById('avgRatio') as HTMLDivElement,
  passRate: document.getElementById('passRate') as HTMLDivElement,
  loadingState: document.getElementById('loadingState') as HTMLDivElement,
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
    const response = await fetch(`${API_BASE}/coins`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch coins data');
    }
    // Backend wraps coins in { data: { coins, total, filtered, ... } }
    const envelope = result.data as { coins: CoinData[]; total: number; filtered: number; returned: number; config: unknown };
    return envelope.coins;
  } catch (error) {
    console.error('Error fetching coins:', error);
    throw error;
  }
}

async function fetchStatistics(): Promise<Statistics> {
  try {
    const response = await fetch(`${API_BASE}/statistics`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result: ApiResponse<Statistics> = await response.json();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch statistics');
    }
    return result.data;
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

  // Calculate pass rate from totalCoins and filteredCoins
  const passRate = stats.totalCoins > 0
    ? (stats.filteredCoins / stats.totalCoins) * 100
    : 0;
  elements.passRate.textContent = formatPercentage(passRate);
}

function renderCoinRow(coin: CoinData): string {
  const statusBadge = coin.passesFilter
    ? '<span class="status-badge pass">✅ Pass</span>'
    : '<span class="status-badge fail">❌ Fail</span>';

  const rowClass = coin.passesFilter ? 'pass' : '';
  const ratioClass = coin.passesFilter ? 'ratio-highlight' : '';

  return `
    <tr class="${rowClass}">
      <td>
        <div class="symbol-cell" onclick="window.copyToClipboard('${coin.symbol}')">
          ${coin.symbol}
          <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </div>
      </td>
      <td>${coin.name}</td>
      <td class="text-right price-formatted">${formatPrice(coin.price)}</td>
      <td class="text-right market-cap-formatted">${formatCurrency(coin.marketCap)}</td>
      <td class="text-right oi-formatted">${formatCurrency(coin.aggregateOI)}</td>
      <td class="text-right ${ratioClass}">${formatRatio(coin.ratio)}</td>
      <td class="text-center">${statusBadge}</td>
      <td class="text-right">${formatTimestamp(coin.lastUpdated)}</td>
    </tr>
  `;
}

function renderTable(coins: CoinData[]): void {
  if (coins.length === 0) {
    elements.tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No coins match your search criteria</td></tr>';
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

  filteredCoinsData = displayCoins;
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
  elements.loadingState.style.display = 'flex';
  elements.errorState.style.display = 'none';
  elements.tableSection.style.display = 'none';
  elements.refreshBtn.classList.add('loading');
}

function hideLoading(): void {
  isLoading = false;
  elements.loadingState.style.display = 'none';
  elements.tableSection.style.display = 'block';
  elements.refreshBtn.classList.remove('loading');
}

function showError(title: string, message: string): void {
  elements.errorTitle.textContent = title;
  elements.errorMessage.textContent = message;
  elements.errorState.style.display = 'block';
  elements.loadingState.style.display = 'none';
  elements.tableSection.style.display = 'none';
}

// Data Loading
async function loadData(): Promise<void> {
  if (isLoading) {
    return;
  }

  showLoading();

  try {
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
  loadData();
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

function handleMultiplierChange(): void {
  const value = parseFloat(elements.multiplierInput.value);
  if (isNaN(value) || value < 0.1 || value > 10) {
    showToast('Please enter a valid multiplier (0.1 - 10)', 'warning');
    return;
  }

  // In a real implementation, this would trigger a backend update
  // For now, just show a message
  showToast('Filter updated (reload required)', 'warning');
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

  // Multiplier input
  elements.multiplierInput.addEventListener('change', handleMultiplierChange);

  // Table sorting
  const sortableHeaders = document.querySelectorAll('.coin-table th.sortable');
  sortableHeaders.forEach((header) => {
    header.addEventListener('click', handleSortClick);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    // Ctrl/Cmd + R: Refresh
    if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
      event.preventDefault();
      loadData();
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
