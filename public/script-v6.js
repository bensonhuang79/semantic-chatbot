console.log("SCRIPT VERSION 6 LOADED");

const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const toggleMaskBtn = document.getElementById("toggleMaskBtn");
const predictionList = document.getElementById("predictionList");
const gauge = document.getElementById("gauge");
const gaugeText = document.getElementById("gaugeText");

let masked = true;
let latestPredictions = [];
let latestSimilarity = 0;
let prevPrediction = "";

function addMessage(text, role) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderPredictions(predictions, similarity) {
  predictionList.innerHTML = "";

  if (!predictions.length) {
    const empty = document.createElement("div");
    empty.className = "prediction-item";
    empty.textContent = "暫無預判結果";
    predictionList.appendChild(empty);
  } else {
    predictions.forEach((item) => {
      const div = document.createElement("div");
      div.className = `prediction-item ${masked ? "masked" : ""}`;

      if (masked) {
        div.textContent = "＊＊＊ 已遮蔽 ＊＊＊";
      } else {
        div.textContent = `item.text（{item.text}（item.text（{Math.round(item.score * 100)}%）`;
      }

      predictionList.appendChild(div);
    });
  }

  const percent = Math.round((similarity || 0) * 100);
  const angle = percent * 3.6;
  gauge.style.background = `conic-gradient(#2563eb {angle}deg, #e5e7eb{angle}deg)`;
  gaugeText.textContent = `${percent}%`;
}

async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: text,
        history: [],
        prevPrediction: prevPrediction
      })
    });

    const data = await res.json();

    if (!res.ok) {
      addMessage(data.error || "發生錯誤，請稍後再試。", "bot");
      return;
    }

    addMessage(data.reply || "（沒有回覆）", "bot");

    const nextText = data.next_prediction || "";

    latestPredictions = nextText
      ? [
          { text: nextText, score: 0.80 },
          { text: "你是想問作業嗎？", score: 0.78 },
          { text: "你想學 AI 嗎？", score: 0.76 }
        ]
      : [];

    latestSimilarity = data.similarity || 0;
    prevPrediction = nextText;

    renderPredictions(latestPredictions, latestSimilarity);
  } catch (err) {
    console.error(err);
    addMessage("發生錯誤，請稍後再試。", "bot");
  }
}

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

toggleMaskBtn.addEventListener("click", () => {
  masked = !masked;
  renderPredictions(latestPredictions, latestSimilarity);
});

renderPredictions([], 0);
