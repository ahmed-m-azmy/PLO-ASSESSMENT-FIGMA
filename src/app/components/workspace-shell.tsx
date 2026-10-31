import * as React from "react";
import { KeyRound, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ROLE_LABELS, type Profile } from "../lib/roles";

interface WorkspaceShellProps {
  profile: Profile;
  title: string;
  onSignOut: () => void;
  onChangePassword: () => void;
  children: React.ReactNode;
}

export function WorkspaceShell({ profile, title, onSignOut, onChangePassword, children }: WorkspaceShellProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {profile.fullName} · {profile.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{ROLE_LABELS[profile.role]}</Badge>
            <Button variant="outline" size="sm" onClick={onChangePassword}>
              <KeyRound className="w-4 h-4 mr-2" />
              Password
            </Button>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
