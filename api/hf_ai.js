module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "No prompt provided" });

  try {
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

    const data = await response.json();

    // Beginner-friendly: try multiple possible fields
    let text = "No response";
    if (Array.isArray(data)) {
      if (data[0]?.generated_text) text = data[0].generated_text;
      else if (typeof data[0] === "string") text = data[0];
    } else if (typeof data === "string") {
      text = data;
    } else if (data?.generated_text) {
      text = data.generated_text;
    }

    res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
