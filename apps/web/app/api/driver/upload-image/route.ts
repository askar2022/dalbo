import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { DRIVER_MEDIA_BUCKET } from "../../../../lib/media";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../../lib/supabase-server";

export const runtime = "nodejs";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_UPLOAD_KINDS = new Set(["profile", "car", "plate"]);

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function getFileExtension(file: File) {
  const extensionFromName = file.name.split(".").pop()?.toLowerCase();

  if (extensionFromName) {
    return extensionFromName;
  }

  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getAccessToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    const authClient = getSupabaseAuthClient();
    const {
      data: { user },
      error: userError,
    } = await authClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json({ error: "Unable to verify the signed-in driver." }, { status: 401 });
    }

    const formData = await request.formData();
    const kind = formData.get("kind");
    const file = formData.get("file");

    if (typeof kind !== "string" || !ALLOWED_UPLOAD_KINDS.has(kind)) {
      return NextResponse.json({ error: "Unsupported driver image type." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image file." }, { status: 400 });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image size must be 5 MB or less." },
        { status: 400 },
      );
    }

    const path = `${user.id}/${kind}/${randomUUID()}.${getFileExtension(file)}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const supabase = getSupabaseServiceRoleClient();
    const { error: uploadError } = await supabase.storage
      .from(DRIVER_MEDIA_BUCKET)
      .upload(path, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return NextResponse.json({ path });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to upload the image right now.",
      },
      { status: 500 },
    );
  }
}
