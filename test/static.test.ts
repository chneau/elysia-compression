import { expect, test } from "bun:test";
import { staticPlugin } from "@elysiajs/static";
import { $, sleep } from "bun";
import { Elysia, error } from "elysia";
import { compression } from "../src";

test("looking on the right directory for assets", async () => {
	const files = await $`ls ${import.meta.dir}/public`
		.text()
		.then((x) => x.split("\n").filter((x) => x));
	expect(files).toEqual(["index.css", "index.html", "index.js"]);
});

test("handle errors", async () => {
	new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => {
			return error("Not Found", 404);
		})
		.listen(3000);

	const res = await fetch("http://localhost:3000");
	expect(res.status).toBe(404);
	expect(res.headers.get("content-type")).toBe("text/plain;charset=utf-8");
	expect(res.headers.get("content-encoding")).toBe("gzip");
});

test.skip("serve static with compression", async () => {
	new Elysia()
		.use(compression({ threshold: 0 }))
		.use(
			staticPlugin({
				prefix: "/",
				assets: `${import.meta.dir}/public`,
			}),
		)
		.listen(3000);

	const html = await fetch("http://localhost:3000");
	expect(html.headers.get("content-type")).toBe("text/html;charset=utf-8");
	expect(html.headers.get("content-encoding")).toBe("gzip");
	const js = await fetch("http://localhost:3000/index.js");
	expect(js.headers.get("content-type")).toBe("text/javascript;charset=utf-8");
	expect(js.headers.get("content-encoding")).toBe("gzip");
	const css = await fetch("http://localhost:3000/index.css");
	expect(css.headers.get("content-type")).toBe("text/css;charset=utf-8");
	expect(css.headers.get("content-encoding")).toBe("gzip");
});
