import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

/** Serves wizexercise.txt from app root; Dockerfile copies the same file to /app/wizexercise.txt. */
export async function GET() {
  try {
    const filePath = join(process.cwd(), "wizexercise.txt");
    const text = await readFile(filePath, "utf8");
    return new NextResponse(text, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch {
    return new NextResponse("wizexercise.txt not found", { status: 404 });
  }
}
