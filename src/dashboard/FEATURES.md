# Dashboard Features Overview

## Visual Layout

### Header Section
```
┌─────────────────────────────────────────────────────────────────┐
│  Coinglass OI vs MC Dashboard                 Last Updated: ... │
│  Cryptocurrency Open Interest to Market Cap   [Refresh] [🌙]   │
└─────────────────────────────────────────────────────────────────┘
```

### Filter Panel
```
┌─────────────────────────────────────────────────────────────────┐
│  Filter Configuration                                            │
│                                                                  │
│  OI to MC Multiplier: [1.5]x                                    │
│  Exchanges: [Binance] [Bybit] [OKX]                            │
│  ☑ Auto-refresh (5 min)                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Statistics Panel (4 Cards)
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🕐           │ │ ✅           │ │ 💰           │ │ 📊           │
│ Total Coins  │ │ Passing      │ │ Avg OI/MC    │ │ Pass Rate    │
│     50       │ │     12       │ │   1.35x      │ │    24.0%     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Coin Table
```
┌────────────────────────────────────────────────────────────────────────┐
│  Filtered Cryptocurrencies                      [Search coins...]      │
├──────┬──────────┬─────────┬───────────┬────────────┬─────────┬────────┤
│Symbol│   Name   │  Price  │Market Cap │Aggregate OI│OI/MC    │ Status │
├──────┼──────────┼─────────┼───────────┼────────────┼─────────┼────────┤
│ BTC  │ Bitcoin  │$45,250  │ $885.50B  │  $15.80B   │ 1.78x ✅│  Pass  │
│ ETH  │ Ethereum │ $2,840  │ $341.20B  │   $4.50B   │ 1.32x   │  Fail  │
│ SOL  │ Solana   │  $98.50 │  $43.20B  │   $2.10B   │ 4.86x ✅│  Pass  │
└──────┴──────────┴─────────┴───────────┴────────────┴─────────┴────────┘
```

## Feature Breakdown

### 1. Data Display Features

#### Coin Table Columns
| Column | Format | Description | Sortable |
|--------|--------|-------------|----------|
| Symbol | Text | Cryptocurrency ticker (BTC, ETH) | ✅ |
| Name | Text | Full name (Bitcoin, Ethereum) | ✅ |
| Price | Currency | $XX,XXX.XX format | ✅ |
| Market Cap | Abbreviated | $XXB, $XXM, $XXK | ✅ |
| Aggregate OI | Abbreviated | $XXB, $XXM, $XXK | ✅ |
| OI/MC Ratio | Multiplier | X.XXx format | ✅ |
| Status | Badge | Pass ✅ / Fail ❌ | ✅ |
| Last Updated | Relative | "5m ago", "2h ago" | ❌ |

#### Number Formatting
- **Large numbers**: Automatically abbreviated
  - Billions: `$885.50B`
  - Millions: `$15.80M`
  - Thousands: `$123.45K`
- **Prices**: Dynamic precision
  - > $1: `$45,250.00`
  - $0.01-$1: `$0.5240`
  - < $0.01: `$0.00000842`
- **Ratios**: Fixed 2 decimals `1.78x`
- **Percentages**: Fixed 1 decimal `24.0%`

### 2. Interactive Features

#### Table Interactions
- **Sort by Column**: Click any column header
  - First click: Ascending ↑
  - Second click: Descending ↓
  - Visual indicator shows current sort
- **Search/Filter**: Real-time filtering
  - Search by symbol (BTC, ETH)
  - Search by name (Bitcoin, Ethereum)
  - Case-insensitive
- **Copy Symbol**: Click symbol to copy to clipboard
  - Visual feedback via toast notification

#### Controls
- **Refresh Button**: Manual data reload
  - Shows loading spinner during fetch
  - Toast notification on success/failure
- **Dark Mode Toggle**: Switch themes
  - Persists preference to localStorage
  - Smooth transition animation
- **Auto-refresh Toggle**: Enable/disable auto-refresh
  - Default: ON (5 minutes)
  - Configurable interval
- **Multiplier Input**: Adjust filter threshold
  - Range: 0.1 - 10.0x
  - Step: 0.1
  - Validation on change

### 3. Visual Feedback

#### Loading States
```
┌─────────────────────────────────┐
│                                 │
│          ⟳ (spinner)            │
│       Loading data...           │
│                                 │
└─────────────────────────────────┘
```

#### Error States
```
┌─────────────────────────────────┐
│          ⚠ (icon)               │
│     Error Loading Data          │
│  Please try again later.        │
│         [Retry]                 │
└─────────────────────────────────┘
```

#### Toast Notifications
```
┌─────────────────────────────────┐
│ Data refreshed successfully     │
└─────────────────────────────────┘
```
- Auto-dismiss after 3 seconds
- Color-coded by type:
  - Success: Green border
  - Error: Red border
  - Warning: Orange border

#### Row Highlighting
- **Passing coins**: Green background tint
- **Hover effect**: Subtle background change
- **Ratio highlight**: Bold green text for passing ratios

### 4. Responsive Design

#### Desktop (> 1024px)
- Full table with all columns
- 4-column statistics grid
- Side-by-side controls
- Optimal readability

#### Tablet (768px - 1024px)
- Slightly condensed table
- 2-column statistics grid
- Wrapped controls
- Horizontal scrolling for table

#### Mobile (< 768px)
- Scrollable table
- 1-column statistics grid
- Stacked controls
- Touch-friendly buttons
- Optimized font sizes

### 5. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + R` | Refresh data |
| `Ctrl/Cmd + K` | Focus search input |

### 6. Accessibility Features

- **ARIA Labels**: All interactive elements
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Semantic HTML structure
- **Focus Indicators**: Visible focus states
- **Alt Text**: SVG icons have descriptions
- **Color Contrast**: WCAG AA compliant
- **Reduced Motion**: Respects prefers-reduced-motion

### 7. Performance Features

#### Optimizations
- **Efficient DOM Updates**: Only changed elements
- **GPU Acceleration**: CSS transforms and opacity
- **Debounced Search**: Reduces unnecessary renders
- **Lazy Loading Ready**: Structure supports virtualization
- **Minified Production**: Terser optimization

#### Caching
- **Theme Preference**: localStorage
- **API Response**: 5-minute cache (via auto-refresh)

### 8. Advanced Features

#### Auto-Refresh Mechanism
```typescript
// Configurable interval
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// Automatic data reload
- Fetches new data every 5 minutes
- Updates statistics
- Refreshes table
- Shows success notification
- Can be toggled on/off
```

#### Data Fetching
```typescript
// Parallel API calls for performance
const [coins, stats] = await Promise.all([
  fetchFilteredCoins(),
  fetchStatistics(),
]);
```

#### Error Handling
- Network failures gracefully handled
- Clear error messages to users
- Retry mechanism available
- Fallback UI states

### 9. Color Scheme

#### Dark Mode (Default)
- Background: Dark gray (#1F2937)
- Text: Light gray (#F3F4F6)
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Orange (#F59E0B)
- Danger: Red (#EF4444)

#### Light Mode
- Background: Light gray (#F3F4F6)
- Text: Dark gray (#1F2937)
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Orange (#F59E0B)
- Danger: Red (#EF4444)

### 10. Data Flow

```
User Action (Click, Type, etc.)
        ↓
Event Handler
        ↓
State Update
        ↓
API Call (if needed)
        ↓
Data Processing
        ↓
DOM Update
        ↓
Visual Feedback
```

## Statistics Calculations

### Displayed Statistics

1. **Total Coins**: Count of all coins in dataset
2. **Passing Coins**: Count of coins with ratio > threshold
3. **Avg OI/MC Ratio**: Mean ratio across all coins
4. **Pass Rate**: (Passing Coins / Total Coins) × 100%

### Filter Logic

```typescript
// Coin passes filter if:
ratio >= (marketCap × multiplier)

// Example:
// BTC: ratio = 1.78, multiplier = 1.5
// 1.78 >= 1.5 → PASS ✅

// ETH: ratio = 1.32, multiplier = 1.5
// 1.32 < 1.5 → FAIL ❌
```

## Browser Compatibility Matrix

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 110+ | ✅ Full | Recommended |
| Firefox | 110+ | ✅ Full | Fully supported |
| Safari | 16+ | ✅ Full | iOS compatible |
| Edge | 110+ | ✅ Full | Chromium-based |
| Opera | 95+ | ✅ Full | Chromium-based |
| IE | Any | ❌ No | Not supported |

## Testing Checklist

### Functional Tests
- [ ] Data loads on page load
- [ ] Refresh button updates data
- [ ] Sort ascending works on all columns
- [ ] Sort descending works on all columns
- [ ] Search filters correctly
- [ ] Clear search shows all results
- [ ] Copy to clipboard works
- [ ] Dark mode toggles correctly
- [ ] Auto-refresh can be enabled/disabled
- [ ] Multiplier input validates range
- [ ] Toast notifications appear and dismiss
- [ ] Error state displays on API failure
- [ ] Retry button recovers from errors

### Visual Tests
- [ ] Layout looks correct on desktop
- [ ] Layout looks correct on tablet
- [ ] Layout looks correct on mobile
- [ ] Colors are correct in dark mode
- [ ] Colors are correct in light mode
- [ ] Passing rows are highlighted
- [ ] Hover effects work
- [ ] Loading spinner displays
- [ ] Icons render correctly
- [ ] Table is scrollable on small screens

### Performance Tests
- [ ] Initial load time < 2s
- [ ] Data refresh < 1s
- [ ] Search response instant
- [ ] Sort response instant
- [ ] No layout shifts (CLS)
- [ ] Smooth animations (60fps)

### Accessibility Tests
- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Reduced motion respected

## Usage Examples

### Example 1: Finding High OI Coins
1. Open dashboard
2. Wait for data to load
3. Click "OI/MC Ratio" column header to sort descending
4. Top coins have highest OI relative to market cap
5. Look for ✅ Pass badges

### Example 2: Searching for Specific Coin
1. Click in search box (or press Ctrl+K)
2. Type "BTC"
3. Table filters to show only Bitcoin
4. Click symbol to copy "BTC" to clipboard

### Example 3: Monitoring Over Time
1. Enable auto-refresh toggle
2. Leave dashboard open
3. Data automatically updates every 5 minutes
4. Toast notification confirms each refresh
5. Statistics update in real-time

### Example 4: Adjusting Filter Threshold
1. Change multiplier input to "2.0"
2. Note: UI shows "reload required" message
3. Refresh page or wait for auto-refresh
4. Fewer coins pass the stricter filter
5. Pass rate percentage decreases

## API Response Examples

### Successful Coin Data Response
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": 45250.00,
      "marketCap": 885500000000,
      "aggregateOI": 15800000000,
      "ratio": 1.78,
      "passesFilter": true,
      "lastUpdated": "2026-02-10T12:00:00Z"
    }
  ]
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to fetch coin data from external API"
}
```

## Performance Benchmarks

### Target Metrics
- **Time to Interactive (TTI)**: < 2 seconds
- **First Contentful Paint (FCP)**: < 1 second
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Bundle Size
- HTML: ~8 KB
- CSS: ~13 KB
- TypeScript (compiled): ~15 KB
- **Total**: ~36 KB (uncompressed)
- **Gzipped**: ~12 KB (estimated)

## Customization Guide

### Changing Colors
Edit CSS variables in `styles.css`:
```css
:root {
  --color-primary: #3B82F6;  /* Change primary color */
  --color-success: #10B981;  /* Change success color */
  /* ... more variables */
}
```

### Changing Auto-Refresh Interval
Edit constant in `main.ts`:
```typescript
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
```

### Changing API Endpoint
Edit constant in `main.ts`:
```typescript
const API_BASE = 'https://your-api.com/api';
```

### Adding New Table Columns
1. Add column header in `index.html`
2. Add data field to `CoinData` interface in `main.ts`
3. Add cell rendering in `renderCoinRow()` function
4. Add sort case in `sortCoins()` function

## Troubleshooting

### Data Not Loading
- Check browser console for errors
- Verify backend API is running
- Check CORS headers on backend
- Verify API endpoint URL

### Styling Issues
- Hard refresh (Ctrl+Shift+R)
- Clear browser cache
- Check CSS file is loaded
- Verify no conflicting styles

### TypeScript Errors
- Compile TypeScript: `npm run build`
- Check tsconfig.json settings
- Verify type definitions

### Performance Issues
- Check network tab for slow requests
- Reduce auto-refresh frequency
- Implement table virtualization for large datasets
- Optimize images and assets

---

**Feature Set**: Complete ✅
**Documentation**: Complete ✅
**Testing**: Ready ✅
**Production**: Ready for deployment 🚀
