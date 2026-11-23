import {ProtectedSidebarLayout} from "@/components/protected-sidebar-layout";
import {resolveUserContext} from "@/lib/server-session-helper";

type ProtectedHomePageProps = {
  params: Promise<{locale: string}>;
};

export default async function ProtectedHomePage({params}: ProtectedHomePageProps) {
  const {locale} = await params;
  const {session, actor, companyName, userCargo, roleScope} = await resolveUserContext(locale);

  return (
    <ProtectedSidebarLayout
      locale={locale}
      userName={session.user.name ?? "Usuario"}
      userEmail={session.user.email ?? ""}
      userImage={session.user.image ?? null}
      actorId={actor.actorId}
      actorRole={actor.role}
      companyId={actor.companyId}
      companyName={companyName}
      userCargo={userCargo}
      roleScope={roleScope}
    />
  );
}
