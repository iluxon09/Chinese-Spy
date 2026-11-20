import { NextResponse } from "next/server";
import { crashReplayDatabaseErrorResponse } from "@/lib/crash-replay/errors";
import { isUuid, jsonError, parseJsonObject } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ runId: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    if (!isUuid(runId)) return jsonError("Invalid replay run ID.", 400);

    const { supabase, user } = await getAuthenticatedSupabase();
    if (!user) return jsonError("Sign in to complete crash replay.", 401);

    const body = parseJsonObject(await request.json().catch(() => null));
    const attempt = body?.attempt;
    if (attempt !== "baseline" && attempt !== "reassessment") {
      return jsonError("attempt must be baseline or reassessment.", 400);
    }

    const { data, error } = await supabase.rpc("complete_crash_replay_attempt", {
      p_run_id: runId,
      p_attempt: attempt,
    });

    if (error) return crashReplayDatabaseErrorResponse(error);
    return NextResponse.json({ run: data }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return jsonError("Could not complete crash replay. Check server configuration.", 500);
  }
}
