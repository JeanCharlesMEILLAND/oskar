import { db } from "@/db";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let tableEnsured = false;
async function ensureTables() {
  if (tableEnsured) return;
  // name-based (no FK to accounts table — names are the single source of truth on the client).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS name_friend_requests (
      id SERIAL PRIMARY KEY,
      from_name TEXT NOT NULL,
      to_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS name_friend_req_pair
      ON name_friend_requests (lower(from_name), lower(to_name));
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS name_friend_req_to_idx
      ON name_friend_requests (lower(to_name));
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS name_friendships (
      id SERIAL PRIMARY KEY,
      owner_name TEXT NOT NULL,
      friend_name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS name_friendship_pair
      ON name_friendships (lower(owner_name), lower(friend_name));
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS name_friendship_owner_idx
      ON name_friendships (lower(owner_name));
  `);
  tableEnsured = true;
}

function bad(reason: string, status = 400) {
  return Response.json({ error: reason }, { status });
}

// GET ?me=NAME → { friends: string[], requests: string[] }
export async function GET(req: Request) {
  try {
    await ensureTables();
    const url = new URL(req.url);
    const me = url.searchParams.get("me")?.trim();
    if (!me) return bad("missing me");
    const meLower = me.toLowerCase();

    const friendsRes = await db.execute<{ friend_name: string }>(sql`
      SELECT friend_name FROM name_friendships
       WHERE lower(owner_name) = ${meLower}
       ORDER BY created_at ASC
    `);
    const reqRes = await db.execute<{ from_name: string }>(sql`
      SELECT from_name FROM name_friend_requests
       WHERE lower(to_name) = ${meLower}
       ORDER BY created_at ASC
    `);

    return Response.json({
      friends: friendsRes.rows.map((r) => r.friend_name),
      requests: reqRes.rows.map((r) => r.from_name),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}

// POST { action, ... }
//   action=request  { from, to }          → create pending request (or no-op if already friends)
//   action=accept   { me, from }          → mutual friendship + delete request
//   action=decline  { me, from }          → delete request
//   action=remove   { me, friend }        → delete both friendship rows
export async function POST(req: Request) {
  try {
    await ensureTables();
    const body = (await req.json()) as {
      action?: string;
      from?: string;
      to?: string;
      me?: string;
      friend?: string;
    };
    const action = body.action;

    if (action === "request") {
      const from = body.from?.trim();
      const to = body.to?.trim();
      if (!from || !to) return bad("missing from/to");
      if (from.toLowerCase() === to.toLowerCase()) return bad("self");

      // If already friends → reject as alreadyFriend
      const exist = await db.execute<{ n: number }>(sql`
        SELECT 1 AS n FROM name_friendships
         WHERE lower(owner_name) = ${from.toLowerCase()}
           AND lower(friend_name) = ${to.toLowerCase()}
         LIMIT 1
      `);
      if (exist.rows.length > 0) return bad("alreadyFriend");

      // If there's a pending request from the other side → auto-accept (mutual interest)
      const reciprocal = await db.execute<{ n: number }>(sql`
        SELECT 1 AS n FROM name_friend_requests
         WHERE lower(from_name) = ${to.toLowerCase()}
           AND lower(to_name) = ${from.toLowerCase()}
         LIMIT 1
      `);
      if (reciprocal.rows.length > 0) {
        // Both wanted to be friends → become friends right away
        await db.execute(sql`
          DELETE FROM name_friend_requests
           WHERE (lower(from_name) = ${from.toLowerCase()} AND lower(to_name) = ${to.toLowerCase()})
              OR (lower(from_name) = ${to.toLowerCase()} AND lower(to_name) = ${from.toLowerCase()})
        `);
        await db.execute(sql`
          INSERT INTO name_friendships (owner_name, friend_name) VALUES (${from}, ${to})
          ON CONFLICT DO NOTHING
        `);
        await db.execute(sql`
          INSERT INTO name_friendships (owner_name, friend_name) VALUES (${to}, ${from})
          ON CONFLICT DO NOTHING
        `);
        return Response.json({ ok: true, mutual: true });
      }

      // Otherwise insert (or ignore if duplicate)
      await db.execute(sql`
        INSERT INTO name_friend_requests (from_name, to_name) VALUES (${from}, ${to})
        ON CONFLICT DO NOTHING
      `);
      return Response.json({ ok: true, mutual: false });
    }

    if (action === "accept") {
      const me = body.me?.trim();
      const from = body.from?.trim();
      if (!me || !from) return bad("missing me/from");
      // Delete the request
      await db.execute(sql`
        DELETE FROM name_friend_requests
         WHERE lower(from_name) = ${from.toLowerCase()}
           AND lower(to_name) = ${me.toLowerCase()}
      `);
      // Insert both directions
      await db.execute(sql`
        INSERT INTO name_friendships (owner_name, friend_name) VALUES (${me}, ${from})
        ON CONFLICT DO NOTHING
      `);
      await db.execute(sql`
        INSERT INTO name_friendships (owner_name, friend_name) VALUES (${from}, ${me})
        ON CONFLICT DO NOTHING
      `);
      return Response.json({ ok: true });
    }

    if (action === "decline") {
      const me = body.me?.trim();
      const from = body.from?.trim();
      if (!me || !from) return bad("missing me/from");
      await db.execute(sql`
        DELETE FROM name_friend_requests
         WHERE lower(from_name) = ${from.toLowerCase()}
           AND lower(to_name) = ${me.toLowerCase()}
      `);
      return Response.json({ ok: true });
    }

    if (action === "remove") {
      const me = body.me?.trim();
      const friend = body.friend?.trim();
      if (!me || !friend) return bad("missing me/friend");
      await db.execute(sql`
        DELETE FROM name_friendships
         WHERE (lower(owner_name) = ${me.toLowerCase()} AND lower(friend_name) = ${friend.toLowerCase()})
            OR (lower(owner_name) = ${friend.toLowerCase()} AND lower(friend_name) = ${me.toLowerCase()})
      `);
      return Response.json({ ok: true });
    }

    return bad("unknown_action");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return Response.json({ error: "db_error", detail: msg }, { status: 500 });
  }
}
