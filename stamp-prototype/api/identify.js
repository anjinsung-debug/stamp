// 사진 → 규정표 항목 ID. AI는 물건만 고르고 판정은 앱이 규정표로 함.
// 키는 서버 환경변수 GEMINI_API_KEY에만 둠 (브라우저로 보내지 않음).
const fs = require("fs");
const path = require("path");

const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const MAX_IMAGE = 1_500_000; // base64 글자 수. 앱이 1024px로 줄여 보내면 보통 300KB 이하

const D = new Function(fs.readFileSync(path.join(__dirname, "..", "data.js"), "utf8") + ";return STAMP_DATA")();
const IDS = [...D.items.map((i) => i.id), "unknown"];
const LIST = D.items.map((i) => `${i.id}: ${i.name}`).join("\n");

const PROMPT = `여행 가방에 넣으려는 물건 사진이에요. 사진 속 물건을 아래 목록에서 하나 고르세요.
목록에 없거나 알아볼 수 없으면 unknown을 고르세요.
비슷한 후보가 있으면 candidates에 최대 3개까지 넣으세요.
제품에 용량(mAh, Wh, ml)이 글자로 보이면 capacity에 적고, 안 보이면 value는 null, unit은 none으로 두세요. 추측하지 마세요.

${LIST}`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    item_id: { type: "STRING", enum: IDS },
    confidence: { type: "STRING", enum: ["high", "low"] },
    candidates: { type: "ARRAY", items: { type: "STRING", enum: IDS } },
    capacity: {
      type: "OBJECT",
      properties: { value: { type: "NUMBER", nullable: true }, unit: { type: "STRING", enum: ["mAh", "Wh", "ml", "none"] } },
      required: ["value", "unit"],
    },
  },
  required: ["item_id", "confidence", "candidates", "capacity"],
};

const send = (res, code, obj) => {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
};

async function readBody(req) {
  if (req.body) return typeof req.body === "string" ? JSON.parse(req.body) : req.body; // Vercel은 미리 파싱해 줌
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_IMAGE + 1000) throw new Error("too_large");
  }
  return JSON.parse(raw);
}

// IP별 횟수 제한은 코드가 아니라 Vercel 방화벽(WAF Rate Limiting) 규칙으로 /api/identify에 걸어 둠
module.exports = async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "method" });
  let body;
  try { body = await readBody(req); } catch { return send(res, 413, { error: "bad_request" }); }
  const { image, mime } = body || {};
  if (typeof image !== "string" || !image || image.length > MAX_IMAGE || !/^image\/(jpeg|png|webp)$/.test(mime || "")) {
    return send(res, 400, { error: "bad_image" });
  }

  // 키 없이 화면만 확인할 때 (STAMP_MOCK=1)
  if (process.env.STAMP_MOCK) return send(res, 200, { item_id: "power_bank", confidence: "high", candidates: ["spare_battery"], capacity: { value: 20000, unit: "mAh" } });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return send(res, 503, { error: "no_key" });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: mime, data: image } }] }],
        generationConfig: { response_mime_type: "application/json", response_schema: SCHEMA },
      }),
    });
    if (r.status === 429) return send(res, 429, { error: "quota" });
    if (!r.ok) return send(res, 502, { error: "upstream" });
    const out = JSON.parse((await r.json()).candidates[0].content.parts[0].text);
    // 스키마로 막았지만 한 번 더: 목록 밖 ID는 unknown 처리
    const ok = (id) => IDS.includes(id);
    return send(res, 200, {
      item_id: ok(out.item_id) ? out.item_id : "unknown",
      confidence: out.confidence === "high" ? "high" : "low",
      candidates: (out.candidates || []).filter(ok).slice(0, 3),
      capacity: out.capacity || { value: null, unit: "none" },
    });
  } catch {
    return send(res, 502, { error: "upstream" });
  }
};
