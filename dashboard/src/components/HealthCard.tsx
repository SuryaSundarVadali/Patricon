type HealthCardProps = {
  title: string;
  value: string;
};

export function HealthCard({ title, value }: HealthCardProps) {
  return (
    <article>
      <h3>{title}</h3>
      <p>{value}</p>
    </article>
  );
}
