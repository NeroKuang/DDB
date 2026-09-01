export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="space-y-2">
      <h1 className="font-display text-3xl font-semibold tracking-wide">
        {title}
      </h1>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {children}
    </header>
  );
}
