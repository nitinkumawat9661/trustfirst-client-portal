import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SignInForm } from "@/features/auth/sign-in-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link className="mb-6 flex items-center justify-center gap-2 font-semibold" href="/">
          <ShieldCheck className="size-6 text-primary" />
          TrustFirst Client Portal
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Access is provisioned by your TrustFirst administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
