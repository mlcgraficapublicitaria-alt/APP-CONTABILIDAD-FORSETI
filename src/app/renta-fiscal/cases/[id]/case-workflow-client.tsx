"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpModal } from "../../help-modal";

type WorkflowProps = {
  taxCaseId: string;
  requirements: Array<{ requirementId: string; label: string }>;
};

export function CaseWorkflowClient({ taxCaseId, requirements }: WorkflowProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState("");

  async function submitJson(url: string, payload?: unknown) {
    setMessage("");
    setLoading(url);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json().catch(() => null);
    setLoading("");
    if (!response.ok) {
      setMessage(result?.error ?? "Operacion no completada.");
      return;
    }
    setMessage("Cambios guardados.");
    router.refresh();
  }

  async function handleDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await submitJson(`/tax-cases/${taxCaseId}/documents`, {
      requirementId: formData.get("requirementId"),
      fileName: formData.get("fileName"),
      mimeType: "application/pdf",
      sizeBytes: 0,
      notes: "Registro documental local. Pendiente conectar almacenamiento privado.",
    });
  }

  async function handleDataPoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await submitJson(`/tax-cases/${taxCaseId}/data-points`, {
      key: formData.get("key"),
      label: formData.get("label"),
      value: formData.get("value"),
      source: formData.get("source"),
      confidence: formData.get("confidence"),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={handleDocument} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Registrar documento</h2>
          <HelpModal title="Como registrar un documento" triggerLabel="Ayuda">
            <p>Este formulario sirve para marcar que un documento ya esta recibido o localizado dentro del expediente.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><span className="font-semibold text-white">Tipo de documento:</span> selecciona a que requisito del checklist pertenece, por ejemplo DNI/NIE, datos fiscales AEAT o certificado de ingresos.</li>
              <li><span className="font-semibold text-white">Nombre del documento:</span> escribe un nombre reconocible, por ejemplo datos-fiscales-aeat-2026.pdf.</li>
              <li><span className="font-semibold text-white">Uso actual:</span> en esta fase se registra de forma logica. Todavia no sube el archivo real a almacenamiento privado.</li>
            </ul>
            <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">No marques un documento como recibido si no existe o no lo tienes localizado.</p>
          </HelpModal>
        </div>
        <p className="mt-1 text-sm text-zinc-400">Registro logico sin subida real de fichero. El almacenamiento privado queda pendiente para la version operativa completa.</p>
        <select name="requirementId" className="mt-4 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
          {requirements.map((item) => (
            <option key={item.requirementId} value={item.requirementId}>{item.label}</option>
          ))}
        </select>
        <input name="fileName" placeholder="nombre-documento.pdf" className="mt-3 h-10 w-full rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" required />
        <button disabled={loading.includes("/documents")} className="mt-4 h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">Registrar documento</button>
      </form>

      <form onSubmit={handleDataPoint} className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Añadir dato clave</h2>
          <HelpModal title="Como añadir un dato clave" triggerLabel="Ayuda">
            <p>Un dato clave es cualquier informacion importante para revisar la renta. Debe quedar registrada con una fuente y un nivel de confianza.</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li><span className="font-semibold text-white">Clave unica:</span> nombre interno sin espacios, por ejemplo ingresos_trabajo, alquiler_vivienda o donativos.</li>
              <li><span className="font-semibold text-white">Etiqueta:</span> nombre claro para leerlo en pantalla, por ejemplo Ingresos del trabajo.</li>
              <li><span className="font-semibold text-white">Valor:</span> dato registrado. Puede ser texto o importe, pero solo si hay base para ello.</li>
              <li><span className="font-semibold text-white">Fuente:</span> de donde sale el dato, por ejemplo Datos fiscales AEAT, certificado empresa o factura.</li>
              <li><span className="font-semibold text-white">Estado:</span> pendiente si falta confirmar, estimado si es orientativo, confirmado si esta respaldado por documento fiable.</li>
            </ul>
            <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">Regla: si no estas seguro, usa pendiente. FORSETI no debe inventar importes ni condiciones fiscales.</p>
          </HelpModal>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input name="key" placeholder="identificador_del_dato" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" required />
          <input name="label" placeholder="Etiqueta" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" required />
          <input name="value" placeholder="Valor, sin inventar importes" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" />
          <input name="source" placeholder="Fuente" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none" />
          <select name="confidence" className="h-10 rounded-md border border-white/10 bg-slate-950 px-3 text-sm text-white">
            <option value="PENDING">Pendiente</option>
            <option value="ESTIMATED">Estimado</option>
            <option value="CONFIRMED">Confirmado</option>
          </select>
        </div>
        <button disabled={loading.includes("/data-points")} className="mt-4 h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 disabled:opacity-50">Guardar dato</button>
      </form>

      <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
        <button onClick={() => submitJson(`/tax-cases/${taxCaseId}/validate`)} disabled={loading.includes("/validate")} className="h-10 rounded-md border border-emerald-300/50 px-4 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/10 disabled:opacity-50">
          Ejecutar validaciones
        </button>
        {message ? <p className="text-sm text-zinc-300">{message}</p> : null}
      </div>
    </div>
  );
}
