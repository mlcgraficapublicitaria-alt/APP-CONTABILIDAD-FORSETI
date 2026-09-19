import { describe, expect, it } from "vitest";
import { TOOLS } from "./navigation";

describe("integración del cierre trimestral en FORSETI", () => {
  it("lo publica dentro de HERRAMIENTAS con el nombre y ruta aprobados", () => {
    expect(TOOLS).toContainEqual(expect.objectContaining({
      id: "cierres-trimestres-autonomo",
      label: "CIERRES TRIMESTRES AUTONOMO",
      title: "CIERRES TRIMESTRES AUTONOMO",
      href: "/forseti/cierres-trimestres-autonomo",
    }));
  });

  it("no crea un acceso raíz independiente", () => {
    const tool = TOOLS.find((item) => item.id === "cierres-trimestres-autonomo");
    expect(tool?.href.startsWith("/forseti/")).toBe(true);
  });
});
