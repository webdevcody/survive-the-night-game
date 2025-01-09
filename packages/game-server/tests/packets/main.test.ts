import { Packet } from "../../src/network";
import { expect, test } from "vitest";

const Vector = Packet.create({
  x: "uint32",
  y: "uint32",
});

const Collection = Packet.create({
  list: [Vector],
});

const Dead = Packet.create({
  lastDead: "uint32",
});

const Alive = Packet.create({
  lifetime: "uint32",
});

const Player = Packet.create({
  select: [Dead, Alive],
});

test("check vector", () => {
  const vector = Vector.create({
    x: 5,
    y: 5,
  });

  // decode to buffer
  const buffer = Vector.decode(vector);
  expect(buffer).toEqual(new Uint8Array([0, 0, 0, 5, 0, 0, 0, 5]));

  // encode to packet
  const packet = Vector.encode(buffer);

  // check data
  expect(packet.data).toEqual({ x: 5, y: 5 });

  // check type
  expect(packet.type).toBe(Vector);
});

test("check array vector", () => {
  const collection = Collection.create({
    list: [
      Vector.create({ x: 100, y: 100 }),
      Vector.create({ x: 200, y: 200 }),
      Vector.create({ x: 255, y: 255 }),
    ],
  });

  // decode to buffer
  const buffer = Collection.decode(collection);
  expect(buffer).toEqual(
    new Uint8Array([
      3, 0, 0, 0, 100, 0, 0, 0, 100, 0, 0, 0, 200, 0, 0, 0, 200, 0, 0, 0, 255, 0, 0, 0, 255,
    ])
  );

  // encode to packet
  const packet = Collection.encode(buffer);

  //check data
  expect(packet.toJSON()).toEqual({
    list: [
      { x: 100, y: 100 },
      { x: 200, y: 200 },
      { x: 255, y: 255 },
    ],
  });

  //check type
  expect(packet.type).toBe(Collection);

  const dataJson = packet.toJSON();

  // check index = 0
  expect(dataJson.list[0].x).toBe(100);
  expect(dataJson.list[0].y).toBe(100);

  // check index = 1
  expect(dataJson.list[1].x).toBe(200);
  expect(dataJson.list[1].y).toBe(200);

  // check index = 2
  expect(dataJson.list[2].x).toBe(255);
  expect(dataJson.list[2].y).toBe(255);
});

test("check enum", () => {
  const player = Player.create({
    select: Alive.create(),
  });

  // decode to buffer
  const buffer = Player.decode(player);
  expect(buffer).toEqual(new Uint8Array([1, 0, 0, 0, 0]));

  // encode to packet
  const packet = Player.encode(buffer);

  // check type
  expect(packet.type).toBe(Player);
});
