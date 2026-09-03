import { getStore } from "@edgeone/pages-blob";
import core from "../../deploy/guyu-edgeone/server/guyu-core.cjs";

const { createHandler, STORAGE_NAMESPACE } = core;

async function toEvent(request) {
  const url = new URL(request.url);
  const queryStringParameters = {};
  for (const [key, value] of url.searchParams) queryStringParameters[key] = value;

  const bytes = Buffer.from(await request.arrayBuffer());
  return {
    path: url.pathname,
    httpMethod: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters,
    body: bytes.length ? bytes.toString("base64") : "",
    isBase64Encoded: bytes.length > 0,
  };
}

function toResponse(result) {
  const body = result.isBase64Encoded
    ? Buffer.from(result.body || "", "base64")
    : result.body || "";
  return new Response(body, {
    status: result.statusCode,
    headers: result.headers,
  });
}

export async function handleEdgeOneRequest(context, overrides = {}) {
  const env = { ...process.env, ...(context.env || {}) };
  let downloadFile = overrides.downloadFile;

  if (!downloadFile) {
    try {
      const store = getStore(STORAGE_NAMESPACE);
      downloadFile = async (objectKey) => {
        const content = await store.get(objectKey, { type: "arrayBuffer" });
        return content == null ? null : Buffer.from(content);
      };
    } catch {
      downloadFile = async () => { throw new Error("private storage is not configured"); };
    }
  }

  const handler = createHandler({ downloadFile, env });
  return toResponse(await handler(await toEvent(context.request)));
}

export function onRequest(context) {
  return handleEdgeOneRequest(context);
}
