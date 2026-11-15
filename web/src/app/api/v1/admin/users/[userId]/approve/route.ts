import {NextResponse} from "next/server";
import {updateApprovalStatus} from "@/server/auth/onboarding";

type RouteContext = {
  params: Promise<{userId: string}>;
};

export async function POST(request: Request, {params}: RouteContext) {
  try {
    const {userId} = await params;
    const actor = request.headers.get("x-actor-id") ?? "admin";
    
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
