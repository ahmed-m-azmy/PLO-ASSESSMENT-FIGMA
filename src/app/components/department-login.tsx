import * as React from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Building2, ChevronRight, Lock } from "lucide-react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface Department {
  id: string;
  name: string;
}

interface DepartmentLoginProps {
  departments: Department[];
  onLogin: (departmentId: string, password: string) => Promise<void>;
  isLoading?: boolean;
  errorMessage?: string | null;
}

export function DepartmentLogin({ departments, onLogin, isLoading, errorMessage }: DepartmentLoginProps) {
  const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = React.useState(false);
  const [password, setPassword] = React.useState("");

  const handleDepartmentClick = (department: Department) => {
    setSelectedDepartment(department);
    setPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedDepartment || !password) {
      return;
    }
    await onLogin(selectedDepartment.id, password);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 via-amber-50 to-orange-50"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1554793000-245d3a3c2a51?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/60 via-orange-900/50 to-amber-950/60"></div>

      <div className="relative z-10 w-full max-w-4xl px-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-2xl">
            Learning Outcomes Assessment System
          </h1>
          <p className="text-xl text-amber-100 drop-shadow-lg">
            College of Architecture and Planning
          </p>
        </div>

        <Card className="shadow-2xl border-2 border-amber-200/30 bg-gradient-to-br from-amber-50/95 to-orange-50/95 backdrop-blur-md">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-3xl text-amber-900">Select Your Department</CardTitle>
            <CardDescription className="text-lg text-amber-800">
              Click your department then enter the department password
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {departments.map((department) => (
                <Button
                  key={department.id}
                  onClick={() => handleDepartmentClick(department)}
                  className="h-auto py-8 px-6 flex items-center justify-between text-left !bg-gradient-to-br !from-amber-600 !to-amber-900 hover:!from-amber-700 hover:!to-amber-950 !shadow-lg hover:!shadow-xl transform hover:scale-105 transition-all duration-300"
                  size="lg"
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl">
                      <Building2 className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-white">{department.name}</p>
                      <p className="text-sm text-orange-100 mt-1">Password protected access</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-white/80" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-amber-100 text-sm drop-shadow-lg">
            Each department has access only to its own data and programs
          </p>
        </div>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Department Password
            </DialogTitle>
            <DialogDescription>
              {selectedDepartment ? `Enter password for ${selectedDepartment.name}` : "Enter department password"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="department-password">Password</Label>
            <Input
              id="department-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSubmit();
                }
              }}
            />
            {errorMessage ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errorMessage}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmit()} disabled={isLoading || !password}>
              {isLoading ? "Verifying..." : "Login"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
