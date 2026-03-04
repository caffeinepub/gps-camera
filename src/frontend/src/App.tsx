import { Toaster } from "@/components/ui/sonner";
import { Camera, Images } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { CameraView } from "./components/CameraView";
import { GalleryView } from "./components/GalleryView";

type Tab = "camera" | "gallery";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("camera");

  return (
    <div
      className="flex flex-col h-full max-w-lg mx-auto overflow-hidden"
      style={{
        background:
          activeTab === "camera"
            ? "oklch(var(--cam-bg))"
            : "oklch(var(--background))",
        transition: "background 0.3s ease",
      }}
    >
      {/* Main content */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === "camera" ? (
          <CameraView onGoToGallery={() => setActiveTab("gallery")} />
        ) : (
          <GalleryView />
        )}
      </main>

      {/* Bottom tab bar */}
      <nav
        className="flex-shrink-0 flex border-t"
        style={{
          background:
            activeTab === "camera"
              ? "oklch(var(--cam-surface))"
              : "oklch(var(--card))",
          borderColor:
            activeTab === "camera"
              ? "oklch(var(--cam-border))"
              : "oklch(var(--border))",
        }}
      >
        <TabButton
          data-ocid="nav.camera_tab"
          label="Camera"
          icon={<Camera className="w-5 h-5" />}
          active={activeTab === "camera"}
          darkMode={activeTab === "camera"}
          onClick={() => setActiveTab("camera")}
        />
        <TabButton
          data-ocid="nav.gallery_tab"
          label="Gallery"
          icon={<Images className="w-5 h-5" />}
          active={activeTab === "gallery"}
          darkMode={activeTab === "camera"}
          onClick={() => setActiveTab("gallery")}
        />
      </nav>

      {/* Footer */}
      <div
        className="flex-shrink-0 text-center pb-safe"
        style={{
          background:
            activeTab === "camera"
              ? "oklch(var(--cam-surface))"
              : "oklch(var(--card))",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 6px)",
        }}
      >
        <p
          className="text-[10px] pb-1"
          style={{
            color:
              activeTab === "camera"
                ? "oklch(var(--cam-text-dim) / 0.6)"
                : "oklch(var(--muted-foreground) / 0.7)",
          }}
        >
          Built with ♥ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 opacity-70 hover:opacity-100 transition-opacity"
          >
            caffeine.ai
          </a>
        </p>
      </div>

      <Toaster />
    </div>
  );
}

interface TabButtonProps {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  darkMode: boolean;
  onClick: () => void;
  "data-ocid": string;
}

function TabButton({
  label,
  icon,
  active,
  darkMode,
  onClick,
  "data-ocid": ocid,
}: TabButtonProps) {
  const activeColor = darkMode
    ? "oklch(var(--cam-amber))"
    : "oklch(var(--primary))";
  const inactiveColor = darkMode
    ? "oklch(var(--cam-text-dim))"
    : "oklch(var(--muted-foreground))";

  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      className="flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative"
      style={{ color: active ? activeColor : inactiveColor }}
      aria-selected={active}
      role="tab"
    >
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute top-0 inset-x-6 h-0.5 rounded-full"
          style={{ background: activeColor }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      {icon}
      <span className="text-[11px] font-medium font-display">{label}</span>
    </button>
  );
}
