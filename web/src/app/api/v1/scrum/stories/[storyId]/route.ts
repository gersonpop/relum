import {NextResponse} from "next/server";
import {requireSuperUser} from "@/server/api-auth";
import {updateStory} from "@/server/scrumFileStore";

type Params = {params: Promise<{storyId: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const auth = await requireSuperUser(request);
  if ("error" in auth) return auth.error;
  const {storyId} = await params;
  const body = await request.json();

  try {
    const story = await updateStory(storyId, body);
    return NextResponse.json({story});
  } catch (error) {
    return NextResponse.json(
      {message: error instanceof Error ? error.message : "No fue posible actualizar la story"},
      {status: 404}
    );
  }
}
