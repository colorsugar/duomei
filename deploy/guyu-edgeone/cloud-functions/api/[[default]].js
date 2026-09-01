import COS from "cos-nodejs-sdk-v5";
import core from "../../server/guyu-core.cjs";

const { createHandler } = core;

function required(env, name) {
  const value = env?.[name];
  if (typeof value !== "string" || !value) throw new Error(`${name} is not configured`);
  return value;
}

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
  const env = context.env || {};
  let downloadFile = overrides.downloadFile;

  if (!downloadFile) {
    try {
      const cos = new COS({
        SecretId: required(env, "TENCENTCLOUD_SECRETID"),
        SecretKey: required(env, "TENCENTCLOUD_SECRETKEY"),
      });
      downloadFile = async (objectKey) => new Promise((resolve, reject) => {
        cos.getObject({
          Bucket: required(env, "GUYU_COS_BUCKET"),
          Region: required(env, "GUYU_COS_REGION"),
          Key: objectKey,
        }, (error, data) => {
          if (error) reject(error);
          else resolve(data?.Body);
        });
      });
    } catch {
      downloadFile = async () => {
        throw new Error("private storage is not configured");
      };
    }
  }

  const handler = createHandler({ downloadFile, env });
  return toResponse(await handler(await toEvent(context.request)));
}

export function onRequest(context) {
  return handleEdgeOneRequest(context);
}
