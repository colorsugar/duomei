import vercelHandler from "../../api/guyu-auth.ts";

type EventContext = { request: Request };

/** EdgeOne Makers Cloud Function handler for /api/guyu-auth. */
export default function onRequest({ request }: EventContext) {
  return vercelHandler.fetch(request);
}
