const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const keyMatch = env.match(/GEMINI_API_KEY=(.*)/);
if (!keyMatch || !keyMatch[1]) {
  console.log("No key found");
  process.exit(1);
}
const apiKey = keyMatch[1].trim();

async function run() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await res.json();
  data.models.forEach(m => console.log(m.name));
}
run();
