import * as React from "react";
import { LearningOutcomesApp } from "./components/learning-outcomes-app";
import { IOSToggle } from "./components/ios-toggle";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [showDemo, setShowDemo] = React.useState(false);

  return (
    <div className="size-full">
      {showDemo ? (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white p-12 rounded-2xl shadow-xl">
            <h2 className="mb-6 text-center text-gray-700">iOS Toggle Demo</h2>
            <div className="flex flex-col items-center gap-6">
              <IOSToggle checked={showDemo} onChange={setShowDemo} />
              <p className="text-muted-foreground">Toggle to explore the app</p>
            </div>
          </div>
        </div>
      ) : (
        <LearningOutcomesApp />
      )}

      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-white rounded-full shadow-lg p-3 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Toggle Demo</span>
          <IOSToggle checked={showDemo} onChange={setShowDemo} />
        </div>
      </div>

      <Toaster />
    </div>
  );
}
