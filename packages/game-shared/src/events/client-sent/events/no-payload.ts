// Events with no payload - empty buffer is sufficient
export function serialize(_args: any[]): ArrayBuffer | null {
  return new ArrayBuffer(0);
}

export function deserialize(_buffer: ArrayBuffer): any[] | null {
  return [];
}

