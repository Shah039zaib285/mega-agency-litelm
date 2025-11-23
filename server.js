import express from "express";
const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;

app.post("/", (req, res) => {
  const userMsg = (req.body?.messages?.slice?.(-1)[0]?.content) || req.body?.message || "Hello";
  // Simple echo-style placeholder reply
  res.json({
    id: "lite-reply-1",
    object: "response",
    choices: [{ message: { content: `Bot reply: ${userMsg}` } }]
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));
app.listen(PORT, "0.0.0.0", () => console.log("LiteLLM running on", PORT));
