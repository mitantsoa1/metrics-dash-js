import { test } from 'node:test';
import assert from 'node:assert/strict';

// Two copies of the module, as in the index and react bundles.
const copyA = await import('./sharedClient.ts?copy=a');
const copyB = await import('./sharedClient.ts?copy=b');

test('un client posé par une copie du paquet est vu par l\'autre copie', () => {
  const client = { trackEvent() {} };
  copyA.setSharedClient(client);
  assert.equal(copyB.getSharedClient(), client);
});

test('destroy (null) est vu par les deux copies', () => {
  copyA.setSharedClient(null);
  assert.equal(copyB.getSharedClient(), null);
});
