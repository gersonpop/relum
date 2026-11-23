import {requireActivePageSession} from "@/lib/server-session-helper";
import {getTranslations} from "next-intl/server";
import {type ActorContext} from "@/server/pgDynamicDbStore";
import {PositionsConfigClient} from "./component.positions";
import {NewPagePattern} from "@/components/module-patterns/NewPagePattern";

type PageProps = {
  params: Promise<{locale: string}>;
};

export default async function PositionsPage({params}: PageProps) {
  const {locale} = await params;
  const session = await requireActivePageSession(locale);

  const rawRole = String((session.user as {role?: string}).role ?? "SU").trim().toLowerCase();
  const role: "SU" | "cliente" = rawRole === "su" ? "SU" : "cliente";
  const actor: ActorContext = {
    actorId: session.user.email ?? session.user.name ?? "anonymous",
    role,
    companyId: (session.user as {companyId?: string | null}).companyId ?? null
  };

  const t = await getTranslations({locale, namespace: "AccountConfig"});

  return (
    <NewPagePattern
      title="Cargos"
      description="Crea los cargos de tu equipo, por ejemplo Técnico, Supervisor o Jefe de mantenimiento."
      plain={true}
    >
      <PositionsConfigClient actorId={actor.actorId} actorRole={actor.role} companyId={actor.companyId} />
    </NewPagePattern>
  );
}