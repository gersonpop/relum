import {getServerSession, type Session} from "next-auth";
import {cookies} from "next/headers";
import {NextResponse} from "next/server";
import {authOptions} from "@/lib/auth-options";
import {resolveSocialOnboarding, type ResolveFlow, type SocialProvider} from "@/server/auth/onboarding";
import {getPgPool} from "@/server/postgres";
import type {ActorContext} from "@/server/pgDynamicDbStore";
import {accessGate} from "../../messages/es.json";

/**
 * Identifica a quien llama a la API a partir de la sesión de NextAuth (cookie firmada),
 * nunca a partir de cabeceras que envía el navegador. Las cabeceras x-actor-id,
 * x-actor-role y Authorization ya no otorgan permisos.
 */

export type SessionUser = {
  email: string;
  name: string | null;
  userId: string | null;
  role: "SU" | "cliente";
  roleScope: string;
  companyId: string | null;
  provider: SocialProvider;
};

export type ApiActor = ActorContext & {user: SessionUser};

type SessionResult = {user: SessionUser} | {error: NextResponse};
type ActorResult = {actor: ApiActor} | {error: NextResponse};

/** Sesión falsa de superusuario solo para desarrollo local y solo si se pide explícitamente. */
export function isDevFakeSessionEnabled() {
  return process.env.NODE_ENV === "development" && process.env.DEV_FAKE_SESSION === "true";
}

function devFakeUser(): SessionUser {
  return {
    email: "dev@relum.app",
    name: "Dev User",
    userId: null,
    role: "SU",
    roleScope: "SU",
    companyId: "900000000",
    provider: "google"
  };
}

function toSessionUser(session: Session | null): SessionUser | null {
  const user = session?.user as (Record<string, unknown> & {email?: string | null; name?: string | null}) | undefined;
  const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
  if (!user || !email) return null;
  const rawRole = String(user.role ?? "cliente").trim().toLowerCase();
  return {
    email,
    name: user.name ?? null,
    userId: typeof user.userId === "string" ? user.userId : null,
    role: rawRole === "su" ? "SU" : "cliente",
    roleScope: String(user.roleScope ?? "User"),
    companyId: typeof user.companyId === "string" && user.companyId.length > 0 ? user.companyId : null,
    provider: (user.provider as SocialProvider | undefined) ?? "google"
  };
}

function json(message: string, status: number) {
  return NextResponse.json({message}, {status});
}

async function resolveSessionAccess(): Promise<{user: SessionUser; flow: ResolveFlow} | {error: NextResponse}> {
  const session = await getServerSession(authOptions);
  const user = toSessionUser(session);
  if (user) {
    const {flow} = await resolveSocialOnboarding(user.email, user.provider);
    return {user, flow};
  }
  if (!session && isDevFakeSessionEnabled()) return {user: devFakeUser(), flow: "ACTIVE"};
  return {error: json("Inicia sesión para continuar.", 401)};
}

/** Exige una cuenta activa para usar la aplicación. */
export async function requireSessionUser(): Promise<SessionResult> {
  const result = await resolveSessionAccess();
  if ("error" in result) return result;
  if (result.flow === "ACTIVE") return {user: result.user};
  return {error: json(result.flow === "INACTIVE" ? accessGate.inactive : accessGate.approvalRequired, 403)};
}

/** Limita las acciones del formulario de registro a quien puede completarlo. */
export async function requireOnboardingSessionUser(): Promise<SessionResult> {
  const result = await resolveSessionAccess();
  if ("error" in result) return result;
  if (result.flow === "FORM_REQUIRED") return {user: result.user};
  return {error: json(result.flow === "INACTIVE" ? accessGate.inactive : accessGate.approvalRequired, 403)};
}

async function belongsToCompany(user: SessionUser, companyId: string) {
  if (user.companyId === companyId) return true;
  if (!user.userId) return false;
  const res = await getPgPool().query(
    'SELECT 1 FROM public."UserRole" WHERE platform_user_id = $1 AND company_id = $2 LIMIT 1',
    [user.userId, companyId]
  );
  return (res.rowCount ?? 0) > 0;
}

/**
 * Resuelve el actor de la API. La empresa activa solo se puede cambiar si el usuario es
 * superusuario o pertenece a esa empresa; "ver todas las compañías" es solo para superusuarios.
 */
export async function requireApiActor(request: Request): Promise<ActorResult> {
  const result = await requireSessionUser();
  if ("error" in result) return result;
  const {user} = result;

  const cookieStore = await cookies();
  const requestedCompany =
    request.headers.get("x-company-id")?.trim() || cookieStore.get("active_company_id")?.value?.trim() || null;

  let companyId = user.companyId;
  if (requestedCompany && requestedCompany !== user.companyId) {
    if (user.role === "SU" || (await belongsToCompany(user, requestedCompany))) {
      companyId = requestedCompany;
    } else {
      return {error: json("No tienes acceso a esa empresa.", 403)};
    }
  }

  if (user.role !== "SU" && !companyId) {
    return {error: json("Tu usuario no tiene una empresa asignada.", 403)};
  }

  return {
    actor: {
      actorId: user.email,
      role: user.role,
      companyId,
      showAllCompanies: user.role === "SU" && request.headers.get("x-show-all-companies") === "true",
      user
    }
  };
}

/** Exige superusuario. */
export async function requireSuperUser(request: Request): Promise<ActorResult> {
  const result = await requireApiActor(request);
  if ("error" in result) return result;
  if (result.actor.role !== "SU") return {error: json("Solo un superadministrador puede hacer esto.", 403)};
  return result;
}
