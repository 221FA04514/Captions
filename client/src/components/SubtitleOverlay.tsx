import React from 'react';
import type { CaptionCue, SubtitleStyle } from '../types';
import { useAppContext } from '../context/AppContext';
import { getCueWords, getActiveWordIndex } from '../types';

interface SubtitleOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cues: CaptionCue[];
  globalStyle: SubtitleStyle;
  renderedFrameHeight: number;
  renderedFrameWidth: number;
}

const RAINBOW_COLORS = ['#38BDF8', '#22C55E', '#FACC15', '#FB7185', '#A855F7'];

function hexToRgba(hex: string, opacity: number): string {
  let clean = hex.replace('#', '');
  if (clean.length === 3) clean = clean.split('').map((c) => c + c).join('');
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function buildTextShadow(s: SubtitleStyle, scaleFactor: number): string {
  const shadows: string[] = [];
  const scaledOutline = Math.max(1, Math.round(s.outlineWidth * scaleFactor));

  if (s.outlineWidth > 0) {
    const ox = scaledOutline;
    const oc = s.outlineColor;
    shadows.push(
      `-${ox}px -${ox}px 0 ${oc}`,
      `${ox}px -${ox}px 0 ${oc}`,
      `-${ox}px ${ox}px 0 ${oc}`,
      `${ox}px ${ox}px 0 ${oc}`,
      `-${ox}px 0 0 ${oc}`,
      `${ox}px 0 0 ${oc}`,
      `0 -${ox}px 0 ${oc}`,
      `0 ${ox}px 0 ${oc}`
    );
  }

  if (s.shadowBlur > 0) {
    const scaledBlur = Math.max(1, Math.round(s.shadowBlur * scaleFactor));
    const sx = Math.round((s.shadowOffsetX ?? 2) * scaleFactor);
    const sy = Math.round((s.shadowOffsetY ?? 2) * scaleFactor);
    shadows.push(`${sx}px ${sy}px ${scaledBlur}px ${s.shadowColor}`);
  }

  return shadows.join(', ') || 'none';
}

export default function SubtitleOverlay({
  videoRef,
  cues,
  globalStyle,
  renderedFrameHeight,
  renderedFrameWidth,
}: SubtitleOverlayProps) {
  const { state } = useAppContext();
  const currentTime = state.currentTime;

  // Find active cue(s) for the current playback position
  const activeCues = cues.filter(
    (c) => currentTime >= c.startTime && currentTime <= c.endTime
  );

  if (activeCues.length === 0 || renderedFrameHeight <= 0) return null;

  // Scale factor based on reference 1080p canvas
  const scaleFactor = renderedFrameHeight / 1080;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
      {activeCues.map((cue) => {
        // Merge global style with per-cue override
        const effectiveStyle: SubtitleStyle = {
          ...globalStyle,
          ...(cue.styleOverride || {}),
        };

        const anim = effectiveStyle.animationType;
        const isCaps = effectiveStyle.allCaps;
        const words = getCueWords(cue);
        const activeWordIdx = getActiveWordIndex(words, currentTime);

        // Position within the video frame
        const positionStyle: React.CSSProperties = {
          position: 'absolute',
          left: 0,
          right: 0,
          textAlign: effectiveStyle.alignment,
          whiteSpace: 'pre-line',
          padding: `0 ${Math.max(8, Math.round(effectiveStyle.backgroundPadding * scaleFactor + 12))}px`,
          pointerEvents: 'none',
        };

        const offsetPct = `${effectiveStyle.verticalOffsetPercent}%`;
        if (effectiveStyle.position === 'bottom') {
          positionStyle.bottom = offsetPct;
        } else if (effectiveStyle.position === 'top') {
          positionStyle.top = offsetPct;
        } else {
          positionStyle.top = '50%';
          positionStyle.transform = 'translateY(-50%)';
        }

        const scaledFontSize = Math.max(11, Math.round(effectiveStyle.fontSize * scaleFactor));
        const scaledPadding = Math.round(effectiveStyle.backgroundPadding * scaleFactor);
        const scaledRadius = Math.round((effectiveStyle.borderRadius ?? 4) * scaleFactor);

        const containerBoxStyle: React.CSSProperties = {
          display: 'inline-block',
          fontFamily: effectiveStyle.fontFamily,
          fontSize: `${scaledFontSize}px`,
          fontWeight: effectiveStyle.fontWeight === '800' ? 800 : effectiveStyle.fontWeight === 'bold' ? 700 : 400,
          color: effectiveStyle.textColor,
          letterSpacing: `${Math.round(effectiveStyle.letterSpacing * scaleFactor)}px`,
          lineHeight: effectiveStyle.lineHeight,
          textShadow: buildTextShadow(effectiveStyle, scaleFactor),
          borderRadius: effectiveStyle.backgroundOpacity > 0 && scaledPadding > 0 ? `${scaledRadius}px` : undefined,
          backgroundColor: effectiveStyle.backgroundOpacity > 0
            ? hexToRgba(effectiveStyle.backgroundColor, effectiveStyle.backgroundOpacity)
            : undefined,
          padding: effectiveStyle.backgroundOpacity > 0 && scaledPadding > 0
            ? `${Math.round(scaledPadding * 0.4)}px ${scaledPadding}px`
            : undefined,
          maxWidth: '92%',
          wordBreak: 'break-word',
        };

        const isTelugu = effectiveStyle.fontFamily.toLowerCase().includes('telugu');

        // Render animated words or static text
        const renderContent = () => {
          if (anim === 'typewriter') {
            const visibleWords = words.slice(0, Math.max(0, activeWordIdx + 1));
            return visibleWords.map((w, idx) => {
              const text = isCaps ? w.word.toUpperCase() : w.word;
              return (
                <React.Fragment key={idx}>
                  <span>{text}</span>
                  {w.hasNewline ? <br /> : ' '}
                </React.Fragment>
              );
            });
          }

          if (anim === 'karaoke-highlight' || anim === 'word-pop' || anim === 'rainbow') {
            return words.map((w, idx) => {
              const isActive = idx === activeWordIdx;
              const text = isCaps ? w.word.toUpperCase() : w.word;

              let wordColor = effectiveStyle.textColor;
              if (isActive) {
                if (anim === 'rainbow') {
                  wordColor = RAINBOW_COLORS[idx % RAINBOW_COLORS.length];
                } else {
                  wordColor = effectiveStyle.activeWordColor || effectiveStyle.highlightColor || '#FFE81F';
                }
              }

              const wordStyle: React.CSSProperties = {
                color: wordColor,
                transition: 'color 0.1s ease-out, transform 0.1s ease-out',
                display: 'inline-block',
                transform: isActive && anim === 'word-pop' ? 'scale(1.12)' : 'scale(1)',
                transformOrigin: 'center bottom',
                fontWeight: isActive && anim === 'word-pop' ? 800 : undefined,
              };

              return (
                <React.Fragment key={idx}>
                  <span style={wordStyle}>{text}</span>
                  {w.hasNewline ? <br /> : ' '}
                </React.Fragment>
              );
            });
          }

          // Static text
          const fullText = isCaps ? cue.text.toUpperCase() : cue.text;
          return fullText;
        };

        return (
          <div key={cue.id} style={positionStyle}>
            <span style={containerBoxStyle} className={isTelugu ? 'font-telugu' : ''}>
              {renderContent()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
