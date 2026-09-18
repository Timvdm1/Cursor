import type { AvatarShape, BotStatus } from "@/lib/types";

const SHAPE: Record<AvatarShape, string> = {
  stadium: "40% / 50%",
  squircle: "28%",
  capsule: "50% / 38%",
  diamond: "18% 82% 18% 82% / 50% 18% 50% 18%",
  hex: "25% 25% 25% 25% / 15% 15% 15% 15%",
  pill: "999px",
};

export function Avatar({
  color,
  shape,
  status = "idle",
  size = 36,
  title,
}: {
  color: string;
  shape: AvatarShape;
  status?: BotStatus;
  size?: number;
  title?: string;
}) {
  return (
    <span
      className={`crew-avatar is-${status}`}
      title={title}
      style={{
        width: size,
        height: size,
        background: color,
        borderRadius: SHAPE[shape],
      }}
    >
      <span className="crew-ring" />
      <span className="crew-eye left" />
      <span className="crew-eye right" />
    </span>
  );
}
