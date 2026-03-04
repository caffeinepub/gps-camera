import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  Clock,
  ImageOff,
  Loader2,
  MapPin,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Photo } from "../backend.d";
import { useDeletePhoto, useGetAllPhotos } from "../hooks/useQueries";

export function GalleryView() {
  const { data: photos, isLoading, isError } = useGetAllPhotos();
  const deletePhoto = useDeletePhoto();
  const [deleteTarget, setDeleteTarget] = useState<Photo | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteClick = (photo: Photo) => {
    setDeleteTarget(photo);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePhoto.mutateAsync(deleteTarget.id);
      toast.success("Photo deleted");
    } catch {
      toast.error("Failed to delete photo");
    } finally {
      setConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const formatTimestamp = (ts: bigint) => {
    // Motoko Time is in nanoseconds
    const ms = Number(ts) / 1_000_000;
    const date = new Date(ms);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCoord = (val: number, axis: "lat" | "lng") => {
    const dir = axis === "lat" ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
    return `${Math.abs(val).toFixed(4)}°${dir}`;
  };

  const sortedPhotos = photos
    ? [...photos].sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
    : [];

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex-shrink-0">
        <h2 className="font-display font-black text-2xl text-foreground tracking-tight leading-none">
          Gallery
        </h2>
        {sortedPhotos.length > 0 && (
          <p className="text-muted-foreground text-sm mt-0.5">
            {sortedPhotos.length} photo{sortedPhotos.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading ? (
          <div
            data-ocid="gallery.loading_state"
            className="flex items-center justify-center py-20"
          >
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Loading photos…</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-foreground font-medium">
                Failed to load photos
              </p>
              <p className="text-muted-foreground text-sm">
                Check your connection and try again.
              </p>
            </div>
          </div>
        ) : sortedPhotos.length === 0 ? (
          <motion.div
            data-ocid="gallery.empty_state"
            className="flex flex-col items-center justify-center py-20 text-center px-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "oklch(var(--muted))" }}
            >
              <ImageOff className="w-9 h-9 text-muted-foreground" />
            </div>
            <h3 className="font-display font-bold text-foreground text-lg mb-1">
              No photos yet
            </h3>
            <p className="text-muted-foreground text-sm max-w-[220px]">
              Switch to Camera and take your first geotagged photo.
            </p>
          </motion.div>
        ) : (
          <motion.div
            data-ocid="gallery.list"
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {sortedPhotos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                index={index + 1}
                onDelete={() => handleDeleteClick(photo)}
                formatTimestamp={formatTimestamp}
                formatCoord={formatCoord}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="font-display font-bold">
              Delete photo?
            </DialogTitle>
            <DialogDescription>
              This photo will be permanently removed. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2">
            <Button
              data-ocid="gallery.cancel_button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              data-ocid="gallery.confirm_button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletePhoto.isPending}
              className="flex-1"
            >
              {deletePhoto.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface PhotoCardProps {
  photo: Photo;
  index: number;
  onDelete: () => void;
  formatTimestamp: (ts: bigint) => string;
  formatCoord: (val: number, axis: "lat" | "lng") => string;
}

function PhotoCard({
  photo,
  index,
  onDelete,
  formatTimestamp,
  formatCoord,
}: PhotoCardProps) {
  const [imgError, setImgError] = useState(false);
  const imgUrl = photo.image.getDirectURL();

  return (
    <motion.div
      data-ocid={`gallery.item.${index}`}
      className="gallery-card-hover rounded-xl overflow-hidden border border-border bg-card shadow-xs"
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
      }}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={photo.note ?? `Photo ${index}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        )}

        {/* Delete button */}
        <button
          type="button"
          data-ocid={`gallery.delete_button.${index}`}
          onClick={onDelete}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center transition-colors backdrop-blur-sm"
          aria-label="Delete photo"
        >
          <Trash2 className="w-3.5 h-3.5 text-white" />
        </button>
      </div>

      {/* Metadata */}
      <div className="px-2.5 py-2 space-y-1">
        {/* Coords */}
        <div className="flex items-center gap-1">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0 text-primary" />
          <span className="font-mono text-[10px] text-foreground leading-none truncate">
            {formatCoord(photo.latitude, "lat")}{" "}
            {formatCoord(photo.longitude, "lng")}
          </span>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1">
          <Clock className="w-2.5 h-2.5 flex-shrink-0 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground leading-none truncate">
            {formatTimestamp(photo.timestamp)}
          </span>
        </div>

        {/* Note */}
        {photo.note && (
          <p className="text-[11px] text-foreground/80 leading-snug line-clamp-2 mt-0.5">
            {photo.note}
          </p>
        )}
      </div>
    </motion.div>
  );
}
