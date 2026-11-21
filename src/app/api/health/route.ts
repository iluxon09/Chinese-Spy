import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "tilt-financial-universe-api",
    message: "TILT Financial Universe API is running.",
  });
}
