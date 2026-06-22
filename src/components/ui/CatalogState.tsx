type CatalogStateProps = {
  title: string;
  message: string;
};

export function CatalogState({ title, message }: CatalogStateProps) {
  return (
    <section className="catalog-state" role="status">
      <h2>{title}</h2>
      <p>{message}</p>
    </section>
  );
}
