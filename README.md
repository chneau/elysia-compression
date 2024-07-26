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
