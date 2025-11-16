type LabelBox = {
  centerX: number;
  width: number;
  y: number;
};

const LABEL_HEIGHT = 8;
const STACK_LINE_HEIGHT = 8;
const MAX_RESOLVE_STEPS = 8;

const labelBoxes: LabelBox[] = [];

export function beginTextStackFrame(): void {
  labelBoxes.length = 0;
}

function overlaps(box: LabelBox, centerX: number, width: number, y: number): boolean {
  const horizontalOverlap = Math.abs(centerX - box.centerX) < (width + box.width) / 2;
  const verticalOverlap = Math.abs(y - box.y) < LABEL_HEIGHT;
  return horizontalOverlap && verticalOverlap;
}

export function resolveStackedLabelY(
  centerX: number,
  width: number,
  baseY: number,
  preferUp: boolean = false
): number {
  const candidateOffsets: number[] = [0];

  for (let step = 1; step <= MAX_RESOLVE_STEPS; step += 1) {
    const offset = step * STACK_LINE_HEIGHT;
    if (preferUp) {
      candidateOffsets.push(-offset, offset);
    } else {
      candidateOffsets.push(offset, -offset);
    }
  }

  for (const offset of candidateOffsets) {
    const candidateY = baseY + offset;
    if (!labelBoxes.some((box) => overlaps(box, centerX, width, candidateY))) {
      labelBoxes.push({ centerX, width, y: candidateY });
      return candidateY;
    }
  }

  const fallbackY = baseY + (preferUp ? -MAX_RESOLVE_STEPS : MAX_RESOLVE_STEPS) * STACK_LINE_HEIGHT;
  labelBoxes.push({ centerX, width, y: fallbackY });
  return fallbackY;
}
