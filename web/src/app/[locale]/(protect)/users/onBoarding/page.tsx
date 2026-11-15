import {listRecords} from "@/server/pgDynamicDbStore";
import {NewPagePattern} from "@/components/module-patterns/NewPagePattern";
import DynamicComponent from "./component.onboarding";
import {resolveUserContext} from "@/lib/server-session-helper";
import {getPgPool} from "@/server/postgres";

type PageProps = {
  params: Promise<{locale: string}>;
};

export default async function DynamicNewPage({params}: PageProps) {
  const {locale} = await params;
  const {session, actor, companyName, userCargo, roleScope} = await resolveUserContext(locale);

  const rows = (await listRecords(actor, "modules", null)) as Array<Record<string, any>>;
  const currentRoute = "/users/onBoarding";
  const currentModule = rows.find(m => m.route === currentRoute && m.status === "active");

  const pool = getPgPool();
  const email = session.user?.email;
  let currentUserProfile = null;
  let eligibleCompanies: Array<{ id: string; commercialName: string }> = [];

  if (email) {
    const userRes = await pool.query(
      'SELECT * FROM public."PlatformUser" WHERE user_email = $1 LIMIT 1',
      [email]
    );
    if (userRes.rows.length > 0) {
      currentUserProfile = userRes.rows[0];
      const dbUserId = currentUserProfile.id_user_pk;

      const userRolesRes = await pool.query<{ company_id: string }>(
        'SELECT DISTINCT company_id FROM public."UserRole" WHERE platform_user_id = $1',
        [dbUserId]
      );
      const assignedCompanyIds = userRolesRes.rows.map(r => r.company_id).filter(Boolean);

      const allCompaniesRes = await pool.query<{ id: string; commercialName: string; status: string }>(
        'SELECT id, "commercialName", status FROM public."Company"'
      );

      const isSU = actor.role === "SU";
      eligibleCompanies = allCompaniesRes.rows
        .filter((c) => {
          const isActive = c.status === "ACTIVE" || c.status === "TRIAL";
          if (!isActive) return false;
          if (isSU) return true;
          return !assignedCompanyIds.includes(c.id);
        })
        .map(c => ({ id: c.id, commercialName: c.commercialName }));
    }
  }

  return (
    <NewPagePattern
      title={currentModule?.name ?? "onBoarding"}
      description={currentModule?.description ?? ""}
      plain={true}
    >
      <DynamicComponent
        currentUserEmail={session.user.email ?? undefined}
        currentUserImage={session.user.image ?? undefined}
        currentUserProvider={(session.user as any).provider ?? undefined}
        isSU={actor.role === "SU"}
        currentUserCompanyId={actor.companyId ?? undefined}
        currentUserRole={roleScope}
        currentUserProfile={currentUserProfile}
        eligibleCompanies={eligibleCompanies}
      />
    </NewPagePattern>
  );
}