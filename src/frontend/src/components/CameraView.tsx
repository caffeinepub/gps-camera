import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  SwitchCamera,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useCamera } from "../camera/useCamera";
import { useAddPhoto } from "../hooks/useQueries";

interface CameraViewProps {
  onGoToGallery: () => void;
}

interface GpsCoords {
  latitude: number;
  longitude: number;
}

type GpsState =
  | { status: "idle" }
  | { status: "fetching" }
  | { status: "ready"; coords: GpsCoords }
  | { status: "error"; message: string };

export function CameraView({ onGoToGallery }: CameraViewProps) {
  const {
    isActive,
    isSupported,
    error: camError,
    isLoading: camLoading,
    currentFacingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
    canvasRef,
  } = useCamera({ facingMode: "environment", quality: 0.85 });

  const [note, setNote] = useState("");
  const [gpsState, setGpsState] = useState<GpsState>({ status: "idle" });
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "success" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const addPhoto = useAddPhoto();

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only effect
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Fetch GPS continuously in the background
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsState({
        status: "error",
        message: "Geolocation is not supported",
      });
      return;
    }

    setGpsState({ status: "fetching" });

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsState({
          status: "ready",
          coords: {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          },
        });
      },
      (err) => {
        setGpsState({
          status: "error",
          message:
            err.code === err.PERMISSION_DENIED
              ? "Location permission denied"
              : "Unable to determine location",
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleCapture = useCallback(async () => {
    if (!isActive || camLoading || saveState === "saving") return;

    // Flash effect
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);

    setSaveState("saving");
    setUploadProgress(0);

    try {
      const file = await capturePhoto();
      if (!file) throw new Error("Failed to capture photo");

      const arrayBuffer = (await file.arrayBuffer()) as ArrayBuffer;
      const imageBytes = new Uint8Array(arrayBuffer) as Uint8Array<ArrayBuffer>;
      const id = crypto.randomUUID();

      // Use available GPS coords or fall back to 0,0 if GPS not ready yet
      const latitude =
        gpsState.status === "ready" ? gpsState.coords.latitude : 0;
      const longitude =
        gpsState.status === "ready" ? gpsState.coords.longitude : 0;

      await addPhoto.mutateAsync({
        id,
        latitude,
        longitude,
        note: note.trim() || null,
        imageBytes,
        onProgress: setUploadProgress,
      });

      setSaveState("success");
      setNote("");
      if (gpsState.status !== "ready") {
        toast.success("Photo saved! (GPS unavailable — no location tagged)");
      } else {
        toast.success("Photo saved!");
      }

      setTimeout(() => setSaveState("idle"), 2500);
    } catch (err) {
      console.error(err);
      setSaveState("error");
      toast.error("Failed to save photo");
      setTimeout(() => setSaveState("idle"), 2500);
    }
  }, [isActive, camLoading, saveState, gpsState, capturePhoto, addPhoto, note]);

  const formatCoord = (val: number, axis: "lat" | "lng") => {
    const dir = axis === "lat" ? (val >= 0 ? "N" : "S") : val >= 0 ? "E" : "W";
    return `${Math.abs(val).toFixed(5)}° ${dir}`;
  };

  const canCapture = isActive && !camLoading && saveState !== "saving";

  return (
    <div className="relative flex flex-col h-full cam-bg overflow-hidden">
      {/* Flash overlay */}
      <AnimatePresence>
        {flashActive && (
          <motion.div
            className="absolute inset-0 z-50 bg-white pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
        )}
      </AnimatePresence>

      {/* Camera preview — fills available space */}
      <div className="relative flex-1 overflow-hidden">
        {/* Video */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          style={{
            transform:
              currentFacingMode === "user" ? "scaleX(-1)" : "scaleX(1)",
          }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Dark vignette at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Top HUD */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-start justify-between">
          {/* GPS indicator */}
          <div className="flex items-center gap-1.5 cam-surface-2 rounded-full px-3 py-1.5 border border-cam">
            <MapPin
              className={`w-3.5 h-3.5 ${
                gpsState.status === "ready"
                  ? "text-cam-amber"
                  : gpsState.status === "fetching"
                    ? "text-cam-dim coord-blink"
                    : "text-destructive"
              }`}
            />
            {gpsState.status === "ready" ? (
              <span className="font-mono-coords text-xs text-cam leading-none">
                {formatCoord(gpsState.coords.latitude, "lat")} /{" "}
                {formatCoord(gpsState.coords.longitude, "lng")}
              </span>
            ) : gpsState.status === "fetching" ? (
              <span className="font-mono-coords text-xs text-cam-dim leading-none coord-blink">
                Acquiring GPS…
              </span>
            ) : (
              <span
                className="font-mono-coords text-xs leading-none"
                style={{ color: "oklch(var(--cam-danger))" }}
              >
                {gpsState.status === "error" ? gpsState.message : "No GPS"}
              </span>
            )}
          </div>

          {/* Switch camera (mobile only) */}
          {isMobile && (
            <button
              type="button"
              onClick={() => switchCamera()}
              disabled={camLoading || !isActive}
              className="cam-surface-2 border border-cam rounded-full p-2.5 text-cam disabled:opacity-40 active:scale-95 transition-transform"
              aria-label="Switch camera"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error state */}
        <AnimatePresence>
          {(camError || !isSupported) && (
            <motion.div
              data-ocid="camera.error_state"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="rounded-2xl border p-8 max-w-sm w-full"
                style={{
                  background: "oklch(var(--cam-surface))",
                  borderColor: "oklch(var(--cam-danger) / 0.4)",
                }}
              >
                <CameraOff
                  className="w-10 h-10 mx-auto mb-3"
                  style={{ color: "oklch(var(--cam-danger))" }}
                />
                <h3 className="font-display font-bold text-cam text-lg mb-1">
                  Camera Unavailable
                </h3>
                <p className="text-cam-dim text-sm">
                  {isSupported === false
                    ? "Your browser doesn't support camera access."
                    : (camError?.message ?? "Unknown error")}
                </p>
                {camError?.type === "permission" && (
                  <p
                    className="text-xs mt-3"
                    style={{ color: "oklch(var(--cam-amber))" }}
                  >
                    Allow camera permission in your browser settings.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera loading state */}
        {camLoading && !camError && (
          <div
            data-ocid="camera.loading_state"
            className="absolute inset-0 flex items-center justify-center"
          >
            <Loader2 className="w-8 h-8 text-cam-amber animate-spin" />
          </div>
        )}

        {/* Save success overlay */}
        <AnimatePresence>
          {saveState === "success" && (
            <motion.div
              data-ocid="camera.success_state"
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div
                className="rounded-2xl px-8 py-6 flex flex-col items-center gap-2"
                style={{ background: "oklch(var(--cam-surface) / 0.95)" }}
              >
                <CheckCircle2 className="w-12 h-12 text-cam-amber" />
                <span className="font-display font-bold text-cam text-base">
                  Saved!
                </span>
                <button
                  type="button"
                  onClick={onGoToGallery}
                  className="text-xs text-cam-dim flex items-center gap-1 mt-1 hover:text-cam transition-colors"
                >
                  View in Gallery <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save error overlay */}
        <AnimatePresence>
          {saveState === "error" && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="rounded-2xl px-8 py-6 flex flex-col items-center gap-2"
                style={{ background: "oklch(var(--cam-surface) / 0.95)" }}
              >
                <AlertCircle
                  className="w-10 h-10"
                  style={{ color: "oklch(var(--cam-danger))" }}
                />
                <span className="font-display font-bold text-cam text-base">
                  Save failed
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="cam-bg border-t border-cam px-6 py-5 flex flex-col items-center gap-4">
        {/* Note input */}
        <input
          data-ocid="camera.note_input"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note… (optional)"
          maxLength={200}
          className="w-full max-w-xs bg-transparent border rounded-lg px-3 py-2 text-sm text-cam placeholder:text-cam-dim border-cam focus:outline-none focus:ring-1 font-sans"
          style={
            {
              "--tw-ring-color": "oklch(var(--cam-amber))",
            } as React.CSSProperties
          }
        />

        {/* Saving progress */}
        {saveState === "saving" && uploadProgress > 0 && (
          <div
            data-ocid="camera.loading_state"
            className="w-full max-w-xs flex items-center gap-2"
          >
            <div className="flex-1 h-1 rounded-full bg-cam-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${uploadProgress}%`,
                  background: "oklch(var(--cam-amber))",
                }}
              />
            </div>
            <span className="font-mono-coords text-xs text-cam-dim">
              {uploadProgress}%
            </span>
          </div>
        )}

        {/* Capture row */}
        <div className="flex items-center justify-center gap-10">
          {/* Capture button */}
          <motion.button
            data-ocid="camera.capture_button"
            onClick={handleCapture}
            disabled={!canCapture}
            className={`shutter-ring rounded-full transition-opacity ${
              !canCapture ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
            }`}
            whileTap={canCapture ? { scale: 0.92 } : {}}
            aria-label="Capture photo"
          >
            <div
              className="w-[72px] h-[72px] rounded-full border-4 border-white/20 flex items-center justify-center"
              style={{
                background:
                  saveState === "saving"
                    ? "oklch(var(--cam-surface-2))"
                    : "white",
                boxShadow: canCapture
                  ? "0 0 0 3px oklch(var(--cam-amber) / 0.3), 0 4px 24px oklch(var(--cam-amber) / 0.2)"
                  : "none",
              }}
            >
              {saveState === "saving" ? (
                <Loader2
                  className="w-8 h-8 animate-spin"
                  style={{ color: "oklch(var(--cam-amber))" }}
                />
              ) : (
                <Camera
                  className="w-8 h-8"
                  style={{ color: "oklch(var(--cam-bg))" }}
                />
              )}
            </div>
          </motion.button>
        </div>

        {/* GPS status line */}
        {gpsState.status !== "ready" && gpsState.status !== "idle" && (
          <p
            className="text-xs font-mono-coords text-center"
            style={{
              color:
                gpsState.status === "error"
                  ? "oklch(var(--cam-danger))"
                  : "oklch(var(--cam-text-dim))",
            }}
          >
            {gpsState.status === "fetching"
              ? "⊙ Acquiring GPS signal…"
              : gpsState.status === "error"
                ? `⚠ ${gpsState.message}`
                : null}
          </p>
        )}
      </div>
    </div>
  );
}
