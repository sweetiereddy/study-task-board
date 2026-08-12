import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/tasks -> list all tasks, newest first
export async function GET() {
  const tasks = await prisma.task.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tasks);
}

// POST /api/tasks -> create a new task
// body: { title: string, addedBy?: string }
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json(
      { error: "Task title is required." },
      { status: 400 }
    );
  }

  const task = await prisma.task.create({
    data: {
      title: body.title.trim(),
      addedBy: body.addedBy?.trim() || null,
    },
  });

  return NextResponse.json(task, { status: 201 });
}
