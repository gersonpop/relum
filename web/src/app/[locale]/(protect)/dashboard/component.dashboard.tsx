"use client";

export function DynamicComponent() {
  return (
    <section className="space-y-4">
      <p className="text-sm text-slate-600">Esta sección todavía está en preparación.</p>
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-800">Muy pronto</h2>
        <p className="mt-1 text-xs text-slate-500">Mientras tanto, usa el menú de la izquierda para ir a otra sección.</p>
      </div>
    </section>
  );
}

export default DynamicComponent;