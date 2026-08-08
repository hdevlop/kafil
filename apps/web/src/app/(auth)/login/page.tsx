import { LoginForm } from "@/features/Auth/components/LoginForm";
import { getOAuthFlowErrorMessage } from "@/features/Auth/lib/getAuthErrorMessage";
import { getSafeRedirectPath } from "najm-auth/client/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;

  return (
    <LoginForm
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      oauthErrorMessage={getOAuthFlowErrorMessage(params.oauthError)}
      redirectTo={getSafeRedirectPath(params.from)}
    />
  );
}
