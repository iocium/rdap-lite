# @iocium/rdap-lite

[![npm](https://img.shields.io/npm/v/@iocium/rdap-lite)](https://www.npmjs.com/package/@iocium/rdap-lite)
[![build](https://github.com/iocium/favicon-fetcher/actions/workflows/test.yml/badge.svg)](https://github.com/iocium/rdap-lite/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/iocium/favicon-fetcher/branch/main/graph/badge.svg)](https://codecov.io/gh/iocium/rdap-lite)
[![npm downloads](https://img.shields.io/npm/dm/@iocium/rdap-lite)](https://www.npmjs.com/package/@iocium/rdap-lite)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@iocium/rdap-lite)](https://bundlephobia.com/package/@iocium/rdap-lite)
[![types](https://img.shields.io/npm/types/@iocium/rdap-lite)](https://www.npmjs.com/package/@iocium/rdap-lite)
[![license](https://img.shields.io/npm/l/@iocium/rdap-lite)](https://github.com/iocium/rdap-lite/blob/main/LICENSE)

> **Lightweight RDAP client** for domain and IP lookups with normalized JSON output, built-in caching, and a user-friendly CLI. Works seamlessly in Node.js, browsers, and serverless environments.

> 🚀 *Blazingly fast lookups powered by automatic IANA bootstrap discovery and retry logic.*

> 🔗 *Explore full API docs* at: https://iocium.github.io/rdap-lite

## 📌 Features

- 🔍 **Normalized Results**: Consistent JSON shape for domain & IP RDAP responses
- 🌐 **IANA Bootstrap**: Automatic discovery of RDAP endpoints (no manual URLs)
- ⏱️ **Retries & Backoff**: Automatic retry on HTTP 429 with exponential backoff
- ⚙️ **Flexible Configuration**: Custom headers, proxy support, timeouts, and cache
- 💾 **Pluggable Caching**: Default in-memory cache or custom implementations
- 🛠 **Dual Interface**: Promise-based API and standalone CLI

## 📦 Installation

```bash
npm install @iocium/rdap-lite
# or
yarn add @iocium/rdap-lite
```

## ⚡️ CLI Usage

```bash
# Simple lookup
npx rdap-lite example.com

# JSON output
npx rdap-lite 8.8.8.8 --json
```

For more options:
```bash
rdap-lite --help
```

## 💻 Programmatic API

```js
import { queryRDAP } from '@iocium/rdap-lite';

(async () => {
  try {
    const info = await queryRDAP('example.com', {
      timeout: 5000,
      headers: { 'User-Agent': 'my-app/1.0' },
      proxy: 'https://myproxy.local/',
    });
    console.log(info);
  } catch (err) {
    console.error('Error:', err);
  }
})();
```

### Configuration Options

| Option     | Type                      | Default      | Description                               |
|------------|---------------------------|--------------|-------------------------------------------|
| `headers`  | `Record<string,string>`   | `{…}`        | Custom HTTP headers                       |
| `proxy`    | `string`                  | `undefined`  | Proxy prefix URL for routing requests     |
| `timeout`  | `number`                  | `10000`      | Request timeout in milliseconds           |
| `cache`    | `RDAPCache`               | In-memory    | Custom cache implementing `.get()` / `.set()` |

> The default in-memory cache retains results for 1 hour.

### Cache Backends

You can use the default in-memory cache via the `cache` option (using `memoryCache`), or Workers KV and D1 backends with the built-in helpers:

```js
import { queryRDAP, kvCache, d1Cache } from '@iocium/rdap-lite';

// Use KV namespace as cache
const result = await queryRDAP('example.com', {
  cache: kvCache(env.MY_KV_NAMESPACE),
});

// Use D1 database as cache
const result2 = await queryRDAP('example.com', {
  cache: d1Cache(env.DB),
});
```

## 🌍 Environment Compatibility

- **Node.js** (v14+)
- **Browsers** (bundlers supporting Fetch & AbortController)
- **Cloudflare Workers** & other serverless platforms

## 🖥️ Browser Build

We provide a standalone IIFE bundle for direct use in browsers (no bundler required):

```html
<script src="dist/browser/index.global.js"></script>
<script>
  rdapLite.queryRDAP('example.com').then(console.log);
</script>
```

## 📚 Documentation

Explore the full API reference generated via TypeDoc:

[▶️ View Documentation](https://iocium.github.io/rdap-lite)

## 📄 License

MIT