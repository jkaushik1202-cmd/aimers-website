// api/aim-mitr.js — AIM-Mitr (Gemini), frank Hinglish, safe, with hidden debug

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error:'POST only' });

  const body = await readJson(req);
  const question = (body?.question || '').trim();
  const cls = (body?.cls || '').trim();
  const subject = (body?.subject || '').trim();
  const history = Array.isArray(body?.history) ? body.history.slice(-6) : [];
  if (!question) return res.status(400).json({ error:'empty question' });

  const CLOSERS = [
    "Aur kuch? Bol de. Chal, padh le ab 📚🔥",
    "Next doubt bhej, warna notes revise kar 📒",
    "Main yahin hoon — pooch le. Focus mode on 💪",
    "Badiya! Practice kar, phir aana ✨",
  ];
  const closer = () => CLOSERS[Math.floor(Math.random()*CLOSERS.length)];

  const smallTalk = /^(hi+|hello+|hey+|yo+|hola|namaste|kya\s*scene|sup|how\s*are\s*you|good\s*(morning|evening|afternoon))\b/i;
  if (smallTalk.test(question)) {
    return res.status(200).json({
      answer: `Hey! 👋 Mood set hai. Ab class & subject choose karke apna doubt type kar 😎<br><br>${closer()}`
    });
  }

  const system = `
You are AIM-Mitr 🧞, a genie-like senior friend for CBSE students at AIMERS.
Style: frank, witty, motivating; Hinglish + English; strictly school-safe.
Never reveal backend, API, model or any external source. You're just AIMERS helper.
If user is rude: short classy comeback (no profanity).

Answer format:
• Concept: 3–6 crisp lines with tiny example.
• Problem: 2–6 bullet steps + final answer.
• Add 1–2 practice tips when useful.
• Adapt to Class & Subject. Mobile-friendly. No headings, no links, no citations.
`;

  const contents = [{ role:"user", parts:[{ text: system }]}];
  for (const turn of history) {
    contents.push({ role: turn.role === 'assistant' ? 'model' : 'user', parts:[{ text: turn.content }]});
  }
  contents.push({ role:"user", parts:[{ text: `Class: ${cls || 'NA'}\nSubject: ${subject || 'NA'}\nDoubt: ${question}` }]});

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ answer: safeMsg("Server key missing, ping admin.") });

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const payload = { contents, generationConfig:{ temperature:0.55 } };

    const r = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await r.json();

    if (!r.ok || j.error) {
      const dbg = j?.error?.message || JSON.stringify(j).slice(0,300);
      // user-safe message + hidden debug for console
      return res.status(200).json({
        answer: "Thoda glitch hua 😅. Ek line me dubara likh de ya thoda simple karke pooch.",
        debug: `API ${r.status}: ${dbg}`
      });
    }

    let text = extractText(j);
    if (!text) {
      return res.status(200).json({
        answer: "Arre yaar, abhi reply nahi bana paaya 😅. Doubt thoda concise karke bhej.",
        debug: 'Empty candidates'
      });
    }
    text = sanitize(text) + `<br><br>${closer()}`;
    return res.status(200).json({ answer: text });
  } catch (e) {
    return res.status(200).json({
      answer: "Server side issue aa gaya 😬. Dubara try kar.",
      debug: String(e)
    });
  }
}

/* helpers */
function readJson(req){ return new Promise(resolve=>{
  let d=''; req.on('data',c=>d+=c);
  req.on('end',()=>{ try{ resolve(JSON.parse(d||'{}')); } catch{ resolve({}); } });
  req.on('error',()=>resolve({}));
});}

function extractText(j){
  if (j?.candidates?.[0]?.content?.parts) {
    return j.candidates[0].content.parts.map(p=>p.text||'').join('\n').trim();
  }
  if (j?.candidates?.[0]?.output) return j.candidates[0].output;
  return '';
}

function sanitize(t){
  return (t||'')
    .replace(/https?:\/\/\S+/gi,'')                 // no links
    .replace(/(source|sources|citation|references)\s*:\s*.*$/gim,'') // no source talk
    .replace(/[ \t]+\n/g,'\n')
    .trim()
    .replace(/\n/g,'<br>');
}
function safeMsg(m){ return m; }
