import React, { useState } from 'react';
import type { SubtitleStyle, SubtitlePreset, SubtitleAnimationType, StylingScope } from '../types';
import { SUBTITLE_PRESETS } from '../types';
import { useAppContext } from '../context/AppContext';
import {
  Type, Palette, Square, AlignCenter, Sparkles, RotateCcw,
  ChevronDown, ChevronRight, Sliders, Check
} from 'lucide-react';

const FONT_OPTIONS = [
  { label: 'Montserrat (Bold)', value: 'Montserrat, sans-serif' },
  { label: 'Inter (Clean)', value: 'Inter, sans-serif' },
  { label: 'Outfit (Modern)', value: 'Outfit, sans-serif' },
  { label: 'Nirmala UI (Telugu)', value: 'Nirmala UI, "Noto Sans Telugu", sans-serif' },
  { label: 'Noto Sans Telugu', value: '"Noto Sans Telugu", Nirmala UI, sans-serif' },
  { label: 'Times New Roman (Cinematic)', value: '"Times New Roman", Georgia, serif' },
  { label: 'Georgia (Serif)', value: 'Georgia, serif' },
  { label: 'Courier New (Typewriter)', value: '"Courier New", Courier, monospace' },
  { label: 'Arial', value: 'Arial, sans-serif' },
];

function SectionHeader({
  title,
  isOpen,
  onToggle,
  icon,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between py-2 px-3 text-xs font-semibold text-text-primary hover:bg-surface-150 transition-colors border-b border-border select-none"
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-text-secondary">{icon}</span>}
        <span>{title}</span>
      </div>
      {isOpen ? (
        <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
      ) : (
        <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
      )}
    </button>
  );
}

function ColorInput({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] text-text-secondary">{label}</span>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-border cursor-pointer bg-transparent p-0"
          id={id}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value.trim();
            if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) onChange(v);
          }}
          className="input-field py-0.5 px-1.5 text-[11px] font-mono w-18 text-center uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function CompactSlider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  id: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-secondary">{label}</span>
        <span className="font-mono text-text-muted">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        id={id}
        className="w-full"
      />
    </div>
  );
}

export default function StylePanel() {
  const { state, dispatch, notify } = useAppContext();
  const { project, activeCueId, stylingScope } = state;

  // Accordion state (presets and typography open by default)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    presets: true,
    typography: true,
    animation: true,
    colors: false,
    background: false,
    position: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!project) return null;

  const selectedCue = activeCueId
    ? project.captions.find((c) => c.id === activeCueId)
    : null;

  const effectiveStyle: SubtitleStyle =
    stylingScope === 'selected' && selectedCue?.styleOverride
      ? { ...project.style, ...selectedCue.styleOverride }
      : project.style;

  const currentPreset = SUBTITLE_PRESETS.find((p) => p.id === effectiveStyle.presetId);
  const defaultFontSize = currentPreset ? currentPreset.style.fontSize : 42;

  const update = (partial: Partial<SubtitleStyle>) => {
    if (stylingScope === 'selected') {
      if (!activeCueId) {
        notify('warning', 'Please select a caption first to customize its individual style.');
        return;
      }
      dispatch({
        type: 'UPDATE_SELECTED_CUE_STYLE',
        payload: { ...partial, presetId: 'custom' },
      });
    } else {
      dispatch({
        type: 'SET_STYLE',
        payload: { ...project.style, ...partial, presetId: 'custom' },
      });
    }
  };

  const applyPreset = (preset: SubtitlePreset) => {
    if (stylingScope === 'selected') {
      if (!activeCueId) {
        notify('warning', 'Please select a caption first to apply this preset.');
        return;
      }
      dispatch({
        type: 'UPDATE_SELECTED_CUE_STYLE',
        payload: { ...preset.style },
      });
      notify('info', `Preset "${preset.name}" applied to selected caption #${selectedCue?.index}.`);
    } else {
      dispatch({
        type: 'SET_STYLE',
        payload: { ...preset.style },
      });
      notify('success', `Preset "${preset.name}" applied to all captions.`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 border-l border-border select-none overflow-y-auto">
      {/* 1. Scope Selector Strip */}
      <div className="p-3 border-b border-border bg-surface-100 flex-shrink-0 space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-text-secondary uppercase tracking-wider">
            Apply Scope
          </span>
          {stylingScope === 'selected' && selectedCue && (
            <span className="text-[10px] text-accent font-medium truncate max-w-[140px]">
              #{selectedCue.index} selected
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 p-0.5 bg-surface-200/80 rounded-md border border-border">
          <button
            onClick={() => dispatch({ type: 'SET_STYLING_SCOPE', payload: 'all' })}
            id="scope-apply-to-all"
            className={`py-1 text-xs font-medium rounded transition-all ${
              stylingScope === 'all'
                ? 'bg-surface-50 text-text-primary shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Captions
          </button>
          <button
            onClick={() => {
              dispatch({ type: 'SET_STYLING_SCOPE', payload: 'selected' });
              if (!activeCueId && project.captions.length > 0) {
                dispatch({ type: 'SET_ACTIVE_CUE', payload: project.captions[0].id });
              }
            }}
            id="scope-apply-to-selected"
            className={`py-1 text-xs font-medium rounded transition-all ${
              stylingScope === 'selected'
                ? 'bg-surface-50 text-accent font-semibold shadow-subtle'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Selected Only
          </button>
        </div>
      </div>

      {/* 2. Subtitle Presets (Compact Tiles) */}
      <div className="border-b border-border">
        <SectionHeader
          title="Presets"
          isOpen={openSections.presets}
          onToggle={() => toggleSection('presets')}
          icon={<Sliders className="w-3.5 h-3.5" />}
        />
        {openSections.presets && (
          <div className="p-3 grid grid-cols-2 gap-1.5 bg-surface-100/40">
            {SUBTITLE_PRESETS.map((preset) => {
              const isSelected = effectiveStyle.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  id={`preset-${preset.id}`}
                  className={`relative p-2 rounded-md border text-left transition-all ${
                    isSelected
                      ? 'border-accent bg-accent-light text-accent shadow-subtle ring-1 ring-accent'
                      : 'border-border bg-surface-50 hover:border-accent/40 hover:bg-surface-150 text-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-[11px] truncate">{preset.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-accent flex-shrink-0" />}
                  </div>

                  {/* Micro Subtitle Sample Box */}
                  <div
                    className="h-6 rounded flex items-center justify-center text-[10px] font-semibold overflow-hidden border border-border-subtle"
                    style={{
                      background: preset.previewBg,
                      color: preset.style.textColor,
                      fontFamily: preset.style.fontFamily,
                      textTransform: preset.style.allCaps ? 'uppercase' : 'none',
                    }}
                  >
                    <span>Aa</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Typography */}
      <div className="border-b border-border">
        <SectionHeader
          title="Typography"
          isOpen={openSections.typography}
          onToggle={() => toggleSection('typography')}
          icon={<Type className="w-3.5 h-3.5" />}
        />
        {openSections.typography && (
          <div className="p-3 space-y-3 bg-surface-50">
            {/* Font Family */}
            <div className="space-y-1">
              <label className="text-[11px] text-text-secondary">Font Family</label>
              <select
                value={effectiveStyle.fontFamily}
                onChange={(e) => update({ fontFamily: e.target.value })}
                className="input-field text-xs py-1"
                id="font-family-select"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Draggable Font Size Slider with number input & reset */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-text-secondary">Font Size</span>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    min={12}
                    max={140}
                    value={effectiveStyle.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) update({ fontSize: Math.max(12, Math.min(140, val)) });
                    }}
                    className="input-field py-0 px-1 w-12 text-center text-[11px] font-mono"
                    id="font-size-number-input"
                  />
                  <span className="text-text-muted text-[10px]">px</span>
                  <button
                    onClick={() => update({ fontSize: defaultFontSize })}
                    className="btn-ghost p-0.5 text-text-muted hover:text-text-primary"
                    title={`Reset to default (${defaultFontSize}px)`}
                    id="reset-font-size-btn"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <input
                type="range"
                min={12}
                max={140}
                step={1}
                value={effectiveStyle.fontSize}
                onChange={(e) => update({ fontSize: parseInt(e.target.value, 10) })}
                id="font-size-slider"
                className="w-full"
              />
            </div>

            {/* Font Weight */}
            <div className="space-y-1">
              <span className="text-[11px] text-text-secondary">Font Weight</span>
              <div className="grid grid-cols-3 gap-1">
                {(['normal', 'bold', '800'] as const).map((w) => (
                  <button
                    key={w}
                    onClick={() => update({ fontWeight: w })}
                    id={`font-weight-${w}`}
                    className={`py-1 rounded text-[11px] font-medium border transition-colors ${
                      effectiveStyle.fontWeight === w
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface-50 border-border text-text-secondary hover:bg-surface-150'
                    }`}
                  >
                    {w === '800' ? 'Black' : w.charAt(0).toUpperCase() + w.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Spacing & Caps */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border-subtle">
              <CompactSlider
                label="Letter Space"
                value={effectiveStyle.letterSpacing}
                onChange={(v) => update({ letterSpacing: v })}
                min={-2}
                max={10}
                step={0.5}
                unit="px"
                id="letter-spacing-slider"
              />
              <CompactSlider
                label="Line Height"
                value={effectiveStyle.lineHeight}
                onChange={(v) => update({ lineHeight: v })}
                min={1.0}
                max={2.0}
                step={0.05}
                id="line-height-slider"
              />
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-border-subtle text-[11px]">
              <span className="text-text-secondary">ALL CAPS</span>
              <button
                onClick={() => update({ allCaps: !effectiveStyle.allCaps })}
                id="all-caps-toggle"
                className={`relative w-8 h-4.5 rounded-full transition-colors ${
                  effectiveStyle.allCaps ? 'bg-accent' : 'bg-surface-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${
                    effectiveStyle.allCaps ? 'left-4' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Animation & Spoken Word Highlighting */}
      <div className="border-b border-border">
        <SectionHeader
          title="Animation & Highlighting"
          isOpen={openSections.animation}
          onToggle={() => toggleSection('animation')}
          icon={<Sparkles className="w-3.5 h-3.5" />}
        />
        {openSections.animation && (
          <div className="p-3 space-y-3 bg-surface-50">
            <div className="space-y-1">
              <label className="text-[11px] text-text-secondary">Spoken Word Animation</label>
              <select
                value={effectiveStyle.animationType || 'none'}
                onChange={(e) =>
                  update({ animationType: e.target.value as SubtitleAnimationType })
                }
                className="input-field text-xs py-1"
                id="animation-type-select"
              >
                <option value="none">None (Static Subtitles)</option>
                <option value="karaoke-highlight">Karaoke Active Word Highlight</option>
                <option value="word-pop">Active Word Pop</option>
                <option value="rainbow">Rainbow Multicolor Progression</option>
                <option value="typewriter">Typewriter (Progressive Reveal)</option>
              </select>
            </div>

            {effectiveStyle.animationType && effectiveStyle.animationType !== 'none' && (
              <ColorInput
                label="Active Word Color"
                value={effectiveStyle.activeWordColor || effectiveStyle.highlightColor || '#FFE81F'}
                onChange={(v) => update({ activeWordColor: v })}
                id="active-word-color-picker"
              />
            )}
          </div>
        )}
      </div>

      {/* 5. Colors, Outline & Shadow */}
      <div className="border-b border-border">
        <SectionHeader
          title="Colors & Stroke"
          isOpen={openSections.colors}
          onToggle={() => toggleSection('colors')}
          icon={<Palette className="w-3.5 h-3.5" />}
        />
        {openSections.colors && (
          <div className="p-3 space-y-2.5 bg-surface-50">
            <ColorInput
              label="Text Color"
              value={effectiveStyle.textColor}
              onChange={(v) => update({ textColor: v })}
              id="text-color-picker"
            />
            <ColorInput
              label="Outline Color"
              value={effectiveStyle.outlineColor}
              onChange={(v) => update({ outlineColor: v })}
              id="outline-color-picker"
            />
            <CompactSlider
              label="Outline Width"
              value={effectiveStyle.outlineWidth}
              onChange={(v) => update({ outlineWidth: v })}
              min={0}
              max={10}
              step={0.5}
              unit="px"
              id="outline-width-slider"
            />
            <ColorInput
              label="Shadow Color"
              value={effectiveStyle.shadowColor}
              onChange={(v) => update({ shadowColor: v })}
              id="shadow-color-picker"
            />
            <CompactSlider
              label="Shadow Blur"
              value={effectiveStyle.shadowBlur}
              onChange={(v) => update({ shadowBlur: v })}
              min={0}
              max={15}
              step={1}
              unit="px"
              id="shadow-blur-slider"
            />
          </div>
        )}
      </div>

      {/* 6. Background Box */}
      <div className="border-b border-border">
        <SectionHeader
          title="Background Box"
          isOpen={openSections.background}
          onToggle={() => toggleSection('background')}
          icon={<Square className="w-3.5 h-3.5" />}
        />
        {openSections.background && (
          <div className="p-3 space-y-2.5 bg-surface-50">
            <ColorInput
              label="Box Color"
              value={effectiveStyle.backgroundColor}
              onChange={(v) => update({ backgroundColor: v })}
              id="bg-color-picker"
            />
            <CompactSlider
              label="Box Opacity"
              value={Math.round(effectiveStyle.backgroundOpacity * 100)}
              onChange={(v) => update({ backgroundOpacity: v / 100 })}
              min={0}
              max={100}
              step={5}
              unit="%"
              id="bg-opacity-slider"
            />
            <CompactSlider
              label="Box Padding"
              value={effectiveStyle.backgroundPadding}
              onChange={(v) => update({ backgroundPadding: v })}
              min={0}
              max={30}
              step={2}
              unit="px"
              id="bg-padding-slider"
            />
            <CompactSlider
              label="Corner Radius"
              value={effectiveStyle.borderRadius ?? 4}
              onChange={(v) => update({ borderRadius: v })}
              min={0}
              max={24}
              step={2}
              unit="px"
              id="border-radius-slider"
            />
          </div>
        )}
      </div>

      {/* 7. Position & Alignment */}
      <div className="border-b border-border">
        <SectionHeader
          title="Position & Alignment"
          isOpen={openSections.position}
          onToggle={() => toggleSection('position')}
          icon={<AlignCenter className="w-3.5 h-3.5" />}
        />
        {openSections.position && (
          <div className="p-3 space-y-3 bg-surface-50">
            <div className="space-y-1">
              <span className="text-[11px] text-text-secondary">Vertical Placement</span>
              <div className="grid grid-cols-3 gap-1">
                {(['top', 'middle', 'bottom'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => update({ position: pos })}
                    id={`position-${pos}`}
                    className={`py-1 rounded text-[11px] capitalize border transition-colors ${
                      effectiveStyle.position === pos
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface-50 border-border text-text-secondary hover:bg-surface-150'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] text-text-secondary">Text Alignment</span>
              <div className="grid grid-cols-3 gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => update({ alignment: align })}
                    id={`alignment-${align}`}
                    className={`py-1 rounded text-[11px] capitalize border transition-colors ${
                      effectiveStyle.alignment === align
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface-50 border-border text-text-secondary hover:bg-surface-150'
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            <CompactSlider
              label="Vertical Offset from Edge"
              value={effectiveStyle.verticalOffsetPercent}
              onChange={(v) => update({ verticalOffsetPercent: v })}
              min={0}
              max={40}
              step={1}
              unit="%"
              id="vertical-offset-slider"
            />
          </div>
        )}
      </div>
    </div>
  );
}
