import { Skeleton } from "@/components/ui/primitives";

export default function AppLoading() {
  return (
    <div role="status" aria-label="Cargando">
      <div className="mb-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="card p-5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="mt-4 h-7 w-32 max-w-full" />
            <Skeleton className="mt-3 h-3.5 w-20" />
          </div>
        ))}
      </div>
      <div className="card mt-4 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-5 h-64 w-full" />
      </div>
    </div>
  );
}
