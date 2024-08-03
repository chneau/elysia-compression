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

### [1.0.8] - 2024-08-03

#### Fixed

- Working with elysia static, json and errors.

### [1.0.7] - 2024-08-03

### Added

- Tests.

#### Fixed

- Working with elysia static.
