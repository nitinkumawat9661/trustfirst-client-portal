import { z } from "zod";

export const credentialsLoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(256),
  rememberMe: z.coerce.boolean().optional().default(false),
});

export const passwordResetRequestSchema = z.object({
  email: z.string().email().max(254),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(32).max(256),
  password: z.string().min(12).max(256),
});

export const emailVerificationRequestSchema = z.object({
  email: z.string().email().max(254),
});

export const emailVerificationConfirmSchema = z.object({
  token: z.string().min(32).max(256),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8).max(256),
  newPassword: z.string().min(12).max(256),
});

export const adminResetPasswordSchema = z.object({
  temporaryPassword: z.string().min(12).max(256),
  userId: z.string().min(1),
});

export type CredentialsLoginInput = z.infer<typeof credentialsLoginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerificationRequestInput = z.infer<
  typeof emailVerificationRequestSchema
>;
export type EmailVerificationConfirmInput = z.infer<
  typeof emailVerificationConfirmSchema
>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
