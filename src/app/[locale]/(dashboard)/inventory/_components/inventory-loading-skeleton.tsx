import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton as SkeletonBlock } from '@/components/ui/skeleton';

export function InventoryLoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="border-border/60 bg-background/60">
          <CardHeader className="gap-3 border-border/50 border-b pb-4">
            <div className="flex items-start gap-3">
              <SkeletonBlock className="size-11 rounded-2xl" />
              <div className="flex-1 space-y-2">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="h-3 w-1/2" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            <SkeletonBlock className="h-20 rounded-xl" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
