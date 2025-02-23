import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex justify-center items-start">
      <div className="flex flex-col items-center">
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px]" />
        <div className="w-px h-10 bg-gray-200 my-3" />
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px] " />
        <div className="w-px h-10 bg-gray-200 my-3" />
        <Skeleton className="p-5 rounded-md min-h-[94px] min-w-[176px] " />
      </div>
    </div>
  );
}
