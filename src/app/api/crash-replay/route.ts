import { NextResponse } from "next/server";
import { crashReplayDatabaseErrorResponse } from "@/lib/crash-replay/errors";
import { jsonError } from "@/lib/api/http";
import { parseRiskQuestionnaire, deriveRiskProfile } from "@/lib/crash-replay/risk-profile";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to access crash replay.", 401);

    const { data, error } = await supabase
      .from("crash_replay_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return crashReplayDatabaseErrorResponse(error);
    return NextResponse.json({ run: data }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return jsonError("Could not load crash replay. Check server configuration.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in before starting crash replay.", 401);

    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("Request body must be a JSON object.", 400);
    }

    const answers = parseRiskQuestionnaire((body as Record<string, unknown>).questionnaire);
    if (!answers) return jsonError("Complete every risk assessment question using the provided options.", 400);

    const derived = deriveRiskProfile(answers);
    const { data, error } = await supabase.rpc("create_crash_replay_run", {
      p_questionnaire: answers,
      p_risk_profile: derived.profile,
      p_max_drawdown_bps: derived.maxDrawdownBps,
      p_max_position_bps: derived.maxPositionBps,
    });

    if (error) return crashReplayDatabaseErrorResponse(error);
    return NextResponse.json({ run: data }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return jsonError("Could not start crash replay. Check server configuration and migration status.", 500);
  }
}
