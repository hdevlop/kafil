import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function FamilyCartRedirect() {
  redirect("/products?cart=open");
}
