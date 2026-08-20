import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { deleteFile, readFile } from "@/lib/storage";

// GET downloads the file; DELETE removes it. Both check ownership first
// so a user can never access or delete another user's file.
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await db.file.findUnique({ where: { id: params.id } });
  if (!file || file.ownerId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buffer = await readFile(file.storageKey);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file.originalName)}"`
    }
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await db.file.findUnique({ where: { id: params.id } });
  if (!file || file.ownerId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await deleteFile(file.storageKey);
  await db.$transaction([
    db.file.delete({ where: { id: file.id } }),
    db.user.update({
      where: { id: session.userId },
      data: { storageUsed: { decrement: file.size } }
    })
  ]);

  return NextResponse.json({ ok: true });
}
