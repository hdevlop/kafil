import { LoginForm } from "@/features/Auth/components/LoginForm";
import { getSafeRedirectPath } from "@/lib/safeRedirect";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;

  return  <LoginForm redirectTo={getSafeRedirectPath(params.from)} />

}
