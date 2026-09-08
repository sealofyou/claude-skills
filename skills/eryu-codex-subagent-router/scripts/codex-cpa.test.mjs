import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { scalar, resolveModel, validateProvider, buildArgs, loadProvider, childEnvironment, runtimeEnvironment, parseEvents, terminateChild } from './codex-cpa.mjs';

test('normalization preserves version and meaningful suffixes', () => {
  assert.equal(resolveModel('grok4.6', ['grok-4.6']), 'grok-4.6');
  assert.throws(() => resolveModel('gemini3.8flash', ['gemini-3.8-flash-high']));
  assert.throws(() => resolveModel('grok4.6', ['grok-4.6', 'grok_4.6']));
  assert.throws(() => resolveModel('kimi-k3', ['kimi-k3-256k']));
});
test('provider rejects partial credentials and unsafe URLs', () => {
  assert.throws(() => loadProvider({ CPA_BASE_URL: 'https://example.com/v1' }));
  assert.throws(() => validateProvider({ baseUrl: 'https://example.com/v1?key=value', key: 'test' }));
  assert.throws(() => validateProvider({ baseUrl: 'http://example.com/v1', key: 'test' }));
  assert.equal(validateProvider({ baseUrl: 'http://localhost:8080/v1/', key: 'test' }).baseUrl, 'http://localhost:8080/v1');
});
test('CLI keeps sandbox and no credential in argv', () => {
  const args = buildArgs({ model: 'grok-4.6', cwd: '/tmp/test', baseUrl: 'https://example.com/v1' });
  assert.ok(args.includes('read-only'));
  assert.ok(args.includes('--ignore-user-config'));
  assert.ok(args.includes('model_providers.cpa_subagent.env_key="CPA_SUBAGENT_API_KEY"'));
  assert.ok(args.includes('shell_environment_policy.inherit="none"'));
  assert.ok(!args.some(arg => arg.includes('bypass')));
  assert.throws(() => buildArgs({ access: 'danger-full-access' }));
});
test('unrelated credentials are removed from child environment', () => {
  const env = childEnvironment({ Path: 'bin', SystemRoot: 'Windows', TEMP: 'temp', CODEX_HOME: 'config', AWS_SECRET_ACCESS_KEY: 'secret', GITHUB_TOKEN: 'secret', PRIVATE_FOO: 'secret', NODE_OPTIONS: '--require untrusted.js' });
  assert.deepEqual(env, { Path: 'bin', SystemRoot: 'Windows', TEMP: 'temp', CODEX_HOME: 'config' });
});
test('runtime profile does not inherit host configuration discovery paths', () => {
  const env = runtimeEnvironment('task-output', 'test-key', { HOME: 'host-home', USERPROFILE: 'host-profile', CODEX_HOME: 'host-codex', APPDATA: 'host-appdata', LOCALAPPDATA: 'host-local', PATH: 'bin', GITHUB_TOKEN: 'private' });
  assert.ok(env.CODEX_HOME.includes('runtime-profile'));
  assert.equal(env.HOME, env.USERPROFILE);
  assert.ok(!Object.values(env).some(value => value.startsWith('host-')));
  assert.equal(env.GITHUB_TOKEN, undefined);
  assert.equal(env.CPA_SUBAGENT_API_KEY, 'test-key');
});
test('JSONL completion distinguishes output, errors and tool evidence', () => {
  const parsed = parseEvents('noise\n' + [
    { type: 'item.completed', item: { type: 'command_execution', exit_code: 0 } },
    { type: 'item.completed', item: { type: 'agent_message', text: 'result' } },
    { type: 'turn.completed', usage: { input_tokens: 10 } },
  ].map(x => JSON.stringify(x)).join('\n'));
  assert.equal(parsed.completed, true); assert.equal(parsed.failed, false);
  assert.equal(parsed.finalText, 'result'); assert.equal(parsed.toolCalls.length, 1);
  assert.equal(parseEvents('{"type":"turn.failed"}').failed, true);
  assert.equal(parseEvents('{"type":"turn.completed"}').finalText, '');
  assert.equal(parseEvents('truncated').completed, false);
});
test('Windows termination falls back if taskkill fails', () => {
  let killed = 0;
  const child = { pid: 12345, kill: () => killed++ };
  const killer = new EventEmitter();
  terminateChild(child, 'win32', () => killer);
  killer.emit('close', 1);
  assert.equal(killed, 1);
  killer.emit('error', new Error('unavailable'));
  assert.equal(killed, 2);
});
test('quoted TOML scalar parsing does not execute content', () => {
  assert.equal(scalar('model = "grok-4.6" # comment', 'model'), 'grok-4.6');
  assert.equal(scalar("model = '$(literal)'", 'model'), '$(literal)');
  assert.equal(scalar('model = unsupported', 'model'), undefined);
});
