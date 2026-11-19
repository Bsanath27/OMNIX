import React from 'react';
import { ThemeProperties } from '../lib/presentonThemes';

export interface MiniSlidePreviewProps {
  slideTitle?: string;
  slideSubtitle?: string;
  bullets?: string[];
  themeProperties?: ThemeProperties;
  themeName: string;
  previewBg: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
  textColor: string;
  isDark: boolean;
  useRealContent?: boolean;
}

export const MiniSlidePreview: React.FC<MiniSlidePreviewProps> = ({
  slideTitle,
  slideSubtitle,
  bullets = [],
  themeProperties,
  themeName,
  previewBg,
  accentColor,
  headingFont,
  bodyFont,
  textColor,
  isDark,
  useRealContent = true,
}) => {
  const displayTitle = (useRealContent && slideTitle && slideTitle.trim())
    ? slideTitle
    : `${themeName} Academic Architecture`;

  const displaySubtitle = (useRealContent && slideSubtitle && slideSubtitle.trim())
    ? slideSubtitle
    : 'FOUNDATIONAL PRINCIPLES • CURRICULUM MODULE';

  const defaultBullets = [
    'Direct textbook passage synthesis',
    'Verified theoretical formulation',
    'Classroom exercise and discussion',
  ];

  const displayBullets = (useRealContent && bullets && bullets.length > 0)
    ? bullets.slice(0, 3)
    : defaultBullets;

  const cardBg = themeProperties?.colors?.cardBackground || (isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(255, 255, 255, 0.85)');
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
  const badgeBg = `${accentColor}25`;

  return (
    <div
      className="w-full aspect-video rounded-2xl mb-3 border overflow-hidden p-3 flex flex-col justify-between relative shadow-inner select-none transition-transform group-hover:scale-[1.02]"
      style={{
        background: previewBg,
        borderColor: cardBorder,
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-1 z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: badgeBg,
              color: accentColor,
            }}
          >
            {themeName}
          </span>
          <span
            className="text-[8px] font-mono truncate opacity-60"
            style={{ color: textColor }}
          >
            {displaySubtitle}
          </span>
        </div>
        <span
          className="text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 font-bold"
          style={{
            backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
            color: textColor,
          }}
        >
          16:9
        </span>
      </div>

      {/* Slide Title */}
      <div className="my-auto py-1 z-10">
        <h5
          className="text-xs sm:text-sm font-extrabold line-clamp-1 leading-tight tracking-tight"
          style={{
            color: themeProperties?.colors?.heading || textColor,
            fontFamily: headingFont,
          }}
        >
          {displayTitle}
        </h5>
        <div
          className="h-0.5 w-8 rounded-full mt-1"
          style={{ backgroundColor: accentColor }}
        />
      </div>

      {/* Mini Concept Cards Grid */}
      <div className="grid grid-cols-3 gap-1.5 z-10">
        {displayBullets.map((bText, idx) => (
          <div
            key={idx}
            className="p-1.5 rounded-lg border flex flex-col justify-between backdrop-blur-xs min-h-[44px]"
            style={{
              backgroundColor: cardBg,
              borderColor: cardBorder,
            }}
          >
            <div className="flex items-center gap-1 mb-0.5">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: accentColor }}
              />
              <span
                className="text-[7px] font-mono font-bold uppercase truncate"
                style={{ color: accentColor }}
              >
                0{idx + 1}
              </span>
            </div>
            <p
              className="text-[8px] leading-tight line-clamp-2"
              style={{
                color: textColor,
                fontFamily: bodyFont,
                opacity: 0.85,
              }}
            >
              {bText}
            </p>
          </div>
        ))}
      </div>

      {/* Subtle Bottom Glow Accent */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none opacity-60"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accentColor} 50%, transparent 100%)`,
        }}
      />
    </div>
  );
};
