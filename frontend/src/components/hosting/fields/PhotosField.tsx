import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { api, ApiError } from "@/lib/api";
import { isPhotoUrl } from "@/lib/listing-draft";
import { FieldError, inputCls } from "./FieldError";

const MAX = 20;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  error?: string;
}

export function PhotosField({ value, onChange, error }: Props) {
  const [url, setUrl] = useState("");
  const [localError, setLocalError] = useState<string>();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const full = value.length >= MAX;

  function addUrl() {
    const u = url.trim();
    if (!isPhotoUrl(u)) return setLocalError("Enter a link that starts with http:// or https://");
    if (value.includes(u)) return setLocalError("That photo is already added.");
    setLocalError(undefined);
    setUrl("");
    onChange([...value, u]);
  }

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return setLocalError("Photos must be JPEG, PNG or WebP.");
    if (file.size > 4 * 1024 * 1024) return setLocalError("Photos must be 4 MB or smaller.");
    setLocalError(undefined);
    setUploading(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const { url: uploaded } = await api<{ url: string }>("/upload", { method: "POST", body });
      onChange([...value, uploaded]);
    } catch (e) {
      setLocalError(e instanceof ApiError ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  const iconBtn = "flex size-8 items-center justify-center rounded-full bg-white shadow-elevation1 hover:bg-faint disabled:opacity-40 disabled:hover:bg-white";

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <label htmlFor="photo-url" className="sr-only">
            Photo link
          </label>
          <input
            id="photo-url"
            type="url"
            value={url}
            placeholder="Paste a photo link (https://...)"
            disabled={full}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            className={inputCls}
          />
        </div>
        <Button variant="outline" disabled={full || !url.trim()} onClick={addUrl}>
          Add link
        </Button>
        <Button variant="outline" disabled={full || uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus size={18} />
          {uploading ? "Uploading..." : "Upload photo"}
        </Button>
        <input ref={fileRef} type="file" accept={TYPES.join(",")} hidden aria-label="Upload a photo file" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <p className="mt-2 text-sm text-secondary">
        {value.length} of {MAX} photos. JPEG, PNG or WebP, up to 4 MB each.
      </p>
      <FieldError error={localError ?? error} />

      <ul className="mt-6 grid grid-cols-2 gap-3">
        {value.map((src, i) => (
          <li key={src} className={`relative overflow-hidden rounded-12 bg-bebe ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-[4/3]"}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`Photo ${i + 1}`} className="size-full object-cover" />
            {i === 0 && <span className="absolute top-3 left-3 rounded-pill bg-white px-3 py-1 text-label shadow-elevation1">Cover Photo</span>}
            <div className="absolute right-3 bottom-3 flex gap-2">
              <button type="button" aria-label={`Move photo ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}>
                <ArrowUp size={16} />
              </button>
              <button type="button" aria-label={`Move photo ${i + 1} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
                <ArrowDown size={16} />
              </button>
              <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className={iconBtn}>
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
