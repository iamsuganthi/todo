import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/mongodb";
import Todo from "@/models/Todo";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    const body = await request.json();
    await connectDb();
    const update: { title?: string; completed?: boolean } = {};
    if (typeof body.title === "string") {
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
      }
      update.title = t;
    }
    if (typeof body.completed === "boolean") {
      update.completed = body.completed;
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "no valid fields to update" }, { status: 400 });
    }
    const doc = await Todo.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!doc) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: String(doc._id),
      title: doc.title,
      completed: doc.completed,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to update todo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }
    await connectDb();
    const res = await Todo.findByIdAndDelete(id);
    if (!res) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to delete todo";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
