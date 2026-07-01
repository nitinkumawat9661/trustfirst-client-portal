"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@trustfirst/ui";
import { ShieldCheck } from "lucide-react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { signInSchema, type SignInInput } from "./schemas";

export function SignInForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: SignInInput) {
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      callbackUrl: "/client",
      redirect: true,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="email">
          Email
        </label>
        <Input id="email" autoComplete="email" {...register("email")} />
        {errors.email ? (
          <p className="text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="password">
          Password
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <p className="text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>
      <Button className="w-full" disabled={isSubmitting} type="submit">
        <ShieldCheck aria-hidden className="size-4" />
        Continue securely
      </Button>
    </form>
  );
}
