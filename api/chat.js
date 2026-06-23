import { GoogleGenAI } from "@google/genai";

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

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
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

    const ai = new GoogleGenAI({ apiKey });

    // 1) 使用者句子的 embedding
    const userResp = await ai.models.embedContent({
      model: "gemini-embedding-001",
      content: message,
      config: {
        taskType: "SEMANTIC_SIMILARITY",
      },
    });

    const userEmbedding = userResp.embedding?.values || userResp.embeddings?.[0]?.values;
    if (!userEmbedding) {
      return res.status(500).json({ error: "Failed to get user embedding" });
    }

    // 2) 候選句 embeddings
    const candidateEmbeddings = [];
    for (const c of CANDIDATES) {
      const resp = await ai.models.embedContent({
        model: "gemini-embedding-001",
        content: c.text,
        config: {
          taskType: "SEMANTIC_SIMILARITY",
        },
      });

      const emb = resp.embedding?.values || resp.embeddings?.[0]?.values;
      if (!emb) {
        return res.status(500).json({ error: "Failed to get candidate embedding" });
      }
      candidateEmbeddings.push(emb);
    }

    // 3) 計算相似度
    const scored = CANDIDATES.map((c, i) => ({
      ...c,
      score: cosineSimilarity(userEmbedding, candidateEmbeddings[i]),
    }))
      .sort((a, b) => b.score - a.score);

    const top3 = scored.slice(0, 3);
    const best = top3[0];

    return res.status(200).json({
      reply: best.reply,
      predictions: top3.map(({ text, score }) => ({
        text,
        score: Number(score.toFixed(4)),
      })),
      similarity: Number(best.score.toFixed(4)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
