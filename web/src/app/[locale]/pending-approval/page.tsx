import {getServerSession} from "next-auth";
import {getTranslations} from "next-intl/server";
import {redirect} from "next/navigation";
import {authOptions} from "@/lib/auth-options";
import {resolveSocialOnboarding, type SocialProvider} from "@/server/auth/onboarding";
import {BackToStartButton} from "./BackToStartButton";

type PendingApprovalPageProps = {
  params: Promise<{locale: string}>;
};

export default async function PendingApprovalPage({params}: PendingApprovalPageProps) {
  const {locale} = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect(`/${locale}`);
  }

  const provider = (session.user as {provider?: SocialProvider}).provider ?? "google";
  const {flow} = await resolveSocialOnboarding(session.user.email, provider);
  if (flow === "ACTIVE") {
    redirect(`/${locale}/home`);
  }
  if (flow !== "INACTIVE" && flow !== "PENDING_ONLY") {
    redirect(`/${locale}/onboarding`);
  }

  const t = await getTranslations({locale, namespace: "accessGate"});

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 p-6 text-white">
      <section className="max-w-lg rounded-2xl border border-white/20 bg-white/10 p-6 text-center backdrop-blur-md">
        <h1 className="text-2xl font-semibold">{t(flow === "INACTIVE" ? "inactiveTitle" : "pendingTitle")}</h1>
        <p className="mt-2 text-sm text-white/80">{t(flow === "INACTIVE" ? "inactive" : "approvalRequired")}</p>
        <BackToStartButton locale={locale} />
      </section>
    </main>
  );
}
