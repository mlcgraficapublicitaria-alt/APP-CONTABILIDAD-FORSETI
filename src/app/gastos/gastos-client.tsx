"use client";

import { useEffect, useMemo, useState } from "react";

type Expense = {
  id: string;
  expenseDate: string;
  month: string;
  supplier: string;
  invoiceNumber?: string;
  concept: string;
  category: string;
  amount: number;
  notes: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

type DriveFolder = { id: string; name: string };

const categories = ["Inteligencia artificial", "Luz", "Agua", "Telefonía e internet", "Software", "Gestoría", "Material", "Transporte", "Otros"];
const fieldClass = "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-[#87ba2f] focus:ring-2 focus:ring-[#87ba2f]/30";

function money(value: number) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value);
}

async function loadExpenses() {
  const response = await fetch("/api/gastos", { cache: "no-store" });
  const data = await response.json().catch(() => ({})) as { expenses?: Expense[]; error?: string };
  if (!response.ok) throw new Error(data.error || "No se pudieron cargar los gastos.");
  return data.expenses ?? [];
}

export function GastosClient() {
  const today = new Date().toISOString().slice(0, 10);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [expenseDate, setExpenseDate] = useState(today);
  const [supplier, setSupplier] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [driveQuery, setDriveQuery] = useState("");
  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>([]);
  const [driveFolderId, setDriveFolderId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function refresh() { setExpenses(await loadExpenses()); }

  useEffect(() => {
    loadExpenses().then(setExpenses).catch((error) => setStatus(error.message));
  }, []);

  const filtered = useMemo(() => expenses.filter((expense) => expense.month === month), [expenses, month]);
  const total = useMemo(() => filtered.reduce((sum, expense) => sum + expense.amount, 0), [filtered]);

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return setStatus("Adjunta una factura o justificante.");
    setBusy(true);
    setStatus("Guardando gasto...");
    try {
      const body = new FormData();
      body.set("expenseDate", expenseDate); body.set("supplier", supplier); body.set("invoiceNumber", invoiceNumber); body.set("concept", concept);
      body.set("category", category); body.set("amount", amount); body.set("notes", notes); body.set("file", file);
      const response = await fetch("/api/gastos", { method: "POST", body });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el gasto.");
      setMonth(expenseDate.slice(0, 7)); setSupplier(""); setInvoiceNumber(""); setConcept(""); setAmount(""); setNotes(""); setFile(null);
      const input = document.getElementById("expense-file") as HTMLInputElement | null; if (input) input.value = "";
      await refresh(); setStatus("Gasto guardado correctamente.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo guardar el gasto."); }
    finally { setBusy(false); }
  }

  async function analyzeFile(nextFile: File) {
    setAnalyzing(true); setStatus("Leyendo datos de la factura o ticket...");
    try {
      const body = new FormData(); body.set("file", nextFile);
      const response = await fetch("/api/gastos/analizar", { method: "POST", body });
      const data = await response.json().catch(() => ({})) as { error?: string; fields?: { supplier?: string; invoiceNumber?: string; expenseDate?: string; amount?: number; category?: string; concept?: string } };
      if (!response.ok || !data.fields) throw new Error(data.error || "No se pudieron detectar los datos.");
      if (data.fields.supplier) setSupplier(data.fields.supplier);
      if (data.fields.invoiceNumber) setInvoiceNumber(data.fields.invoiceNumber);
      if (data.fields.expenseDate) setExpenseDate(data.fields.expenseDate);
      if (data.fields.amount) setAmount(String(data.fields.amount).replace(".", ","));
      if (data.fields.category) setCategory(data.fields.category);
      if (data.fields.concept) setConcept(data.fields.concept);
      setStatus("Datos detectados. Revísalos antes de guardar.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo analizar el archivo. Puedes rellenar los campos manualmente."); }
    finally { setAnalyzing(false); }
  }

  async function deleteExpense(expense: Expense) {
    if (!window.confirm(`¿Eliminar el gasto de ${expense.supplier}?`)) return;
    const response = await fetch(`/api/gastos?id=${encodeURIComponent(expense.id)}`, { method: "DELETE" });
    if (!response.ok) { const data = await response.json().catch(() => ({})); return setStatus(data.error || "No se pudo eliminar."); }
    await refresh(); setStatus("Gasto eliminado.");
  }

  async function sendMonth() {
    setBusy(true); setStatus("Enviando justificantes...");
    try {
      const response = await fetch("/api/gastos/enviar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, email }) });
      const data = await response.json().catch(() => ({})) as { error?: string; count?: number };
      if (!response.ok) throw new Error(data.error || "No se pudo enviar el correo.");
      setStatus(`${data.count} justificantes enviados a ${email}.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudo enviar el correo."); }
    finally { setBusy(false); }
  }

  async function searchDriveFolders() {
    setBusy(true); setStatus("Buscando carpetas de Drive...");
    try {
      const response = await fetch(`/api/drive/folders?q=${encodeURIComponent(driveQuery)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({})) as { folders?: DriveFolder[]; error?: string };
      if (!response.ok) throw new Error(data.error || "No se pudieron buscar carpetas.");
      setDriveFolders(data.folders ?? []); setStatus(data.folders?.length ? "Selecciona una carpeta de Drive." : "No se encontraron carpetas.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudieron buscar carpetas."); }
    finally { setBusy(false); }
  }

  async function uploadMonthToDrive() {
    setBusy(true); setStatus("Enviando justificantes a Google Drive...");
    try {
      const response = await fetch("/api/gastos/drive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ month, folderId: driveFolderId }) });
      const data = await response.json().catch(() => ({})) as { error?: string; uploaded?: number };
      if (!response.ok) throw new Error(data.error || "No se pudieron enviar los archivos a Drive.");
      setStatus(`${data.uploaded} justificantes guardados en Google Drive.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "No se pudieron enviar los archivos a Drive."); }
    finally { setBusy(false); }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[0.85fr_1.3fr]">
      <form onSubmit={saveExpense} className="rounded-[28px] border border-white/10 bg-[#0f1728] p-6 shadow-xl">
        <h2 className="text-center text-xl font-semibold">Añadir gasto</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">Fecha<input type="date" className={`${fieldClass} mt-2`} value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required /></label>
          <label className="text-sm font-semibold">Importe total<input inputMode="decimal" className={`${fieldClass} mt-2`} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" required /></label>
        </div>
        <label className="mt-4 block text-sm font-semibold">Proveedor<input className={`${fieldClass} mt-2`} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="OpenAI, Iberdrola, Aquaservice..." required /></label>
        <label className="mt-4 block text-sm font-semibold">Número de factura o ticket<input className={`${fieldClass} mt-2`} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Ej. F-2026-00425" /></label>
        <label className="mt-4 block text-sm font-semibold">Concepto<input className={`${fieldClass} mt-2`} value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Suscripción, suministro..." required /></label>
        <label className="mt-4 block text-sm font-semibold">Categoría<select className={`${fieldClass} mt-2`} value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="mt-4 block text-sm font-semibold">Notas<textarea className={`${fieldClass} mt-2 min-h-20 resize-y`} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
        <label className="mt-4 block text-sm font-semibold">Factura o justificante<input id="expense-file" type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className={`${fieldClass} mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-[#87ba2f] file:px-3 file:py-2 file:font-semibold file:text-slate-950`} onChange={(e) => { const nextFile = e.target.files?.[0] ?? null; setFile(nextFile); if (nextFile) void analyzeFile(nextFile); }} required /></label>
        {analyzing ? <p className="mt-3 text-center text-sm font-semibold text-sky-300">Analizando documento...</p> : null}
        <button disabled={busy || analyzing} className="mt-5 w-full rounded-2xl bg-[#87ba2f] px-5 py-3 font-semibold text-slate-950 disabled:opacity-50">Guardar gasto</button>
      </form>

      <div className="rounded-[28px] border border-white/10 bg-[#0f1728] p-6 shadow-xl">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-sm font-semibold">Mes<input type="month" className={`${fieldClass} mt-2`} value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <a href={`/api/gastos/descargar?mes=${encodeURIComponent(month)}`} className={`rounded-2xl bg-[#87ba2f] px-5 py-3 text-center text-sm font-semibold text-slate-950 ${filtered.length ? "" : "pointer-events-none opacity-40"}`}>Descargar mes en ZIP</a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="email" className={fieldClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo de destino" />
          <button type="button" disabled={busy || !email || !filtered.length} onClick={sendMonth} className="rounded-2xl border border-[#87ba2f]/50 px-5 py-3 text-sm font-semibold text-[#d7f0a7] disabled:opacity-40">Enviar mes por correo</button>
        </div>
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-semibold text-[#d7f0a7]">Google Drive</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input className={fieldClass} value={driveQuery} onChange={(e) => setDriveQuery(e.target.value)} placeholder="Buscar carpeta de Drive" />
            <button type="button" disabled={busy} onClick={searchDriveFolders} className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold disabled:opacity-40">Buscar</button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <select className={fieldClass} value={driveFolderId} onChange={(e) => setDriveFolderId(e.target.value)}>
              <option value="">Seleccionar carpeta</option>
              {driveFolders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
            </select>
            <button type="button" disabled={busy || !driveFolderId || !filtered.length} onClick={uploadMonthToDrive} className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-semibold text-slate-950 disabled:opacity-40">Enviar mes a Drive</button>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-b border-white/10 pb-4"><p className="text-sm text-slate-300">{filtered.length} gastos</p><p className="text-xl font-semibold text-[#b3d87d]">{money(total)}</p></div>
        {status ? <p className="mt-4 rounded-xl bg-white/5 p-3 text-center text-sm text-amber-200">{status}</p> : null}
        <div className="mt-4 grid max-h-[560px] gap-3 overflow-y-auto pr-1">
          {filtered.length ? filtered.map((expense) => (
            <article key={expense.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{expense.supplier}</p><p className="mt-1 text-sm text-slate-300">{expense.concept} · {expense.category}</p>{expense.invoiceNumber ? <p className="mt-1 text-xs font-semibold text-[#d7f0a7]">Nº {expense.invoiceNumber}</p> : null}<p className="mt-1 text-xs text-slate-400">{new Date(`${expense.expenseDate}T00:00:00`).toLocaleDateString("es-ES")} · {expense.fileName}</p></div><p className="font-semibold text-[#b3d87d]">{money(expense.amount)}</p></div>
              {expense.notes ? <p className="mt-3 text-sm text-slate-300">{expense.notes}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2"><a href={`/api/gastos/archivo?id=${encodeURIComponent(expense.id)}&modo=preview`} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[#87ba2f]/15 px-3 py-2 text-xs font-semibold text-[#d7f0a7] hover:bg-[#87ba2f]/25">Previsualizar</a><a href={`/api/gastos/archivo?id=${encodeURIComponent(expense.id)}`} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">Descargar</a><button type="button" onClick={() => void deleteExpense(expense)} className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/20">Eliminar</button></div>
            </article>
          )) : <p className="py-10 text-center text-slate-400">No hay gastos guardados en este mes.</p>}
        </div>
      </div>
    </section>
  );
}
