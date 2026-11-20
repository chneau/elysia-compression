import { deflateSync, gzipSync, type InputType } from "node:zlib";
import Elysia, {
	type Context,
	ElysiaCustomStatusResponse,
	type LifeCycleType,
} from "elysia";

type Compressor = (buffer: InputType) => Buffer;

const isElysiaResponse = (
	object: unknown,
): object is ElysiaCustomStatusResponse<number, unknown> =>
	object instanceof ElysiaCustomStatusResponse;

const isResponse = (response: unknown): response is Response =>
	response instanceof Response;

const negotiate = (
	acceptEncoding: string | undefined,
	compressEncoders: Record<string, Compressor | undefined>,
) => {
	for (const encoding of acceptEncoding?.split(", ") ?? []) {
		if (compressEncoders[encoding]) return encoding;
	}
	return undefined;
};

const prepareResponse = async (response: unknown, set: Context["set"]) => {
	if (typeof response === "function") {
		return prepareResponse(await response(), set);
	}
	let isJson = typeof response === "object";
	let text = isJson ? JSON.stringify(response) : (response?.toString() ?? "");
	const contentType = isJson ? "application/json" : "text/plain";
	if (isElysiaResponse(response)) {
		const value = response.response;
		isJson = typeof value === "object" && value !== null;
		text = isJson ? JSON.stringify(value) : (value?.toString() ?? "");
		set.status = response.code;
		set.headers["Content-Type"] = `${contentType};charset=utf-8`;
		return text;
	}
	set.headers["Content-Type"] = `${contentType};charset=utf-8`;
	return text;
};

// Compress a native Response without dropping any of its headers. When
// compression does not apply, the original Response is returned untouched so
// cookies, location, cache headers and custom headers survive.
const compressResponse = async (
	response: Response,
	acceptEncoding: string | undefined,
	threshold: number,
	compressEncoders: Record<string, Compressor | undefined>,
	encoder: TextEncoder,
): Promise<Response> => {
	if (response.status >= 300 && response.status < 400) return response;
	if (response.headers.has("content-encoding")) return response;

	const encoding = negotiate(acceptEncoding, compressEncoders);
	if (!encoding) return response;

	const contentLength = response.headers.get("content-length");
	if (contentLength !== null && Number(contentLength) < threshold) {
		return response;
	}

	const text = await response.clone().text();
	if (text.length < threshold) return response;

	const headers = new Headers(response.headers);
	headers.delete("content-length");
	headers.set("content-encoding", encoding);

	return new Response(
		compressEncoders[encoding]?.(encoder.encode(text)) as BodyInit,
		{
			status: response.status,
			statusText: response.statusText,
			headers,
		},
	);
};

const toResponse = (body: unknown, set: Context["set"]) => {
	if (body instanceof Response) return body;
	const headers = new Headers();
	for (const [name, value] of Object.entries(set.headers)) {
		if (value === undefined || value === null) continue;
		if (Array.isArray(value)) {
			for (const item of value) headers.append(name, String(item));
		} else {
			headers.set(name, String(value));
		}
	}
	const res = new Response(body as BodyInit, {
		status: typeof set.status === "number" ? set.status : undefined,
		headers,
	});
	set.status = undefined;
	set.cookie = undefined;
	set.headers = {};
	return res;
};

type Options = {
	threshold?: number;
	allowed?: ("deflate" | "gzip")[];
	as?: LifeCycleType;
};
export const compression = ({
	threshold = 1000,
	allowed = ["deflate", "gzip"],
	as = "global",
}: Options = {}) => {
	const encoder = new TextEncoder();
	const compressEncoders: Record<string, Compressor | undefined> = {
		deflate: allowed.includes("deflate") ? deflateSync : undefined,
		gzip: allowed.includes("gzip") ? gzipSync : undefined,
	};
	return new Elysia().mapResponse(
		{ as },
		async ({ response, set, headers }) => {
			if (typeof response === "function") {
				response = await response();
			}
			if (isResponse(response)) {
				return compressResponse(
					response,
					headers["accept-encoding"],
					threshold,
					compressEncoders,
					encoder,
				);
			}
			let status =
				response instanceof ElysiaCustomStatusResponse
					? response.code
					: undefined;
			if (!status && typeof set.status === "number") status = set.status;
			if (!status) return;
			if (status >= 300 && status < 400) return toResponse(response, set);
			const text = await prepareResponse(response, set);
			if (text.length < threshold) return toResponse(text, set);
			const encoding = negotiate(headers["accept-encoding"], compressEncoders);
			if (encoding) {
				set.headers["Content-Encoding"] = encoding;
				return toResponse(
					compressEncoders[encoding]?.(encoder.encode(text)),
					set,
				);
			}
			return toResponse(text, set);
		},
	);
};
