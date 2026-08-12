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

  if (body.title.trim().length > 200) {
    return NextResponse.json(
      { error: "Task title must be under 200 characters." },
      { status: 400 }
    );
  }

  if (body.addedBy && typeof body.addedBy === "string" && body.addedBy.trim().length > 50) {
    return NextResponse.json(
      { error: "Name must be under 50 characters." },
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
