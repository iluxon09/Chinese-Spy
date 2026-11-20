
import { NextResponse } from "next/server";
import { isUuid, jsonError } from "@/lib/api/http";
import { getAuthenticatedSupabase } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params;

    if (!isUuid(sessionId)) {
      return jsonError("Invalid session ID.", 400);
    }

    const { supabase, user } =
      await getAuthenticatedSupabase();

    if (!user) {
      return jsonError(
        "Sign in to view transactions.",
        401
      );
    }

    // Verify that this session belongs to the
    // authenticated user before accessing transactions.
    const { data: session, error: sessionError } =
      await supabase
        .from("simulation_sessions")
        .select("id")
        .eq("id", sessionId)
        .maybeSingle();

    if (sessionError || !session) {
      return jsonError(
        "Simulation session was not found.",
        404
      );
    }

    const url = new URL(request.url);

    const limitValue = Number(
      url.searchParams.get("limit") ?? 100
    );

    const limit = Number.isSafeInteger(limitValue)
      ? Math.min(Math.max(limitValue, 1), 500)
      : 100;

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return jsonError(
        "Could not load transactions.",
        500
      );
    }

    return NextResponse.json({
      transactions: data,
      limit
    });

  } catch {
    return jsonError(
      "Could not load transactions.",
      500
    );
  }
}
