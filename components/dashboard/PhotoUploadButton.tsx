"use client";

import type { UploadKind } from "@/hooks/usePhotoUpload";

type Props = {
  kind: UploadKind;
  label: string;
  busy: boolean;
  /** How many of how many are done, while a batch is in flight. */
  progress?: { done: number; total: number } | null;
  onFiles: (kind: UploadKind, files: FileList | null) => void;
  primary?: boolean;
};

/** File picker styled as a button; the label keeps it keyboard- and screen-reader-friendly. */
export function PhotoUploadButton({ kind, label, busy, progress, onFiles, primary = false }: Props) {
  return (
    <label className={`btn btn-sm ${primary ? "" : "btn-o"} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {busy ? (progress && progress.total > 1 ? `A carregar ${progress.done} de ${progress.total}…` : "A carregar…") : label}
      <input
        type="file"
        accept="image/*"
        multiple={kind === "gallery"}
        // On phones the selfie opens the front camera straight away.
        capture={kind === "selfie" ? "user" : undefined}
        className="sr-only"
        onChange={(e) => {
          onFiles(kind, e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
