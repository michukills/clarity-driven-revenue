// P93E-E2D Phase 2B — Deno tests proving the public scorecard-classify
// edge function is constrained: schema validation, allow-list enforcement,
// no score in the wire format, deterministic-rules fallback when the AI
// gateway is unavailable, conservative handling of vague answers, and
// no leakage of system prompts / provider internals / service role.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/assert.ts";

const FN_PATH = new URL("./index.ts", import.meta.url).pathname;
const SOURCE = await Deno.readTextFile(FN_PATH);

function makeAnswer(opts?: { text?: string; qid?: string }) {
  return {
    question_id: opts?.qid ?? "q1",
    gear: "operations",
    prompt: "How do you track this?",
    owner_text: opts?.text ?? "",
    allowed_options: [
      { id: "opt_low", label: "We wing it with no system", weight: 0.0 },
      { id: "opt_mid", label: "Spreadsheet that one person owns", weight: 0.5 },
      { id: "opt_high", label: "Documented system with weekly review", weight: 1.0 },
    ],
  };
}

async function importHandler() {
  // Ensure no AI key is present so handler exercises the rules path.
  Deno.env.delete("LOVABLE_API_KEY");
  Deno.env.delete("SUPABASE_URL");
  Deno.env.delete("SUPABASE_SERVICE_ROLE_KEY");
  // Stub Deno.serve so importing the module does not bind a real port.
  // deno-lint-ignore no-explicit-any
  let handler: any = null;
  const original = Deno.serve;
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = (h: any) => {
    handler = h;
    return { finished: Promise.resolve(), shutdown() {}, ref() {}, unref() {} };
  };
  try {
    await import(`${FN_PATH}?cachebust=${crypto.randomUUID()}`);
  } finally {
    // deno-lint-ignore no-explicit-any
    (Deno as any).serve = original;
  }
  if (!handler) throw new Error("handler not registered");
  return handler as (req: Request) => Promise<Response>;
}

function postReq(body: unknown) {
  return new Request("http://local/scorecard-classify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

Deno.test("rejects invalid JSON body with 400", async () => {
  const handler = await importHandler();
  const res = await handler(
    new Request("http://local/scorecard-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    }),
  );
  assertEquals(res.status, 400);
  const j = await res.json();
  assertEquals(j.error, "invalid_json");
});

Deno.test("rejects payloads missing required fields with 400", async () => {
  const handler = await importHandler();
  const res = await handler(postReq({ rubric_version: "v3", answers: [] }));
  assertEquals(res.status, 400);
  const j = await res.json();
  assertEquals(j.error, "invalid_request");
  assert(typeof j.details === "object");
});

Deno.test("rejects non-POST methods", async () => {
  const handler = await importHandler();
  const res = await handler(
    new Request("http://local/scorecard-classify", { method: "GET" }),
  );
  assertEquals(res.status, 405);
  await res.text();
});

Deno.test("CORS preflight allowed", async () => {
  const handler = await importHandler();
  const res = await handler(
    new Request("http://local/scorecard-classify", { method: "OPTIONS" }),
  );
  assertEquals(res.status, 200);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "*");
  await res.text();
});

Deno.test("short / vague answers classify low-confidence + insufficient_detail", async () => {
  const handler = await importHandler();
  const res = await handler(
    postReq({
      rubric_version: "v3_deterministic_gears",
      answers: [makeAnswer({ text: "idk" })],
    }),
  );
  assertEquals(res.status, 200);
  const j = await res.json();
  assertEquals(j.classifier_status, "rules");
  const c = j.classifications[0];
  assertEquals(c.classified_option_id, "opt_low");
  assertEquals(c.confidence, "low");
  assertEquals(c.insufficient_detail, true);
  assert("score" in c === false, "wire format must not include any score");
});

Deno.test("classifier output is constrained to allow-listed option ids only", async () => {
  const handler = await importHandler();
  const res = await handler(
    postReq({
      rubric_version: "v3_deterministic_gears",
      answers: [
        makeAnswer({ text: "we have a documented system with weekly review" }),
        makeAnswer({
          qid: "q2",
          text: "we wing it with no real system right now",
        }),
      ],
    }),
  );
  assertEquals(res.status, 200);
  const j = await res.json();
  for (const c of j.classifications) {
    assert(["opt_low", "opt_mid", "opt_high"].includes(c.classified_option_id));
  }
});

Deno.test("missing LOVABLE_API_KEY -> deterministic rules fallback path", async () => {
  const handler = await importHandler();
  const res = await handler(
    postReq({
      rubric_version: "v3_deterministic_gears",
      answers: [makeAnswer({ text: "no system at all, never tracked" })],
    }),
  );
  const j = await res.json();
  assertEquals(j.classifier_status, "rules");
  assertEquals(j.classifications[0].classifier_type, "rules");
});

Deno.test("response payload never echoes system prompt or provider internals", async () => {
  const handler = await importHandler();
  const res = await handler(
    postReq({
      rubric_version: "v3_deterministic_gears",
      answers: [makeAnswer({ text: "documented sop weekly review" })],
    }),
  );
  const text = await res.text();
  assertEquals(text.includes("structured classifier"), false);
  assertEquals(text.includes("ai.gateway.lovable.dev"), false);
  assertEquals(text.includes("LOVABLE_API_KEY"), false);
  assertEquals(text.includes("SERVICE_ROLE"), false);
  assertEquals(text.includes("Bearer "), false);
});

Deno.test("source: AI prompt forbids inventing option ids and assigning scores", () => {
  assert(SOURCE.includes("NEVER invent option ids"));
  assert(SOURCE.includes("NEVER assign scores"));
});

Deno.test("source: zod schema bounds payload size and option allow-list", () => {
  assert(SOURCE.includes("RequestSchema"));
  assert(SOURCE.includes("z.array(AnswerInputSchema).min(1).max(60)"));
  assert(SOURCE.includes("z.array(OptionSchema).min(2).max(10)"));
});

Deno.test("source: AI tool-call schema forbids additionalProperties", () => {
  // Both the outer params and the inner classification item are sealed.
  const matches = SOURCE.match(/additionalProperties:\s*false/g) ?? [];
  assert(matches.length >= 2);
});

Deno.test("source: persistence uses service role inside backend only", () => {
  assert(SOURCE.includes('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")'));
  assert(SOURCE.includes(".from(\"scorecard_answer_classifications\")"));
});

Deno.test("source: response body shape excludes any score field", () => {
  // The wire JSON keys we emit. None of these may include "score".
  const responseBlock = SOURCE.slice(SOURCE.indexOf("return new Response("));
  assertEquals(/\bscore\b/.test(responseBlock), false);
});

Deno.test("source: never marks classifications as evidence-verified", () => {
  assertEquals(SOURCE.includes("verified_by_evidence"), false);
  assertEquals(/legally\s+verified|compliance\s+verified|accounting\s+verified/i.test(SOURCE), false);
});