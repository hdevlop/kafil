import type { SVGProps } from "react";

export function UserShieldIcon({
  className,
  ...props
}: Readonly<SVGProps<SVGSVGElement>>) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle cx="8" cy="7" r="3" />
      <path d="M2.5 17.5c.8-3.5 2.7-5.5 5.5-5.5 1.2 0 2.3.4 3.2 1.1" />
      <path d="m16.5 11 4.5 1.8v3.1c0 2.7-1.8 4.6-4.5 5.6-2.7-1-4.5-2.9-4.5-5.6v-3.1l4.5-1.8Z" />
      <path d="m14.8 16.2 1.1 1.1 2.3-2.4" />
    </svg>
  );
}
