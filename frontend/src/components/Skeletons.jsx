/**
 * Skeleton loading components for each content type
 */
export function SongCardSkeleton() {
  return (
    <div className="bg-spotify-card rounded-lg p-4">
      <div className="skeleton aspect-square rounded-md mb-4" />
      <div className="skeleton h-4 rounded mb-2 w-3/4" />
      <div className="skeleton h-3 rounded w-1/2" />
    </div>
  );
}

export function SongRowSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-2">
      <div className="skeleton w-4 h-4 rounded" />
      <div className="skeleton w-10 h-10 rounded" />
      <div className="flex-1">
        <div className="skeleton h-4 rounded mb-1 w-1/3" />
        <div className="skeleton h-3 rounded w-1/4" />
      </div>
      <div className="skeleton h-3 rounded w-12" />
    </div>
  );
}

export function AlbumCardSkeleton() {
  return (
    <div className="bg-spotify-card rounded-lg p-4">
      <div className="skeleton aspect-square rounded-md mb-4" />
      <div className="skeleton h-4 rounded mb-2 w-3/4" />
      <div className="skeleton h-3 rounded w-1/2" />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="p-8">
      <div className="flex items-end gap-6 mb-8">
        <div className="skeleton w-52 h-52 rounded-full" />
        <div>
          <div className="skeleton h-3 w-24 rounded mb-2" />
          <div className="skeleton h-12 w-64 rounded mb-4" />
          <div className="skeleton h-4 w-48 rounded" />
        </div>
      </div>
    </div>
  );
}
