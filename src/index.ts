import { type InputType, deflateSync, gzipSync } from "node:zlib";
import Elysia, {
	type Context,
	ELYSIA_RESPONSE,
	type error,
	type LifeCycleType,
	mapResponse,
} from "elysia";

const isElysiaResponse = (
	object: unknown,
): object is ReturnType<typeof error> => {
	if (!object) return false;
	return typeof object === "object" && ELYSIA_RESPONSE in object;
};

const isResponse = (response: unknown): response is Response => {
	if (!response) return false;
	return typeof response === "object" && "headers" in response;
};

const prepareResponse = async (response: unknown, set: Context["set"]) => {
	let isJson = typeof response === "object";
	let text = isJson ? JSON.stringify(response) : response?.toString() ?? "";
	let status = set.status;
	const contentType = isJson ? "application/json" : "text/plain";
	if (isElysiaResponse(response)) {
		text = response.response?.toString() ?? "";
		status = response[ELYSIA_RESPONSE];
		isJson = typeof response.response === "object";
		set.status = status;
		set.headers["Content-Type"] = `${contentType};charset=utf-8`;
		return text;
	}
	if (isResponse(response)) {
		text = await response.text();
		status = response.status;
		set.status = status;
		set.headers["content-type"] =
			response.headers.get("content-type") ?? "text/plain";
		return text;
	}
	set.headers["Content-Type"] = `${contentType};charset=utf-8`;
	return text;
};

const toResponse = (text: unknown, set: Context["set"]) => {
	const res = mapResponse(text, set);
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
	const compressEncoders: {
		[key: string]: ((buffer: InputType) => Buffer) | undefined;
	} = {
		deflate: allowed.includes("deflate") ? deflateSync : undefined,
		gzip: allowed.includes("gzip") ? gzipSync : undefined,
	};
	return new Elysia().mapResponse(
		{ as },
		async ({ response, set, headers }) => {
			const text = await prepareResponse(response, set);
			if (text.length < threshold) return toResponse(text, set);
			for (const encoding of headers["accept-encoding"]?.split(", ") ?? []) {
				const _encoder = compressEncoders[encoding];
				if (_encoder) {
					set.headers["Content-Encoding"] = encoding;
					return toResponse(_encoder(encoder.encode(text)), set);
				}
			}
			return toResponse(text, set);
		},
	);
};
