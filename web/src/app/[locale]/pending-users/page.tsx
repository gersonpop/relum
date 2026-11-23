import {ProtectedSidebarLayout} from "@/components/protected-sidebar-layout";
import {requireActivePageSession} from "@/lib/server-session-helper";
import {listPendingApprovals} from "@/server/auth/onboarding";
import {PendingUsersClient} from "./PendingUsersClient";

type PendingUsersPageProps = {
  params: Promise<{locale: string}>;
};

export default async function PendingUsersPage({params}: PendingUsersPageProps) {
  const {locale} = await params;
  const session = await requireActivePageSession(locale);

  const pending = await listPendingApprovals();
  const rawRole = String((session.user as {role?: string}).role ?? "cliente").trim().toLowerCase();
  const role: "SU" | "cliente" = rawRole === "su" ? "SU" : "cliente";

  const actorId = session.user.email ?? session.user.name ?? "anonymous";

  return (
    <ProtectedSidebarLayout
      locale={locale}
      userName={session.user.name ?? "Usuario"}
      userEmail={session.user.email ?? ""}
      userImage={session.user.image ?? null}
      actorId={actorId}
      actorRole={role}
      companyId={(session.user as {companyId?: string | null}).companyId ?? null}
      title="Pendientes de alta"
      description="Revision y aprobacion de usuarios registrados por redes sociales."
    >
      <PendingUsersClient initialPending={pending} actorId={actorId} />
    </ProtectedSidebarLayout>
  );
}
