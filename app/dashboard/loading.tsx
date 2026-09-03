export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <div className="h-9 w-56 animate-pulse rounded-lg bg-white/[0.06]" />
      <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-white/[0.06]" />
      <div className="mt-8 h-10 w-full max-w-md animate-pulse rounded-full bg-white/[0.06]" />
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    </div>
  )
}
