import {requireActivePageSession} from "@/lib/server-session-helper";
import {ScrumPageClient} from "./ScrumPageClient";

type ScrumPageProps = {
  params: Promise<{locale: string}>;
};

export default async function ScrumPage({params}: ScrumPageProps) {
  const {locale} = await params;
  await requireActivePageSession(locale);

  return <ScrumPageClient />;
}
