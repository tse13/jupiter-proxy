import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// 允许跨域请求（可根据需要限制 origin）
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ===========================
// Jupiter 官方接口定义
// ===========================
const JUP_HOST = "quote-api.jup.ag";
const JUP_IP = "172.67.181.66"; // Jupiter 固定 IP，避免 DNS 解析失败

// ===========================
// 通用代理逻辑
// ===========================
app.use(async (req, res) => {
  const target = `https://${JUP_IP}${req.originalUrl}`;
  console.log(`[Proxy] ${req.method} ${target}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // ⏱ 15 秒超时

    const response = await fetch(target, {
      method: req.method,
      headers: {
        ...req.headers,
        host: JUP_HOST,
        origin: "https://jup.ag",
        referer: "https://jup.ag/",
        "accept-encoding": "identity", // 🚫 禁用 gzip/deflate，防止截断
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0 Proxy/2.0",
      },
      body:
        req.method === "GET" || req.method === "HEAD"
          ? undefined
          : JSON.stringify(req.body),
      duplex: "half",
      signal: controller.signal,
      compress: false, // 🚫 不使用压缩
    });

    clearTimeout(timeout);

    // ✅ 保留 Jupiter 的原始头信息
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      if (!["content-length", "transfer-encoding"].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    }

    // ✅ 直接透传响应体（防止 base64 被截断）
    if (response.body) {
      response.body.pipe(res);
    } else {
      const text = await response.text();
      res.send(text);
    }
  } catch (err) {
    console.error("[Proxy error]", err);
    res.status(530).json({
      error: "Proxy error",
      message: err.message,
      type: err.name,
    });
  }
});

// ===========================
// 启动服务
// ===========================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Jupiter Proxy running on port ${PORT}`));
