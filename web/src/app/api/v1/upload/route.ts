import { NextResponse } from "next/server";
import { requireSessionUser } from "@/server/api-auth";
import { ImageStorageService } from "@/server/storage";
import { isCorsOriginAllowed, auditDenied } from "@/server/pgDynamicDbStore";

function withCors(response: NextResponse, request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-company-id, x-show-all-companies");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return response;
}

async function authorize(request: Request) {
  const origin = request.headers.get("origin");
  if (!isCorsOriginAllowed(origin)) {
    return {error: withCors(NextResponse.json({message: "CORS origin blocked"}, {status: 403}), request)};
  }

  // Solo exige sesión: quien completa su registro también sube su foto.
  const result = await requireSessionUser();
  if ("error" in result) {
    await auditDenied({actorId: "anonymous", role: "cliente", companyId: null}, "upload", "No valid session");
    return {error: withCors(result.error, request)};
  }

  return {user: result.user};
}

export async function OPTIONS(request: Request) {
  return withCors(new NextResponse(null, { status: 204 }), request);
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return auth.error;

  try {
    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || !(fileEntry instanceof File)) {
      return withCors(
        NextResponse.json({ message: "No se proporcionó ningún archivo válido en el campo 'file'" }, { status: 400 }),
        request
      );
    }

    const file = fileEntry as File;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return withCors(
        NextResponse.json({ message: "Formato no permitido. Permita únicamente imágenes (JPEG, PNG, WEBP, GIF)" }, { status: 400 }),
        request
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const imageUrl = await ImageStorageService.uploadImage(buffer, file.name, file.type);

    return withCors(
      NextResponse.json({ ok: true, url: imageUrl }),
      request
    );
  } catch (error) {
    return withCors(
      NextResponse.json({ message: error instanceof Error ? error.message : "Error al procesar la carga de archivo" }, { status: 500 }),
      request
    );
  }
}
