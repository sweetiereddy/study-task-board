import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/tasks/:id -> update status ("todo" | "done")
// body: { status: string }
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  if (!["todo", "done"].includes(body.status)) {
    return NextResponse.json(
      { error: "Status must be 'todo' or 'done'." },
      { status: 400 }
    );
  }

  const task = await prisma.task.update({
    where: { id: params.id },
    data: { status: body.status },
  });

  return NextResponse.json(task);
}

// DELETE /api/tasks/:id -> remove a task
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
