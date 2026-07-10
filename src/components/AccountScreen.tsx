import React, { useState, useRef } from "react";
import { UserProfile, ScreenId } from "../types";
import {
  User,
  CheckCircle,
  Key,
  RefreshCw,
  Download,
  Upload,
  Database,
  FileJson,
  AlertTriangle,
  Info,
  LogOut
} from "lucide-react";
import PageShell from "./layout/PageShell";

interface AccountScreenProps {
  user: UserProfile;
  onUpdateUser: (name: string, email: string) => void;
  onExportData: () => void;
  onImportData: (data: any) => boolean;
  onLogout: () => void;
}

export default function AccountScreen({
  user,
  onUpdateUser,
  onExportData,
  onImportData,
  onLogout
}: AccountScreenProps) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [isUpdating, setIsUpdating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Backup state management
  const [importStatus, setImportStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => {
      onUpdateUser(name, email);
      setIsUpdating(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }, 600);
  };

  // Import file processing logic
  const processImportFile = (file: File) => {
    if (!file) return;
    
    if (file.type !== "application/json" && !file.name.endsWith(".json")) {
      setImportStatus("error");
      setErrorMessage("Unsupported file type. Please select a valid ACN Link backup (.json) file.");
      return;
    }

    setImportStatus("loading");
    setErrorMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        
        // Simulate a tiny organic delay to give visual feedback to the user
        setTimeout(() => {
          const successResult = onImportData(parsed);
          if (successResult) {
            setImportStatus("success");
          } else {
            setImportStatus("error");
            setErrorMessage("Invalid schema detected. This file is missing required ACN Link metadata.");
          }
        }, 850);
      } catch (err) {
        setImportStatus("error");
        setErrorMessage("Malformed JSON syntax. Could not parse this backup file.");
      }
    };
    reader.onerror = () => {
      setImportStatus("error");
      setErrorMessage("Failed to read the file. Please try again.");
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImportFile(file);
    }
  };

  return (
    <PageShell className="max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-gray-950 tracking-tight animate-in fade-in slide-in-from-top-4 duration-300">
            Account Settings
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Manage workspace plans, user credentials, and full-database backups.
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:border-rose-300 text-sm font-semibold transition-all active:scale-95"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>

      <div className="max-w-3xl">
        {/* Left Columns - profile settings & backups */}
        <div className="space-y-8">
          
          {/* Profile details card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="font-display font-bold text-gray-950 text-base flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              Profile Details
            </h3>

            {success && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle className="h-4 w-4" />
                <span>Profile saved successfully!</span>
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-950 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#4F46E5] rounded-xl py-2.5 px-3.5 text-sm text-gray-950 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-indigo-100/50 flex items-center gap-2 transition-all disabled:opacity-80 active:scale-95"
              >
                {isUpdating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                <span>Save Profile Changes</span>
              </button>
            </form>
          </div>

          {/* Backup & Data Migration Dashboard */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-gray-950 text-base flex items-center gap-2">
                <Database className="h-5 w-5 text-gray-400" />
                Data Portability & Porting
              </h3>
              <span className="bg-indigo-50 text-indigo-600 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                Full Database
              </span>
            </div>

            <p className="text-gray-500 text-xs leading-relaxed">
              Instantly port your entire workspace, including published pages, customizable widgets, templates, pixel codes, shortened links, and lead contacts. Download a copy or restore previous backup setups instantly.
            </p>

            {/* Visual Feedback Alerts */}
            {importStatus === "success" && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl text-xs space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span>Workspace Restored Successfully!</span>
                </div>
                <p className="text-emerald-600/90 pl-5.5">
                  All pages, short links, customized widgets, and active templates have been imported and loaded into memory.
                </p>
              </div>
            )}

            {importStatus === "error" && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-2xl text-xs space-y-1 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span>Import Restoration Failed</span>
                </div>
                <p className="text-red-600/90 pl-5.5">
                  {errorMessage}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Export Panel */}
              <div className="border border-slate-100 rounded-2xl p-4.5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileJson className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold text-slate-800">Export All User Data</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Downloads a local `.json` file representing all pages, contact lists, custom templates, tracking IDs, and current configurations.
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={onExportData}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Backup JSON</span>
                </button>
              </div>

              {/* Import Panel */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-4.5 transition-all flex flex-col justify-between space-y-4 ${
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/30"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="space-y-1.5 text-center md:text-left">
                  <div className="flex items-center gap-1.5 justify-center md:justify-start">
                    <Upload className={`h-4 w-4 ${isDragging ? "text-indigo-600 animate-bounce" : "text-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-800">Import & Restore Data</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Drag and drop your `acn_link_backup.json` here, or click below to pick it from your system storage.
                  </p>
                </div>

                <div className="w-full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".json"
                    className="hidden"
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importStatus === "loading"}
                    className="w-full border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                  >
                    {importStatus === "loading" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                    ) : (
                      <Database className="h-3.5 w-3.5 text-indigo-500" />
                    )}
                    <span>{importStatus === "loading" ? "Restoring Workspace..." : "Choose Backup File"}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Note alert banner */}
            <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl flex gap-2 text-[10px] text-amber-700 leading-relaxed">
              <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Warning:</strong> Restoring a backup overwrites your current local data state, including pages and shortened URLs. Ensure you back up your current workspace before applying updates.
              </span>
            </div>
          </div>

          {/* Security details card */}
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-display font-bold text-gray-950 text-base flex items-center gap-2">
              <Key className="h-5 w-5 text-gray-400" />
              Security & Credentials
            </h3>
            <p className="text-gray-500 text-xs leading-relaxed">
              To update your system credentials or activate hardware MFA key fobs, contact our organizational security team.
            </p>
            <button
              onClick={() => alert(`Redirecting to administrative security controls...`)}
              className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs py-2 px-4 rounded-xl shadow-inner active:scale-95"
            >
              Configure MFA Security
            </button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}
