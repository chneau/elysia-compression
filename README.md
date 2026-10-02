# elysia-compression

## Installation

```bash
bun install @chneau/elysia-compression
```

## Example

```ts
import { compression } from "@chneau/elysia-compression";
import { Elysia } from "elysia";

const app = new Elysia().use(compression()).listen(8080);
```

## Changelog

### [1.0.12] - 2026-10-02

#### Changed

- Updated to the Elysia 1.4 API (`status` instead of the removed `error`).
- Replaced `bun-plugin-dts` with `tsc` for declaration generation.

#### Fixed

- Custom status responses with an object payload are now serialized as JSON
  instead of `[object Object]`.

#### Added

- More tests covering thresholds, allowed/negotiated encodings, custom status
  codes, redirects, explicit `Response` content types and async handlers.

### [1.0.11] - 2024-08-29

#### Fixed

- Fixed all tests. Compression if working again!

### [1.0.10] - 2024-08-27

#### Fixed

- Fixed potential null pointer exception.

### [1.0.9] - 2024-08-03

#### Fixed

- Working with elysia static, json and errors.

### [1.0.8] - 2024-08-03

#### Fixed

- Working with elysia static, json and errors.

### [1.0.7] - 2024-08-03

### Added

- Tests.

#### Fixed

- Working with elysia static.
