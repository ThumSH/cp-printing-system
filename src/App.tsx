import { useState } from "react";
import Login from "./components/Login";
import DevelopmentModule from "./components/DevelopmentModule";

const ROLES = ["Admin", "Development", "Stores", "QC", "Gatepass", "Audit", "Worker"];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeRole, setActiveRole] = useState(ROLES[0]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login activeRole={activeRole} setActiveRole={setActiveRole} onLogin={handleLogin} roles={ROLES} />;
  }

  return (
    <div className="min-h-screen bg-cplus-light font-sans text-cplus-dark">
      <nav className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Colour<span className="text-cplus-primary">plus</span></h1>
          <span className="bg-cplus-primary/10 text-cplus-primary px-3 py-1 rounded-full text-sm font-bold border border-cplus-primary/20">
            {activeRole} Module
          </span>
        </div>
        <button onClick={handleLogout} className="text-sm font-bold text-gray-500 hover:text-cplus-secondary transition-colors">
          Sign Out
        </button>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {(activeRole === "Admin" || activeRole === "Development") ? (
           <DevelopmentModule />
        ) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-200 text-center">
            <h2 className="text-2xl font-bold text-gray-400">Under Construction</h2>
            <p className="text-gray-500 mt-2">The {activeRole} module is not yet built.</p>
          </div>
        )}
      </main>
    </div>
  );
}