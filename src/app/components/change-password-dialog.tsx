import * as React from "react";
import { toast } from "sonner";
import { supabase } from "../../supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";

interface ChangePasswordDialogProps {
  open: boolean;
  /** When true the dialog cannot be dismissed (temporary password). */
  forced?: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const MIN_LENGTH = 10;

export function ChangePasswordDialog({ open, forced, onClose, onChanged }: ChangePasswordDialogProps) {
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const problem =
    password.length > 0 && password.length < MIN_LENGTH
      ? `Use at least ${MIN_LENGTH} characters`
      : confirm && password !== confirm
        ? "Passwords do not match"
        : null;

  const save = async () => {
    if (password.length < MIN_LENGTH || password !== confirm) return;
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      toast.error(error.message);
      return;
    }
    const { error: flagError } = await supabase.rpc("clear_must_change_password");
    setSaving(false);
    if (flagError) {
      toast.error(flagError.message);
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("Password updated");
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !forced && onClose()}>
      <DialogContent onInteractOutside={(e) => forced && e.preventDefault()} onEscapeKeyDown={(e) => forced && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{forced ? "Set a new password" : "Change password"}</DialogTitle>
          <DialogDescription>
            {forced
              ? "You signed in with a temporary password. Choose your own password to continue."
              : `Choose a new password of at least ${MIN_LENGTH} characters.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="new-password">New password</Label>
            <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          {problem && <p className="text-sm text-red-600">{problem}</p>}
        </div>
        <DialogFooter>
          {!forced && <Button variant="outline" onClick={onClose}>Cancel</Button>}
          <Button onClick={save} disabled={saving || password.length < MIN_LENGTH || password !== confirm}>
            {saving ? "Saving..." : "Save password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
