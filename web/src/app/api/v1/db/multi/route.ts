import {NextResponse} from "next/server";
import {requireApiActor} from "@/server/api-auth";
import {auditDenied, isCorsOriginAllowed, listRecords, type ActorContext} from "@/server/pgDynamicDbStore";


function withCors(response: NextResponse, request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-company-id, x-show-all-companies");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  return response;
}

async function authorize(request: Request) {
  const origin = request.headers.get("origin");
  if (!isCorsOriginAllowed(origin)) {
    return {error: withCors(NextResponse.json({message: "CORS origin blocked"}, {status: 403}), request)};
  }

  const result = await requireApiActor(request);
  if ("error" in result) {
    await auditDenied({actorId: "anonymous", role: "cliente", companyId: null}, "audit_logs", "No valid session");
    return {error: withCors(result.error, request)};
  }

  return {actor: result.actor};
}

export async function OPTIONS(request: Request) {
  return withCors(new NextResponse(null, {status: 204}), request);
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;

  try {
    const url = new URL(request.url);
    const tables = Array.from(url.searchParams.values()).filter((value) => value.trim().length > 0);

    if (tables.length === 0) {
      return withCors(NextResponse.json({message: "request without tables"}, {status: 400}), request);
    }

    const data: Record<string, unknown> = {};
    await Promise.all(
      tables.map(async (tableName) => {
        data[tableName] = await listRecords(auth.actor, tableName, null);
      })
    );

    return withCors(NextResponse.json(data), request);
  } catch (error) {
    return withCors(
      NextResponse.json({message: error instanceof Error ? error.message : "Request failed"}, {status: 400}),
      request
    );
  }
}
