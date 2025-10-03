export function Footer() {
  return (
    <footer className="py-6 md:px-8 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-6 md:h-24 md:flex-row">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built with{" "}
          <a
            className="font-medium underline underline-offset-4"
            href="https://ui.shadcn.com"
          >
            shadcn/ui
          </a>
          .
        </p>
      </div>
    </footer>
  );
}