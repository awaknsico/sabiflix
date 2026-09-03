import Image from 'next/image'

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-12 sm:px-6">{children}</div>
      <div className="relative hidden overflow-hidden border-l border-border/60 lg:block">
        <Image
          src="/hero-cinema.png"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12">
          <blockquote className="max-w-md font-serif text-2xl font-medium leading-snug text-balance">
            &ldquo;A curator&apos;s eye turns a library into a collection.&rdquo;
          </blockquote>
          <p className="mt-3 text-sm text-muted-foreground">
            Every title on SabiFlix is watched and approved by a human.
          </p>
        </div>
      </div>
    </div>
  )
}
