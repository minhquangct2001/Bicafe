'use client';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { confirmResetPassword, confirmSignUp, resendSignUpCode, resetPassword, signIn, signUp } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetConfirmation, setIsResetConfirmation] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");




  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signIn({
        username: email,
        password: password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
          },
        },
      });
      setNeedsConfirmation(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmSignUp(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: confirmationCode,
      });
      await signIn({
        username: email,
        password: password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to confirm account");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResendCode() {
    setIsLoading(true);
    setError("");

    try {
      await resendSignUpCode({ username: email });
      setError("Confirmation code resent to your email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await resetPassword({ username: email });
      setIsResetConfirmation(true);
      setError("Password reset code sent to your email");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset code");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleConfirmResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: confirmationCode,
        newPassword: newPassword,
      });
      setError("Password reset successful! You can now sign in with your new password.");
      // Reset all states to go back to sign in
      setIsForgotPassword(false);
      setIsResetConfirmation(false);
      setConfirmationCode("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  }

  if (isResetConfirmation) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset Your Password</CardTitle>
            <CardDescription>
              Enter the code sent to {email} and your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmResetPassword}>
              <div className="grid gap-6">
                {error && (
                  <div className={`text-sm text-center ${error.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
                    {error}
                  </div>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="resetCode">Reset Code</Label>
                  <Input
                    id="resetCode"
                    type="text"
                    placeholder="123456"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => {
                      setIsResetConfirmation(false);
                      setIsForgotPassword(false);
                      setError("");
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email to receive a password reset code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword}>
              <div className="grid gap-6">
                {error && (
                  <div className={`text-sm text-center ${error.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
                    {error}
                  </div>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Code"}
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setError("");
                    }}
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (needsConfirmation) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Confirm Your Account</CardTitle>
            <CardDescription>
              Enter the confirmation code sent to {email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleConfirmSignUp}>
              <div className="grid gap-6">
                {error && (
                  <div className="text-sm text-red-600 text-center">{error}</div>
                )}
                <div className="grid gap-3">
                  <Label htmlFor="confirmationCode">Confirmation Code</Label>
                  <Input
                    id="confirmationCode"
                    type="text"
                    placeholder="123456"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Confirming..." : "Confirm Account"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  Resend Code
                </Button>
                <div className="text-center text-sm">
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setNeedsConfirmation(false)}
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {isSignUp ? "Create Account" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isSignUp 
              ? "Sign up for a new account" 
              : "Sign in to your account"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={isSignUp ? handleSignUp : handleSignIn}>
            <div className="grid gap-6">
              {error && (
                <div className="text-sm text-red-600 text-center">{error}</div>
              )}
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="m@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {!isSignUp && (
                      <button
                        type="button"
                        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setError("");
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading 
                    ? (isSignUp ? "Creating Account..." : "Signing In...") 
                    : (isSignUp ? "Create Account" : "Sign In")
                  }
                </Button>
              </div>
              <div className="text-center text-sm">
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  className="underline underline-offset-4"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError("");
                  }}
                >
                  {isSignUp ? "Sign in" : "Sign up"}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground text-center text-xs text-balance">
        By clicking continue, you agree to our <a href="#" className="underline underline-offset-4">Terms of Service</a>{" "}
        and <a href="#" className="underline underline-offset-4">Privacy Policy</a>.
      </div>
    </div>
  )
}
