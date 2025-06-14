const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());

let data = [];
try {
  data = JSON.parse(fs.readFileSync("discourse.json"));
  console.log(`✅ Loaded ${data.length} scraped items`);
} catch {
  console.log("⚠️  discourse.json missing—run scraper.js first");
}

function search(question) {
  const q = question.toLowerCase().split(/\s+/);
  return data
    .map(item => ({
      ...item,
      score: q.filter(w => item.content.toLowerCase().includes(w)).length
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);
}

app.post("/api", (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ error: "Missing question field" });

  const results = search(question);
  if (results.length === 0) {
    return res.json({ answer: "No results found. Try phrasing differently.", links: [] });
  }

  const answer = results.map(r => `• ${r.content.slice(0, 150)}...`).join("\n");
  const links = results.map(r => ({ url: r.url, text: r.title }));
  res.json({ answer, links });
});

app.listen(3000, () => console.log("🚀 API listening on port 3000"));
