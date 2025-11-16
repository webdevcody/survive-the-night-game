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

export function resolveStackedLabelY(centerX: number, width: number, baseY: number): number {
  let y = baseY;
  let steps = 0;

  while (steps < MAX_RESOLVE_STEPS) {
    const overlappingBox = labelBoxes.find((box) => overlaps(box, centerX, width, y));
    if (!overlappingBox) {
      break;
    }

    const direction = centerX >= overlappingBox.centerX ? 1 : -1;
    y += direction * STACK_LINE_HEIGHT;
    steps += 1;
  }

  labelBoxes.push({ centerX, width, y });
  return y;
}
