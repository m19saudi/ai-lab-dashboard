module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { data } = req.body;
  if (!data || !Array.isArray(data)) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    // 🔥 Build prompt
    let prompt = "Analyze each water sample. Say if pH, Ca, Mg, Cl are normal, high, or low. Keep it short.\n\n";

    data.forEach((row, i) => {
      const id = row.id || `S${i+1}`;
      prompt += `Sample ${id}: pH=${row.pH}, Ca=${row.Ca}, Mg=${row.Mg}, Cl=${row.Cl}\n`;
    });

    // ✅ Using the STABLE v1 endpoint and gemini-3.5-flash-lite
    const response = await fetch(
       `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.0,
            topP: 0.95,
            topK: 64,
            maxOutputTokens: 65536
          }
        })
      }
    );

    const raw = await response.json();

    // 🔥 DEBUG 
    console.log("Gemini 2.5 Flash RAW:", JSON.stringify(raw));

    // ✅ Extract text safely
    let text = "No response";

    if (raw.error) {
      text = `API Error: ${raw.error.message}`;
    } else if (raw?.candidates?.[0]?.content?.parts?.[0]?.text) {
      text = raw.candidates[0].content.parts.map(p => p.text).join("\n");
    } else if (JSON.stringify(raw) !== "{}") {
      // If we got a response but not in the expected format, show the raw JSON
      text = JSON.stringify(raw);
    }

    res.status(200).json({ text });

  } catch (err) {
    console.error("Handler Error:", err);
    res.status(500).json({ error: err.message });
  }
};
