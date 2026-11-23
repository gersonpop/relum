import { cache } from "react";
import { getServerSession, type Session } from "next-auth";
import { cookies } from "next/headers";
import { authOptions } from "@/lib/auth-options";
import { getPgPool } from "@/server/postgres";
import type { ActorContext } from "@/server/pgDynamicDbStore";
import { redirect } from "next/navigation";
import { isDevFakeSessionEnabled } from "@/server/api-auth";
import { resolveSocialOnboarding, type SocialProvider } from "@/server/auth/onboarding";

type ProtectedSession = Session & {
  user: NonNullable<Session["user"]> & {
    email: string;
    role?: string;
    roleScope?: string;
    companyId?: string | null;
    companyName?: string;
    userCargo?: string;
    provider?: SocialProvider;
  };
};

export interface ResolvedUserContext {
  session: ProtectedSession;
  actor: ActorContext;
  companyName: string;
  userCargo: string;
  roleScope: string;
  locale: string;
}

export const requireActivePageSession = cache(async (locale: string): Promise<ProtectedSession> => {
  const session = await getServerSession(authOptions);

  if (isDevFakeSessionEnabled() && !session) {
    return {
      user: {
        name: "Dev User",
        email: "dev@relum.app",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
        role: "SU",
        roleScope: "SU",
        companyId: "900000000",
        companyName: "Relum Dev",
        userCargo: "Super Administrador",
        provider: "google"
      },
      expires: "2026-06-30T00:00:00.000Z"
    };
  }

  const email = session?.user?.email;
  if (!email) {
    redirect("/" + locale);
  }

  const provider = (session.user as { provider?: SocialProvider }).provider ?? "google";
  const {flow} = await resolveSocialOnboarding(email, provider);
  if (flow === "PENDING_ONLY" || flow === "INACTIVE") {
    redirect(`/${locale}/pending-approval`);
  }
  if (flow !== "ACTIVE") {
    redirect(`/${locale}/onboarding`);
  }
  return session as ProtectedSession;
});

export async function resolveUserContext(locale: string): Promise<ResolvedUserContext> {
  const session = await requireActivePageSession(locale);
  const rawRole = String(session.user.role ?? "cliente").trim().toLowerCase();
  const role: "SU" | "cliente" = rawRole === "su" ? "SU" : "cliente";
  const roleScope = String(session.user.roleScope ?? "User");
  
  const cookieStore = await cookies();
  const activeCompanyId = cookieStore.get("active_company_id")?.value;
  
  const isMulticompany = roleScope.toLowerCase() === "multicompany";
  const finalCompanyId = ((role === "SU" || isMulticompany) && activeCompanyId) 
    ? activeCompanyId 
    : (session.user.companyId ?? null);

  const actor: ActorContext = {
    actorId: session.user.email ?? session.user.name ?? "anonymous",
    role,
    companyId: finalCompanyId
  };

  let companyName = session.user.companyName ?? "";
  const userCargo = session.user.userCargo ?? "Miembro";

  // If SU or Multicompany user switched active company, fetch that company's name
  if ((role === "SU" || isMulticompany) && activeCompanyId) {
    try {
      const pool = getPgPool();
      const res = await pool.query('SELECT "commercialName" FROM public."Company" WHERE id = $1 LIMIT 1', [activeCompanyId]);
      if (res.rows.length > 0) {
        companyName = res.rows[0].commercialName;
      } else {
        companyName = `Company ID: ${activeCompanyId}`;
      }
    } catch (e) {
      console.error("Error fetching active company name:", e);
    }
  }

  return {
    session,
    actor,
    companyName,
    userCargo,
    roleScope,
    locale
  };
}
