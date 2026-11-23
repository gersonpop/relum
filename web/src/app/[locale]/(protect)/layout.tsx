import type {ReactNode} from "react";
import {requireActivePageSession} from "@/lib/server-session-helper";

type ProtectedLayoutProps = {
  params: Promise<{locale: string}>;
  children: ReactNode;
};

export default async function ProtectedLayout({params, children}: ProtectedLayoutProps) {
  const {locale} = await params;
  await requireActivePageSession(locale);

  return children;
}
