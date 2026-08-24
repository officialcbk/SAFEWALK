// Google Maps-style directional arrow icons for the active turn-by-turn step
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

export function ManeuverIcon({ type, modifier }: { type: string; modifier?: string }) {
  const props = { width: 28, height: 28, viewBox: '0 0 24 24', fill: 'none', stroke: 'white', strokeWidth: 2.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (type === 'arrive') {
    return (
      <Svg {...props}>
        <Path d="M12 2a7 7 0 0 1 7 7c0 4.9-7 13-7 13S5 13.9 5 9a7 7 0 0 1 7-7z" />
        <Circle cx={12} cy={9} r={2.5} fill="white" stroke="none" />
      </Svg>
    );
  }

  if (type === 'roundabout' || type === 'rotary') {
    return (
      <Svg {...props}>
        <Path d="M21.5 2v6h-6" /><Path d="M21.34 15.57a10 10 0 1 1-.57-8.38" />
      </Svg>
    );
  }

  if (type === 'turn' || type === 'end of road') {
    if (modifier === 'uturn') {
      return (
        <Svg {...props}>
          <Path d="M9 14 4 9l5-5" /><Path d="M4 9h9a4 4 0 0 1 0 8H5" />
        </Svg>
      );
    }
    if (modifier === 'sharp left' || modifier === 'left') {
      return (
        <Svg {...props}>
          <Polyline points="9 14 4 9 9 4" />
          <Path d="M20 20v-7a4 4 0 0 0-4-4H4" />
        </Svg>
      );
    }
    if (modifier === 'slight left') {
      return (
        <Svg {...props}>
          <Path d="M5 19 12 5l7 14" /><Path d="M12 5v14" />
          <Polyline points="8 15 5 19 11 19" />
        </Svg>
      );
    }
    if (modifier === 'sharp right' || modifier === 'right') {
      return (
        <Svg {...props}>
          <Polyline points="15 14 20 9 15 4" />
          <Path d="M4 20v-7a4 4 0 0 1 4-4h12" />
        </Svg>
      );
    }
    if (modifier === 'slight right') {
      return (
        <Svg {...props}>
          <Polyline points="16 15 19 19 13 19" />
          <Path d="M4 19 12 5l7 14" />
          <Path d="M12 5v14" />
        </Svg>
      );
    }
  }

  // straight / depart / continue / default
  return (
    <Svg {...props}>
      <Path d="M12 19V5" /><Polyline points="5 12 12 5 19 12" />
    </Svg>
  );
}
