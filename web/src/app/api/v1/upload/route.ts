import {requireSessionUser} from "@/server/api-auth";
import {avatarUploadOptions, uploadAvatar} from "@/server/avatar-upload";

export function OPTIONS(request: Request) {
  return avatarUploadOptions(request);
}

export function POST(request: Request) {
  return uploadAvatar(request, requireSessionUser);
}
