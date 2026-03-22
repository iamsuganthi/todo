import mongoose, { Schema, type Model, type InferSchemaType } from "mongoose";

const todoSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type TodoDoc = InferSchemaType<typeof todoSchema> & { _id: mongoose.Types.ObjectId };

const TodoModel: Model<TodoDoc> =
  (mongoose.models.Todo as Model<TodoDoc>) || mongoose.model<TodoDoc>("Todo", todoSchema);

export default TodoModel;
