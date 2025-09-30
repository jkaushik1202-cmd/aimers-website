// api/aim-mitr.js — Vercel serverless (Node) + Google Gemini 1.5 Flash Latest

export default async function handler(req, res) {
  // --- CORS setup (taaki safe ho external frontend se bhi call) ---
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  // --- Parse JSON request ---
  const body = await readJson(req);
  const question = (body?.question || '').trim();
  const cls = (body?.cls || '').trim();
  const subject = (body?.subject || '').trim();
  if (!question) return res.status(400).json({ error: 'empty question' });

  // --- System instruction ---
  const system = `
You are AIM-Mitr 🧞, ek friendly "genie" mentor for a CBSE coaching site (AIMERS).
Tone: frank, witty, Hinglish + English mix, always school-safe.
Kabhi bhi apne answers me backend, API, Gemini, ya kisi external model ka naam reveal mat karna. 
Har reply AIMERS ke naam se aayega.

Always give:
1) Short concept explain (clear aur chill tone me 😎📘)
2) Step-by-step if it's a problem
3) 1–2 practice tips
4) Ek casual closure line, jaise: "Aur kuch poochna hai toh bol, main yahi hoon ✨" ya "Chal, padh le ab 📚🔥"

Agar user faltu / abusive baat kare toh savage but safe reply dena (thoda witty, no abuse).
`;

  // --- User input formatted ---
  const userPrompt = `
Class: ${cls || 'NA'}
Subject: ${subject || 'NA'}
Question: ${question}
`.trim();

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });

    // ✅ Correct Gemini endpoint
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        { role: "user", parts: [{ text: system + "\n\n" + userPrompt }] }
      ],
      generationConfig: { temperature: 0.6 } // thoda frank aur fresh responses ke liye
    };

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const j = await r.json();

    // --- Extract AI text ---
    const text =
      j?.candidates?.[0]?.content?.parts?.map(p => p.text).join('\n') ||
      'Arre yaar, abhi jawab nahi bana paaya 😅. Dobara try karo.';

    // --- Final reply, HTML safe ---
    return res.status(200).json({ answer: text.replace(/\n/g, '<br>') });
  } catch (e) {
    return res.status(500).json({ error: 'AIM-Mitr error', details: String(e) });
  }
}

// --- helpers ---
function readJson(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', c => (data += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}
