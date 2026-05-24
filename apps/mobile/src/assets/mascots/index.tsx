// @ts-nocheck
/**
 * SVG Mascot System — Duolingo-style cute characters
 *
 * 5 mascot types × 5 evolution stages:
 *   Level 1: Egg/seed (tiny, minimal features)
 *   Level 2: Baby (small, big eyes, simple body)
 *   Level 3: Teen (medium, more detail, accessories)
 *   Level 4: Adult (full-size, confident pose, items)
 *   Level 5: Master (large, crown/glow, special effects)
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
} from 'react-native-svg';

// ─── Types ───────────────────────────────────────────────────────
export type MascotSize = 'small' | 'medium' | 'large';

const SIZE_PX = { small: 64, medium: 88, large: 120 };

interface MascotProps {
  size: MascotSize;
  level?: number; // 1-5, controls evolution stage
  mood?: 'happy' | 'sad' | 'sleeping' | 'excited'; // optional mood
}

// ─── Helpers ─────────────────────────────────────────────────────
function wrap(px: number, children: React.ReactNode) {
  return (
    <View style={[styles.container, { width: px, height: px }]}>
      <Svg width={px} height={px} viewBox="0 0 120 120">
        {children}
      </Svg>
    </View>
  );
}

function getStage(level?: number): number {
  return Math.min(Math.max(level || 1, 1), 5);
}

// ─── Shared parts ────────────────────────────────────────────────
function Eyes({ cx, cy, size, mood }: { cx: number; cy: number; size: number; mood?: string }) {
  const r = size;
  if (mood === 'sleeping') {
    // Closed eyes — two small arcs
    return (
      <G>
        <Path d={`M${cx - r * 1.2},${cy} Q${cx},${cy - r * 1.5} ${cx + r * 1.2},${cy}`} stroke="#333" strokeWidth={1.5} fill="none" />
      </G>
    );
  }
  if (mood === 'sad') {
    return (
      <G>
        <Circle cx={cx} cy={cy} r={r} fill="#333" />
        <Circle cx={cx + r * 0.3} cy={cy - r * 0.3} r={r * 0.35} fill="#FFF" />
      </G>
    );
  }
  // Happy / excited — big shiny eyes (Duolingo style)
  const pupilR = mood === 'excited' ? r * 0.6 : r * 0.5;
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill="#333" />
      <Circle cx={cx + r * 0.25} cy={cy - r * 0.25} r={r * 0.4} fill="#FFF" />
      <Circle cx={cx - r * 0.2} cy={cy + r * 0.15} r={r * 0.18} fill="rgba(255,255,255,0.5)" />
    </G>
  );
}

function Crown({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Path
        d={`M${cx - 14},${cy} L${cx - 10},${cy - 14} L${cx - 3},${cy - 6} L${cx},${cy - 16} L${cx + 3},${cy - 6} L${cx + 10},${cy - 14} L${cx + 14},${cy} Z`}
        fill="#FFD700"
        stroke="#FFA000"
        strokeWidth={1}
      />
      <Circle cx={cx} cy={cy - 13} r={2} fill="#FF5252" />
      <Circle cx={cx - 9} cy={cy - 11} r={1.5} fill="#448AFF" />
      <Circle cx={cx + 9} cy={cy - 11} r={1.5} fill="#69F0AE" />
    </G>
  );
}

function Blush({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return <Ellipse cx={cx} cy={cy} rx={r} ry={r * 0.6} fill="rgba(255,100,100,0.25)" />;
}

function Egg({ color1, color2, px }: { color1: string; color2: string; px: number }) {
  return wrap(px, (
    <G>
      <Defs>
        <LinearGradient id="egg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color1} />
          <Stop offset="1" stopColor={color2} />
        </LinearGradient>
      </Defs>
      {/* Egg shape */}
      <Path
        d="M60,20 C80,20 95,45 95,70 C95,95 80,105 60,105 C40,105 25,95 25,70 C25,45 40,20 60,20 Z"
        fill="url(#egg)"
      />
      {/* Crack line */}
      <Path
        d="M38,60 L45,55 L50,62 L58,54 L65,60 L72,54 L80,60"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth={2}
        fill="none"
      />
      {/* Eyes peeking */}
      <Eyes cx={48} cy={75} size={4} mood="happy" />
      <Eyes cx={72} cy={75} size={4} mood="happy" />
    </G>
  ));
}

// ─── CAT ─────────────────────────────────────────────────────────
export function CatMascot({ size, level, mood = 'happy' }: MascotProps) {
  const px = SIZE_PX[size];
  const stage = getStage(level);

  if (stage === 1) return <Egg color1="#FFCC80" color2="#FF9800" px={px} />;

  return wrap(px, (
    <G>
      <Defs>
        <LinearGradient id="catBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB74D" />
          <Stop offset="1" stopColor="#FF9800" />
        </LinearGradient>
        <RadialGradient id="catBelly" cx="50%" cy="50%">
          <Stop offset="0" stopColor="#FFF3E0" />
          <Stop offset="1" stopColor="#FFE0B2" />
        </RadialGradient>
      </Defs>

      {/* Tail */}
      {stage >= 3 && (
        <Path
          d="M85,80 C100,70 105,50 95,40"
          stroke="#FF9800"
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Body */}
      <Ellipse cx={60} cy={72} rx={stage >= 4 ? 30 : 25} ry={stage >= 4 ? 35 : 28} fill="url(#catBody)" />

      {/* Belly */}
      <Ellipse cx={60} cy={78} rx={16} ry={stage >= 3 ? 20 : 15} fill="url(#catBelly)" />

      {/* Head */}
      <Circle cx={60} cy={stage >= 3 ? 38 : 42} r={stage >= 4 ? 26 : 22} fill="url(#catBody)" />

      {/* Ears */}
      <Path d="M40,25 L35,8 L50,20 Z" fill="#FF9800" />
      <Path d="M80,25 L85,8 L70,20 Z" fill="#FF9800" />
      <Path d="M42,23 L39,12 L49,21 Z" fill="#FFE0B2" />
      <Path d="M78,23 L81,12 L71,21 Z" fill="#FFE0B2" />

      {/* Eyes */}
      <Eyes cx={50} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 5 : 4} mood={mood} />
      <Eyes cx={70} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 5 : 4} mood={mood} />

      {/* Nose */}
      <Path d={`M58,${stage >= 3 ? 44 : 48} L60,${stage >= 3 ? 46 : 50} L62,${stage >= 3 ? 44 : 48}`} fill="#E65100" />

      {/* Mouth */}
      <Path d={`M55,${stage >= 3 ? 48 : 52} Q60,${stage >= 3 ? 52 : 56} 65,${stage >= 3 ? 48 : 52}`} stroke="#8D6E63" strokeWidth={1.2} fill="none" />

      {/* Whiskers */}
      {stage >= 3 && (
        <G>
          <Path d="M30,40 L46,42" stroke="#8D6E63" strokeWidth={0.8} />
          <Path d="M30,46 L46,45" stroke="#8D6E63" strokeWidth={0.8} />
          <Path d="M90,40 L74,42" stroke="#8D6E63" strokeWidth={0.8} />
          <Path d="M90,46 L74,45" stroke="#8D6E63" strokeWidth={0.8} />
        </G>
      )}

      {/* Blush */}
      <Blush cx={42} cy={stage >= 3 ? 44 : 48} r={5} />
      <Blush cx={78} cy={stage >= 3 ? 44 : 48} r={5} />

      {/* Stage 4+: Small fork/spoon accessory */}
      {stage >= 4 && (
        <G>
          <Path d="M22,55 L22,85" stroke="#78909C" strokeWidth={2} strokeLinecap="round" />
          <Circle cx={22} cy={52} r={4} fill="none" stroke="#78909C" strokeWidth={1.5} />
        </G>
      )}

      {/* Stage 5: Crown */}
      {stage >= 5 && <Crown cx={60} cy={stage >= 3 ? 16 : 22} />}
    </G>
  ));
}

// ─── DOG ─────────────────────────────────────────────────────────
export function DogMascot({ size, level, mood = 'happy' }: MascotProps) {
  const px = SIZE_PX[size];
  const stage = getStage(level);

  if (stage === 1) return <Egg color1="#D7CCC8" color2="#8D6E63" px={px} />;

  return wrap(px, (
    <G>
      <Defs>
        <LinearGradient id="dogBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#A1887F" />
          <Stop offset="1" stopColor="#8D6E63" />
        </LinearGradient>
        <RadialGradient id="dogBelly" cx="50%" cy="50%">
          <Stop offset="0" stopColor="#EFEBE9" />
          <Stop offset="1" stopColor="#D7CCC8" />
        </RadialGradient>
      </Defs>

      {/* Tail */}
      {stage >= 3 && (
        <Path
          d="M88,70 C100,55 98,40 90,35"
          stroke="#8D6E63"
          strokeWidth={6}
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Body */}
      <Ellipse cx={60} cy={74} rx={stage >= 4 ? 30 : 25} ry={stage >= 4 ? 33 : 26} fill="url(#dogBody)" />
      <Ellipse cx={60} cy={78} rx={16} ry={stage >= 3 ? 18 : 14} fill="url(#dogBelly)" />

      {/* Head */}
      <Circle cx={60} cy={stage >= 3 ? 40 : 44} r={stage >= 4 ? 25 : 21} fill="url(#dogBody)" />

      {/* Floppy ears */}
      <Ellipse cx={36} cy={stage >= 3 ? 42 : 46} rx={10} ry={16} fill="#795548" transform={`rotate(-15, 36, ${stage >= 3 ? 42 : 46})`} />
      <Ellipse cx={84} cy={stage >= 3 ? 42 : 46} rx={10} ry={16} fill="#795548" transform={`rotate(15, 84, ${stage >= 3 ? 42 : 46})`} />

      {/* Muzzle */}
      <Ellipse cx={60} cy={stage >= 3 ? 48 : 52} rx={12} ry={8} fill="#EFEBE9" />

      {/* Eyes */}
      <Eyes cx={50} cy={stage >= 3 ? 37 : 41} size={stage >= 4 ? 5 : 4} mood={mood} />
      <Eyes cx={70} cy={stage >= 3 ? 37 : 41} size={stage >= 4 ? 5 : 4} mood={mood} />

      {/* Nose */}
      <Ellipse cx={60} cy={stage >= 3 ? 46 : 50} rx={4} ry={3} fill="#333" />

      {/* Mouth */}
      <Path d={`M54,${stage >= 3 ? 50 : 54} Q60,${stage >= 3 ? 55 : 59} 66,${stage >= 3 ? 50 : 54}`} stroke="#795548" strokeWidth={1.2} fill="none" />

      {/* Tongue (excited) */}
      {mood === 'excited' && (
        <Ellipse cx={60} cy={stage >= 3 ? 56 : 60} rx={4} ry={5} fill="#FF8A80" />
      )}

      {/* Blush */}
      <Blush cx={42} cy={stage >= 3 ? 45 : 49} r={5} />
      <Blush cx={78} cy={stage >= 3 ? 45 : 49} r={5} />

      {/* Stage 4: Bowl */}
      {stage >= 4 && (
        <G>
          <Path d="M15,90 Q15,100 28,100 L28,100 Q15,100 15,90" fill="#FF7043" />
          <Ellipse cx={22} cy={90} rx={8} ry={3} fill="#FF7043" />
          <Ellipse cx={22} cy={90} rx={6} ry={2} fill="#FFAB91" />
        </G>
      )}

      {/* Stage 5: Crown */}
      {stage >= 5 && <Crown cx={60} cy={stage >= 3 ? 18 : 24} />}
    </G>
  ));
}

// ─── PANDA ───────────────────────────────────────────────────────
export function PandaMascot({ size, level, mood = 'happy' }: MascotProps) {
  const px = SIZE_PX[size];
  const stage = getStage(level);

  if (stage === 1) return <Egg color1="#E8F5E9" color2="#66BB6A" px={px} />;

  return wrap(px, (
    <G>
      <Defs>
        <RadialGradient id="pandaBody" cx="50%" cy="40%">
          <Stop offset="0" stopColor="#FAFAFA" />
          <Stop offset="1" stopColor="#E0E0E0" />
        </RadialGradient>
      </Defs>

      {/* Body */}
      <Ellipse cx={60} cy={74} rx={stage >= 4 ? 30 : 24} ry={stage >= 4 ? 34 : 27} fill="url(#pandaBody)" />

      {/* Black arms */}
      {stage >= 3 && (
        <G>
          <Ellipse cx={32} cy={72} rx={8} ry={12} fill="#424242" transform="rotate(-10, 32, 72)" />
          <Ellipse cx={88} cy={72} rx={8} ry={12} fill="#424242" transform="rotate(10, 88, 72)" />
        </G>
      )}

      {/* Belly with leaf pattern */}
      <Ellipse cx={60} cy={80} rx={16} ry={16} fill="#F1F8E9" />
      {stage >= 3 && (
        <Path d="M56,78 Q60,70 64,78 Q60,74 56,78 Z" fill="#81C784" />
      )}

      {/* Head */}
      <Circle cx={60} cy={stage >= 3 ? 38 : 42} r={stage >= 4 ? 25 : 22} fill="url(#pandaBody)" />

      {/* Ears */}
      <Circle cx={38} cy={stage >= 3 ? 22 : 26} r={10} fill="#424242" />
      <Circle cx={82} cy={stage >= 3 ? 22 : 26} r={10} fill="#424242" />

      {/* Eye patches */}
      <Ellipse cx={48} cy={stage >= 3 ? 37 : 41} rx={10} ry={8} fill="#424242" transform={`rotate(-5, 48, ${stage >= 3 ? 37 : 41})`} />
      <Ellipse cx={72} cy={stage >= 3 ? 37 : 41} rx={10} ry={8} fill="#424242" transform={`rotate(5, 72, ${stage >= 3 ? 37 : 41})`} />

      {/* Eyes */}
      <Eyes cx={48} cy={stage >= 3 ? 37 : 41} size={stage >= 4 ? 4.5 : 3.5} mood={mood} />
      <Eyes cx={72} cy={stage >= 3 ? 37 : 41} size={stage >= 4 ? 4.5 : 3.5} mood={mood} />

      {/* Nose */}
      <Ellipse cx={60} cy={stage >= 3 ? 46 : 50} rx={3.5} ry={2.5} fill="#333" />

      {/* Mouth */}
      <Path d={`M55,${stage >= 3 ? 49 : 53} Q60,${stage >= 3 ? 53 : 57} 65,${stage >= 3 ? 49 : 53}`} stroke="#666" strokeWidth={1} fill="none" />

      {/* Blush */}
      <Blush cx={40} cy={stage >= 3 ? 46 : 50} r={5} />
      <Blush cx={80} cy={stage >= 3 ? 46 : 50} r={5} />

      {/* Stage 4: Bamboo stick */}
      {stage >= 4 && (
        <G>
          <Path d="M92,30 L92,95" stroke="#66BB6A" strokeWidth={3} strokeLinecap="round" />
          <Path d="M92,40 L100,34" stroke="#66BB6A" strokeWidth={2} strokeLinecap="round" />
          <Path d="M92,55 L100,49" stroke="#66BB6A" strokeWidth={2} strokeLinecap="round" />
          <Ellipse cx={101} cy={32} rx={5} ry={3} fill="#81C784" transform="rotate(-20, 101, 32)" />
          <Ellipse cx={101} cy={47} rx={5} ry={3} fill="#81C784" transform="rotate(-20, 101, 47)" />
        </G>
      )}

      {/* Stage 5: Crown */}
      {stage >= 5 && <Crown cx={60} cy={stage >= 3 ? 16 : 22} />}
    </G>
  ));
}

// ─── FOX ─────────────────────────────────────────────────────────
export function FoxMascot({ size, level, mood = 'happy' }: MascotProps) {
  const px = SIZE_PX[size];
  const stage = getStage(level);

  if (stage === 1) return <Egg color1="#FFCCBC" color2="#FF5722" px={px} />;

  return wrap(px, (
    <G>
      <Defs>
        <LinearGradient id="foxBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF7043" />
          <Stop offset="1" stopColor="#E64A19" />
        </LinearGradient>
      </Defs>

      {/* Tail */}
      {stage >= 3 && (
        <G>
          <Path
            d="M85,75 C105,60 108,40 95,30"
            stroke="#E64A19"
            strokeWidth={8}
            strokeLinecap="round"
            fill="none"
          />
          <Circle cx={95} cy={32} r={5} fill="#FAFAFA" />
        </G>
      )}

      {/* Body */}
      <Ellipse cx={60} cy={74} rx={stage >= 4 ? 28 : 24} ry={stage >= 4 ? 33 : 27} fill="url(#foxBody)" />
      <Ellipse cx={60} cy={80} rx={14} ry={16} fill="#FFF3E0" />

      {/* Head */}
      <Circle cx={60} cy={stage >= 3 ? 38 : 42} r={stage >= 4 ? 24 : 21} fill="url(#foxBody)" />

      {/* Pointed ears */}
      <Path d="M38,26 L30,4 L50,20 Z" fill="#E64A19" />
      <Path d="M82,26 L90,4 L70,20 Z" fill="#E64A19" />
      <Path d="M40,24 L34,10 L48,21 Z" fill="#FFCCBC" />
      <Path d="M80,24 L86,10 L72,21 Z" fill="#FFCCBC" />

      {/* White face mask */}
      <Path d={`M46,${stage >= 3 ? 38 : 42} Q60,${stage >= 3 ? 56 : 60} 74,${stage >= 3 ? 38 : 42} L60,${stage >= 3 ? 52 : 56} Z`} fill="#FFF3E0" />

      {/* Eyes */}
      <Eyes cx={49} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 4.5 : 3.5} mood={mood} />
      <Eyes cx={71} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 4.5 : 3.5} mood={mood} />

      {/* Nose */}
      <Ellipse cx={60} cy={stage >= 3 ? 46 : 50} rx={3} ry={2.5} fill="#333" />

      {/* Mouth */}
      <Path d={`M55,${stage >= 3 ? 49 : 53} Q60,${stage >= 3 ? 53 : 57} 65,${stage >= 3 ? 49 : 53}`} stroke="#BF360C" strokeWidth={1} fill="none" />

      {/* Blush */}
      <Blush cx={40} cy={stage >= 3 ? 44 : 48} r={5} />
      <Blush cx={80} cy={stage >= 3 ? 44 : 48} r={5} />

      {/* Stage 4: Berry */}
      {stage >= 4 && (
        <G>
          <Circle cx={20} cy={85} r={6} fill="#E53935" />
          <Circle cx={20} cy={85} r={4.5} fill="#EF5350" />
          <Path d="M20,79 L19,75 M20,79 L22,76" stroke="#4CAF50" strokeWidth={1.2} />
        </G>
      )}

      {/* Stage 5: Crown */}
      {stage >= 5 && <Crown cx={60} cy={stage >= 3 ? 16 : 22} />}
    </G>
  ));
}

// ─── ROBOT ───────────────────────────────────────────────────────
export function RobotMascot({ size, level, mood = 'happy' }: MascotProps) {
  const px = SIZE_PX[size];
  const stage = getStage(level);

  if (stage === 1) return <Egg color1="#BBDEFB" color2="#1976D2" px={px} />;

  return wrap(px, (
    <G>
      <Defs>
        <LinearGradient id="robotBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#64B5F6" />
          <Stop offset="1" stopColor="#1E88E5" />
        </LinearGradient>
        <LinearGradient id="robotScreen" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E3F2FD" />
          <Stop offset="1" stopColor="#BBDEFB" />
        </LinearGradient>
      </Defs>

      {/* Antenna */}
      <Path d={`M60,${stage >= 3 ? 14 : 20} L60,${stage >= 3 ? 6 : 12}`} stroke="#90CAF9" strokeWidth={2} />
      <Circle cx={60} cy={stage >= 3 ? 4 : 10} r={3} fill="#FF5252" />

      {/* Body */}
      <Path
        d={`M${60 - (stage >= 4 ? 26 : 22)},60
            L${60 - (stage >= 4 ? 26 : 22)},${stage >= 4 ? 100 : 95}
            Q${60 - (stage >= 4 ? 26 : 22)},${stage >= 4 ? 108 : 103} 60,${stage >= 4 ? 108 : 103}
            Q${60 + (stage >= 4 ? 26 : 22)},${stage >= 4 ? 108 : 103} ${60 + (stage >= 4 ? 26 : 22)},${stage >= 4 ? 100 : 95}
            L${60 + (stage >= 4 ? 26 : 22)},60 Z`}
        fill="url(#robotBody)"
      />

      {/* Chest screen */}
      <Path
        d={`M46,65 L74,65 Q76,65 76,67 L76,85 Q76,87 74,87 L46,87 Q44,87 44,85 L44,67 Q44,65 46,65`}
        fill="url(#robotScreen)"
      />
      {/* Heart on screen */}
      <Path
        d="M55,73 C55,70 58,70 60,72 C62,70 65,70 65,73 C65,77 60,80 60,80 C60,80 55,77 55,73"
        fill="#4CAF50"
      />

      {/* Head */}
      <Path
        d={`M${60 - (stage >= 4 ? 24 : 20)},${stage >= 3 ? 18 : 24}
            L${60 + (stage >= 4 ? 24 : 20)},${stage >= 3 ? 18 : 24}
            Q${60 + (stage >= 4 ? 24 : 20) + 2},${stage >= 3 ? 18 : 24} ${60 + (stage >= 4 ? 24 : 20) + 2},${(stage >= 3 ? 18 : 24) + 2}
            L${60 + (stage >= 4 ? 24 : 20) + 2},${stage >= 3 ? 54 : 56}
            Q${60 + (stage >= 4 ? 24 : 20) + 2},${(stage >= 3 ? 54 : 56) + 2} ${60 + (stage >= 4 ? 24 : 20)},${(stage >= 3 ? 54 : 56) + 2}
            L${60 - (stage >= 4 ? 24 : 20)},${(stage >= 3 ? 54 : 56) + 2}
            Q${60 - (stage >= 4 ? 24 : 20) - 2},${(stage >= 3 ? 54 : 56) + 2} ${60 - (stage >= 4 ? 24 : 20) - 2},${stage >= 3 ? 54 : 56}
            L${60 - (stage >= 4 ? 24 : 20) - 2},${(stage >= 3 ? 18 : 24) + 2}
            Q${60 - (stage >= 4 ? 24 : 20) - 2},${stage >= 3 ? 18 : 24} ${60 - (stage >= 4 ? 24 : 20)},${stage >= 3 ? 18 : 24} Z`}
        fill="url(#robotBody)"
      />

      {/* Face plate */}
      <Path
        d={`M42,${stage >= 3 ? 25 : 31} L78,${stage >= 3 ? 25 : 31} Q80,${stage >= 3 ? 25 : 31} 80,${(stage >= 3 ? 25 : 31) + 2} L80,${stage >= 3 ? 48 : 51} Q80,${(stage >= 3 ? 48 : 51) + 2} 78,${(stage >= 3 ? 48 : 51) + 2} L42,${(stage >= 3 ? 48 : 51) + 2} Q40,${(stage >= 3 ? 48 : 51) + 2} 40,${stage >= 3 ? 48 : 51} L40,${(stage >= 3 ? 25 : 31) + 2} Q40,${stage >= 3 ? 25 : 31} 42,${stage >= 3 ? 25 : 31} Z`}
        fill="url(#robotScreen)"
      />

      {/* Eyes */}
      <Eyes cx={50} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 5 : 4} mood={mood} />
      <Eyes cx={70} cy={stage >= 3 ? 36 : 40} size={stage >= 4 ? 5 : 4} mood={mood} />

      {/* Mouth — LED smile */}
      <Path d={`M50,${stage >= 3 ? 46 : 49} L54,${stage >= 3 ? 48 : 51} L58,${stage >= 3 ? 46 : 49} L62,${stage >= 3 ? 48 : 51} L66,${stage >= 3 ? 46 : 49} L70,${stage >= 3 ? 48 : 51}`} stroke="#4CAF50" strokeWidth={1.5} fill="none" />

      {/* Arms */}
      {stage >= 3 && (
        <G>
          <Path d="M34,65 L26,80" stroke="#42A5F5" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={25} cy={82} r={4} fill="#42A5F5" />
          <Path d="M86,65 L94,80" stroke="#42A5F5" strokeWidth={4} strokeLinecap="round" />
          <Circle cx={95} cy={82} r={4} fill="#42A5F5" />
        </G>
      )}

      {/* Blush */}
      <Blush cx={42} cy={stage >= 3 ? 44 : 48} r={4} />
      <Blush cx={78} cy={stage >= 3 ? 44 : 48} r={4} />

      {/* Stage 5: Crown */}
      {stage >= 5 && <Crown cx={60} cy={stage >= 3 ? 10 : 18} />}
    </G>
  ));
}

// ─── Exports ─────────────────────────────────────────────────────
export const MASCOT_COMPONENTS = {
  CAT: CatMascot,
  DOG: DogMascot,
  PANDA: PandaMascot,
  FOX: FoxMascot,
  ROBOT: RobotMascot,
} as const;

export const MASCOT_LIST = [
  { type: 'CAT' as const, label: 'Cat', color: '#FF9800' },
  { type: 'DOG' as const, label: 'Dog', color: '#8D6E63' },
  { type: 'PANDA' as const, label: 'Panda', color: '#66BB6A' },
  { type: 'FOX' as const, label: 'Fox', color: '#FF5722' },
  { type: 'ROBOT' as const, label: 'Robot', color: '#1E88E5' },
];

export const MASCOT_COLORS = {
  CAT: { primary: '#FF9800', light: '#FFF3E0' },
  DOG: { primary: '#8D6E63', light: '#EFEBE9' },
  PANDA: { primary: '#66BB6A', light: '#E8F5E9' },
  FOX: { primary: '#FF5722', light: '#FBE9E7' },
  ROBOT: { primary: '#1E88E5', light: '#E3F2FD' },
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
