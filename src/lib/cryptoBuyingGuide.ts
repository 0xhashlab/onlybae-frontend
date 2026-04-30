/**
 * Region-by-region "how to buy USDT" guide.
 *
 * AllScale only accepts crypto on its hosted checkout — it does not sell crypto.
 * Users without a wallet need somewhere to buy USDT first. Pick the region,
 * sign up at one of the listed exchanges, fund with bank/card, then come back
 * and pay.
 */

export interface CryptoExchange {
  name: string;
  url: string;
  methods: string[];
  note?: string;
}

export interface CryptoRegion {
  code: string;
  label: string;
  flag: string;
  countries: string;
  exchanges: CryptoExchange[];
}

export const CRYPTO_REGIONS: CryptoRegion[] = [
  {
    code: 'NA',
    label: 'North America',
    flag: '🇺🇸',
    countries: 'USA · Canada · Mexico',
    exchanges: [
      { name: 'Coinbase',    url: 'https://www.coinbase.com',    methods: ['Bank (ACH)', 'Card', 'Apple/Google Pay'], note: 'Easiest for beginners; KYC required' },
      { name: 'Kraken',      url: 'https://www.kraken.com',      methods: ['Bank wire', 'Card'] },
      { name: 'Crypto.com',  url: 'https://crypto.com',          methods: ['Card', 'Apple/Google Pay'] },
      { name: 'Cash App',    url: 'https://cash.app',            methods: ['Linked bank'], note: 'BTC only — convert to USDT after withdrawing' },
    ],
  },
  {
    code: 'EU',
    label: 'Europe',
    flag: '🇪🇺',
    countries: 'EU · UK · Switzerland · Norway',
    exchanges: [
      { name: 'Binance',   url: 'https://www.binance.com', methods: ['SEPA', 'Card', 'P2P'] },
      { name: 'Bitstamp',  url: 'https://www.bitstamp.net', methods: ['SEPA', 'Card'] },
      { name: 'Bitpanda',  url: 'https://www.bitpanda.com', methods: ['SEPA', 'Card', 'Apple Pay'], note: 'Austrian, EU-licensed' },
      { name: 'Kraken',    url: 'https://www.kraken.com',  methods: ['SEPA', 'Card'] },
      { name: 'Coinbase',  url: 'https://www.coinbase.com', methods: ['SEPA', 'Card'] },
    ],
  },
  {
    code: 'SA',
    label: 'South America',
    flag: '🌎',
    countries: 'Brazil · Argentina · Mexico · Colombia · Chile',
    exchanges: [
      { name: 'Bitso',           url: 'https://bitso.com',         methods: ['Bank transfer (SPEI/PIX)', 'Card'], note: 'Mexico, Argentina, Brazil, Colombia' },
      { name: 'Mercado Bitcoin', url: 'https://www.mercadobitcoin.com.br', methods: ['PIX', 'Bank transfer'], note: 'Brazil' },
      { name: 'Lemon Cash',      url: 'https://www.lemon.me',      methods: ['Bank transfer'], note: 'Argentina' },
      { name: 'Ripio',           url: 'https://www.ripio.com',     methods: ['Bank transfer', 'Cash'], note: 'Argentina, Brazil' },
      { name: 'Binance P2P',     url: 'https://p2p.binance.com',   methods: ['Local bank', 'PIX', 'Mercado Pago'] },
    ],
  },
  {
    code: 'AS',
    label: 'Asia',
    flag: '🌏',
    countries: 'Korea · Japan · Thailand · Vietnam · Philippines · Indonesia',
    exchanges: [
      { name: 'Binance',  url: 'https://www.binance.com', methods: ['Card', 'P2P', 'Local bank'] },
      { name: 'OKX',      url: 'https://www.okx.com',     methods: ['Card', 'P2P'] },
      { name: 'Bybit',    url: 'https://www.bybit.com',   methods: ['Card', 'P2P'] },
      { name: 'Upbit',    url: 'https://upbit.com',       methods: ['Bank transfer (KRW)'], note: 'Korea' },
      { name: 'Bitkub',   url: 'https://www.bitkub.com',  methods: ['Bank transfer (THB)'], note: 'Thailand' },
    ],
  },
  {
    code: 'AF',
    label: 'Africa',
    flag: '🌍',
    countries: 'South Africa · Nigeria · Kenya · Ghana · Egypt',
    exchanges: [
      { name: 'Luno',         url: 'https://www.luno.com',        methods: ['Bank transfer', 'Card'], note: 'South Africa, Nigeria' },
      { name: 'Yellow Card',  url: 'https://yellowcard.io',       methods: ['Bank transfer', 'Mobile money'] },
      { name: 'VALR',         url: 'https://www.valr.com',        methods: ['Bank transfer (ZAR)'], note: 'South Africa' },
      { name: 'Binance P2P',  url: 'https://p2p.binance.com',     methods: ['Bank transfer', 'M-Pesa', 'Mobile money'] },
    ],
  },
  {
    code: 'OC',
    label: 'Oceania',
    flag: '🇦🇺',
    countries: 'Australia · New Zealand',
    exchanges: [
      { name: 'CoinJar',             url: 'https://www.coinjar.com',         methods: ['Bank transfer (PayID/OSKO)', 'Card'] },
      { name: 'Independent Reserve', url: 'https://www.independentreserve.com', methods: ['Bank transfer'], note: 'AU & NZ' },
      { name: 'Swyftx',              url: 'https://swyftx.com',              methods: ['Bank transfer', 'Card', 'PayID'] },
    ],
  },
];

export const CRYPTO_GUIDE_INTRO = {
  title: 'How to buy USDT (crypto)',
  body: 'Top-ups and memberships are paid in USDT (a stable coin pegged 1:1 to USD). If you don\'t already have USDT, buy it on one of the exchanges below — pick your region, sign up, deposit with your local bank or card, then come back here and pay.',
};
