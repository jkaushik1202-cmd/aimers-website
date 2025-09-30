// api/aim-mitr.js — Gemini 1.5 Flash, frank+Hinglish, convo memory + random closers

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
  const history = Array.isArray(body?.history) ? body.history.slice(-6) : []; // [{role:'user'|'assistant', content:'...'}]
  if (!question) return res.status(400).json({ error:'empty question' });

  // closers pool (random, varied)
  const CLOSERS = [
    "Kuch aur chahiye to pooch le — main yahi hoon. Chal, padh le ✌️",
    "Aur doubt? Bol de bina sharmaye. Ab focus on padhai 🔥",
    "Samajh aa gaya? Nahi to dubara pooch — main yahin hu. Ab thoda practice kar 💪",
    "Next doubt bhej, I got you. Warna abhi ke liye notes revise kar 📒",
    "Clear hai? Great. Agar atka to ping — ab seedha padhai mode on 🚀",
    "Aur kuch? Main standby pe hoon. Chalo, smart study karte hain 😎",
    "Question khatam, excuses bhi khatam. Ab mehnat on — poochna ho to bol na 😉",
  ];
  const closer = CLOSERS[Math.floor(Math.random()*CLOSERS.length)];

  // tone & rules
  const system = `
You are "AIM-Mitr": a genie-like senior friend for CBSE students.
Style: frank, witty, motivating; Hinglish + English; strictly school-safe.
Never include links, sources, citations, or site names. No "according to..." lines.
If user is toxic/abusive: reply with a short, classy, savage comeback — but no profanity.
Answer rules:
• Concept -> 3–6 crisp lines + tiny example.
• Problem -> 2–6 bullet steps + final answer.
• Add 1–2 practice tips when useful.
• Adapt to Class and Subject.
• Mobile-friendly, concise, no headings.
• End with a friendly closer (I will append one).
`;

  // build conversation for Gemini
  const contents = [];
  contents.push({ role: "user", parts: [{ text: system }]});
  for (const turn of history) {
    contents.push({
      role: turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: turn.content }]
    });
  }
  const userPrompt = `Class: ${cls || 'NA'}\nSubject: ${subject || 'NA'}\nDoubt: ${question}`;
  contents.push({ role:"user", parts:[{ text: userPrompt }]});

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error:'Missing GEMINI_API_KEY' });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const payload = { contents, generationConfig:{ temperature:0.55 } };

    const r = await fetch(endpoint, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await r.json();

    let text = j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n')
              || 'Glitch ho gaya. Doubt ek line me dubara bhej 🙂';

    text = stripLinks(text);

    // add random closer once
    text += `\n\n${closer}`;

    return res.status(200).json({ answer: text.replace(/\n/g,'<br>') });
  } catch (e) {
    return res.status(500).json({ error:'Gemini error', details:String(e) });
  }
}

/* helpers */
function readJson(req){ return new Promise(resolve=>{
  let d=''; req.on('data',c=>d+=c);
  req.on('end',()=>{ try{ resolve(JSON.parse(d||'{}')); } catch{ resolve({}); } });
  req.on('error',()=>resolve({}));
});}
function stripLinks(t){
  return t.replace(/https?:\/\/\S+/gi,'')
          .replace(/(source|sources|citation|references)\s*:\s*.*$/gim,'')
          .replace(/[ \t]+\n/g,'\n').trim();
}
