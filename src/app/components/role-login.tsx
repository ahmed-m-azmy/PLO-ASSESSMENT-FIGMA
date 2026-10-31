import * as React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { LogIn } from "lucide-react";

interface RoleLoginProps {
  onLogin: (email: string, password: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO_LOGIN === "true";
const DEMO_PASSWORD = "Demo#Pass2026";
const DEMO_ACCOUNTS = [
  { label: "Demo Admin", email: "demo.admin@plo-demo.local" },
  { label: "Demo Course Coordinator", email: "demo.coordinator@plo-demo.local" },
  { label: "Demo Section Instructor", email: "demo.instructor@plo-demo.local" },
];

export function RoleLogin({ onLogin, isLoading, errorMessage }: RoleLoginProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) return;
    await onLogin(email.trim(), password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50"
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1554793000-245d3a3c2a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 via-orange-900/50 to-amber-950/60" />
      <div className="relative z-10 w-full max-w-md px-6">
        <h1 className="text-3xl font-bold text-white mb-2 text-center drop-shadow-2xl">
          Learning Outcomes Assessment System
        </h1>
        <p className="text-amber-100 text-center mb-8">Sign in with your university account</p>
        <Card className="bg-white/95 backdrop-blur">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Admins, course coordinators and section instructors</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
              {errorMessage && <p className="text-sm text-red-600" role="alert">{errorMessage}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || !email.trim() || !password}>
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            {DEMO_ENABLED && (
              <div className="mt-6 border-t pt-4 space-y-2">
                <p className="text-sm text-muted-foreground">Demo accounts (sample data, no password needed)</p>
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    onClick={() => onLogin(account.email, DEMO_PASSWORD)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
