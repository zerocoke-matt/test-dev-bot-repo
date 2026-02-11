/**
 * Symbol Mapping
 * Maps base symbols to exchange-specific formats and CoinGecko IDs
 */

export type ExchangeName = 'binance' | 'bybit' | 'bitget' | 'okx';

export interface SymbolMapping {
  base: string;           // e.g., 'BTC'
  coingeckoId: string;    // e.g., 'bitcoin'
  exchanges: Record<ExchangeName, string>;  // exchange-specific symbols
}

/**
 * Known symbol mappings for major cryptocurrencies
 */
export const SYMBOL_MAPPINGS: SymbolMapping[] = [
  { base: 'BTC', coingeckoId: 'bitcoin', exchanges: { binance: 'BTCUSDT', bybit: 'BTCUSDT', bitget: 'BTCUSDT', okx: 'BTC-USDT-SWAP' } },
  { base: 'ETH', coingeckoId: 'ethereum', exchanges: { binance: 'ETHUSDT', bybit: 'ETHUSDT', bitget: 'ETHUSDT', okx: 'ETH-USDT-SWAP' } },
  { base: 'SOL', coingeckoId: 'solana', exchanges: { binance: 'SOLUSDT', bybit: 'SOLUSDT', bitget: 'SOLUSDT', okx: 'SOL-USDT-SWAP' } },
  { base: 'XRP', coingeckoId: 'ripple', exchanges: { binance: 'XRPUSDT', bybit: 'XRPUSDT', bitget: 'XRPUSDT', okx: 'XRP-USDT-SWAP' } },
  { base: 'DOGE', coingeckoId: 'dogecoin', exchanges: { binance: 'DOGEUSDT', bybit: 'DOGEUSDT', bitget: 'DOGEUSDT', okx: 'DOGE-USDT-SWAP' } },
  { base: 'ADA', coingeckoId: 'cardano', exchanges: { binance: 'ADAUSDT', bybit: 'ADAUSDT', bitget: 'ADAUSDT', okx: 'ADA-USDT-SWAP' } },
  { base: 'AVAX', coingeckoId: 'avalanche-2', exchanges: { binance: 'AVAXUSDT', bybit: 'AVAXUSDT', bitget: 'AVAXUSDT', okx: 'AVAX-USDT-SWAP' } },
  { base: 'LINK', coingeckoId: 'chainlink', exchanges: { binance: 'LINKUSDT', bybit: 'LINKUSDT', bitget: 'LINKUSDT', okx: 'LINK-USDT-SWAP' } },
  { base: 'DOT', coingeckoId: 'polkadot', exchanges: { binance: 'DOTUSDT', bybit: 'DOTUSDT', bitget: 'DOTUSDT', okx: 'DOT-USDT-SWAP' } },
  { base: 'MATIC', coingeckoId: 'matic-network', exchanges: { binance: 'MATICUSDT', bybit: 'MATICUSDT', bitget: 'MATICUSDT', okx: 'MATIC-USDT-SWAP' } },
  { base: 'UNI', coingeckoId: 'uniswap', exchanges: { binance: 'UNIUSDT', bybit: 'UNIUSDT', bitget: 'UNIUSDT', okx: 'UNI-USDT-SWAP' } },
  { base: 'ATOM', coingeckoId: 'cosmos', exchanges: { binance: 'ATOMUSDT', bybit: 'ATOMUSDT', bitget: 'ATOMUSDT', okx: 'ATOM-USDT-SWAP' } },
  { base: 'LTC', coingeckoId: 'litecoin', exchanges: { binance: 'LTCUSDT', bybit: 'LTCUSDT', bitget: 'LTCUSDT', okx: 'LTC-USDT-SWAP' } },
  { base: 'FIL', coingeckoId: 'filecoin', exchanges: { binance: 'FILUSDT', bybit: 'FILUSDT', bitget: 'FILUSDT', okx: 'FIL-USDT-SWAP' } },
  { base: 'ARB', coingeckoId: 'arbitrum', exchanges: { binance: 'ARBUSDT', bybit: 'ARBUSDT', bitget: 'ARBUSDT', okx: 'ARB-USDT-SWAP' } },
  { base: 'OP', coingeckoId: 'optimism', exchanges: { binance: 'OPUSDT', bybit: 'OPUSDT', bitget: 'OPUSDT', okx: 'OP-USDT-SWAP' } },
  { base: 'APT', coingeckoId: 'aptos', exchanges: { binance: 'APTUSDT', bybit: 'APTUSDT', bitget: 'APTUSDT', okx: 'APT-USDT-SWAP' } },
  { base: 'NEAR', coingeckoId: 'near', exchanges: { binance: 'NEARUSDT', bybit: 'NEARUSDT', bitget: 'NEARUSDT', okx: 'NEAR-USDT-SWAP' } },
  { base: 'SUI', coingeckoId: 'sui', exchanges: { binance: 'SUIUSDT', bybit: 'SUIUSDT', bitget: 'SUIUSDT', okx: 'SUI-USDT-SWAP' } },
  { base: 'PEPE', coingeckoId: 'pepe', exchanges: { binance: 'PEPEUSDT', bybit: 'PEPEUSDT', bitget: 'PEPEUSDT', okx: 'PEPE-USDT-SWAP' } },
];

/**
 * Get symbol mapping for a base symbol
 */
export function getSymbolMapping(base: string): SymbolMapping | undefined {
  return SYMBOL_MAPPINGS.find(m => m.base === base.toUpperCase());
}

/**
 * Get exchange-specific symbol
 */
export function getExchangeSymbol(base: string, exchange: ExchangeName): string | undefined {
  const mapping = getSymbolMapping(base);
  return mapping?.exchanges[exchange];
}

/**
 * Get CoinGecko ID for a base symbol
 */
export function getCoinGeckoId(base: string): string | undefined {
  const mapping = getSymbolMapping(base);
  return mapping?.coingeckoId;
}

/**
 * Get all base symbols
 */
export function getAllBaseSymbols(): string[] {
  return SYMBOL_MAPPINGS.map(m => m.base);
}

/**
 * Reverse lookup: find base symbol from CoinGecko ID
 */
export function getBaseFromCoinGeckoId(coingeckoId: string): string | undefined {
  const mapping = SYMBOL_MAPPINGS.find(m => m.coingeckoId === coingeckoId);
  return mapping?.base;
}
