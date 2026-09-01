import vercelHandler from "../../api/guyu-page.ts";

type EventContext = { request: Request };

/** EdgeOne Makers Cloud Function handler for /api/guyu-page. */
export default function onRequest({ request }: EventContext) {
  return vercelHandler.fetch(request);
}
