export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { message } = req.body || {};

  const candidates = [
    { text: "你是想問作業嗎？", reply: "你可以把題目貼給我。"},
    { text: "你可以再說清楚一點嗎？", reply: "我想更了解你的意思。"},
    { text: "我可以幫你整理想法。", reply: "我們可以一起整理重點。"}
  ];

  const best = candidates[0];

  return res.status(200).json({
    reply: `你剛剛說的是：${message}`,
    predictions: candidates.map((c, i) => ({
      text: c.text,
      score: i === 0 ? 0.84 : i === 1 ? 0.79 : 0.72
    })),
    similarity: 0.84
  });
}
