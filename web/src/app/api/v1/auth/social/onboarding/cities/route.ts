import {NextResponse} from "next/server";
import {requireOnboardingSessionUser} from "@/server/api-auth";
import {getCatalogCities} from "@/server/auth/onboarding";

export async function GET(request: Request) {
  const auth = await requireOnboardingSessionUser();
  if ("error" in auth) return auth.error;
  const url = new URL(request.url);
  const departmentCode = url.searchParams.get("departmentCode") ?? "";
  const countryCode = url.searchParams.get("countryCode") ?? "";
  const items = await getCatalogCities(departmentCode, countryCode);
  return NextResponse.json({items});
}
