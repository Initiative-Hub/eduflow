type AuthFormHeadingProps = {
  title: string;
  description: string;
};

export function AuthFormHeading({ title, description }: AuthFormHeadingProps) {
  return (
    <header className="space-y-2 text-center">
      <h2 className="font-extrabold font-heading text-4xl text-foreground leading-none tracking-tight">
        {title}
      </h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </header>
  );
}
