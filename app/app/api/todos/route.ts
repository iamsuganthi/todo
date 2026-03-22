import { NextResponse } from "next/server";
import { connectDb } from "@/lib/mongodb";
import Todo from "@/models/Todo";

export async function GET() {
  try {
    await connectDb();
    const todos = await Todo.find().sort({ createdAt: -1 }).lean();
    return NextResponse.json(
      todos.map((t) => ({
        id: String(t._id),
        title: t.title,
        completed: t.completed,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }))
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to list todos";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    await connectDb();
    const completed = Boolean(body.completed);
    const doc = await Todo.create({ title, completed });
    return NextResponse.json(
      {
        id: String(doc._id),
        title: doc.title,
        completed: doc.completed,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
      { status: 201 }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to create todo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
