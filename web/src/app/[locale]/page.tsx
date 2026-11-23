import {getTranslations, setRequestLocale} from "next-intl/server";
import type {Viewport} from "next";
import {getServerSession} from "next-auth";
import Image from "next/image";
import {redirect} from "next/navigation";
import {LanguageSwitcher} from "@/components/language-switcher";
import {LoginShowcase} from "@/components/login-showcase";
import {SocialAuthButtons} from "@/components/social-auth-buttons";
import {authOptions} from "@/lib/auth-options";

type HomePageProps = {
  params: Promise<{locale: string}>;
};

export const viewport: Viewport = {
  viewportFit: "cover"
};

export default async function HomePage({params}: HomePageProps) {
  const {locale} = await params;
  const session = await getServerSession(authOptions);

  if (session?.user?.email) {
    redirect(`/${locale}/home`);
  }

  setRequestLocale(locale);
  const t = await getTranslations({locale, namespace: "HomePage"});
  const slides = [1, 2, 3, 4, 5].map((item) => ({
    title: t(`login-title-${item}`),
    text: t(`login-text-${item}`),
    image: `/images/login/login-image-${item}.jpeg`
  }));

  return (
    <div className="relative bg-[#083870] md:h-dvh md:overflow-hidden md:bg-[url('/images/login-backgorund.jpeg')] md:bg-cover md:bg-center md:bg-no-repeat">
      <div className="absolute inset-0 hidden bg-slate-950/30 md:block" />

      <main className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1024px] flex-col max-md:pt-[max(1rem,env(safe-area-inset-top))] max-md:pr-[max(1.5rem,env(safe-area-inset-right))] max-md:pb-[max(1rem,env(safe-area-inset-bottom))] max-md:pl-[max(1.5rem,env(safe-area-inset-left))] md:grid md:h-full md:min-h-0 md:grid-cols-[5fr_4fr] md:items-center md:gap-4 md:p-5 lg:max-h-[900px] lg:gap-6 lg:p-6">
        <section className="hidden min-h-0 md:block md:h-[500px] md:min-w-0 lg:h-[560px]">
          <LoginShowcase slides={slides} />
        </section>

        <section className="liquid-card max-md:flex max-md:flex-1 max-md:flex-col max-md:border-0! max-md:bg-none! max-md:backdrop-filter-none! md:h-[500px] md:min-h-0 md:rounded-[2rem] md:p-5 lg:h-[560px] lg:min-w-0 lg:p-6">
          <span className="pointer-events-none absolute inset-[1px] hidden rounded-[1.95rem] border-2 border-white/40 md:block" />
          <span className="pointer-events-none absolute inset-[1px] hidden rounded-[1.95rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-12px_28px_rgba(255,255,255,0.08),0_18px_40px_rgba(2,23,56,0.24)] md:block" />
          <div className="flex w-full justify-end max-md:[&_button]:min-h-11 max-md:[&_button]:min-w-11">
            <LanguageSwitcher />
          </div>

          <div className="flex flex-1 flex-col justify-center py-5 text-white md:hidden [@media(max-height:640px)]:py-2">
            <Image src="/logo_icon.png" alt="" width={64} height={64} className="rounded-2xl [@media(max-height:640px)]:size-11" />
            <h1 className="mt-4 text-4xl font-semibold tracking-tight [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:text-3xl">Relum</h1>
            <p className="mt-2 max-w-xs text-lg leading-7 text-sky-100 [@media(max-height:640px)]:text-base [@media(max-height:560px)]:hidden">{t("description")}</p>
          </div>

          <div className="mt-4 hidden space-y-2 md:block lg:mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">Relum</p>
            <h1 className="text-2xl font-semibold leading-8 tracking-tight text-white lg:text-3xl lg:leading-10">{t("loginHeading")}</h1>
            <p className="text-sm leading-6 text-slate-100 lg:text-base">{t("loginDescription")}</p>
          </div>

          <SocialAuthButtons
            locale={locale}
            googleLabel={t("socialGoogle")}
            facebookLabel={t("socialFacebook")}
            linkedInLabel={t("socialLinkedIn")}
            microsoftLabel={t("socialMicrosoft")}
            showMicrosoft={Boolean(process.env.AUTH_MICROSOFT_ID && process.env.AUTH_MICROSOFT_SECRET)}
            disclaimer={t("socialDisclaimer")}
          />
        </section>
      </main>
    </div>
  );
}
