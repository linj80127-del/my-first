import type { JSX, SVGProps } from "react";
import { HighlightKind } from "@/lib/highlight";

// Simple original line-art (not third-party clip art) so it can sit as a faint background
// watermark without licensing concerns, and inherits color via currentColor for dark mode.
function ProteinIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" {...props}>
      <rect x="6" y="34" width="16" height="32" rx="4" strokeLinejoin="round" />
      <rect x="78" y="34" width="16" height="32" rx="4" strokeLinejoin="round" />
      <line x1="22" y1="50" x2="78" y2="50" strokeLinecap="round" />
      <rect x="32" y="41" width="9" height="18" rx="2" strokeLinejoin="round" />
      <rect x="59" y="41" width="9" height="18" rx="2" strokeLinejoin="round" />
    </svg>
  );
}

function TeaIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="5" {...props}>
      <path
        d="M22 42 H70 V60 A24 24 0 0 1 46 84 A24 24 0 0 1 22 60 Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M70 48 H80 A10 10 0 0 1 80 68 H70" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="88" x2="78" y2="88" strokeLinecap="round" />
      <path d="M36 30 Q31 22 36 15" strokeLinecap="round" />
      <path d="M50 30 Q45 22 50 15" strokeLinecap="round" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<HighlightKind, (props: SVGProps<SVGSVGElement>) => JSX.Element> = {
  protein: ProteinIllustration,
  unsweetened: TeaIllustration,
};

export default function HighlightIllustration({
  kind,
  className,
}: {
  kind: HighlightKind;
  className?: string;
}) {
  const Illustration = ILLUSTRATIONS[kind];
  return <Illustration className={className} aria-hidden />;
}
