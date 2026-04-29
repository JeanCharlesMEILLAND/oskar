import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { and, asc, eq, gt, or, sql as drizzleSql } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  // Bootstrap: create table + indexes if they don't exist.
  // This makes the API self-sufficient; user doesn't have to run db:push manually.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_pair_idx ON chat_messages (from_name, to_name);
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS chat_pair_reverse_idx ON chat_messages (to_name, from_name);
  `);
  tableEnsured = true;
}

function bad(reason: string, status = 400) {
  return Response.json({ error: reason }, { status });
}

export async function GET(req: Request) {
  try {
    await ensureTable();
    const url = new URL(req.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const sinceMsParam = url.searchParams.get("since");
    if (!from || !to) return bad("missing from/to");

    const fromLower = from.toLowerCase();
    const toLower = to.toLowerCase();

    let where = or(
      and(drizzleSql`lower(${chatMessages.fromName}) = ${fromLower}`, drizzleSql`lower(${chatMessages.toName}) = ${toLower}`),
      and(drizzleSql`lower(${chatMessages.fromName}) = ${toLower}`, drizzleSql`lower(${chatMessages.toName}) = ${fromLower}`),
    );

    if (sinceMsParam) {
      const since = new Date(parseInt(sinceMsParam, 10));
      if (!isNaN(since.getTime())) {
        where = and(where, gt(chatMessages.createdAt, since));
      }
    }

    const rows = await db
      .select()
      .from(chatMessages)
      .where(where)
      .orderBy(asc(chatMessages.createdAt))
      .limit(200);

    return Response.json({
      messages: rows.map((r) => ({
        from: r.fromName,
        text: r.text,
        ts: r.createdAt.getTime(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureTable();
    const body = (await req.json()) as { from?: string; to?: string; text?: string };
    const from = body.from?.trim();
    const to = body.to?.trim();
    const text = body.text?.trim();
    if (!from || !to || !text) return bad("missing fields");
    if (from.toLowerCase() === to.toLowerCase()) return bad("cannot message yourself");
    if (text.length > 500) return bad("text too long");
    if (from.length > 50 || to.length > 50) return bad("name too long");

    const [inserted] = await db
      .insert(chatMessages)
      .values({ fromName: from, toName: to, text })
      .returning();

    return Response.json({
      ok: true,
      message: {
        from: inserted.fromName,
        text: inserted.text,
        ts: inserted.createdAt.getTime(),
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}
