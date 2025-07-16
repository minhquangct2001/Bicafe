'use client';

import { useState } from "react";
import { signIn, signUp, confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");

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
      // After confirmation, sign in automatically
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
                  <Label htmlFor="password">Password</Label>
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
