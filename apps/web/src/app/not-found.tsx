import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@trustfirst/ui";
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>
            The page may have moved, or you may not have access to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/">Return home</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
