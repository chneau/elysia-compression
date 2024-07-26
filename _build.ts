import { $ } from "bun";
import dts from "bun-plugin-dts";

await $`rm -rf dist`;

await Bun.build({
	entrypoints: ["src/index.ts"],
	external: ["elysia"],
	outdir: "dist",
	target: "node",
	minify: true,
	plugins: [dts()],
});
