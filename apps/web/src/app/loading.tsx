export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        aria-label="Loading"
        className="size-10 animate-spin rounded-full border-2 border-border border-t-primary"
        role="status"
      />
    </main>
  );
}
