import { VerifyEmailForm } from "@/features/Auth/components/VerifyEmailForm";

export const metadata = { title: "Verify email" };

export default async function VerifyEmailPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  return <VerifyEmailForm token={token ?? ""} />;
}
