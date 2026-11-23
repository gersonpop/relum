"use client";

import {useTranslations} from "next-intl";
import {useId, useRef, useState} from "react";

import {Dialog} from "./dialog";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "warning";
};

export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  variant = "danger",
}: ConfirmDialogProps) {
  const t = useTranslations("dialogs");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleConfirm() {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setFailed(false);

    try {
      await onConfirm();
      onClose();
    } catch {
      setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  function handleClose() {
    if (!pending.current) onClose();
  }

  return (
    <Dialog
      title={title}
      onClose={handleClose}
      descriptionId={descriptionId}
      initialFocusRef={cancelRef}
      dismissible={!busy}
      className="sm:max-w-md"
    >
      <p id={descriptionId} className="break-words text-sm leading-relaxed text-slate-600">{description}</p>
      {failed && <p role="alert" className="mt-3 text-sm text-rose-700">{t("actionFailed")}</p>}
      <p role="status" className="sr-only">{busy ? t("processing") : ""}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button
          ref={cancelRef}
          type="button"
          aria-disabled={busy}
          onClick={handleClose}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 aria-disabled:opacity-60"
        >
          {t("cancel")}
        </button>
        <button
          type="button"
          aria-disabled={busy}
          onClick={() => void handleConfirm()}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 aria-disabled:opacity-60 ${variant === "danger"
            ? "bg-rose-700 hover:bg-rose-800 focus-visible:outline-rose-700"
            : "bg-blue-700 hover:bg-blue-800 focus-visible:outline-blue-700"}`}
        >
          {busy ? t("processing") : confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
