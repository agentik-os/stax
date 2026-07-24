import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  return NextResponse.json({ products: [] });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  return NextResponse.json({ created: body }, { status: 201 });
}
