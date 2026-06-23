export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const KEY = process.env.GEMINI_API_KEY;
  if (!KEY) {
    return res.status(500).json({ error: "伺服器尚未設定 GEMINI_API_KEY 環境變數" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }

  const {
    message,
    history = [],
    prevPrediction = ""
  } = body || {};

  if (!message) {
    return res.status(400).json({ error: "缺少 message" });
  }

  try {
    const convo = Array.isArray(history)
      ? history
          .map((m) => `m.role==="user"?"使用者":"機器人"：{m.role === "user" ? "使用者" : "機器人"}：m.role==="user"?"使用者":"機器人"：{m.content}`)
          .join("\n")
      : "";

    const genPrompt =
      `你是一個中文聊天機器人。只輸出一個 JSON 物件，不要任何說明、不要 markdown 圍欄。\n` +
      `JSON 格式必須是：\n` +
      `{"reply":"用朋友聊天的輕鬆口吻、繁體中文、1~2 句回覆使用者最新這句話",` +
      `"next_prediction":"根據目前對話脈絡，預測使用者下一句最可能說出的「實際內容」一句話；避免輸出反問句、避免輸出泛用閒聊句、避免輸出空泛猜測；必須具體、口語、與目前對話高度相關；不要問使用者問題"}\n\n` +
      `===對話紀錄===\n${convo}\n\n` +
      `請針對使用者最新這句「${message}」輸出 JSON。`;

    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: genPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json"
          }
        })
      }
    );

    const genData = await genRes.json();
    const rawText = genData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const m = rawText.match(/\{[\s\S]*\}/);
      parsed = m
        ? JSON.parse(m[0])
        : {
            reply: rawText || "（沒有回覆）",
            next_prediction: ""
          };
    }

    const reply = parsed.reply || "（沒有回覆）";
    let nextPrediction = parsed.next_prediction || "";

    if (!nextPrediction.trim()) {
      nextPrediction = "我想聊聊剛剛的話題";
    }

    let similarity = null;
    if (prevPrediction && String(prevPrediction).trim()) {
      const [e1, e2] = await Promise.all([
        embed(prevPrediction, KEY),
        embed(message, KEY)
      ]);

      if (e1 && e2) {
        similarity = Math.round(Math.max(0, cosine(e1, e2)) * 100);
      }
    }

    return res.status(200).json({
      reply,
      next_prediction: nextPrediction,
      similarity
    });
  } catch (e) {
    return res.status(500).json({
      error: "伺服器錯誤：" + (e?.message || String(e))
    });
  }
}

async function embed(text, key) {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "models/gemini-embedding-001",
        content: {
          parts: [{ text: String(text) }]
        }
      })
    }
  );

  const d = await r.json();
  return d?.embedding?.values || null;
}

function cosine(a, b) {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;

  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }

  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}
