import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasMysqlDatabaseUrl } from "@/lib/database-url";
import { badRequest, ok, readJson, requireUser } from "@/lib/renta-fiscal/api";
import { prisma } from "@/lib/renta-fiscal/prisma";

type SavedService = {
  id: string;
  name: string;
  articleCode: string;
};

type SaveServiceBody = {
  id?: string;
  name?: string;
  articleCode?: string;
};

const localServicesPath = path.join(process.cwd(), ".forseti", "invoice-services.json");
const defaultServices: SavedService[] = [
  { id: "default-hosting-domain", name: "HOSTING WEB Y DOMINIO", articleCode: "H" },
  { id: "default-graphic-web-design", name: "SERVICIO DE DISEÑO GRÁFICO Y WEB", articleCode: "H" },
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
    return withDefaultServices(Array.isArray(services) ? services.map((service) => ({ ...service, articleCode: service.articleCode || "H" })) : []);
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

  try {
    const services = hasMysqlDatabaseUrl()
      ? withDefaultServices(await prisma.invoiceService.findMany({ select: { id: true, name: true, articleCode: true } }))
      : await readServices();
    services.sort((a, b) => a.name.localeCompare(b.name, "es"));
    return ok({ services });
  } catch (error) {
    return ok(
      {
        services: [],
        error: error instanceof Error ? `No se pudieron cargar los servicios desde MySQL: ${error.message}` : "No se pudieron cargar los servicios desde MySQL.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const body = await readJson<SaveServiceBody>(request);
  const name = body.name?.trim();
  const articleCode = body.articleCode?.trim().toUpperCase() || "H";
  if (!name) return badRequest("Escribe el nombre del servicio que quieres guardar.");

  try {
    if (hasMysqlDatabaseUrl()) {
      const existing = body.id
        ? await prisma.invoiceService.findUnique({ where: { id: body.id } })
        : await prisma.invoiceService.findFirst({ where: { name } });
      const service = existing
        ? await prisma.invoiceService.update({ where: { id: existing.id }, data: { name, articleCode } })
        : await prisma.invoiceService.create({ data: { name, articleCode } });
      return ok({ service: { id: service.id, name: service.name, articleCode: service.articleCode } }, { status: existing ? 200 : 201 });
    }

    const services = await readServices();
    const existingIndex = body.id
      ? services.findIndex((service) => service.id === body.id)
      : services.findIndex((service) => service.name.toLocaleLowerCase("es") === name.toLocaleLowerCase("es"));
    if (existingIndex >= 0) {
      const service = { ...services[existingIndex], name, articleCode };
      services[existingIndex] = service;
      await writeServices(services);
      return ok({ service });
    }

    const service = { id: randomUUID(), name, articleCode };
    services.push(service);
    await writeServices(services);
    return ok({ service }, { status: 201 });
  } catch (error) {
    return badRequest(
      error instanceof Error
        ? `No se pudo guardar el servicio${hasMysqlDatabaseUrl() ? " en MySQL" : ""}: ${error.message}`
        : "No se pudo guardar el servicio.",
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireUser();
  if (!auth.user) return auth.response;

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return badRequest("El servicio que quieres eliminar no está identificado.");
  if (id.startsWith("default-")) return badRequest("Los servicios predeterminados no se pueden eliminar.");

  try {
    if (hasMysqlDatabaseUrl()) {
      await prisma.invoiceService.delete({ where: { id } });
    } else {
      const services = await readServices();
      const filteredServices = services.filter((service) => service.id !== id);
      if (filteredServices.length === services.length) return badRequest("No se encontró el servicio.");
      await writeServices(filteredServices);
    }

    return ok({ deleted: true });
  } catch (error) {
    return badRequest(error instanceof Error ? `No se pudo eliminar el servicio: ${error.message}` : "No se pudo eliminar el servicio.");
  }
}
