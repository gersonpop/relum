import {NextResponse} from "next/server";
import {requireSuperUser} from "@/server/api-auth";
import {updateTask} from "@/server/scrumFileStore";

type Params = {params: Promise<{taskId: string}>};

export async function PATCH(request: Request, {params}: Params) {
  const auth = await requireSuperUser(request);
  if ("error" in auth) return auth.error;
  const {taskId} = await params;
  const body = await request.json();

  try {
    const task = await updateTask(taskId, body);
    return NextResponse.json({task});
  } catch (error) {
    return NextResponse.json(
      {message: error instanceof Error ? error.message : "No fue posible actualizar la task"},
      {status: 404}
    );
  }
}
