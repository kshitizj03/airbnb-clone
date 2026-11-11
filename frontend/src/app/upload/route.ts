import { put } from "@vercel/blob";
import { sniffImage } from "@/lib/image-type";

// Photo uploads. Lives outside /api because next.config.ts rewrites /api/* to FastAPI.
// On Vercel (BLOB_READ_WRITE_TOKEN set) the photo goes to Vercel Blob; locally it is
// handed to the backend, which keeps it on disk as before.

const backend = process.env.BACKEND_URL || "http://127.0.0.1:8000";
const MAX_BYTES = 4 * 1024 * 1024; // Vercel functions refuse bodies over ~4.5 MB anyway

const error = (status: number, code: string, message: string) =>
  Response.json({ error: { code, message } }, { status });

export async function POST(req: Request) {
  const cookie = req.headers.get("cookie") ?? "";
  const me = await fetch(`${backend}/api/auth/me`, { headers: { cookie } });
  if (me.status !== 200) return error(401, "not_authenticated", "Please log in.");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    const res = await fetch(`${backend}/api/uploads`, {
      method: "POST",
      headers: { cookie, "content-type": req.headers.get("content-type") ?? "" },
      body: await req.arrayBuffer(),
    });
    return new Response(await res.text(), {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  }

  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return error(422, "validation_error", "Some fields are invalid.");
  if (file.size > MAX_BYTES) return error(413, "too_large", "Images can be at most 4 MB.");
  const bytes = await file.arrayBuffer();
  const kind = sniffImage(new Uint8Array(bytes));
  // Trust neither the header nor the bytes alone: both must agree (same rule as the backend).
  if (!kind || kind.type !== file.type) return error(415, "unsupported_type", "Upload a JPEG, PNG or WebP image.");

  const blob = await put(`listings/${crypto.randomUUID()}.${kind.ext}`, bytes, {
    access: "public",
    contentType: kind.type,
  });
  return Response.json({ url: blob.url }, { status: 201 });
}
