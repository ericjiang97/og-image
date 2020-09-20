import { IncomingMessage, ServerResponse } from "http";
import { parseRequest } from "./_lib/parser";
import { getScreenshot } from "./_lib/chromium";
import { getHtml } from "./_lib/template";
const fetch = require("node-fetch");

const isDev = !process.env.AWS_REGION;
const isHtmlDebug = process.env.OG_HTML_DEBUG === "1";

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  const { url } = req;
  if (!url) {
    res.setHeader("Content-Type", "text/html");
    return;
  }
  const [path, query] = url.split("?");
  const pageInfo = await fetch(`https://ericjiang.dev${path}`);
  if (!pageInfo.ok) {
    res.setHeader("Content-Type", "text/html");
    res.statusCode = pageInfo.status;
    res.end();
    return;
  }
  const body = await pageInfo.text();
  let title = body.split("<title>")[1].split("</title>")[0];
  console.log(title);
  title = title.replace(" - Eric Jiang", "");
  title += " **by Eric Jiang**";
  req.url = `/${title}${query ? `?${query}` : "?"}&md=1`;
  try {
    const parsedReq = parseRequest(req);
    const html = getHtml(parsedReq);
    if (isHtmlDebug) {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
      return;
    }
    const { fileType } = parsedReq;
    const file = await getScreenshot(html, fileType, isDev);
    res.statusCode = 200;
    res.setHeader("Content-Type", `image/${fileType}`);
    res.setHeader(
      "Cache-Control",
      `public, immutable, no-transform, s-maxage=31536000, max-age=31536000`
    );
    res.end(file);
  } catch (e) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/html");
    res.end("<h1>Internal Error</h1><p>Sorry, there was a problem</p>");
    console.error(e);
  }
}
