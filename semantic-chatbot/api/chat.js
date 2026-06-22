export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message } = req.body;

  const result = {
    reply: "我收到你的訊息了。",
    predictions: [
      { text: "你是想問作業嗎？", score: 0.84 },
      { text: "你可以再說清楚一點嗎？", score: 0.79 },
      { text: "我可以幫你整理想法。", score: 0.72 }
    ],
    similarity: 0.84
  };

  return res.status(200).json(result);
}
