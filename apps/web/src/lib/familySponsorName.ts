/** Keep a family-facing sponsor name safe even while an older response is cached. */
export function familySponsorName(name: string | null | undefined): string {
  const firstName = name?.match(/\S+/u)?.[0];
  return firstName ? `${firstName} ***` : "";
}
