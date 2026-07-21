import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { workerStatusLabel } from '../src/jobs/worker-control-state';

describe('workerStatusLabel', () => {
  it('reports stopped when the dashboard switch is off and no process is active', () => {
    assert.equal(workerStatusLabel({ desiredEnabled: false, processRunning: false, activeCycle: false }), 'Parado');
  });

  it('reports running when the dashboard switch is on and the loop is waiting for the next cycle', () => {
    assert.equal(workerStatusLabel({ desiredEnabled: true, processRunning: true, activeCycle: false }), 'Rodando');
  });

  it('reports executing when a cycle is active', () => {
    assert.equal(workerStatusLabel({ desiredEnabled: true, processRunning: true, activeCycle: true }), 'Executando ciclo');
  });

  it('reports stopping when a cycle is active after the dashboard switch was turned off', () => {
    assert.equal(workerStatusLabel({ desiredEnabled: false, processRunning: true, activeCycle: true }), 'Parando após ciclo atual');
  });
});
