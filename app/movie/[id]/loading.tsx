export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Skeleton mirrors the film detail layout so the swap-in is seamless. */}
      <div className="relative">
        <div className="absolute inset-0 h-[420px] animate-pulse bg-white/[0.03]" />
        <div className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="mb-6 h-8 w-28 animate-pulse rounded-full bg-white/[0.06]" />
          <div className="flex flex-col gap-8 pb-8 md:flex-row md:gap-10">
            <div className="mx-auto aspect-[2/3] w-52 shrink-0 animate-pulse rounded-2xl bg-white/[0.06] sm:w-64 md:mx-0" />
            <div className="flex flex-1 flex-col gap-4 pt-2">
              <div className="h-6 w-24 animate-pulse rounded-full bg-white/[0.06]" />
              <div className="h-10 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
              <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-white/[0.06]" />
              <div className="h-4 w-full max-w-xl animate-pulse rounded bg-white/[0.06]" />
              <div className="mt-4 flex gap-3">
                <div className="h-11 w-36 animate-pulse rounded-full bg-white/[0.06]" />
                <div className="h-11 w-40 animate-pulse rounded-full bg-white/[0.06]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
