module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { data } = req.body;
  if (!data || !Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ error: "No data provided" });
  }

  try {
    const results = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];

      // Build prompt per sample
      const prompt = `Analyze this water sample and give a short clear statement:
pH=${row.pH}, Calcium=${row.Ca}, Magnesium=${row.Mg}, Chloride=${row.Cl}.
Say if each is normal, high, or low.`;

      const response = await fetch(
        "https://api-inference.huggingface.co/models/google/flan-t5-small",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.HF_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ inputs: prompt })
        }
      );

      const result = await response.json();

      // Extract text safely
      let text = "No response";
      if (Array.isArray(result)) {
        if (result[0]?.generated_text) text = result[0].generated_text;
        else if (typeof result[0] === "string") text = result[0];
      } else if (typeof result === "string") {
        text = result;
      } else if (result?.generated_text) {
        text = result.generated_text;
      }

      results.push({
        SampleID: row.SampleID || `S${i + 1}`,
        text
      });
    }

    // ✅ Return array (this matches your original frontend)
    res.status(200).json({ results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
