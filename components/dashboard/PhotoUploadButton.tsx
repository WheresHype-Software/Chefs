"use client";

import type { UploadKind } from "@/hooks/usePhotoUpload";

type Props = {
  kind: UploadKind;
  label: string;
  busy: boolean;
  onFiles: (kind: UploadKind, files: FileList | null) => void;
  primary?: boolean;
};

/** File picker styled as a button; the label keeps it keyboard- and screen-reader-friendly. */
export function PhotoUploadButton({ kind, label, busy, onFiles, primary = false }: Props) {
  return (
    <label className={`btn btn-sm ${primary ? "" : "btn-o"} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
      {busy ? "A carregar…" : label}
      <input
        type="file"
        accept="image/*"
        multiple={kind === "gallery"}
        className="sr-only"
        onChange={(e) => {
          onFiles(kind, e.target.files);
          e.target.value = "";
        }}
      />
    </label>
  );
}
