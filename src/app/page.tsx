"use client";

import { useEffect, useState } from "react";

type Task = {
  id: string;
  title: string;
  status: "todo" | "done";
  addedBy: string | null;
  createdAt: string;
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryCooldown, setSummaryCooldown] = useState(false);

  async function loadTasks() {
    setLoading(true);
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
    setLoading(false);
  }

  useEffect(() => {
    loadTasks();
    const savedName = window.localStorage.getItem("stb_name");
    if (savedName) setAddedBy(savedName);
  }, []);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !addedBy.trim()) return;
    window.localStorage.setItem("stb_name", addedBy.trim());
    setSubmitting(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, addedBy }),
    });
    setTitle("");
    await loadTasks();
    setSubmitting(false);
  }

  async function toggleStatus(task: Task) {
    const newStatus = task.status === "todo" ? "done" : "todo";
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t))
    );
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function deleteTask(id: string, title: string) {
    if (!window.confirm(`Delete "${title}"? This can't be undone.`)) return;
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  }

  async function getSummary() {
    if (summaryCooldown) return;
    setSummaryLoading(true);
    setSummary(null);
    const res = await fetch("/api/ai/summary", { method: "POST" });
    const data = await res.json();
    setSummary(data.summary || data.error || "Something went wrong.");
    setSummaryLoading(false);
    setSummaryCooldown(true);
    setTimeout(() => setSummaryCooldown(false), 15000); // 15s cooldown to limit AI cost
  }

  const todo = tasks.filter((t) => t.status === "todo");
  const done = tasks.filter((t) => t.status === "done");

  return (
    <main className="min-h-screen px-6 py-12 md:px-16">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="mb-10 border-b border-line pb-6">
          <p className="mb-2 font-body text-xs uppercase tracking-[0.2em] text-moss">
            Team board
          </p>
          <h1 className="font-display text-4xl italic text-ink md:text-5xl">
            Study Task Board
          </h1>
          <p className="mt-2 max-w-md font-body text-sm text-ink/60">
            One shared list. Add what needs doing, check it off, and let AI
            tell you what to tackle first.
          </p>
        </header>

        {/* Add task form */}
        <form
          onSubmit={addTask}
          className="mb-10 flex flex-col gap-3 rounded-lg border border-line bg-chalk p-5 md:flex-row md:items-center"
        >
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to get done?"
            className="flex-1 rounded-md border border-line bg-paper px-4 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-moss"
          />
          <input
            type="text"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            placeholder="Your name"
            maxLength={50}
            className="w-full rounded-md border border-line bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:ring-2 focus:ring-moss md:w-40"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim() || !addedBy.trim()}
            className="rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-chalk transition hover:bg-moss disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add task"}
          </button>
        </form>

        {/* AI summary */}
        <div className="mb-10 rounded-lg border border-line bg-chalk p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-lg italic text-ink">
                Not sure where to start?
              </p>
              <p className="text-sm text-ink/60">
                Ask AI to summarize and prioritize what&apos;s pending.
              </p>
            </div>
            <button
              onClick={getSummary}
              disabled={summaryLoading || summaryCooldown}
              className="whitespace-nowrap rounded-md border border-rust px-4 py-2 text-sm font-medium text-rust transition hover:bg-rust hover:text-chalk disabled:opacity-50"
            >
              {summaryLoading
                ? "Thinking…"
                : summaryCooldown
                ? "Wait a few seconds…"
                : "Get AI summary"}
            </button>
          </div>
          {summary && (
            <p className="mt-4 whitespace-pre-line rounded-md bg-paper p-4 text-sm leading-relaxed text-ink/80">
              {summary}
            </p>
          )}
        </div>

        {/* Task lists */}
        {loading ? (
          <p className="text-sm text-ink/50">Loading tasks…</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <section>
              <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink/60">
                To do ({todo.length})
              </h2>
              <ul className="space-y-2">
                {todo.length === 0 && (
                  <li className="text-sm text-ink/40">Nothing pending.</li>
                )}
                {todo.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleStatus(task)}
                    onDelete={() => deleteTask(task.id, task.title)}
                  />
                ))}
              </ul>
            </section>

            <section>
              <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-ink/60">
                Done ({done.length})
              </h2>
              <ul className="space-y-2">
                {done.length === 0 && (
                  <li className="text-sm text-ink/40">Nothing finished yet.</li>
                )}
                {done.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onToggle={() => toggleStatus(task)}
                    onDelete={() => deleteTask(task.id, task.title)}
                  />
                ))}
              </ul>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-line bg-chalk px-4 py-3">
      <button
        onClick={onToggle}
        className="flex flex-1 items-center gap-3 text-left"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
            task.status === "done"
              ? "border-moss bg-moss text-chalk"
              : "border-ink/30"
          }`}
        >
          {task.status === "done" && "✓"}
        </span>
        <span
          className={`text-sm ${
            task.status === "done"
              ? "text-ink/40 line-through"
              : "text-ink"
          }`}
        >
          {task.title}
        </span>
      </button>
      <div className="flex items-center gap-2">
        {task.addedBy && (
          <span className="rounded-full bg-paper px-2 py-0.5 text-xs text-ink/50">
            {task.addedBy}
          </span>
        )}
        <button
          onClick={onDelete}
          className="text-xs text-ink/30 transition hover:text-rust"
          aria-label="Delete task"
        >
          ✕
        </button>
      </div>
    </li>
  );
}
