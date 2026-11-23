"use client";

import {signIn} from "next-auth/react";

type SocialAuthButtonsProps = {
  locale: string;
  googleLabel: string;
  facebookLabel: string;
  linkedInLabel: string;
  microsoftLabel: string;
  showMicrosoft?: boolean;
  disclaimer: string;
};

export function SocialAuthButtons({
  locale,
  googleLabel,
  facebookLabel,
  linkedInLabel,
  microsoftLabel,
  showMicrosoft = false,
  disclaimer
}: SocialAuthButtonsProps) {
  const callbackUrl = `/${locale}/home`;

  return (
    <div className="space-y-2.5 max-md:[&_button]:min-h-12 max-md:[&_button]:text-base max-md:[&_button]:motion-reduce:transition-none md:mt-5 md:space-y-3 lg:mt-6 lg:space-y-4">
      <button
        type="button"
        onClick={() => signIn("google", {callbackUrl})}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/18 text-sm font-semibold text-white transition hover:bg-white/28 lg:h-11"
      >
        <span aria-hidden="true">G</span>
        {googleLabel}
      </button>

      <button
        type="button"
        onClick={() => signIn("facebook", {callbackUrl})}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/18 text-sm font-semibold text-white transition hover:bg-white/28 lg:h-11"
      >
        <span aria-hidden="true">f</span>
        {facebookLabel}
      </button>

      <button
        type="button"
        onClick={() => signIn("linkedin", {callbackUrl})}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/18 text-sm font-semibold text-white transition hover:bg-white/28 lg:h-11"
      >
        <span aria-hidden="true">in</span>
        {linkedInLabel}
      </button>

      {showMicrosoft ? (
      <button
        type="button"
        onClick={() => signIn("azure-ad", {callbackUrl})}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/45 bg-white/18 text-sm font-semibold text-white transition hover:bg-white/28 lg:h-11"
      >
        <span aria-hidden="true" className="grid grid-cols-2 gap-px">
          <span className="h-1.5 w-1.5 bg-white" />
          <span className="h-1.5 w-1.5 bg-white" />
          <span className="h-1.5 w-1.5 bg-white" />
          <span className="h-1.5 w-1.5 bg-white" />
        </span>
        {microsoftLabel}
      </button>
      ) : null}

      <p className="pt-1 text-center text-xs text-slate-100/90">{disclaimer}</p>
    </div>
  );
}
