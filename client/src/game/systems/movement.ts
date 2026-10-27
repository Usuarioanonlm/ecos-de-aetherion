export type MovementPoint = { x: number; y: number };

export type OccupancyOptions = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  radius?: number;
  isBlocked: (x: number, y: number) => boolean;
};

export const canOccupy = (
  point: MovementPoint,
  options: OccupancyOptions
): boolean => {
  const radius = options.radius ?? 0;
  if (
    point.x - radius < options.minX ||
    point.x + radius > options.maxX ||
    point.y - radius < options.minY ||
    point.y + radius > options.maxY
  )
    return false;
  const samples = [
    point,
    { x: point.x - radius, y: point.y },
    { x: point.x + radius, y: point.y },
    { x: point.x, y: point.y - radius },
    { x: point.x, y: point.y + radius },
  ];
  return samples.every(
    sample => !options.isBlocked(Math.round(sample.x), Math.round(sample.y))
  );
};

export const moveWithCollision = (
  current: MovementPoint,
  velocity: MovementPoint,
  delta: number,
  options: OccupancyOptions
): MovementPoint => {
  const next = { x: current.x, y: current.y };
  const dx = velocity.x * Math.max(0, delta);
  const dy = velocity.y * Math.max(0, delta);
  const steps = Math.max(
    1,
    Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.25)
  );
  for (let step = 0; step < steps; step += 1) {
    const horizontal = { x: next.x + dx / steps, y: next.y };
    if (canOccupy(horizontal, options)) next.x = horizontal.x;
    const vertical = { x: next.x, y: next.y + dy / steps };
    if (canOccupy(vertical, options)) next.y = vertical.y;
  }
  return next;
};
