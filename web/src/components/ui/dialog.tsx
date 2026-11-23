"use client";

import {useTranslations} from "next-intl";
import {useId, useLayoutEffect, useRef, type KeyboardEvent, type ReactNode, type RefObject} from "react";

type DialogProps = {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  placement?: "center" | "side";
  closeOnBackdrop?: boolean;
  dismissible?: boolean;
  descriptionId?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
};

let scrollLocks = 0;
let previousOverflow = "";

export function Dialog({
  title,
  onClose,
  children,
  className,
  placement = "center",
  closeOnBackdrop = true,
  dismissible = true,
  descriptionId,
  initialFocusRef,
}: DialogProps) {
  const t = useTranslations("dialogs");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pointerStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const root = document.documentElement;
    const trigger = document.activeElement;
    dialog.showModal();
    (initialFocusRef?.current ?? headingRef.current)?.focus({preventScroll: true});

    if (scrollLocks === 0) {
      previousOverflow = root.style.overflow;
      root.style.overflow = "hidden";
    }
    scrollLocks++;

    return () => {
      dialog.close();
      scrollLocks--;
      if (scrollLocks === 0) root.style.overflow = previousOverflow;

      // A parent dialog and its confirmation can unmount in the same commit.
      queueMicrotask(() => {
        if (trigger instanceof HTMLElement && trigger.isConnected && document.activeElement === document.body) {
          trigger.focus({preventScroll: true});
        }
      });
    };
  }, [initialFocusRef]);

  function wrapTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab" || event.defaultPrevented || !(event.target instanceof HTMLElement)
      || event.target.closest("dialog") !== event.currentTarget) return;

    const tabStops = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]',
    )).filter((element) => element.closest("dialog") === event.currentTarget
      && element.tabIndex >= 0 && !element.matches(":disabled")
      && !element.closest("[inert]") && element.getClientRects().length > 0
      && getComputedStyle(element).visibility === "visible");
    const first = tabStops[0];
    const last = tabStops.at(-1);
    const current = document.activeElement;

    if (!first || (event.shiftKey && (current === first || current === headingRef.current))
      || (!event.shiftKey && current === last)) {
      event.preventDefault();
      (event.shiftKey ? last ?? headingRef.current : first ?? headingRef.current)?.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (dismissible) onClose();
      }}
      onPointerDown={(event) => {
        pointerStartedOnBackdrop.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        const startedOnBackdrop = pointerStartedOnBackdrop.current;
        pointerStartedOnBackdrop.current = false;
        if (!dismissible || !closeOnBackdrop || !startedOnBackdrop || event.target !== event.currentTarget) return;

        const {left, right, top, bottom} = event.currentTarget.getBoundingClientRect();
        if (event.clientX < left || event.clientX >= right || event.clientY < top || event.clientY >= bottom) onClose();
      }}
      onKeyDown={wrapTab}
      className={`fixed overflow-hidden border border-slate-200 bg-white text-slate-800 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm open:flex open:flex-col ${placement === "side"
        ? "inset-y-0 right-0 left-auto my-auto h-dvh max-h-dvh w-full sm:rounded-l-2xl"
        : "inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] rounded-2xl"} ${className ?? "sm:max-w-lg"}`}
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 ref={headingRef} tabIndex={-1} id={titleId} className="min-w-0 break-words text-lg font-semibold outline-none">
          {title}
        </h2>
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {t("close")}
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 py-4 sm:px-6">{children}</div>
    </dialog>
  );
}
