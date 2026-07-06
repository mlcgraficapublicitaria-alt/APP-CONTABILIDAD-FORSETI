import { getGoogleAccessToken } from "./google-service-account";
import { randomUUID } from "crypto";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

export type DriveFolderOption = {
  id: string;
  name: string;
  webViewLink?: string;
};

type DriveFileResponse = {
  id: string;
  name: string;
  webViewLink?: string;
};

function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function sanitizeDriveFileName(value: string) {
  return (value || "documento")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .replace(/-+/g, "-");
}

function buildMultipartBody(metadata: Record<string, unknown>, html: string) {
  const boundary = `forseti-${randomUUID()}`;
  const delimiter = `--${boundary}`;
  const closeDelimiter = `--${boundary}--`;
  const body = [
    delimiter,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    delimiter,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
    closeDelimiter,
    "",
  ].join("\r\n");

  return { boundary, body };
}

export async function searchDriveFolders(query: string) {
  const token = await getGoogleAccessToken([DRIVE_SCOPE]);
  const safeQuery = query.trim();
  const filters = [
    `mimeType='${DRIVE_FOLDER_MIME}'`,
    "trashed=false",
    safeQuery ? `name contains '${escapeQueryValue(safeQuery)}'` : "",
  ]
    .filter(Boolean)
    .join(" and ");

  const url = new URL(DRIVE_FILES_URL);
  url.searchParams.set("q", filters);
  url.searchParams.set("fields", "files(id,name,webViewLink)");
  url.searchParams.set("orderBy", "modifiedTime desc");
  url.searchParams.set("pageSize", "20");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "No se pudieron leer las carpetas de Drive.");

  return (data.files ?? []) as DriveFolderOption[];
}

export async function uploadHtmlDocumentToDrive({
  folderId,
  fileName,
  html,
}: {
  folderId: string;
  fileName: string;
  html: string;
}) {
  const token = await getGoogleAccessToken([DRIVE_SCOPE]);
  const finalName = sanitizeDriveFileName(fileName).endsWith(".html")
    ? sanitizeDriveFileName(fileName)
    : `${sanitizeDriveFileName(fileName)}.html`;
  const metadata = {
    name: finalName,
    mimeType: "text/html",
    parents: [folderId],
  };
  const { boundary, body } = buildMultipartBody(metadata, html);
  const url = new URL(DRIVE_UPLOAD_URL);
  url.searchParams.set("uploadType", "multipart");
  url.searchParams.set("fields", "id,name,webViewLink");
  url.searchParams.set("supportsAllDrives", "true");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as Partial<DriveFileResponse> & {
    error?: { message?: string };
  };
  if (!response.ok || !data.id || !data.name) {
    throw new Error(data.error?.message ?? "No se pudo guardar el documento en Drive.");
  }

  return data as DriveFileResponse;
}
