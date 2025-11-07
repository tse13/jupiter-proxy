import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

// 🔁 核心反代逻辑
app.use(async (req, res) => {
  const targetUrl = "https://quote-api.jup.ag" + req.originalUrl;
  console.log("[Proxy]", req.method, targetUrl);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        ...req.headers,
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

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(530).send("Proxy error: " + err.message);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Jupiter Proxy running on ${PORT}`));
