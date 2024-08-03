import { expect, mock, test } from "bun:test";
import { staticPlugin } from "@elysiajs/static";
import { $ } from "bun";
import { Elysia } from "elysia";
import { compression } from "../src";

const random = mock(() => Math.random());

test("looking on the right directory for assets", async () => {
	const files = await $`ls ${import.meta.dir}/public`
		.text()
		.then((x) => x.split("\n").filter((x) => x));
	expect(files).toEqual(["index.html", "index.js"]);
});

test("serve static with compression", async () => {
	new Elysia()
		.use(compression())
		.use(
			staticPlugin({
				prefix: "/",
				assets: `${import.meta.dir}/public`,
			}),
		)
		.listen(3000);

	const html = await fetch("http://localhost:3000/");
	expect(html.headers.get("content-type")).toBe("text/html;charset=utf-8");
	const js = await fetch("http://localhost:3000/index.js");
	expect(js.headers.get("content-type")).toBe("text/javascript;charset=utf-8");
});
