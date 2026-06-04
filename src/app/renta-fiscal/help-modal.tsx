"use client";

import { ReactNode, useEffect, useId, useState } from "react";

type HelpModalProps = {
  title: string;
  triggerLabel: string;
  children: ReactNode;
};

export function HelpModal({ title, triggerLabel, children }: HelpModalProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center justify-center rounded-md border border-emerald-300/35 bg-emerald-300/10 px-3 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/70 hover:bg-emerald-300/15"
      >
        {triggerLabel}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-auto rounded-lg border border-white/10 bg-[#0f172a] p-5 text-white shadow-2xl shadow-black/50" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <h2 id={titleId} className="text-xl font-semibold">
                {title}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-lg leading-none text-zinc-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Cerrar ayuda"
              >
                x
              </button>
            </div>
            <div className="mt-4 text-sm leading-6 text-zinc-300">{children}</div>
            <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-10 rounded-md bg-emerald-300 px-4 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function DashboardHelpButtons() {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <HelpModal title="Que es un expediente fiscal" triggerLabel="Ayuda: expedientes">
        <p>Un expediente fiscal es una carpeta de trabajo para una renta concreta. Dentro se agrupan contribuyente, ejercicio, documentos, datos clave, validaciones, resumen preliminar y auditoria.</p>
        <p className="mt-3">La idea es ordenar el trabajo antes de la revision final. FORSETI no presenta declaraciones automaticamente.</p>
      </HelpModal>
      <HelpModal title="Validaciones y resumen" triggerLabel="Ayuda: validaciones">
        <p>Las validaciones revisan si faltan documentos, NIF/NIE o datos clave. Sirven para detectar bloqueos y pendientes.</p>
        <p className="mt-3">El resumen preliminar cuenta documentos faltantes, incidencias y datos confirmados, estimados o pendientes. No es una declaracion fiscal.</p>
      </HelpModal>
      <HelpModal title="Documentos habituales para la renta" triggerLabel="Ayuda: documentos">
        <DocumentHelpContent variant="dashboard" />
      </HelpModal>
    </section>
  );
}

export function CaseHelpButtons() {
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <HelpModal title="Checklist documental" triggerLabel="Ayuda: checklist">
        <p>El checklist indica que documentos faltan para revisar la renta con orden. No calcula impuestos; solo ayuda a saber si el expediente tiene la documentacion minima.</p>
      </HelpModal>
      <HelpModal title="Documentos a pedir o adjuntar" triggerLabel="Ayuda: documentos">
        <DocumentHelpContent variant="case" />
      </HelpModal>
      <HelpModal title="Datos clave" triggerLabel="Ayuda: datos">
        <p>Los datos clave son informacion importante del expediente: identidad, ingresos, alquileres, deducciones o cualquier dato que afecte a la revision.</p>
        <p className="mt-3">Cada dato debe marcarse como confirmado, estimado o pendiente. Si no hay fuente fiable, dejalo como pendiente.</p>
      </HelpModal>
      <HelpModal title="Incidencias y faltantes" triggerLabel="Ayuda: incidencias">
        <p>Las incidencias son avisos que FORSETI genera cuando falta algo o hay un punto que revisar. Un aviso señala un pendiente; un error señala algo mas critico.</p>
      </HelpModal>
      <HelpModal title="Resumen preliminar" triggerLabel="Ayuda: resumen">
        <p>El resumen preliminar cuenta documentos faltantes, incidencias abiertas y datos confirmados o pendientes. Sirve para saber si el expediente esta maduro para revision final.</p>
        <p className="mt-3">No es una declaracion fiscal ni una recomendacion final.</p>
      </HelpModal>
      <HelpModal title="Auditoria y trazabilidad" triggerLabel="Ayuda: auditoria">
        <p>La auditoria registra acciones relevantes: crear expediente, registrar documentos, cambiar datos o ejecutar validaciones. Sirve para saber que cambio, cuando y bajo que sesion.</p>
      </HelpModal>
    </section>
  );
}

type RequirementHelpButtonProps = {
  code: string;
  label: string;
  description: string;
};

export function RequirementHelpButton({ code, label, description }: RequirementHelpButtonProps) {
  const help = getRequirementHelp(code);

  return (
    <HelpModal title={label} triggerLabel="Que es y donde conseguirlo">
      <p>{description}</p>
      <div className="mt-4 grid gap-4">
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="font-semibold text-white">Que es</p>
          <p className="mt-1">{help.what}</p>
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.04] p-3">
          <p className="font-semibold text-white">Donde se consigue</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {help.where.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100">
          <p className="font-semibold">Cuidado</p>
          <p className="mt-1">{help.warning}</p>
        </div>
      </div>
    </HelpModal>
  );
}

function DocumentHelpContent({ variant }: { variant: "dashboard" | "case" }) {
  const lists =
    variant === "dashboard"
      ? [
          { title: "Basicos", items: ["DNI/NIE o documento identificativo.", "Datos fiscales AEAT.", "IBAN bancario.", "Renta del año anterior, si existe.", "Direccion fiscal actualizada."] },
          { title: "Ingresos y actividad", items: ["Certificado de retenciones.", "Pensiones, desempleo o prestaciones.", "Ingresos y gastos de autonomo.", "Facturas emitidas y recibidas.", "Dividendos, fondos, acciones o cripto."] },
          { title: "Vivienda y patrimonio", items: ["Referencia catastral.", "Hipoteca o alquiler.", "IBI, comunidad, seguros o reparaciones.", "Inmuebles alquilados.", "Venta de inmuebles u otros bienes relevantes."] },
          { title: "Deducciones", items: ["Donativos.", "Planes de pensiones.", "Cuotas sindicales o colegios profesionales.", "Familia, discapacidad o guarderia.", "Deducciones autonomicas."] },
        ]
      : [
          { title: "Base", items: ["DNI/NIE.", "Datos fiscales AEAT.", "IBAN.", "Renta anterior, si existe.", "Direccion fiscal actualizada."] },
          { title: "Ingresos", items: ["Certificado de retenciones.", "Pensiones o prestaciones.", "Autonomos: ingresos y gastos.", "Facturas si aplica.", "Atrasos o indemnizaciones."] },
          { title: "Patrimonio", items: ["Vivienda o alquiler.", "IBI, comunidad y seguros.", "Acciones, fondos o dividendos.", "Cripto si existe.", "Venta de inmuebles u otros bienes."] },
          { title: "Deducciones", items: ["Donativos.", "Planes de pensiones.", "Familia, discapacidad o guarderia.", "Cuotas sindicales o colegios.", "Deducciones autonomicas."] },
        ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lists.map((list) => (
        <HelpList key={list.title} title={list.title} items={list.items} />
      ))}
      <p className="rounded-md border border-amber-300/25 bg-amber-300/10 p-3 text-amber-100 md:col-span-2">Si un dato no esta confirmado, debe quedar pendiente. FORSETI no debe inventar importes ni condiciones fiscales.</p>
    </div>
  );
}

function getRequirementHelp(code: string) {
  const helps: Record<string, { what: string; where: string[]; warning: string }> = {
    "id-doc": {
      what: "Documento que acredita la identidad fiscal de la persona. Normalmente es DNI, NIE o documento equivalente.",
      where: ["Del propio contribuyente.", "Copia escaneada o foto legible del documento.", "En caso de NIE o residencia, documentacion oficial vigente."],
      warning: "Comprueba que el documento sea legible y que el numero coincida con los datos fiscales.",
    },
    "fiscal-data": {
      what: "Resumen de datos fiscales que la Agencia Tributaria tiene registrados para el ejercicio.",
      where: ["Sede electronica de la Agencia Tributaria.", "Apartado de Renta del ejercicio correspondiente.", "Puede obtenerse con certificado digital, DNI electronico, Cl@ve o numero de referencia."],
      warning: "Los datos fiscales ayudan mucho, pero no siempre incluyen todo. Hay que revisarlos y no copiarlos sin comprobar.",
    },
    "income-certificates": {
      what: "Certificados que justifican ingresos y retenciones: nomina, empresa, pension, desempleo u otras prestaciones.",
      where: ["Empresa o pagador.", "Seguridad Social, SEPE u organismo que pague la prestacion.", "Banco o entidad pagadora si corresponde."],
      warning: "Si hubo varios pagadores, pide certificado de cada uno.",
    },
    deductions: {
      what: "Justificantes de gastos o situaciones que pueden dar derecho a deducciones o reducciones.",
      where: ["Entidad receptora del donativo.", "Banco o gestora de plan de pensiones.", "Guarderia, colegio profesional, sindicato u organismo autonomico.", "Documentacion familiar o de discapacidad si aplica."],
      warning: "No todas las deducciones aplican en todas las comunidades autonomas. Dejalo pendiente si no esta claro.",
    },
    banking: {
      what: "Cuenta bancaria usada para domiciliar pagos o recibir devoluciones.",
      where: ["App o web del banco.", "Certificado de titularidad bancaria.", "Recibo bancario donde figure el IBAN."],
      warning: "Verifica que el IBAN pertenece al contribuyente o que esta autorizado para usarlo.",
    },
  };

  return (
    helps[code] ?? {
      what: "Documento de soporte para completar o verificar el expediente fiscal.",
      where: ["Pedirlo al contribuyente.", "Solicitarlo a la entidad que emitio el dato.", "Revisar la sede u organismo oficial correspondiente."],
      warning: "Si no se sabe de donde sale el dato, no lo marques como confirmado.",
    }
  );
}

function HelpList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-semibold text-white">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
