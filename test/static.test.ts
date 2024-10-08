import { expect, test } from "bun:test";
import { staticPlugin } from "@elysiajs/static";
import { $ } from "bun";
import { Elysia, error } from "elysia";
import { compression } from "../src";

test("looking on the right directory for assets", async () => {
	const files = await $`ls ${import.meta.dir}/public`
		.text()
		.then((x) => x.split("\n").filter((x) => x));
	expect(files).toEqual(["index.css", "index.html", "index.js"]);
});

test("handle errors", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => {
			return error("Not Found", 404);
		})
		.listen(3000);

	const res = await fetch("http://localhost:3000");
	expect(res.status).toBe(404);
	expect(res.headers.get("content-type")).toBe(
		"application/json;charset=utf-8",
	);
	expect(res.headers.get("content-encoding")).toBe("gzip");
	await server.stop();
});

test("serve static with compression", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.use(
			staticPlugin({
				prefix: "/",
				assets: `${import.meta.dir}/public`,
			}),
		)
		.listen(3001);

	const html = await fetch("http://localhost:3001");
	expect(html.headers.get("content-type")).toBe("text/html;charset=utf-8");
	expect(html.headers.get("content-encoding")).toBe("gzip");
	const js = await fetch("http://localhost:3001/index.js");
	expect(js.headers.get("content-type")).toBe("text/javascript;charset=utf-8");
	expect(js.headers.get("content-encoding")).toBe("gzip");
	const css = await fetch("http://localhost:3001/index.css");
	expect(css.headers.get("content-type")).toBe("text/css;charset=utf-8");
	expect(css.headers.get("content-encoding")).toBe("gzip");
	await server.stop();
});

test("serve json with compression", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => {
			return { message: "Hello World" };
		})
		.listen(3002);

	const json = await fetch("http://localhost:3002/");
	expect(json.headers.get("content-type")).toBe(
		"application/json;charset=utf-8",
	);
	expect(await json.json()).toEqual({ message: "Hello World" });
	expect(json.headers.get("content-encoding")).toBe("gzip");
	await server.stop();
});

test("redirect properly", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => "hello")
		.get("/redirect", (ctx) => ctx.redirect("/", 307))
		.listen(3003);

	const res = await fetch("http://localhost:3003/redirect");
	expect(res.status).toBe(200);
	expect(await res.text()).toBe("hello");
	expect(res.headers.get("content-encoding")).toBe("gzip");
	expect(res.headers.get("content-type")).toBe("text/plain;charset=utf-8");
	await server.stop();
});
