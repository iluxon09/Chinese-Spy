import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "tilt-member1-api",
    message: "TILT Member 1 starter is running.",
  });
}
