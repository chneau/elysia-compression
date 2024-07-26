import dts from "bun-plugin-dts";

await Bun.build({
	entrypoints: ["src/index.ts"],
	outdir: "dist",
	target: "node",
	minify: true,
	plugins: [dts()],
});
