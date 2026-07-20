"use client";

import { getSupabaseBrowserClient } from "./supabase-browser";

const DATABASE = "customerpulse-import-files";
const STORE = "files";

const openDatabase = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE))
        request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function storeImportedFile(projectId: string, file: File) {
  if (!projectId) throw new Error("A project is required before storing an imported file");
  const client = getSupabaseBrowserClient();
  if (client) {
    const { data } = await client.auth.getUser();
    if (data.user) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${projectId}/${globalThis.crypto.randomUUID()}-${safeName}`;
      const uploaded = await client.storage.from("imported-project-files").upload(storagePath, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });
      if (uploaded.error) throw new Error(`Original file storage failed: ${uploaded.error.message}`);
      return `supabase:${storagePath}`;
    }
  }
  const key = `${projectId}:${globalThis.crypto.randomUUID()}:${file.name}`;
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(file, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  database.close();
  return key;
}

export async function downloadImportedFile(key: string, filename: string) {
  if (key.startsWith("supabase:")) {
    const client = getSupabaseBrowserClient();
    if (!client) throw new Error("Supabase file storage is unavailable");
    const result = await client.storage
      .from("imported-project-files")
      .createSignedUrl(key.slice("supabase:".length), 60, { download: filename });
    if (result.error || !result.data?.signedUrl)
      throw new Error(result.error?.message ?? "Unable to create a secure download link");
    window.location.assign(result.data.signedUrl);
    return;
  }
  const database = await openDatabase();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(STORE, "readonly").objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
  database.close();
  if (!file) throw new Error("The original file is not available in this browser");
  const url = URL.createObjectURL(file);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
