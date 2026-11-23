import {NextResponse} from "next/server";
import {requireSessionUser} from "@/server/api-auth";

async function disabled() {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json({message: "Endpoint deshabilitado: roles/permisos locales fueron retirados"}, {status: 410});
}

export {disabled as GET, disabled as POST, disabled as DELETE};
