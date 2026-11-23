import {requireActivePageSession} from "@/lib/server-session-helper";
import {NewPagePattern} from "@/components/module-patterns/NewPagePattern";
import DynamicComponent from "./component.roles";

type PageProps = {
  params: Promise<{locale: string}>;
};

export default async function DynamicNewPage({params}: PageProps) {
  const {locale} = await params;
  const session = await requireActivePageSession(locale);
  const actorId = session.user.email;
  const actorRole = session.user.role ?? "cliente";
  const companyId = session.user.companyId ?? "";

  return (
    <NewPagePattern
      title="roles"
      description="roles"
      plain={true}
    >
      <DynamicComponent actorId={actorId} actorRole={actorRole} companyId={companyId} />
    </NewPagePattern>
  );
}