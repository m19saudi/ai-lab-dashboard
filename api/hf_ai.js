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
    // 🔥 Build ONE strong prompt (better results)
    let prompt = "Analyze the following water samples. For each sample, state if pH, Ca, Mg, and Cl are normal, high, or low. Also mention scaling or corrosion risk briefly.\n\n";

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
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      }
    );

    const result = await response.json();

    let text = "No response";

    if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
      text = result.candidates[0].content.parts[0].text;
    }

    res.status(200).json({ text });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
