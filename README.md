# @iocium/rdap-lite

Lightweight RDAP client with normalized output, caching, CLI, and browser compatibility.

## Features

- Normalize RDAP responses for domains and IP addresses
- Automatic IANA bootstrap discovery
- Built‑in retries with exponential backoff on rate limits
- Configurable headers, proxy, timeout, and caching
- In‑memory cache by default, pluggable cache interface
- Programmatic API and simple CLI

## Installation

Install from npm:

```bash
npm install @iocium/rdap-lite
```

Or with yarn:

```bash
yarn add @iocium/rdap-lite
```

## Usage

### Programmatic API

Import and invoke the main lookup function:

```ts
import { queryRDAP } from '@iocium/rdap-lite';

(async () => {
  const info = await queryRDAP('example.com', {
    timeout: 5000,
    headers: { 'User-Agent': 'my-app/1.0' },
  });
  console.log(info);
})();
```

The `queryRDAP` function accepts an input string (domain or IP) and an optional options object:

- `headers?: Record<string, string>` — custom HTTP headers for bootstrap and RDAP requests
- `proxy?: string` — base URL to proxy requests (e.g., for CORS)
- `timeout?: number` — request timeout in milliseconds
- `cache?: RDAPCache` — custom cache implementation (defaults to in‑memory cache)

The result is an object containing parsed RDAP data (type, handle, names, events, entities, raw JSON, etc.).

### CLI

Once installed, the CLI wrapper is available as `rdap-lite`:

```bash
npx rdap-lite example.com
```

Run `rdap-lite --help` to see all available options.

## Documentation

Full API reference is generated with TypeDoc in the `docs/` directory:

```bash
npm run docs
```

## License

MIT