import {promises as fs} from "node:fs";
import path from "node:path";
import {NextResponse} from "next/server";
import {requireSessionUser} from "@/server/api-auth";

type Params = {params: Promise<{name: string}>};

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

/** Sirve las fotos subidas que se guardan en el volumen persistente (UPLOADS_DIR). */
export async function GET(_request: Request, {params}: Params) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  const uploadsDir = process.env.UPLOADS_DIR;
  const {name} = await params;
  const ext = path.extname(name).toLowerCase();
  const contentType = CONTENT_TYPES[ext];

  // Solo nombres simples de imagen: nada de rutas ni otros tipos de archivo.
  if (!uploadsDir || !/^[A-Za-z0-9._-]+$/.test(name) || name.startsWith(".") || !contentType) {
    return NextResponse.json({message: "Archivo no encontrado"}, {status: 404});
  }

  try {
    const data = await fs.readFile(path.join(uploadsDir, name));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({message: "Archivo no encontrado"}, {status: 404});
  }
}
