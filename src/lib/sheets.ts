import fs from "node:fs/promises";

const SHEET_ID = "1C-4g6B4iiQzCuiWiDGi-YyTm1Tm5Z88bIrTOhlKSsQo";
const DEFAULT_MONTH = "MAYO 2026";
const CONFIG_PATH = "/data/.openclaw/workspace/forseti/integrations/google-drive/config.json";

type DriveConfig = {
  auth: {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    tokenUri: string;
  };
};

type DashboardData = {
  month: string;
  totalHours: string;
  totalFactura: string;
  totalNeto: string;
  netoConPasivos: string;
  beneficioNeto: string;
  ahorro: string;
  clientSummary: Array<{ client: string; actual: string; hours: string; prevision: string; previsionHours: string; diff: string }>;
};

async function getAccessToken() {
  const raw = await fs.readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(raw) as DriveConfig;

  const body = new URLSearchParams({
    client_id: config.auth.clientId,
    client_secret: config.auth.clientSecret,
    refresh_token: config.auth.refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(config.auth.tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Token error: ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

async function getRange(range: string) {
  const token = await getAccessToken();
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(range)}`);
  url.searchParams.set("valueRenderOption", "FORMATTED_VALUE");
  url.searchParams.set("majorDimension", "ROWS");

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error(`Sheets error: ${res.status}`);
  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

function pick(row: string[] | undefined, index: number) {
  return row?.[index] ?? "—";
}

export async function getDashboardData(month = DEFAULT_MONTH): Promise<DashboardData> {
  const [summary, finance] = await Promise.all([
    getRange(`${month}!A15:H22`),
    getRange(`${month}!AF62:AP66`),
  ]);

  const clientSummary = [1, 2, 4, 5].map((rowIndex) => {
    const row = summary[rowIndex];
    return {
      client: pick(row, 1),
      actual: pick(row, 2),
      hours: pick(row, 3),
      prevision: pick(row, 4),
      previsionHours: pick(row, 5),
      diff: pick(row, 6),
    };
  });

  return {
    month,
    totalHours: pick(finance[0], 0),
    totalFactura: pick(finance[1], 0),
    totalNeto: pick(finance[0], 1),
    netoConPasivos: pick(finance[0], 2),
    beneficioNeto: pick(finance[3], 4),
    ahorro: pick(finance[3], 6),
    clientSummary,
  };
}
