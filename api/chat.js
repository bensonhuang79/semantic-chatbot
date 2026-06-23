export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { message } = req.body || {};

    return res.status(200).json({
      reply: `收到：${message}`,
      predictions: [
        { text: "你是想問作業嗎？", score: 0.84 },
        { text: "你可以再說清楚一點嗎？", score: 0.79 },
        { text: "我可以幫你整理想法。", score: 0.72 }
      ],
      similarity: 0.84
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
