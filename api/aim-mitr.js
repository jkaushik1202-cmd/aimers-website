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
    "Koi aur doubt ho to puch le, main yahin hoon. Chal, padh le ✌️",
    "Aur kuch? Bindaas pooch. Ab thoda practice on 🔥",
    "Samajh aaya? Nahi to dubara pooch. Ab focus mode on 💪",
    "Next doubt bhej de, warna notes revise kar 📒",
    "Clear ho gaya? Great. Atka to ping — ab padhai pe dhyaan 🚀",
    "Main standby pe hoon — pooch le. Ab smart study karte hain 😎",
    "Excuses nahi, questions chahiye. Bol na 😉"
  ];
  const closer = CLOSERS[Math.floor(Math.random()*CLOSERS.length)];

  const ST = /^(hi+|hello+|hey+|yo+|hola|namaste|namaskar|how\s*are\s*you|sup|kya\s*haal|good\s*(morning|evening|afternoon))\b/i;
  if (ST.test(question)) {
    return res.status(200).json({
      answer: `Hey! 👋 Mood set hai. Ab kaam ki baat — class & subject set karke apna doubt type kar 😎<br><br>${closer}`
    });
  }

  const system = `
You are "AIM-Mitr": a genie-like senior friend for CBSE students.
Style: frank, witty, motivating; Hinglish + English; strictly school-safe.
Never include links/sources. If user is toxic: classy, savage comeback (no profanity).
Answer rules:
• Concept -> 3–6 crisp lines + tiny example.
• Problem -> 2–6 bullet steps + final answer.
• 1–2 practice tips when useful.
• Adapt to Class & Subject. Mobile-friendly, concise.`;

  // convo
  const contents = [{ role:"user", parts:[{ text: system }]}];
  for (const t of history) contents.push({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }]});
  contents.push({ role:"user", parts:[{ text: `Class: ${cls || 'NA'}\nSubject: ${subject || 'NA'}\nDoubt: ${question}` }]});

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error:'Missing GEMINI_API_KEY' });

    const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
    const payload = { contents, generationConfig:{ temperature:0.55 } };

    const r = await fetch(endpoint, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await r.json();

    // If API returned an error object, show it so we can fix fast
    if (!r.ok || j.error) {
      const msg = j?.error?.message || JSON.stringify(j).slice(0,300);
      return res.status(500).json({
        answer: `⚠️ API error: ${r.status} – ${msg}<br><br>Tip: Check GEMINI_MODEL & if "Generative Language API" is enabled for your Google Cloud project.`,
        raw: j
      });
    }

    let text = extractText(j) || 'Glitch ho gaya. Doubt ek line me dubara bhej 🙂';
    text = stripLinks(text);
    text += `<br><br>${closer}`;
    return res.status(200).json({ answer: text.replace(/\n/g,'<br>') });
  } catch (e) {
    return res.status(500).json({ answer:`⚠️ Server error: ${String(e)}` });
  }
}

/* helpers */
function readJson(req){ return new Promise(resolve=>{
  let d=''; req.on('data',c=>d+=c);
  req.on('end',()=>{ try{ resolve(JSON.parse(d||'{}')); } catch{ resolve({}); } });
  req.on('error',()=>resolve({}));
});}
function extractText(j){
  if (j?.candidates?.[0]?.content?.parts) return j.candidates[0].content.parts.map(p=>p.text||'').join('\n').trim();
  if (j?.candidates?.[0]?.output) return j.candidates[0].output;
  return '';
}
function stripLinks(t){
  return (t||'')
    .replace(/https?:\/\/\S+/gi,'')
    .replace(/(source|sources|citation|references)\s*:\s*.*$/gim,'')
    .replace(/\(\s*see.*?\)/gi,'')
    .replace(/[ \t]+\n/g,'\n')
    .trim();
}
