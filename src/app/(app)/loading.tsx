export default function AppLoading() {
  return (
    <div className="animate-pulse space-y-5" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-3 w-24 rounded-full bg-neutral-200" />
        <div className="h-8 w-52 rounded-xl bg-neutral-200" />
        <div className="h-4 w-full max-w-md rounded-full bg-neutral-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="panel h-28 bg-white p-4">
            <div className="h-3 w-24 rounded-full bg-neutral-100" />
            <div className="mt-4 h-7 w-32 rounded-lg bg-neutral-200" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="panel space-y-3 p-4">
            <div className="h-5 w-40 rounded-lg bg-neutral-200" />
            <div className="h-16 rounded-2xl bg-neutral-100" />
            <div className="h-16 rounded-2xl bg-neutral-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
