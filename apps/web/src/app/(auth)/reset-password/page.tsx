import { ResetPasswordForm } from "@/features/Auth/components/ResetPasswordForm";

export const metadata = { title: "Set password" };

export default async function ResetPasswordPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;

  return  <ResetPasswordForm token={token ?? ""} />

}
