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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const raw = await response.json();

    // 🔥 DEBUG (IMPORTANT)
    console.log("Gemini RAW:", JSON.stringify(raw));

    // ✅ Extract safely
    let text = "No response";

    if (raw?.candidates?.length > 0) {
      const parts = raw.candidates[0].content?.parts;
      if (parts && parts.length > 0) {
        text = parts.map(p => p.text).join("\n");
      }
    }

    // 🔥 If still empty, show raw for debugging
    if (text === "No response") {
      text = JSON.stringify(raw);
    }

    res.status(200).json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
