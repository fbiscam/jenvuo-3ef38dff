import * as React from "react";
import { Link } from "@tanstack/react-router";
import { useAuthUser } from "@/hooks/useAuthUser";

/**
 * Shared public call-to-action: signed out it reads "Sign up" and opens the sign-up form
 * (free trial); signed in it goes to the dashboard. Renders the signed-out variant until
 * the browser has mounted so server and client HTML match.
 */
export function useSignedInAfterMount(): boolean {
  const { user } = useAuthUser();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted && !!user;
}

export function SignUpCta({
  className,
  label = "Sign up",
  signedInLabel = "Go to dashboard",
  signedInTo = "/dashboard",
  children,
}: {
  className: string;
  label?: React.ReactNode;
  signedInLabel?: React.ReactNode;
  signedInTo?: string;
  children?: React.ReactNode;
}) {
  const signedIn = useSignedInAfterMount();
  if (signedIn) {
    return (
      <Link to={signedInTo} className={className}>
        {signedInLabel}
        {children}
      </Link>
    );
  }
  return (
    <Link to="/auth" search={{ mode: "signup" } as never} className={className}>
      {label}
      {children}
    </Link>
  );
}

export default SignUpCta;
