import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateStorageKey, saveFile } from "@/lib/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB per-file limit for this scaffold

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await db.file.findMany({
    where: { ownerId: session.userId },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const folderId = formData.get("folderId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds the 100MB limit." }, { status: 413 });
  }

  const user = await db.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.storageUsed + BigInt(file.size) > user.storageLimit) {
    return NextResponse.json({ error: "Storage limit reached." }, { status: 507 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storageKey = generateStorageKey(session.userId, file.name);
  await saveFile(storageKey, buffer);

  const created = await db.$transaction(async (tx) => {
    const record = await tx.file.create({
      data: {
        originalName: file.name,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        ownerId: session.userId,
        folderId: typeof folderId === "string" && folderId ? folderId : null
      }
    });
    await tx.user.update({
      where: { id: session.userId },
      data: { storageUsed: { increment: file.size } }
    });
    return record;
  });

  return NextResponse.json(created, { status: 201 });
}
