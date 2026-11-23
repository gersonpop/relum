import {requireOnboardingSessionUser} from "@/server/api-auth";
import {uploadAvatar} from "@/server/avatar-upload";

export function POST(request: Request) {
  return uploadAvatar(request, requireOnboardingSessionUser);
}
