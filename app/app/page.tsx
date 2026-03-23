"use client";

import { useCallback, useEffect, useState } from "react";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

export default function Page() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/todos");
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "Failed to load todos");
      setTodos([]);
      return;
    }
    const data = await res.json();
    setTodos(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to add");
        return;
      }
      setTitle("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function toggleCompleted(id: string, completed: boolean) {
    setError(null);
    const res = await fetch(`/api/todos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to update");
      return;
    }
    await load();
  }

  async function removeTodo(id: string) {
    setError(null);
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Failed to delete");
      return;
    }
    await load();
  }

  return (
    <main>
      <h1>Todoiz</h1>
      <p className="sub">
        Stay Organised..
      </p>
      {error ? <p className="error">{error}</p> : null}
      <form className="add" onSubmit={addTodo}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task…"
          aria-label="New task title"
        />
        <button type="submit" disabled={saving || !title.trim()}>
          Add
        </button>
      </form>
      {loading ? (
        <p className="empty">Loading…</p>
      ) : todos.length === 0 ? (
        <p className="empty">No tasks yet.</p>
      ) : (
        <ul className="todos">
          {todos.map((todo) => (
            <li key={todo.id} className="todo">
              <label>
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleCompleted(todo.id, todo.completed)}
                />
                <span className={todo.completed ? "done" : undefined}>{todo.title}</span>
              </label>
              <button type="button" className="delete" onClick={() => removeTodo(todo.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
