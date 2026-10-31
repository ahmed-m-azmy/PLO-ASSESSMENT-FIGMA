import * as React from "react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { LearningOutcomesApp } from "./learning-outcomes-app";
import { RoleLogin } from "./role-login";
import { ChangePasswordDialog } from "./change-password-dialog";
import { WorkspaceShell } from "./workspace-shell";
import { CourseTools } from "./course-tools";
import { InstructorWorkspace } from "./instructor-workspace";
import { mapProfile, PROFILE_COLUMNS, type Profile } from "../lib/roles";

type GateState = "loading" | "signed-out" | "ready";

export function AuthGate() {
  const [state, setState] = React.useState<GateState>("loading");
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [signingIn, setSigningIn] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !data) {
      await supabase.auth.signOut();
      setProfile(null);
      setState("signed-out");
      setError("This account has no access to the system. Contact your administrator.");
      return;
    }
    const loaded = mapProfile(data);
    if (!loaded.isActive) {
      await supabase.auth.signOut();
      setProfile(null);
      setState("signed-out");
      setError("This account is deactivated. Contact your administrator.");
      return;
    }
    setProfile(loaded);
    setState("ready");
  }, []);

  React.useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) loadProfile(data.session.user.id);
      else setState("signed-out");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setState("signed-out");
      } else if (event === "USER_UPDATED" && session) {
        setTimeout(() => loadProfile(session.user.id), 0);
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    setError(null);
    setSigningIn(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setSigningIn(false);
      const message = signInError?.message ?? "";
      setError(
        /invalid login credentials/i.test(message) || !message
          ? "Invalid email or password (for demo accounts: run seed_demo_accounts.sql first)"
          : message,
      );
      return;
    }
    await loadProfile(data.user.id);
    setSigningIn(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setState("signed-out");
    toast.success("Signed out");
  };

  if (state === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }
  if (state === "signed-out" || !profile) {
    return <RoleLogin onLogin={signIn} isLoading={signingIn} errorMessage={error} />;
  }

  const passwordDialog = (
    <ChangePasswordDialog
      open={profile.mustChangePassword || changePasswordOpen}
      forced={profile.mustChangePassword}
      onClose={() => setChangePasswordOpen(false)}
      onChanged={() => {
        setChangePasswordOpen(false);
        setProfile({ ...profile, mustChangePassword: false });
      }}
    />
  );

  if (profile.role === "admin") {
    return (
      <>
        <LearningOutcomesApp
          authDepartmentId={profile.departmentId}
          authUserId={profile.id}
          onSignOut={signOut}
          onChangePassword={() => setChangePasswordOpen(true)}
        />
        {passwordDialog}
      </>
    );
  }

  return (
    <>
      <WorkspaceShell
        profile={profile}
        title={profile.role === "coordinator" ? "Course Coordinator Workspace" : "Section Instructor Workspace"}
        onSignOut={signOut}
        onChangePassword={() => setChangePasswordOpen(true)}
      >
        {profile.mustChangePassword ? null : profile.role === "coordinator" ? <CourseTools /> : <InstructorWorkspace />}
      </WorkspaceShell>
      {passwordDialog}
    </>
  );
}
