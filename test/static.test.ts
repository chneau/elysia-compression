import { expect, test } from "bun:test";
import { staticPlugin } from "@elysiajs/static";
import { $ } from "bun";
import { Elysia, status } from "elysia";
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
			return status(404, "Not Found");
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

test("compress only when the body reaches the threshold", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 100 }))
		.get("/small", () => "a".repeat(50))
		.get("/big", () => "a".repeat(200))
		.listen(3004);

	const small = await fetch("http://localhost:3004/small");
	expect(small.headers.get("content-encoding")).toBeNull();
	expect(await small.text()).toBe("a".repeat(50));

	const big = await fetch("http://localhost:3004/big");
	expect(big.headers.get("content-encoding")).toBe("gzip");
	expect(await big.text()).toBe("a".repeat(200));
	await server.stop();
});

test("compressed body round-trips back to the original payload", async () => {
	const payload = { message: "x".repeat(2000), nested: { a: 1, b: [1, 2] } };
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => payload)
		.listen(3005);

	const res = await fetch("http://localhost:3005/");
	expect(res.headers.get("content-encoding")).toBe("gzip");
	expect(await res.json()).toEqual(payload);
	await server.stop();
});

test("only uses encodings listed in allowed", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0, allowed: ["deflate"] }))
		.get("/", () => "x".repeat(2000))
		.listen(3006);

	const res = await fetch("http://localhost:3006/", {
		headers: { "accept-encoding": "gzip, deflate" },
	});
	expect(res.headers.get("content-encoding")).toBe("deflate");
	expect(await res.text()).toBe("x".repeat(2000));
	await server.stop();
});

test("does not compress when no encoding is allowed", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0, allowed: [] }))
		.get("/", () => "x".repeat(2000))
		.listen(3007);

	const res = await fetch("http://localhost:3007/");
	expect(res.headers.get("content-encoding")).toBeNull();
	expect(await res.text()).toBe("x".repeat(2000));
	await server.stop();
});

test("negotiates the encoding from accept-encoding", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => "y".repeat(2000))
		.listen(3008);
	const url = "http://localhost:3008/";

	const gzip = await fetch(url, { headers: { "accept-encoding": "gzip" } });
	expect(gzip.headers.get("content-encoding")).toBe("gzip");
	expect(await gzip.text()).toBe("y".repeat(2000));

	const deflate = await fetch(url, {
		headers: { "accept-encoding": "deflate" },
	});
	expect(deflate.headers.get("content-encoding")).toBe("deflate");
	expect(await deflate.text()).toBe("y".repeat(2000));

	const identity = await fetch(url, {
		headers: { "accept-encoding": "identity" },
	});
	expect(identity.headers.get("content-encoding")).toBeNull();
	expect(await identity.text()).toBe("y".repeat(2000));
	await server.stop();
});

test("compresses custom status responses", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", () => status(201, { created: true }))
		.listen(3009);

	const res = await fetch("http://localhost:3009/");
	expect(res.status).toBe(201);
	expect(res.headers.get("content-type")).toBe(
		"application/json;charset=utf-8",
	);
	expect(res.headers.get("content-encoding")).toBe("gzip");
	expect(await res.json()).toEqual({ created: true });
	await server.stop();
});

test("does not compress redirects", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/target", () => "hello")
		.get("/redirect", (ctx) => ctx.redirect("/target", 307))
		.listen(3010);

	const res = await fetch("http://localhost:3010/redirect", {
		redirect: "manual",
	});
	expect(res.status).toBe(307);
	expect(res.headers.get("location")).toContain("/target");
	expect(res.headers.get("content-encoding")).toBeNull();
	await server.stop();
});

test("preserves the content type of an explicit Response", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get(
			"/",
			() =>
				new Response("z".repeat(2000), {
					headers: { "content-type": "application/x-custom" },
				}),
		)
		.listen(3011);

	const res = await fetch("http://localhost:3011/");
	expect(res.headers.get("content-type")).toBe("application/x-custom");
	expect(res.headers.get("content-encoding")).toBe("gzip");
	expect(await res.text()).toBe("z".repeat(2000));
	await server.stop();
});

test("compresses non-string responses", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/number", () => 42)
		.get("/boolean", () => true)
		.listen(3012);

	const number = await fetch("http://localhost:3012/number");
	expect(number.headers.get("content-encoding")).toBe("gzip");
	expect(await number.text()).toBe("42");

	const boolean = await fetch("http://localhost:3012/boolean");
	expect(boolean.headers.get("content-encoding")).toBe("gzip");
	expect(await boolean.text()).toBe("true");
	await server.stop();
});

test("compresses async handlers", async () => {
	const server = new Elysia()
		.use(compression({ threshold: 0 }))
		.get("/", async () => {
			await Bun.sleep(0);
			return { async: true };
		})
		.listen(3013);

	const res = await fetch("http://localhost:3013/");
	expect(res.headers.get("content-encoding")).toBe("gzip");
	expect(await res.json()).toEqual({ async: true });
	await server.stop();
});
