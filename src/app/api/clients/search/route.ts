import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ clients: [] }, { status: 401 });

  const query = (new URL(request.url).searchParams.get("q") ?? "").trim();

  const clients = await prisma.client.findMany({
    where: {
      ...(user.whiteLabelId ? { whiteLabelId: user.whiteLabelId } : {}),
      ...(query
        ? {
            OR: [
              { username: { contains: query, mode: "insensitive" as const } },
              { code: { contains: query, mode: "insensitive" as const } },
              { displayName: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { username: "asc" },
    take: 20,
    select: { id: true, code: true, username: true, displayName: true },
  });

  return NextResponse.json({ clients });
}
