/**
 * Title, optional description and the primary actions for a single screen.
 *
 * Screen-specific actions live here rather than in <AppHeader> on purpose: the
 * header sits in the layout, which does not re-render per navigation, so a page
 * cannot push content into it without a client-side context that would fight
 * the "no setState in effects" rule. Keeping page actions in the page keeps
 * everything a Server Component and keeps the data next to the button that
 * uses it.
 *
 *   <PageHeader title="Invoices" actions={<Button …>New invoice</Button>} />
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
