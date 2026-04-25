import { NextRequest, NextResponse } from "next/server";
import {
  type SecurityAlertEvent,
  sendSecurityAlertEmail,
} from "../../../../lib/security-alerts";
import {
  getSupabaseAuthClient,
  getSupabaseServiceRoleClient,
} from "../../../../lib/supabase-server";

export const runtime = "nodejs";

type SecurityAlertBody = {
  eventType?: SecurityAlertEvent;
  userId?: string;
  email?: string;
  displayName?: string;
  audience?: ProfileRow["role"];
};

type ProfileRow = {
  role: "customer" | "driver" | "food_place" | "admin";
  full_name: string | null;
};

function getAccessToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

function getIpAddress(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? null;
  }

  return realIp?.trim() ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SecurityAlertBody;

    if (!body.eventType || !["sign_in", "account_created"].includes(body.eventType)) {
      return NextResponse.json({ error: "Unsupported security alert event." }, { status: 400 });
    }

    const accessToken = getAccessToken(request);
    const supabase = getSupabaseServiceRoleClient();
    let email: string | null = null;
    let displayName: string | null = null;
    let audience: ProfileRow["role"] = body.audience ?? "customer";

    if (accessToken) {
      const authClient = getSupabaseAuthClient();
      const {
        data: { user },
        error: userError,
      } = await authClient.auth.getUser(accessToken);

      if (userError || !user) {
        return NextResponse.json({ error: "Unable to verify the signed-in user." }, { status: 401 });
      }

      if (!user.email) {
        return NextResponse.json({ error: "This account does not have an email address." }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      email = user.email;
      displayName =
        profile?.full_name ?? (user.user_metadata?.full_name as string | undefined) ?? null;
      audience =
        profile?.role ??
        ((user.user_metadata?.role as ProfileRow["role"] | undefined) ?? body.audience ?? "customer");
    } else if (body.eventType === "account_created" && body.userId && body.email) {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.admin.getUserById(body.userId);

      if (userError || !user) {
        return NextResponse.json({ error: "Unable to verify the new account." }, { status: 401 });
      }

      if (!user.email || user.email.toLowerCase() !== body.email.toLowerCase()) {
        return NextResponse.json({ error: "The account email could not be verified." }, { status: 400 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      email = user.email;
      displayName =
        profile?.full_name ??
        body.displayName ??
        ((user.user_metadata?.full_name as string | undefined) ?? null);
      audience =
        profile?.role ??
        ((user.user_metadata?.role as ProfileRow["role"] | undefined) ?? body.audience ?? "customer");
    } else {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    if (!email) {
      return NextResponse.json({ error: "This account does not have an email address." }, { status: 400 });
    }

    const delivery = await sendSecurityAlertEmail({
      email,
      displayName,
      audience,
      eventType: body.eventType,
      ipAddress: getIpAddress(request),
      userAgent: request.headers.get("user-agent"),
      occurredAt: new Date(),
    });

    return NextResponse.json(delivery);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to send the security alert right now.",
      },
      { status: 500 },
    );
  }
}
