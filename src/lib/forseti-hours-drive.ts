import { getGoogleAccessToken } from "./google-service-account";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

function escapeQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveList(query: string, token: string) {
  const url = new URL(DRIVE_FILES_URL);
  url.searchParams.set("q", query);
  url.searchParams.set("fields", "files(id,name,mimeType)");
  url.searchParams.set("supportsAllDrives", "true");
  url.searchParams.set("includeItemsFromAllDrives", "true");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "No se pudo leer Google Drive.");
  return (data.files ?? []) as DriveFile[];
}

async function findFolderByName(name: string, token: string, parentId?: string) {
  const parentFilter = parentId ? ` and '${parentId}' in parents` : "";
  const query = [
    `name='${escapeQueryValue(name)}'`,
    `mimeType='${DRIVE_FOLDER_MIME}'`,
    "trashed=false",
    parentFilter,
  ]
    .filter(Boolean)
    .join(" and ");
  return (await driveList(query, token))[0];
}

async function resolveHoursFolder(month: string, token: string) {
  const monthFolder = `${month}`;
  const path = ["MLCDESIGN", "2026", "CONTABILIDAD 2026", "FACTURAS 2026", monthFolder];
  let parentId: string | undefined;

  for (const folderName of path) {
    const folder = await findFolderByName(folderName, token, parentId);
    if (!folder) throw new Error(`No se encontro en Drive la carpeta ${folderName}.`);
    parentId = folder.id;
  }

  return parentId;
}

export async function readMonthlyHoursPdfFromDrive(month: string) {
  const token = await getGoogleAccessToken([DRIVE_SCOPE]);
  const folderId = await resolveHoursFolder(month, token);
  const monthName = month.split(" ")[0];
  const query = [
    `'${folderId}' in parents`,
    "mimeType='application/pdf'",
    "trashed=false",
    "name contains 'HORAS'",
    `name contains '${escapeQueryValue(monthName)}'`,
  ].join(" and ");
  const file = (await driveList(query, token))[0];
  if (!file) throw new Error(`No se encontro el PDF de horas para ${month} en Drive.`);

  const response = await fetch(`${DRIVE_FILES_URL}/${file.id}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`No se pudo descargar ${file.name} desde Drive.`);
  return {
    name: file.name,
    buffer: await response.arrayBuffer(),
  };
}
