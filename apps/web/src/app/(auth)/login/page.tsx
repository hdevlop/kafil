import { LoginForm } from "@/features/Auth/components/LoginForm";
import { getOAuthFlowErrorMessage } from "@/features/Auth/lib/getAuthErrorMessage";
import { getSafeRedirectPath } from "najm-auth/client/server";
import { connection } from "next/server";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  // Provider credentials belong to the runtime environment. Opt out of static
  // generation so one Docker image can be promoted between environments.
  await connection();

  return (
    <LoginForm
      githubEnabled={Boolean(
        process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET,
      )}
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      oauthErrorMessage={getOAuthFlowErrorMessage(params.oauthError, params.provider)}
      redirectTo={getSafeRedirectPath(params.from)}
    />
  );
}
