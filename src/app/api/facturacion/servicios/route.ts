import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";

type SavedService = {
  id: string;
  name: string;
};

type SaveServiceBody = {
  name?: string;
};

const localServicesPath = path.join(process.cwd(), ".forseti", "invoice-services.json");
const defaultServices: SavedService[] = [
  { id: "default-hosting-domain", name: "HOSTING WEB Y DOMINIO" },
  { id: "default-graphic-web-design", name: "SERVICIO DE DISEÑO GRÁFICO Y WEB" },
];

function withDefaultServices(services: SavedService[]) {
  const normalizeName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es");
  const names = new Set(services.map((service) => normalizeName(service.name)));
  return [...defaultServices.filter((service) => !names.has(normalizeName(service.name))), ...services];
}

async function readServices(): Promise<SavedService[]> {
  try {
    const content = await readFile(localServicesPath, "utf8");
    const services = JSON.parse(content) as SavedService[];
    return withDefaultServices(Array.isArray(services) ? services : []);
  } catch {
    return defaultServices;
  }
}

async function writeServices(services: SavedService[]) {
  await mkdir(path.dirname(localServicesPath), { recursive: true });
  await writeFile(localServicesPath, JSON.stringify(services, null, 2), "utf8");
}

export async function GET() {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const services = await readServices();
  services.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return ok({ services });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveServiceBody>(request);
  const name = body.name?.trim();
  if (!name) return badRequest("Escribe el nombre del servicio que quieres guardar.");

  try {
    const services = await readServices();
    const existing = services.find((service) => service.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (existing) return ok({ service: existing });

    const service = { id: randomUUID(), name };
    services.push(service);
    await writeServices(services);
    return ok({ service }, { status: 201 });
  } catch (error) {
    return badRequest(error instanceof Error ? `No se pudo guardar el servicio: ${error.message}` : "No se pudo guardar el servicio.");
  }
}
