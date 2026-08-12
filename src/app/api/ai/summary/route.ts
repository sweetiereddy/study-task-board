import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

let lastRequestAt = 0;
const COOLDOWN_MS = 10_000;

export async function POST() {
  const now = Date.now();
  if (now - lastRequestAt < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Please wait a few seconds before requesting another summary." },
      { status: 429 }
    );
  }
  lastRequestAt = now;

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

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b:free",
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
  const summary = data.choices?.[0]?.message?.content?.trim();

  return NextResponse.json({ summary: summary || "No summary generated." });
}