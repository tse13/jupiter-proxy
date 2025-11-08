import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

const JUP_HOST = "quote-api.jup.ag";
const JUP_IP = "172.67.181.66"; // Jupiter 固定 IP

app.use(async (req, res) => {
  const target = `https://${JUP_IP}${req.originalUrl}`;
  console.log("[Proxy]", req.method, target);

  try {
    const response = await fetch(target, {
      method: req.method,
      headers: {
        ...req.headers,
        host: JUP_HOST,
        origin: "https://jup.ag",
        referer: "https://jup.ag/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0 Proxy/1.0",
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : JSON.stringify(req.body),
    });

    // ✅ 关键：透传 headers + 流式返回，防止截断
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    // 不使用 .text() / .json()，直接管道流式传输
    response.body.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(530).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Jupiter Proxy running on ${PORT}`));
