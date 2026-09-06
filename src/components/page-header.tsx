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
    <header className="space-y-1.5">
      <h1 className="page-title">{title}</h1>
      <hr className="brand-rule" />
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {children}
    </header>
  );
}
