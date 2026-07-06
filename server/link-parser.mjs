import http from "node:http";
import { URL } from "node:url";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, stat, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.LUKEE_PARSE_PORT || 5174);
const HOST = process.env.LUKEE_HOST || "0.0.0.0";
const SERVER_DIR = dirname(fileURLToPath(import.meta.url));
const APP_DIR = dirname(SERVER_DIR);
const DIST_DIR = join(APP_DIR, "dist");

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(JSON.stringify(payload));
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendBytes(res, status, bytes, contentType) {
  res.writeHead(status, {
    "content-type": contentType,
    "cache-control": contentType?.startsWith("text/html") ? "no-cache" : "public, max-age=31536000, immutable",
  });
  res.end(bytes);
}

async function serveStaticApp(req, res, pathname) {
  const decodedPath = safeDecode(pathname);
  const requestedPath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalized = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  let filePath = join(DIST_DIR, normalized);

  if (!filePath.startsWith(DIST_DIR)) {
    sendJson(res, 403, { ok: false, error: "forbidden" });
    return;
  }

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) filePath = join(filePath, "index.html");
  } catch {
    filePath = join(DIST_DIR, "index.html");
  }

  try {
    const bytes = await readFile(filePath);
    const contentType = mimeTypes[extname(filePath).toLowerCase()] || "application/octet-stream";
    sendBytes(res, 200, bytes, contentType);
  } catch {
    sendJson(res, 404, { ok: false, error: "app build not found. Run pnpm build first." });
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function stripHtml(value) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function firstMatch(html, patterns) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return stripHtml(match[1]);
  }
  return "";
}

function extractMeta(html) {
  const title = firstMatch(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ]);
  const description = firstMatch(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
  ]);
  const keywords = firstMatch(html, [
    /<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']keywords["'][^>]*>/i,
  ]);

  return { title, description, keywords };
}

function extractUrlHints(rawUrl) {
  const hints = [safeDecode(rawUrl)];
  try {
    const url = new URL(rawUrl);
    for (const [key, value] of url.searchParams.entries()) {
      const decoded = safeDecode(value);
      if (/[\u4e00-\u9fa5]/.test(decoded) || ["keyword", "title", "desc", "description", "text", "content", "q"].includes(key)) {
        hints.push(decoded);
      }
    }
  } catch {
    // Keep decoded raw URL only.
  }
  return hints.join(" ");
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function runPowerShellOcr(imagePath) {
  return new Promise((resolve) => {
    const scriptPath = join(SERVER_DIR, "windows-ocr.ps1");
    const child = spawn(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-ImagePath", imagePath],
      { windowsHide: true },
    );
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      if (code !== 0) {
        resolve({ ok: false, text: "", error: stderr || stdout || `PowerShell OCR exited with ${code}` });
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch {
        resolve({ ok: false, text: "", error: stdout || "OCR returned invalid JSON" });
      }
    });
  });
}

async function parseOcrImage(req) {
  const body = JSON.parse(await readBody(req));
  const dataUrl = body.imageBase64 || "";
  const match = String(dataUrl).match(/^data:image\/(png|jpe?g|bmp|gif);base64,(.+)$/i);
  const extension = match?.[1]?.replace("jpeg", "jpg") || "png";
  const base64 = match?.[2] || String(dataUrl).replace(/^data:[^,]+,/, "");

  if (!base64 || base64.length < 64) {
    return { ok: false, text: "", error: "missing imageBase64" };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "lukee-ocr-"));
  const imagePath = join(tempDir, `screenshot.${extension}`);
  await writeFile(imagePath, Buffer.from(base64, "base64"));

  try {
    return await runPowerShellOcr(imagePath);
  } finally {
    await unlink(imagePath).catch(() => {});
  }
}

async function parseLink(rawUrl) {
  const hints = extractUrlHints(rawUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch(rawUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      },
    });
    const finalUrl = response.url || rawUrl;
    const html = await response.text();
    const meta = extractMeta(html);
    const visibleText = stripHtml(html)
      .replace(/\s+/g, " ")
      .slice(0, 5000);
    const combinedText = [hints, safeDecode(finalUrl), meta.title, meta.description, meta.keywords, visibleText].filter(Boolean).join("\n");

    return {
      ok: true,
      status: response.status,
      finalUrl,
      ...meta,
      text: combinedText,
      note: response.ok ? "已读取网页标题和描述。" : `网页返回状态 ${response.status}，已尝试读取可用信息。`,
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      finalUrl: rawUrl,
      title: "",
      description: "",
      keywords: "",
      text: hints,
      note: `后端无法读取页面正文：${error?.message || "网络或平台限制"}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "accept": "application/json",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      },
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function isUsefulImageUrl(url) {
  return /^https?:\/\//i.test(url || "") && !/\.svg($|\?)/i.test(url) && !/logo|icon|map|avatar|sprite|font|emoji|favicon|dict|hydict|jianbo|zidian|hanzi|bishun|stroke|00cha|daxie/i.test(url || "");
}

async function fetchTextWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.7",
      },
    });
    if (!response.ok) return null;
    return { html: await response.text(), finalUrl: response.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBaiduImageUrl(url) {
  const decoded = decodeHtmlValue(url);
  if (!decoded) return "";
  if (decoded.startsWith("//")) return `https:${decoded}`;
  if (decoded.startsWith("http://")) return decoded.replace(/^http:\/\//i, "https://");
  return decoded;
}

async function findBaiduBaikeImage(keyword) {
  const title = encodeURIComponent(keyword.trim());
  if (!title) return null;

  const cardData = await fetchJsonWithTimeout(`https://baike.baidu.com/api/openapi/BaikeLemmaCardApi?appid=379020&bk_key=${title}&bk_length=600`);
  const cardImage = normalizeBaiduImageUrl(cardData?.image || cardData?.customImg || "");
  if (isUsefulImageUrl(cardImage) && /bkimg\.cdn\.bcebos\.com|baikebcs\.bdimg\.com/i.test(cardImage)) {
    return {
      imageUrl: cardImage,
      title: cardData?.title || keyword,
      source: "百度百科",
      pageUrl: normalizeBaiduImageUrl(cardData?.url || cardData?.wapUrl || `https://baike.baidu.com/item/${title}`),
    };
  }

  const page = await fetchTextWithTimeout(`https://baike.baidu.com/item/${title}`);
  const html = page?.html || "";
  if (!html) return null;

  const candidates = [
    ...html.matchAll(/<meta[^>]+(?:property|name)=["'](?:og:image|image)["'][^>]+content=["']([^"']+)["']/gi),
    ...html.matchAll(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|image)["']/gi),
    ...html.matchAll(/["'](?:image|lemmaPic|pic|coverPic)["']\s*:\s*["']([^"']+)["']/gi),
    ...html.matchAll(/(https?:\\?\/\\?\/bkimg\.cdn\.bcebos\.com\\?\/pic\\?\/[^"'\\\s<>]+|\/\/bkimg\.cdn\.bcebos\.com\/pic\/[^"'\s<>]+)/gi),
  ];

  for (const match of candidates) {
    const imageUrl = normalizeBaiduImageUrl(match[1]);
    if (!isUsefulImageUrl(imageUrl)) continue;
    if (!/bkimg\.cdn\.bcebos\.com|baikebcs\.bdimg\.com/i.test(imageUrl)) continue;

    return {
      imageUrl,
      title: keyword,
      source: "百度百科",
      pageUrl: page.finalUrl || `https://baike.baidu.com/item/${title}`,
    };
  }

  return null;
}

async function findWikipediaPageImage(keyword) {
  const title = encodeURIComponent(keyword.trim());
  if (!title) return null;

  const endpoint =
    `https://zh.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|info&inprop=url&pithumbsize=900&titles=${title}`;
  const data = await fetchJsonWithTimeout(endpoint);
  const pages = Object.values(data?.query?.pages || {});
  const page = pages.find((item) => item?.thumbnail?.source);
  const imageUrl = page?.thumbnail?.source;
  if (!isUsefulImageUrl(imageUrl)) return null;

  return {
    imageUrl,
    title: page?.title || keyword,
    source: "Wikipedia",
    pageUrl: page?.fullurl || `https://zh.wikipedia.org/wiki/${title}`,
  };
}

async function findWikipediaImage(keyword) {
  const title = encodeURIComponent(keyword.trim());
  if (!title) return null;

  const data = await fetchJsonWithTimeout(`https://zh.wikipedia.org/api/rest_v1/page/summary/${title}`);
  const imageUrl = data?.thumbnail?.source || data?.originalimage?.source;
  if (!isUsefulImageUrl(imageUrl)) return null;

  return {
    imageUrl,
    title: data?.title || keyword,
    source: "Wikipedia",
    pageUrl: data?.content_urls?.desktop?.page || `https://zh.wikipedia.org/wiki/${title}`,
  };
}

async function findCommonsImage(keyword) {
  const query = encodeURIComponent(`${keyword} 中国 景点`);
  const endpoint =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${query}&prop=imageinfo&iiprop=url|mime|extmetadata`;
  const data = await fetchJsonWithTimeout(endpoint);
  const pages = Object.values(data?.query?.pages || {});

  for (const page of pages) {
    const info = page?.imageinfo?.[0];
    if (!info || !/^image\/(jpeg|png|webp)$/i.test(info.mime || "")) continue;
    if (!isUsefulImageUrl(info.url)) continue;
    if (/logo|map|icon|seal|flag/i.test(page.title || "")) continue;

    return {
      imageUrl: info.url,
      title: page.title?.replace(/^File:/, "") || keyword,
      source: "Wikimedia Commons",
      pageUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
    };
  }

  return null;
}

function decodeHtmlValue(value) {
  return String(value || "")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, "\"");
}

async function parsePlaceImage(keyword) {
  const cleanKeyword = String(keyword || "").trim();
  if (!cleanKeyword) return { ok: false, imageUrl: "", error: "missing keyword" };

  const baiduBaike = await findBaiduBaikeImage(cleanKeyword);
  if (baiduBaike) return { ok: true, keyword: cleanKeyword, ...baiduBaike };

  const wikiPageImage = await findWikipediaPageImage(cleanKeyword);
  if (wikiPageImage) return { ok: true, keyword: cleanKeyword, ...wikiPageImage };

  const wiki = await findWikipediaImage(cleanKeyword);
  if (wiki) return { ok: true, keyword: cleanKeyword, ...wiki };

  const commons = await findCommonsImage(cleanKeyword);
  if (commons) return { ok: true, keyword: cleanKeyword, ...commons };

  return {
    ok: false,
    keyword: cleanKeyword,
    imageUrl: "",
    error: "no matched image found",
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);

  if (requestUrl.pathname === "/api/place-image") {
    const keyword = requestUrl.searchParams.get("keyword") || "";
    const parsed = await parsePlaceImage(keyword);
    sendJson(res, 200, parsed);
    return;
  }

  if (requestUrl.pathname === "/api/ocr-image") {
    if (req.method !== "POST") {
      sendJson(res, 405, { ok: false, error: "method not allowed" });
      return;
    }

    try {
      const parsed = await parseOcrImage(req);
      sendJson(res, 200, parsed);
    } catch (error) {
      sendJson(res, 200, { ok: false, text: "", error: error?.message || "OCR failed" });
    }
    return;
  }

  if (requestUrl.pathname !== "/api/parse-link") {
    if (!requestUrl.pathname.startsWith("/api/")) {
      await serveStaticApp(req, res, requestUrl.pathname);
      return;
    }
    sendJson(res, 404, { ok: false, error: "not found" });
    return;
  }

  let rawUrl = requestUrl.searchParams.get("url") || "";

  if (req.method === "POST") {
    try {
      const body = JSON.parse(await readBody(req));
      rawUrl = body.url || rawUrl;
    } catch {
      // Fallback to query url.
    }
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    sendJson(res, 400, { ok: false, error: "missing or invalid url" });
    return;
  }

  const parsed = await parseLink(rawUrl);
  sendJson(res, 200, parsed);
});

server.listen(PORT, HOST, () => {
  console.log(`Lukee app server listening on http://${HOST === "0.0.0.0" ? "127.0.0.1" : HOST}:${PORT}`);
});
