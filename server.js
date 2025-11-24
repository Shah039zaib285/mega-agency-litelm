import express from "express";
import axios from "axios";

const app = express();
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 8000;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.MODEL || "gemini-1.5-flash";
if (!GEMINI_KEY) {
  console.warn("Warning: GEMINI_API_KEY not set. Requests will fail until you set it.");
}

// Helper: convert n8n / chat messages to a single prompt
function buildPrompt(messages) {
  // messages: [{role: "system|user|assistant", content: "..."}, ...]
  if (!Array.isArray(messages)) return String(messages || "");
  return messages.map(m => (m.role ? `${m.role}: ${m.content}` : m.content)).join("\n\n");
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/chat/completions", async (req, res) => {
  try {
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

    const body = req.body || {};
    const messages = body.messages || body.input || [];
    const prompt = buildPrompt(messages);
    const temperature = body.temperature ?? 0.7;
    const maxOutputTokens = body.max_tokens ?? 512;

    // Build Gemini request payload (v1beta generateContent style)
    const genBody = {
      "contents": [
        {
          "parts": [
            { "text": prompt }
          ]
        }
      ],
      "generationConfig": {
        "temperature": temperature,
        "maxOutputTokens": maxOutputTokens
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;

    const r = await axios.post(url, genBody, { timeout: 120000 });

    // Extract text from Gemini response (best-effort)
    let text = "";
    try {
      if (r.data?.candidates && r.data.candidates.length) {
        text = r.data.candidates.map(c => c.output?.[0]?.content?.text || c.output?.[0]?.content || "").join("\n\n");
      } else if (r.data?.outputs && r.data.outputs.length) {
        // some variants
        text = r.data.outputs.map(o => o.content?.[0]?.text || "").join("\n\n");
      } else if (r.data?.results && r.data.results.length) {
        text = r.data.results.map(rt => rt.output_text || "").join("\n\n");
      } else {
        text = JSON.stringify(r.data);
      }
    } catch (e) {
      text = JSON.stringify(r.data);
    }

    return res.json({
      id: r.data?.id || null,
      model: MODEL,
      object: "response",
      choices: [{ message: { content: text } }],
      raw: r.data
    });
  } catch (err) {
    console.error("Gemini proxy error:", err?.response?.data || err.message || err);
    const status = err?.response?.status || 500;
    return res.status(status).json({
      error: "Gemini request failed",
      details: err?.response?.data || err.message
    });
  }
});

// simple passthrough for raw requests (optional)
app.post("/raw", async (req, res) => {
  try {
    if (!GEMINI_KEY) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;
    const r = await axios.post(url, req.body, { timeout: 120000 });
    res.json(r.data);
  } catch (err) {
    console.error(err?.response?.data || err.message || err);
    res.status(500).json(err?.response?.data || { error: err.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LiteLLM proxy listening on ${PORT} (model=${MODEL})`);
});
