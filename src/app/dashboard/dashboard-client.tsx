"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type FileRecord = {
  id: string;
  originalName: string;
  size: number;
  mimeType: string;
  createdAt: string;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function DashboardClient({
  user,
  storageUsed,
  storageLimit
}: {
  user: { name: string; email: string };
  storageUsed: number;
  storageLimit: number;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [used, setUsed] = useState(storageUsed);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadFiles() {
    const res = await fetch("/api/files");
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => {
    loadFiles();
  }, []);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/files", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Upload failed.");
        continue;
      }
      const created: FileRecord = await res.json();
      setUsed((u) => u + created.size);
    }
    setUploading(false);
    loadFiles();
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string, size: number) {
    const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFiles((f) => f.filter((file) => file.id !== id));
      setUsed((u) => u - size);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const pct = Math.min(100, (used / storageLimit) * 100);

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-semibold">FileShare India</span>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-600">{user.name}</span>
            <button onClick={handleLogout} className="text-brand-600 font-medium">
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Storage</span>
            <span className="text-slate-600">
              {formatBytes(used)} of {formatBytes(storageLimit)} used
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div
          className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center mb-6 bg-white"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleUpload(e.dataTransfer.files);
          }}
        >
          <p className="text-slate-600 mb-3">Drag and drop files here, or</p>
          <button
            onClick={() => inputRef.current?.click()}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-brand-700"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Choose files"}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />
          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600 text-left">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No files yet. Upload your first file above.
                  </td>
                </tr>
              )}
              {files.map((file) => (
                <tr key={file.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{file.originalName}</td>
                  <td className="px-4 py-3 text-slate-600">{formatBytes(file.size)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(file.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <a href={`/api/files/${file.id}`} className="text-brand-600 font-medium">
                      Download
                    </a>
                    <button
                      onClick={() => handleDelete(file.id, file.size)}
                      className="text-red-600 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
