import {NextResponse} from "next/server";
import {requireOnboardingSessionUser} from "@/server/api-auth";
import {cancelSocialOnboarding} from "@/server/auth/onboarding";

export async function POST(request: Request) {
  const auth = await requireOnboardingSessionUser();
  if ("error" in auth) return auth.error;

  try {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || "unknown";
    const geoCountry = request.headers.get("x-vercel-ip-country") || "";
    const geoRegion = request.headers.get("x-vercel-ip-country-region") || "";
    const geoCity = request.headers.get("x-vercel-ip-city") || "";

    const metadata = {
      ip,
      userAgent,
      geo: {
        country: geoCountry,
        region: geoRegion,
        city: geoCity
      }
    };

    await cancelSocialOnboarding({email: auth.user.email, provider: auth.user.provider, metadata});
    return NextResponse.json({ok: true});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({message}, {status: 500});
  }
}
