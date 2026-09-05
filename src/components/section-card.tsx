export function SectionCard({ title, description, action, children, className = "" }: { title?: string; description?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`panel p-4 md:p-5 ${className}`}>
    {(title || description || action) && <div className="mb-4 flex items-start justify-between gap-4"><div>{title && <h2 className="font-black tracking-tight">{title}</h2>}{description && <p className="mt-1 text-sm leading-5 text-neutral-500">{description}</p>}</div>{action}</div>}
    {children}
  </section>;
}
