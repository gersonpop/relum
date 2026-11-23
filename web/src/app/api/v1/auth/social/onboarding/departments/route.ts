import {NextResponse} from "next/server";
import {requireOnboardingSessionUser} from "@/server/api-auth";
import {getCatalogDepartments} from "@/server/auth/onboarding";

export async function GET(request: Request) {
  const auth = await requireOnboardingSessionUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const countryCode = url.searchParams.get("countryCode") ?? "";
  const items = await getCatalogDepartments(countryCode);
  return NextResponse.json({items});
}
