import {NextResponse} from "next/server";
import {requireSessionUser} from "@/server/api-auth";
import {submitSocialOnboarding} from "@/server/auth/onboarding";

export async function POST(request: Request) {
  const auth = await requireSessionUser();
  if ("error" in auth) return auth.error;

  try {
    const body = (await request.json()) as {
      email: string;
      firstName: string;
      lastName: string;
      phone: string;
      companyId: string;
      countryCode: string;
      country: string;
      department: string;
      city: string;
      dni: string;
      birthDate: string;
      gender: string;
      provider: "google" | "facebook" | "linkedin";
      avatar?: string;
    };

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

    // El correo y la red social salen de la sesión, no del formulario.
    const provider = (auth.user.provider ?? body.provider) as typeof body.provider;
    const user = await submitSocialOnboarding({ ...body, email: auth.user.email, provider, metadata });
    return NextResponse.json({ok: true, user});
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status = message.includes("already") || message.includes("Invalid") || message.includes("DNI_CONFLICT") ? 409 : 400;
    return NextResponse.json({message}, {status});
  }
}
