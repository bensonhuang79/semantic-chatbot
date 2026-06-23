const CANDIDATES = [
  {
    text: "你是想問作業嗎？",
    reply: "你可以把題目貼給我。",
  },
  {
    text: "你可以再說清楚一點嗎？",
    reply: "我想更了解你的意思。",
  },
  {
    text: "我可以幫你整理想法。",
    reply: "我們可以一起整理重點。",
  },
  {
    text: "你今天感覺怎麼樣？",
    reply: "你可以跟我說說今天的狀況。",
  },
  {
    text: "你想學 AI 嗎？",
    reply: "我可以一步一步帶你開始。",
  },
];

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (!denom) return 0;
  return dot / denom;
}

async function getEmbedding(apiKey, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
      taskType: "SEMANTIC_SIMILARITY",
    }),
  });

  const data = await resp.json().catch(() => null);

  if (!resp.ok) {
    const detail = data ? JSON.stringify(data) : `HTTP ${resp.status}`;
    throw new Error(`Gemini embedContent failed: ${detail}`);
  }

  const values =
    data?.embedding?.values ||
    data?.embeddings?.[0]?.values ||
    data?.embedding?.value ||
    null;

  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("Embedding values not found in Gemini response");
  }

  return values;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    // 1) 使用者訊息 embedding
    const userEmbedding = await getEmbedding(apiKey, message);

    // 2) 候選句 embeddings + 相似度
    const scored = [];
    for (const c of CANDIDATES) {
      const candidateEmbedding = await getEmbedding(apiKey, c.text);
      const score = cosineSimilarity(userEmbedding, candidateEmbedding);
      scored.push({
        ...c,
        score,
      });
    }

    // 3) 排序取前 3
    scored.sort((a, b) => b.score - a.score);
    const top3 = scored.slice(0, 3);
    const best = top3[0];

    return res.status(200).json({
      reply: best.reply,
      predictions: top3.map(({ text, score }) => ({
        text,
        score: Number(score.toFixed(4)),
      })),
      similarity: Number((best.score || 0).toFixed(4)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Internal Server Error",
      detail: err?.message || String(err),
    });
  }
}
