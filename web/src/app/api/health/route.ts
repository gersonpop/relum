import {getPgPool} from "@/server/postgres";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = {"Cache-Control": "no-store"};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Database health check timed out")), 3000);
  });

  try {
    await Promise.race([getPgPool().query("SELECT 1"), timeout]);
    return Response.json({status: "ok", database: "ok"}, {status: 200, headers});
  } catch {
    return Response.json({status: "error", database: "error"}, {status: 503, headers});
  } finally {
    clearTimeout(timer);
  }
}
