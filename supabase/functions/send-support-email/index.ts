// @ts-nocheck
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/** CORS: soporta varios orígenes separados por coma en ALLOWED_ORIGIN */
const ORIGINS = (Deno.env.get("ALLOWED_ORIGIN") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPPORT_TO = Deno.env.get("SUPPORT_TO")!;
const FROM = Deno.env.get("MAIL_FROM") || "onboarding@resend.dev";

function cors(status = 200, body: Record<string, unknown> = {}, req?: Request) {
  const origin = req?.headers.get("Origin") ?? "";
  const allow = ORIGINS.includes(origin) ? origin : "null";
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": allow,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

function isValidEmail(s: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

export default async function handler(req: Request) {
  if (req.method === "OPTIONS") return cors(204, {}, req);
  if (req.method !== "POST") return cors(405, { error: "Method not allowed" }, req);

  try {
    const { email, order_code, message } = await req.json();

    // Logs de entrada para diagnosticar
    console.log("INVOKE send-support-email");
    console.log("Origin:", req.headers.get("Origin"));
    console.log("Email:", email);
    console.log("Order:", order_code);
    console.log("MsgLen:", (message ?? "").trim().length);

    if (!email || !isValidEmail(String(email))) {
      console.error("Validación: email inválido");
      return cors(400, { error: "Email inválido" }, req);
    }
    if (!message || String(message).trim().length < 10) {
      console.error("Validación: mensaje muy corto");
      return cors(400, { error: "Mensaje muy corto" }, req);
    }

    const subject = `Nuevo ticket (${order_code || "sin pedido"})`;
    const text = [
      `Email: ${email}`,
      `Pedido: ${order_code || "-"}`,
      "",
      "Mensaje:",
      String(message).trim(),
    ].join("\n");

    // Antes de llamar a Resend: verificar secrets y loguear
    console.log("FROM:", FROM);
    console.log("TO:", SUPPORT_TO);
    console.log("RESEND KEY:", RESEND_API_KEY ? "OK" : "FALTA");

    // Timeout de 6s para que el front no quede esperando
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), 6000);

    let r: Response | null = null;
    try {
      r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM,          // usar "onboarding@resend.dev" si no verificaste dominio
          to: [SUPPORT_TO],
          subject,
          text,
          reply_to: email,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!r) {
      console.error("Fetch a Resend no retornó respuesta");
      return cors(502, { error: "Proveedor de email", detail: "sin respuesta" }, req);
    }

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("Resend error:", r.status, errText);
      return cors(502, { error: "Proveedor de email", status: r.status, detail: errText }, req);
    }

    console.log("Resend OK");
    return cors(200, { ok: true }, req);
  } catch (e: any) {
    console.error("Handler error:", e?.message || String(e));
    return cors(500, { error: e?.message || String(e) }, req);
  }
}