import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Enter a valid work email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  rememberMe: z.boolean(),
});

export type SignInInput = z.infer<typeof signInSchema>;
