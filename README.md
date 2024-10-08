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
