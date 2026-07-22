import { PageForbiddenState } from "@/shared/PageState";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return <PageForbiddenState />;
}
