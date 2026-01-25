interface SubwayLineProps {
  line: string;
  size?: 'sm' | 'md' | 'lg';
}

// Official MTA colors for subway lines
const lineColors: Record<string, string> = {
  '1': '#EE352E',
  '2': '#EE352E',
  '3': '#EE352E',
  '4': '#00933C',
  '5': '#00933C',
  '6': '#00933C',
  '6X': '#00933C',
  '7': '#B933AD',
  '7X': '#B933AD',
  'A': '#0039A6',
  'C': '#0039A6',
  'E': '#0039A6',
  'B': '#FF6319',
  'D': '#FF6319',
  'F': '#FF6319',
  'FX': '#FF6319',
  'M': '#FF6319',
  'G': '#6CBE45',
  'J': '#996633',
  'Z': '#996633',
  'L': '#A7A9AC',
  'N': '#FCCC0A',
  'Q': '#FCCC0A',
  'R': '#FCCC0A',
  'W': '#FCCC0A',
  'S': '#808183',
  'SIR': '#0039A6',
};

// Lines that need dark text
const darkTextLines = ['N', 'Q', 'R', 'W'];

export function SubwayLine({ line, size = 'md' }: SubwayLineProps) {
  const color = lineColors[line] || '#808183';
  const textColor = darkTextLines.includes(line) ? '#000000' : '#FFFFFF';

  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold`}
      style={{ backgroundColor: color, color: textColor }}
    >
      {line.replace('X', '')}
    </div>
  );
}
