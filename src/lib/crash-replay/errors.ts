import { databaseErrorResponse, jsonError } from "@/lib/api/http";

type ReplayDatabaseError = {
  code?: string | null;
  message?: string | null;
};

/**
 * Convert missing Crash Replay database objects into an actionable setup
 * message. PostgREST can report the same missing migration as either a SQL
 * error or a schema-cache error, depending on which endpoint was called.
 */
export function crashReplayDatabaseErrorResponse(error: ReplayDatabaseError) {
  const code = error.code ?? "";
  const message = (error.message ?? "").toLowerCase();

  const missingReplaySchema =
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("crash_replay_runs") ||
    message.includes("create_crash_replay_run") ||
    message.includes("complete_crash_replay_attempt");

  if (missingReplaySchema) {
    return jsonError(
      "Crash Replay is not fully installed in Supabase. Apply supabase/migrations/20261121000100_crash_replay.sql, then reload the page. The Vercel deployment alone does not install database migrations.",
      503,
    );
  }

  if (code === "P0001" && message.includes("unknown_scenario")) {
    return jsonError(
      "The Crash Replay scenario is missing from Supabase. Reapply supabase/migrations/20261121000100_crash_replay.sql.",
      503,
    );
  }

  return databaseErrorResponse(error);
}
