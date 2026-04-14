import type { SVGProps } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  CircleX,
  ExternalLink,
  Eye,
  Filter,
  Gauge,
  LoaderCircle,
  Pause,
  Play,
  PlusSquare,
  RefreshCw,
  Settings,
  Shield,
  Wallet,
  Waypoints
} from "lucide-react";

export type IconName =
  | "overview"
  | "agents"
  | "policies"
  | "activity"
  | "settlement"
  | "settings"
  | "success"
  | "warning"
  | "error"
  | "play"
  | "pause"
  | "refresh"
  | "details"
  | "external"
  | "plusSquare"
  | "spinner"
  | "filter"
  | "wallet"
  | "shieldAgent";

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  "aria-hidden"?: boolean | "true" | "false";
};

function ShieldAgent({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} {...props}>
      <path d="M12 3l7 3v5c0 4.6-2.8 7.7-7 10-4.2-2.3-7-5.4-7-10V6l7-3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 12.2a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.8 17.2c1-.9 2.5-1.5 4.2-1.5s3.2.6 4.2 1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const icons = {
  overview: Gauge,
  agents: Bot,
  policies: Shield,
  activity: Activity,
  settlement: Waypoints,
  settings: Settings,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: CircleX,
  play: Play,
  pause: Pause,
  refresh: RefreshCw,
  details: Eye,
  external: ExternalLink,
  plusSquare: PlusSquare,
  spinner: LoaderCircle,
  filter: Filter,
  wallet: Wallet,
  shieldAgent: ShieldAgent
} as const;

export function Icon({ name, size = 20, className, strokeWidth = 2, ...rest }: IconProps) {
  const Component = icons[name];
  return <Component size={size} strokeWidth={strokeWidth} className={className} {...rest} />;
}
