import { MEMBERSHIP_LEVELS, REGIONS } from '@mentor-tree/domain';
import { useMemo } from 'react';
import { useMemberStyles } from '../appearance/AppearanceContext';
import { findYearColorScale } from '../appearance/memberAppearance';
import { useApplication, useTranslations } from '../state/ApplicationContext';

const GRADIENT_ID = 'legend-year-gradient';
const SWATCH_RADIUS = 5;

function Swatch({ color }: { color: string | null }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      {color === null ? (
        <circle cx="7" cy="7" r={SWATCH_RADIUS} fill="none" stroke="#8C8C8C" strokeWidth="1.2" />
      ) : (
        <circle cx="7" cy="7" r={SWATCH_RADIUS} fill={color} />
      )}
    </svg>
  );
}

/** Bottom-left key to the current color mode; absent in the uniform mode (SPEC 7.8). */
export function ColorLegend() {
  const { state, index } = useApplication();
  const translations = useTranslations();
  const memberStyles = useMemberStyles();
  const { colorMode } = state.settings;
  const { colors } = index.document.settings;
  const yearScale = useMemo(() => findYearColorScale(index), [index]);
  const hasMissingData = useMemo(
    () => [...memberStyles.values()].some((style) => style.fillColor === null),
    [memberStyles],
  );
  if (colorMode === 'uniform') return null;

  return (
    <aside
      className="legend"
      aria-label={translations.legendLabel}
      data-testid="color-legend"
      data-color-mode={colorMode}
    >
      {colorMode === 'programYear' && yearScale && (
        <div className="legend__gradient">
          <svg width="140" height="10" aria-hidden="true">
            <defs>
              <linearGradient id={GRADIENT_ID}>
                <stop offset="0" stopColor={yearScale.oldestColor} />
                <stop offset="1" stopColor={yearScale.newestColor} />
              </linearGradient>
            </defs>
            <rect width="140" height="10" rx="5" fill={`url(#${GRADIENT_ID})`} />
          </svg>
          <div className="legend__years">
            <span>{yearScale.oldestYear}</span>
            <span>{yearScale.newestYear}</span>
          </div>
        </div>
      )}
      {colorMode === 'region' &&
        REGIONS.map((region) => (
          <div key={region} className="legend__item">
            <Swatch color={colors.region[region]} />
            {translations.regions[region]}
          </div>
        ))}
      {colorMode === 'level' &&
        MEMBERSHIP_LEVELS.map((level) => (
          <div key={level} className="legend__item">
            <Swatch color={colors.level[level]} />
            {translations.levels[level]}
          </div>
        ))}
      {hasMissingData && (
        <div className="legend__item">
          <Swatch color={null} />
          {colorMode === 'programYear' ? translations.noProgramYear : translations.legendNoData}
        </div>
      )}
    </aside>
  );
}
