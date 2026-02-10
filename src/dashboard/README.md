# Coinglass OI vs MC Dashboard

A modern, responsive web dashboard for visualizing and filtering cryptocurrency data based on Open Interest to Market Cap ratios.

## Features

- **Real-time Data Display**: View filtered cryptocurrency data with key metrics
- **Interactive Table**: Sort by any column, search/filter coins
- **Auto-refresh**: Configurable automatic data refresh (5-minute intervals)
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Mode**: Toggle between themes with persistent preference
- **Statistics Panel**: Summary metrics including total coins, pass rate, and average ratios
- **User-friendly UI**: Clean, modern design inspired by CoinGecko and CoinMarketCap

## File Structure

```
src/dashboard/
├── index.html    # Main HTML structure
├── styles.css    # Responsive CSS styling
└── main.ts       # TypeScript client logic
```

## Quick Start

### Development Mode (No Build Required)

For quick testing without a build step, you can serve the files directly:

```bash
# Using Python's built-in server
cd src/dashboard
python3 -m http.server 8080

# Or using Node.js http-server
npx http-server -p 8080
```

Then open http://localhost:8080 in your browser.

**Note**: For TypeScript to work without compilation, you'll need to either:
1. Use a dev server that supports TypeScript (like Vite)
2. Compile TypeScript to JavaScript first
3. Use a browser that supports TypeScript modules (limited support)

### Production Build

For production deployment, compile TypeScript to JavaScript:

```bash
# Install TypeScript if not already installed
npm install -g typescript

# Compile TypeScript
tsc main.ts --target ES2020 --module ES2020 --outDir .

# Update index.html to reference main.js instead of main.ts
```

## API Requirements

The dashboard expects a backend API running at `http://localhost:3000/api` with the following endpoints:

### GET /api/coins
Returns filtered coin data:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC",
      "name": "Bitcoin",
      "price": 45000.00,
      "marketCap": 850000000000,
      "aggregateOI": 12000000000,
      "ratio": 1.41,
      "passesFilter": false,
      "lastUpdated": "2026-02-10T12:00:00Z"
    }
  ]
}
```

### GET /api/statistics
Returns summary statistics:
```json
{
  "success": true,
  "data": {
    "totalCoins": 50,
    "passingCoins": 12,
    "avgRatio": 1.35,
    "passRate": 24.0,
    "filterMultiplier": 1.5,
    "exchanges": ["Binance", "Bybit", "OKX"]
  }
}
```

## Usage

### Table Interactions

- **Sort**: Click column headers to sort (ascending/descending)
- **Search**: Type in search box to filter by symbol or name
- **Copy Symbol**: Click any coin symbol to copy it to clipboard

### Controls

- **Refresh Button**: Manually refresh data from the API
- **Dark Mode Toggle**: Switch between dark and light themes
- **Auto-refresh Toggle**: Enable/disable automatic data refresh
- **Multiplier Input**: Adjust the OI/MC ratio threshold (requires reload)

### Keyboard Shortcuts

- `Ctrl/Cmd + R`: Refresh data
- `Ctrl/Cmd + K`: Focus search input

## Customization

### Colors

Edit CSS variables in `styles.css`:

```css
:root {
  --color-primary: #3B82F6;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  /* ... more colors */
}
```

### API Endpoint

Change the API base URL in `main.ts`:

```typescript
const API_BASE = 'https://your-api-domain.com/api';
```

### Auto-refresh Interval

Modify the interval in `main.ts`:

```typescript
const AUTO_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
```

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 12+, Chrome Android

## Responsive Breakpoints

- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Accessibility

- ARIA labels on interactive elements
- Keyboard navigation support
- Reduced motion support for users with vestibular disorders
- High contrast mode compatible

## Performance

- Efficient DOM updates
- Debounced search input
- Lazy loading for large datasets (table virtualization can be added)
- CSS animations use GPU acceleration

## Future Enhancements

- [ ] Add chart visualization (price/OI trends)
- [ ] Export data to CSV/JSON
- [ ] Advanced filtering (price range, market cap range)
- [ ] Favorites/watchlist functionality
- [ ] Push notifications for threshold alerts
- [ ] Historical data comparison
- [ ] Multiple currency support

## Troubleshooting

### CORS Errors

If you see CORS errors in the console, ensure your backend API includes proper CORS headers:

```javascript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
```

### TypeScript Errors

If TypeScript isn't working in the browser:

1. Compile to JavaScript: `tsc main.ts`
2. Update `index.html` to reference `main.js`
3. Or use a build tool like Vite or Webpack

### Styling Issues

Clear browser cache and hard reload (Ctrl+Shift+R / Cmd+Shift+R)

## License

Part of the Coinglass OI vs MC filtering system project.
