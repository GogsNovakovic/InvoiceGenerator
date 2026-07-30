export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4 sm:p-6">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="font-heading text-2xl font-semibold tracking-tight">
            Invoice Generator
          </span>
          <span className="text-sm text-muted-foreground">
            Invoices, PDFs and payment links in one place.
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
