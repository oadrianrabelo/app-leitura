import {
  BookOpen,
  Library,
  Award,
  Settings,
  Sparkles,
  Palette,
  RefreshCw,
  Sun,
  Moon,
  Coffee,
  Monitor,
  ChevronRight,
  Check,
  Download,
  Bookmark,
  Flame,
  Target,
  Upload,
  ScanBarcode,
  Info,
  type LucideProps,
} from "lucide-react";

const ICONS = {
  book: BookOpen,
  library: Library,
  award: Award,
  settings: Settings,
  sparkles: Sparkles,
  palette: Palette,
  refresh: RefreshCw,
  sun: Sun,
  moon: Moon,
  coffee: Coffee,
  monitor: Monitor,
  chevron: ChevronRight,
  check: Check,
  download: Download,
  bookmark: Bookmark,
  flame: Flame,
  target: Target,
  upload: Upload,
  barcode: ScanBarcode,
  info: Info,
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, ...props }: { name: IconName | string } & LucideProps) {
  const Component = ICONS[name as IconName] ?? Sparkles;
  return <Component strokeWidth={1.75} aria-hidden {...props} />;
}
