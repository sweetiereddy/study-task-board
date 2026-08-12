import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/ai/summary
// Reads all pending ("todo") tasks and asks Claude to summarize
// and suggest a priority order for tackling them.
export async function POST() {
  const pendingTasks = await prisma.task.findMany({
    where: { status: "todo" },
    orderBy: { createdAt: "asc" },
  });

  if (pendingTasks.length === 0) {
    return NextResponse.json({
      summary: "No pending tasks right now — the board is clear!",
    });
  }

  const taskList = pendingTasks.map((t) => `- ${t.title}`).join("\n");

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set in .env" },
      { status: 500 }
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Here is a list of pending study tasks:\n${taskList}\n\nWrite a short, encouraging 3-4 sentence summary, then suggest a priority order (which to tackle first and why). Keep it concise and plain text, no markdown headers.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: `AI request failed: ${errText}` },
      { status: 500 }
    );
  }

  const data = await response.json();
  const summary = data.content
    ?.map((block: { type: string; text?: string }) =>
      block.type === "text" ? block.text : ""
    )
    .join("\n")
    .trim();

  return NextResponse.json({ summary: summary || "No summary generated." });
}
