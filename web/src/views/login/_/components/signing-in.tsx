import { Spinner } from '@/components/ui/spinner';

export function SigningIn({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="flex items-center gap-2 text-muted-foreground">
        <Spinner />
        Signing in…
      </p>
    </div>
  );
}
