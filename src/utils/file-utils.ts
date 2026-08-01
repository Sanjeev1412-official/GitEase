import JSZip from "jszip";

export interface ProcessedFile {
  path: string;
  content: string;
  encoding: "utf-8" | "base64";
  size: number;
}

const BINARY_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "bmp", "ico", "tiff", "svg",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "zip", "tar", "gz", "7z", "rar",
  "mp3", "wav", "ogg", "flac", "mp4", "webm", "avi", "mov", "mkv",
  "woff", "woff2", "ttf", "eot", "otf",
  "exe", "dll", "so", "dylib", "bin", "iso"
]);

export function isBinaryFileName(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return BINARY_EXTENSIONS.has(ext);
}

export function shouldIgnoreFile(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  const parts = normalized.split("/");

  for (const part of parts) {
    if (
      part === "node_modules" ||
      part === ".git" ||
      part === ".next" ||
      part === "dist" ||
      part === "build" ||
      part === "coverage" ||
      part === ".DS_Store" ||
      part === "Thumbs.db"
    ) {
      return true;
    }
  }
  return false;
}

function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function processFile(
  file: File,
  relativePath?: string
): Promise<ProcessedFile | null> {
  const rawPath = relativePath || file.webkitRelativePath || file.name;
  const cleanPath = rawPath.replace(/\\/g, "/");

  if (shouldIgnoreFile(cleanPath)) {
    return null;
  }

  const isBinary = isBinaryFileName(file.name);

  if (isBinary) {
    const buffer = await file.arrayBuffer();
    const base64 = bufferToBase64(buffer);
    return {
      path: cleanPath,
      content: base64,
      encoding: "base64",
      size: file.size,
    };
  } else {
    const text = await file.text();
    return {
      path: cleanPath,
      content: text,
      encoding: "utf-8",
      size: file.size,
    };
  }
}

export async function processZipFile(zipFile: File): Promise<ProcessedFile[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const fileEntries: { path: string; entry: JSZip.JSZipObject }[] = [];

  zip.forEach((relativePath, entry) => {
    if (!entry.dir && !shouldIgnoreFile(relativePath)) {
      fileEntries.push({ path: relativePath, entry });
    }
  });

  // Check if all files share a common root directory inside the ZIP
  let rootPrefix = "";
  if (fileEntries.length > 0) {
    const firstPathParts = fileEntries[0].path.split("/");
    if (firstPathParts.length > 1) {
      const candidateRoot = firstPathParts[0] + "/";
      const allShareRoot = fileEntries.every((e) =>
        e.path.startsWith(candidateRoot)
      );
      if (allShareRoot) {
        rootPrefix = candidateRoot;
      }
    }
  }

  const processedFiles: ProcessedFile[] = [];

  for (const { path, entry } of fileEntries) {
    let finalPath = path;
    if (rootPrefix && finalPath.startsWith(rootPrefix)) {
      finalPath = finalPath.slice(rootPrefix.length);
    }
    if (!finalPath || shouldIgnoreFile(finalPath)) continue;

    const isBinary = isBinaryFileName(finalPath);
    if (isBinary) {
      const base64 = await entry.async("base64");
      const uint8 = await entry.async("uint8array");
      processedFiles.push({
        path: finalPath,
        content: base64,
        encoding: "base64",
        size: uint8.length,
      });
    } else {
      const text = await entry.async("string");
      processedFiles.push({
        path: finalPath,
        content: text,
        encoding: "utf-8",
        size: new Blob([text]).size,
      });
    }
  }

  return processedFiles;
}

export function stripRootDirectoryPrefix(files: ProcessedFile[]): ProcessedFile[] {
  if (files.length === 0) return files;

  const firstParts = files[0].path.split("/");
  if (firstParts.length <= 1) return files;

  const rootCandidate = firstParts[0] + "/";
  const allShareRoot = files.every((f) => f.path.startsWith(rootCandidate));

  if (allShareRoot) {
    return files.map((f) => ({
      ...f,
      path: f.path.slice(rootCandidate.length),
    }));
  }

  return files;
}

export async function processFileList(fileList: FileList): Promise<{
  files: ProcessedFile[];
  suggestedRepoName: string;
}> {
  const filesArray = Array.from(fileList);
  
  // If user uploaded a single .zip file
  if (filesArray.length === 1 && filesArray[0].name.endsWith(".zip")) {
    const zipFile = filesArray[0];
    const extracted = await processZipFile(zipFile);
    const suggestedRepoName = zipFile.name.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    return { files: extracted, suggestedRepoName };
  }

  // Handle directory or multi-file selection
  const processedProms = filesArray.map((f) => processFile(f));
  const results = await Promise.all(processedProms);
  const nonNull = results.filter((r): r is ProcessedFile => r !== null);
  const stripped = stripRootDirectoryPrefix(nonNull);

  let suggestedRepoName = "my-awesome-project";
  if (filesArray.length > 0 && filesArray[0].webkitRelativePath) {
    const rootName = filesArray[0].webkitRelativePath.split("/")[0];
    if (rootName) {
      suggestedRepoName = rootName.toLowerCase().replace(/[^a-z0-9-_]/g, "-");
    }
  }

  return { files: stripped, suggestedRepoName };
}

export async function getFilesFromDataTransferItems(
  items: DataTransferItemList
): Promise<{ files: ProcessedFile[]; suggestedRepoName: string }> {
  const processedFiles: ProcessedFile[] = [];
  const entries: any[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        entries.push(entry);
      } else {
        const file = item.getAsFile();
        if (file) {
          if (file.name.endsWith(".zip")) {
            const zipFiles = await processZipFile(file);
            const name = file.name.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
            return { files: zipFiles, suggestedRepoName: name };
          }
          const pf = await processFile(file);
          if (pf) processedFiles.push(pf);
        }
      }
    }
  }

  let rootName = "";

  async function readEntry(entry: any, path = ""): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = [];
    if (entry.isFile) {
      const file: File = await new Promise((resolve, reject) =>
        entry.file(resolve, reject)
      );
      const fullPath = path ? `${path}/${entry.name}` : entry.name;
      const pf = await processFile(file, fullPath);
      if (pf) results.push(pf);
    } else if (entry.isDirectory) {
      if (!rootName && path === "") {
        rootName = entry.name;
      }
      const dirReader = entry.createReader();
      const readEntries = async (): Promise<any[]> => {
        return new Promise((resolve, reject) => {
          dirReader.readEntries(resolve, reject);
        });
      };

      let entriesInDir: any[] = [];
      let batch: any[];
      do {
        batch = await readEntries();
        entriesInDir = entriesInDir.concat(batch);
      } while (batch.length > 0);

      for (const childEntry of entriesInDir) {
        const childPath = path ? `${path}/${entry.name}` : entry.name;
        const childResults = await readEntry(childEntry, childPath);
        results.push(...childResults);
      }
    }
    return results;
  }

  for (const entry of entries) {
    if (entry.isFile && entry.name.endsWith(".zip") && entries.length === 1) {
      const file: File = await new Promise((resolve, reject) =>
        entry.file(resolve, reject)
      );
      const zipFiles = await processZipFile(file);
      const name = file.name.replace(/\.zip$/i, "").toLowerCase().replace(/[^a-z0-9-_]/g, "-");
      return { files: zipFiles, suggestedRepoName: name };
    }
    const res = await readEntry(entry, "");
    processedFiles.push(...res);
  }

  const stripped = stripRootDirectoryPrefix(processedFiles);
  const suggestedRepoName = rootName
    ? rootName.toLowerCase().replace(/[^a-z0-9-_]/g, "-")
    : "my-awesome-project";

  return { files: stripped, suggestedRepoName };
}
