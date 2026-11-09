// PU-31 : batching. Lancer : npm test
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BeaconTransport } from './beaconTransport.ts';

const config = {
  publicSdkKey: 'pk_live_test',
  host: 'http://api.test',
  autoPageview: true,
  autoClick: true,
  autoForm: true,
  autoTime: true,
  inactivityThresholdSeconds: 30,
  bounceTimeThresholdSeconds: 10,
  batchIntervalMs: 5000,
  batchSize: 10,
  verifyKey: false,
  debug: false,
};

const evt = (n: number) => ({ event_type: 'click', timestamp: new Date(n).toISOString(), n });

function harness(fetchImpl: (url: string, init: any) => Promise<{ ok: boolean; status: number }>) {
  const calls: { url: string; body: any }[] = [];
  const beacons: any[] = [];
  let tick: () => void = () => {};
  let interval = 0;
  const transport = new BeaconTransport(config as any, 'v1', 's1', {
    fetch: (async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return fetchImpl(url, init);
    }) as any,
    sendBeacon: (url, blob) => {
      beacons.push({ url, blob });
      return true;
    },
    setInterval: (fn, ms) => {
      tick = fn;
      interval = ms;
      return 1;
    },
    clearInterval: () => {},
    setTimeout: (fn) => {
      fn(); // pas d'attente réelle entre les deux tentatives
      return 0;
    },
  });
  return { transport, calls, beacons, tick: () => tick(), interval: () => interval };
}

const ok = async () => ({ ok: true, status: 202 });
const settle = () => new Promise((r) => setImmediate(r));

test("un lot part dès 10 événements, dans l'ordre", async () => {
  const h = harness(ok);
  for (let i = 1; i <= 9; i++) h.transport.enqueue(evt(i));
  await settle();
  assert.equal(h.calls.length, 0, 'rien avant 10');

  h.transport.enqueue(evt(10));
  await settle();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].body.events.map((e: any) => e.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(h.calls[0].body.public_sdk_key, 'pk_live_test');
  assert.equal(h.calls[0].url, 'http://api.test/api/v1/ingest/sdk');
});

test('un lot partiel part au bout de 5 secondes', async () => {
  const h = harness(ok);
  assert.equal(h.interval(), 5000);
  h.transport.enqueue(evt(1));
  h.transport.enqueue(evt(2));
  h.tick();
  await settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].body.events.length, 2);
  assert.equal(h.transport.pending, 0);
});

test("sendBeacon n'est utilisé qu'à la fermeture de page, pas pour un envoi normal", async () => {
  const h = harness(ok);
  h.transport.enqueue(evt(1));
  h.tick();
  await settle();
  assert.equal(h.beacons.length, 0, 'envoi normal = fetch');

  h.transport.enqueue(evt(2));
  h.transport.flushOnUnload();
  assert.equal(h.beacons.length, 1, 'fermeture = sendBeacon');
  assert.equal(h.calls.length, 1, 'pas de fetch supplémentaire');
  assert.equal(h.transport.pending, 0);
});

test('un lot en échec est retenté une fois puis abandonné', async () => {
  let attempts = 0;
  const h = harness(async () => {
    attempts++;
    return { ok: false, status: 500 };
  });
  h.transport.enqueue(evt(1));
  h.tick();
  await settle();
  assert.equal(attempts, 2, 'envoi initial + une relance, pas plus');
  assert.equal(h.transport.pending, 0);
});

test('un échec transitoire est rattrapé par la relance (aucune perte)', async () => {
  let attempts = 0;
  const h = harness(async () => {
    attempts++;
    return attempts === 1 ? { ok: false, status: 503 } : { ok: true, status: 202 };
  });
  h.transport.enqueue(evt(1));
  h.tick();
  await settle();
  assert.equal(attempts, 2);
  assert.equal(h.calls[1].body.events[0].n, 1, 'même événement renvoyé');
});

test("pas d'envois concurrents", async () => {
  let release: () => void = () => {};
  const gate = new Promise<void>((r) => (release = r));
  const h = harness(async () => {
    await gate;
    return { ok: true, status: 202 };
  });
  h.transport.enqueue(evt(1));
  h.tick(); // envoi 1 en cours
  await settle();
  h.transport.enqueue(evt(2));
  h.tick(); // doit être ignoré tant que le 1er n'est pas terminé
  await settle();
  assert.equal(h.calls.length, 1);
  release();
  await settle();
  h.tick();
  await settle();
  assert.equal(h.calls.length, 2);
});

test('file bornée : les plus anciens sont écartés au-delà de 200', () => {
  const h = harness(() => new Promise(() => {})); // envoi jamais terminé
  for (let i = 1; i <= 260; i++) h.transport.enqueue(evt(i));
  assert.ok(h.transport.pending <= 200);
});

test('clé refusée (401) : envoi désactivé, plus aucun appel', async () => {
  const h = harness(async () => ({ ok: false, status: 401 }));
  h.transport.enqueue(evt(1));
  h.tick();
  await settle();
  const before = h.calls.length;
  h.transport.enqueue(evt(2));
  h.tick();
  await settle();
  assert.equal(h.calls.length, before);
});
