import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin, useGetAdminMe, useChangePassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, Lock, User, Shield, AlertCircle, CheckCircle } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const login = useAdminLogin();
  const changePassword = useChangePassword();
  const queryClient = useQueryClient();
  const { data: session } = useGetAdminMe();

  // Redirect if already logged in
  if (session?.authenticated && !requiresPasswordChange) {
    setLocation("/admin");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    login.mutate(form, {
      onSuccess: (res) => {
        if (res?.requiresPasswordChange) {
          setRequiresPasswordChange(true);
          setPasswordForm((p) => ({ ...p, currentPassword: form.password }));
        } else {
          queryClient.invalidateQueries({ queryKey: ["adminMe"] });
          setLocation("/admin");
        }
      },
      onError: (err: any) => {
        setError(err?.message || "Invalid username or password");
      },
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");

    if (passwordForm.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setPasswordError("New password must be different from current password");
      return;
    }

    changePassword.mutate(
      { currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          setTimeout(() => {
            setRequiresPasswordChange(false);
            queryClient.invalidateQueries({ queryKey: ["adminMe"] });
            setLocation("/admin");
          }, 2000);
        },
        onError: (err: any) => {
          setPasswordError(err?.message || "Failed to change password");
        },
      }
    );
  };

  // Password strength indicator
  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);
  const strengthColors = ["bg-destructive", "bg-orange-500", "bg-yellow-500", "bg-lime-500", "bg-emerald-500", "bg-emerald-600"];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"];

  if (requiresPasswordChange && !passwordSuccess) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0L0 0 0 60' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />
        <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="h-12 w-12 bg-primary rounded-sm flex items-center justify-center mx-auto mb-5">
              <Lock className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-white mb-1">Change Password Required</h1>
            <p className="text-secondary-foreground/50 text-sm font-sans">Please set a new password to continue</p>
          </div>

          <div className="bg-card border border-border rounded-sm p-8">
            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Current Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                    className="rounded-sm font-sans h-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">New Password</Label>
                <div className="relative mt-1.5">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                    className="rounded-sm font-sans h-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordForm.newPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < passwordStrength ? strengthColors[passwordStrength - 1] : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {strengthLabels[Math.max(0, passwordStrength - 1)] || "Very Weak"}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Confirm New Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  className="mt-1.5 rounded-sm font-sans h-10"
                  required
                />
              </div>

              {passwordError && (
                <div className="bg-destructive/8 border border-destructive/20 rounded-sm px-3 py-2.5 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-destructive text-xs font-sans">{passwordError}</p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (passwordSuccess) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center p-4">
        <div className="text-center">
          <div className="h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-8 w-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white mb-2">Password Updated</h1>
          <p className="text-secondary-foreground/50 text-sm font-sans">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 0L0 0 0 60' fill='none' stroke='white' stroke-width='0.5'/%3E%3C/svg%3E\")" }} />
      <div className="absolute left-0 top-0 h-full w-[3px] bg-gradient-to-b from-transparent via-primary/60 to-transparent" />

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="h-12 w-12 bg-primary rounded-sm flex items-center justify-center mx-auto mb-5">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white mb-1">Admin Panel</h1>
          <p className="text-secondary-foreground/40 text-xs font-sans uppercase tracking-[0.2em]">Topline Flooring &amp; Waterproofing</p>
        </div>

        <div className="bg-card border border-border rounded-sm p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Username</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="rounded-sm font-sans h-10 pl-10"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-sans text-muted-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="rounded-sm font-sans h-10 pl-10 pr-10"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={form.remember}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, remember: !!checked }))}
                />
                <Label htmlFor="remember" className="text-xs text-muted-foreground font-sans cursor-pointer">
                  Remember me
                </Label>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/8 border border-destructive/20 rounded-sm px-3 py-2.5 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-destructive text-xs font-sans">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-sm font-sans uppercase tracking-widest text-xs h-11"
              disabled={login.isPending}
            >
              {login.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-[10px] text-secondary-foreground/20 mt-6 font-sans">
          Secure admin access only
        </p>
      </div>
    </div>
  );
}
