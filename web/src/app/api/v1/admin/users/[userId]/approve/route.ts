import {NextResponse} from "next/server";
import {updateApprovalStatus} from "@/server/auth/onboarding";
import {requireApiActor} from "@/server/api-auth";
import {getPgPool} from "@/server/postgres";

type RouteContext = {
  params: Promise<{userId: string}>;
};

export async function POST(request: Request, {params}: RouteContext) {
  const auth = await requireApiActor(request);
  if ("error" in auth) return auth.error;

  try {
    const {userId} = await params;
    const actor = auth.actor.actorId;

    // Un superusuario aprueba en cualquier empresa; los demás solo en su empresa activa.
    if (auth.actor.role !== "SU") {
      const target = await getPgPool().query('SELECT "companyId" FROM "Onboarding" WHERE "id"=$1 LIMIT 1', [userId]);
      const targetCompany = target.rows[0]?.companyId ? String(target.rows[0].companyId) : null;
      if (!targetCompany || targetCompany !== auth.actor.companyId) {
        return NextResponse.json({message: "No puedes gestionar solicitudes de otra empresa."}, {status: 403});
      }
    }
    
    // Parse roleId from body (required for multicompany approval)
    let roleId: string | null = null;
    try {
      const body = await request.json();
      roleId = body?.roleId ?? null;
    } catch {
      // Body may be empty for legacy calls
    }

    const user = await updateApprovalStatus(userId, actor, "approve", roleId);
    return NextResponse.json({ok: true, user});
  } catch (error) {
    return NextResponse.json({message: error instanceof Error ? error.message : "Request failed"}, {status: 400});
  }
}
