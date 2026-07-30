import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RegisterForm } from "@/components/auth/register-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getUser()) {
    redirect("/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          You will confirm your email address before the first sign-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <RegisterForm />
        <p className="text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
