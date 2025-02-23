import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex justify-center items-start animate-fade-in">
      <div className="flex flex-col items-center space-y-3">
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px] animate-pulse" />
        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 my-3 animate-fade-in" />
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px] animate-pulse" />
        <div className="w-px h-10 bg-gray-200 dark:bg-gray-700 my-3 animate-fade-in" />
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px] animate-pulse" />
      </div>
    </div>
  );
}
