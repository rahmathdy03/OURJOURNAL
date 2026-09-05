export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div>{eyebrow && <p className="text-sm font-bold text-orange-600">{eyebrow}</p>}<h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-500">{description}</p>}</div>{action}</div>;
}
