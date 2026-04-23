// src/components/Icons.tsx
// Crisp inline SVG icons — consistent across all Android/iOS/desktop
// No external dependency needed

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

function base(d: string, opts?: { viewBox?: string; strokeWidth?: number }) {
  function Icon({ size = 24, color = 'currentColor', className, style }: IconProps) {
    return (
      <svg
        width={size} height={size}
        viewBox={opts?.viewBox ?? '0 0 24 24'}
        fill="none"
        stroke={color}
        strokeWidth={opts?.strokeWidth ?? 2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <path d={d} />
      </svg>
    );
  }
  return Icon;
}

// Navigation
export const HomeIcon = base('M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10');
export const ProfileIcon = base('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z');
export const MemoryIcon = base('M12 2a9 9 0 100 18 9 9 0 000-18z M12 8v4l3 3');
export const AgentsIcon = base('M13 2L3 14h9l-1 8 10-12h-9l1-8z');
export const PlanIcon = base('M9 11l3 3L22 4 M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11');
export const ReportIcon = base('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8');
export const LogoutIcon = base('M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9');

// Farm features
export const CropIcon = base('M12 22V12 M5.2 13C4.4 12 4 10.9 4 9.5a8 8 0 0116 0c0 1.4-.4 2.5-1.2 3.5L12 22z');
export const DiseaseIcon = base('M12 2a10 10 0 100 20 10 10 0 000-20z M12 8v4 M12 16h.01');
export const SpatialIcon = base('M3 6l9-4 9 4v12l-9 4-9-4V6z M12 2v20 M3 6l9 4 9-4');
export const WeatherIcon = base('M17.5 19a4.5 4.5 0 000-9h-.7A7 7 0 1010 19');
export const NutrientIcon = base('M10 2v7.31 M14 9.3V1.99 M8.5 2h7 M14 9.3a6.5 6.5 0 11-4 0 M6 17h12');

// Actions
export const MicIcon = base('M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z M19 10v2a7 7 0 01-14 0v-2 M12 19v4 M8 23h8');
export const MicOffIcon = base('M1 1l22 22 M9 9v3a3 3 0 005.12 2.12 M15 9.34V4a3 3 0 00-5.94-.6 M17 16.95A7 7 0 015 12v-2 M19 10v2a7 7 0 01-.11 1.23 M12 19v4 M8 23h8');
export const SpeakIcon = base('M11 5L6 9H2v6h4l5 4V5z M19.07 4.93a10 10 0 010 14.14 M15.54 8.46a5 5 0 010 7.07');
export const SendIcon = base('M22 2L11 13 M22 2L15 22 8 13 2 9z');
export const AttachIcon = base('M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48');
export const CloseIcon = base('M18 6L6 18 M6 6l12 12');
export const CheckIcon = base('M20 6L9 17l-5-5');
export const TrashIcon = base('M3 6h18 M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6 M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2');
export const EditIcon = base('M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z');
export const SearchIcon = base('M11 17.25a6.25 6.25 0 110-12.5 6.25 6.25 0 010 12.5z M16 16l4.5 4.5');
export const ArrowLeftIcon = base('M19 12H5 M12 19l-7-7 7-7');
export const ArrowRightIcon = base('M5 12h14 M12 5l7 7-7 7');
export const CameraIcon = base('M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z');
export const ImageIcon = base('M21 19V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2z M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M21 15l-5-5L5 21');
export const BrainIcon = base('M9.5 2A2.5 2.5 0 007 4.5v0A2.5 2.5 0 004.5 7h0A2.5 2.5 0 002 9.5v0A2.5 2.5 0 004.5 12 M14.5 2A2.5 2.5 0 0117 4.5v0A2.5 2.5 0 0119.5 7h0A2.5 2.5 0 0122 9.5v0A2.5 2.5 0 0119.5 12 M4.5 12A2.5 2.5 0 002 14.5v0A2.5 2.5 0 004.5 17h0A2.5 2.5 0 007 19.5v0A2.5 2.5 0 009.5 22 M19.5 12A2.5 2.5 0 0122 14.5v0A2.5 2.5 0 0119.5 17h0A2.5 2.5 0 0117 19.5v0A2.5 2.5 0 0114.5 22 M12 12a2 2 0 100-4 2 2 0 000 4z');
export const SparkleIcon = base('M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z');
export const LeafIcon = base('M2 22c1.25-1.25 2.08-2.9 2.37-4.68 M12.76 3.76a6 6 0 00-8.49 8.49l9.65 9.65c.56.56 1.47.56 2.03 0l2.82-2.82c.37-.37.37-.96 0-1.33z');
export const AlertIcon = base('M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01');
export const InfoIcon = base('M12 22a10 10 0 100-20 10 10 0 000 20z M12 8h.01 M12 12v4');
export const SettingsIcon = base('M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z');
export const PlusIcon = base('M12 5v14 M5 12h14');
export const RefreshIcon = base('M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15');
export const DownloadIcon = base('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3');
export const MapIcon = base('M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z M8 2v16 M16 6v16');
export const ChatIcon = base('M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z');
export const MoneyIcon = base('M12 1v22 M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6');
export const SunIcon = base('M12 17a5 5 0 100-10 5 5 0 000 10z M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42');
export const WaterIcon = base('M12 2.69l5.66 5.66a8 8 0 11-11.31 0z');
export const CalendarIcon = base('M3 9h18 M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z M8 3v4 M16 3v4');
export const StarIcon = base('M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z');
export const FileIcon = base('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6');
export const UploadIcon = base('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12');
export const ExternalLinkIcon = base('M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6 M15 3h6v6 M10 14L21 3');
export const ZapIcon = base('M13 2L3 14h9l-1 8 10-12h-9l1-8z');
