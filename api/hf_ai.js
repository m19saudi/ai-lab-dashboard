module.exports = async function handler(req, res) {
  // Allow CORS for testing and dashboard
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { data } = req.body; // Expecting data = array of rows from CSV
  if (!data || !Array.isArray(data) || data.length === 0)
    return res.status(400).json({ error: "No data provided" });

  try {
    // Build the AI prompt with context
    let prompt = "Analyze the following water sample data and write a short analysis for each sample. Mention if pH, Ca, Mg, or Cl are high or low based on typical water standards.\n\n";

    data.forEach((row, index) => {
      prompt += `Sample ${row.SampleID || "S"+(index+1)}: pH=${row.pH}, Ca=${row.Ca}, Mg=${row.Mg}, Cl=${row.Cl}\n`;
    });

    // Call Hugging Face Inference API
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

    // Return as a single string, one analysis per line
    res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
