import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";
import { jsonError, parseJsonObject } from "@/lib/api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONSENT_VERSION = "2026-11-21-v1";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to manage privacy preferences.", 401);

    const { data, error } = await supabase
      .from("user_consents")
      .select("core_data_acknowledged,ai_processing_consent,accepted_at")
      .eq("user_id", user.id)
      .eq("consent_version", CONSENT_VERSION)
      .maybeSingle();

    if (error) {
      return jsonError("Consent records are not configured. Apply migration 20261121000700_tilt_user_consent.sql.", 503);
    }

    return NextResponse.json({
      coreDataAcknowledged: data?.core_data_acknowledged === true,
      aiProcessingConsent: data?.ai_processing_consent === true,
      acceptedAt: typeof data?.accepted_at === "string" ? data.accepted_at : null,
    }, { headers: { "Cache-Control": "no-store, private", Vary: "Cookie" } });
  } catch {
    return jsonError("Could not load consent preferences.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to save privacy preferences.", 401);

    const body = parseJsonObject(await request.json().catch(() => null));
    if (!body || body.coreDataAcknowledged !== true || typeof body.aiProcessingConsent !== "boolean") {
      return jsonError("Acknowledge core data processing and choose an AI preference.", 400);
    }

    const { data, error } = await supabase.rpc("record_tilt_consent", {
      p_consent_version: CONSENT_VERSION,
      p_ai_processing_consent: body.aiProcessingConsent,
    });

    if (error) {
      console.error("TILT consent recording failed", error.code ?? "unknown");
      return jsonError("Consent storage is not configured. Apply migration 20261121000700_tilt_user_consent.sql.", 503);
    }

    const record = Array.isArray(data) ? data[0] : data;
    if (!record) return jsonError("Consent could not be saved. Please retry.", 503);

    return NextResponse.json({
      coreDataAcknowledged: record.core_data_acknowledged === true,
      aiProcessingConsent: record.ai_processing_consent === true,
      acceptedAt: typeof record.accepted_at === "string" ? record.accepted_at : null,
    }, { headers: { "Cache-Control": "no-store, private", Vary: "Cookie" } });
  } catch {
    return jsonError("Consent could not be saved. Please retry.", 503);
  }
}
