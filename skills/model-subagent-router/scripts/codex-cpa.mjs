import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// Read only the quoted scalar fields needed for an existing CPA provider.
// Unsupported TOML forms fail explicitly instead of guessing a credential.
export function scalar(section, key) {
  const match = section.match(new RegExp(`^\\s*${key}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|'[^']*')\\s*(?:#.*)?$`, 'm'));
  if (!match) return undefined;
  try { return match[1][0] === '"' ? JSON.parse(match[1]) : match[1].slice(1, -1); }
  catch { throw new Error(`Unsupported quoted value for ${key}; configure CPA environment variables instead.`); }
}

export function loadProvider(env = process.env) {
  if (env.CPA_BASE_URL || env.CPA_API_KEY) {
    if (!env.CPA_BASE_URL || !env.CPA_API_KEY) throw new Error('Set both CPA_BASE_URL and CPA_API_KEY.');
    return validateProvider({ baseUrl: env.CPA_BASE_URL, key: env.CPA_API_KEY });
  }
  const codexHome = env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const config = fs.readFileSync(path.join(codexHome, 'config.toml'), 'utf8').replace(/^\uFEFF/, '');
  const provider = scalar(config.split(/^\s*\[/m)[0], 'model_provider');
  if (!provider || !/^[\w-]+$/.test(provider)) throw new Error('No supported current Codex provider; set CPA_BASE_URL and CPA_API_KEY.');
  const heading = `[model_providers.${provider}]`;
  const start = config.indexOf(heading);
  if (start < 0) throw new Error('Current provider section is missing.');
  const section = config.slice(start + heading.length).split(/^\s*\[/m)[0];
  const baseUrl = scalar(section, 'base_url');
  if (scalar(section, 'wire_api') !== 'responses') throw new Error('Codex CPA route requires wire_api=responses.');
  const envKey = scalar(section, 'env_key');
  let key = scalar(section, 'experimental_bearer_token') || (envKey && env[envKey]);
  if (!key && /^\s*requires_openai_auth\s*=\s*true\s*(?:#.*)?$/m.test(section)) {
    try { key = JSON.parse(fs.readFileSync(path.join(codexHome, 'auth.json'), 'utf8')).OPENAI_API_KEY; } catch {}
  }
  return validateProvider({ baseUrl, key });
}

export function validateProvider(provider) {
  if (!provider.baseUrl || !provider.key) throw new Error('Existing CPA URL or credential unavailable; no configuration was changed.');
  const url = new URL(provider.baseUrl);
  if (url.username || url.password || url.search || url.hash) throw new Error('CPA URL must not contain credentials, query or fragment.');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('CPA requires HTTPS or local HTTP.');
  return { baseUrl: url.href.replace(/\/$/, ''), key: provider.key };
}

export async function listModels(provider) {
  const response = await fetch(`${provider.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${provider.key}` }, redirect: 'error', signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`CPA model directory HTTP ${response.status}`);
  const result = await response.json();
  if (!Array.isArray(result.data)) throw new Error('CPA returned no model directory.');
  return result.data.map(item => item.id).filter(id => typeof id === 'string').sort();
}

// Punctuation-only normalization; versions, suffixes and effort are never dropped.
export function resolveModel(requested, models) {
  if (models.includes(requested)) return requested;
  const norm = value => value.toLowerCase().replace(/[\s_.-]/g, '');
  const matches = models.filter(model => norm(model) === norm(requested));
  if (matches.length === 1) return matches[0];
  throw new Error(`Exact model unavailable or ambiguous: ${requested}. Inspect models; do not silently substitute.`);
}

function findCodex() {
  if (process.env.CODEX_BIN) return { command: process.env.CODEX_BIN, prefix: [] };
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    const binary = path.join(dir, process.platform === 'win32' ? 'codex.exe' : 'codex');
    if (fs.existsSync(binary)) return { command: binary, prefix: [] };
    const npmEntry = path.join(dir, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (fs.existsSync(npmEntry)) return { command: process.execPath, prefix: [npmEntry] };
  }
  throw new Error('Codex CLI unavailable. Install it or set CODEX_BIN to its executable.');
}

export function childEnvironment(env = process.env) {
  const allowed = new Set(['PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMDATA', 'SYSTEMDRIVE', 'LANG', 'LC_ALL', 'TERM', 'CODEX_HOME']);
  return Object.fromEntries(Object.entries(env).filter(([key]) => allowed.has(key.toUpperCase())));
}

export function terminateChild(child, platform = process.platform, spawnProcess = spawn) {
  if (!child.pid) return;
  const fallback = () => { try { child.kill('SIGKILL'); } catch {} };
  if (platform === 'win32') {
    const killer = spawnProcess('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore', shell: false });
    killer.on('error', fallback);
    killer.on('close', code => { if (code !== 0) fallback(); });
  } else { try { process.kill(-child.pid, 'SIGKILL'); } catch { fallback(); } }
}

export function parseEvents(stdout) {
  const events = stdout.split(/\r?\n/).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
  const messages = events.filter(event => event.type === 'item.completed' && event.item?.type === 'agent_message').map(event => event.item.text);
  return {
    completed: events.some(event => event.type === 'turn.completed'),
    failed: events.some(event => event.type === 'turn.failed' || event.type === 'error'),
    finalText: messages.at(-1) || '',
    toolCalls: events.filter(event => event.type === 'item.completed' && ['command_execution', 'mcp_tool_call', 'file_change'].includes(event.item?.type)).map(event => event.item),
    usage: events.findLast(event => event.type === 'turn.completed')?.usage,
  };
}

export function buildArgs({ model, cwd, baseUrl, access = 'read-only', effort }) {
  if (!['read-only', 'workspace-write'].includes(access)) throw new Error('Unsupported access; sandbox bypass is not offered.');
  const args = ['exec', '--ignore-user-config', '--ephemeral', '--json', '--color', 'never', '--skip-git-repo-check',
    '-C', cwd, '-s', access, '-m', model,
    '-c', 'model_provider="cpa_subagent"',
    '-c', 'model_providers.cpa_subagent.name="CPA subagent"',
    '-c', `model_providers.cpa_subagent.base_url=${JSON.stringify(baseUrl)}`,
    '-c', 'model_providers.cpa_subagent.wire_api="responses"',
    '-c', 'model_providers.cpa_subagent.env_key="CPA_SUBAGENT_API_KEY"',
    '-c', 'shell_environment_policy.inherit="none"',
    '-c', 'model_providers.cpa_subagent.request_max_retries=0',
    '-c', 'model_providers.cpa_subagent.stream_max_retries=0'];
  if (effort) {
    if (!/^[a-z]+$/.test(effort)) throw new Error('Invalid effort.');
    args.push('-c', `model_reasoning_effort=${JSON.stringify(effort)}`);
  }
  args.push('-');
  return args;
}

export async function run(options, provider, model) {
  const cwd = path.resolve(options.cwd);
  if (!fs.statSync(cwd).isDirectory()) throw new Error('cwd is not a directory.');
  const prompt = fs.readFileSync(options['prompt-file'], 'utf8');
  if (!prompt.trim()) throw new Error('Prompt file is empty.');
  const outDir = path.resolve(options['out-dir']);
  fs.mkdirSync(outDir, { recursive: true });
  const timeout = Number(options.timeout || 180);
  if (!Number.isFinite(timeout) || timeout < 5 || timeout > 1800) throw new Error('Timeout must be 5..1800 seconds.');
  const executable = findCodex();
  const args = buildArgs({ model, cwd, baseUrl: provider.baseUrl, access: options.access, effort: options.effort });
  const started = new Date().toISOString();
  const stdoutFile = path.join(outDir, 'stdout.jsonl');
  const stderrFile = path.join(outDir, 'stderr.txt');
  const resultFile = path.join(outDir, 'result.json');
  for (const file of [stdoutFile, stderrFile, resultFile]) if (fs.existsSync(file)) throw new Error('Output files already exist; use a new out-dir.');
  // Logs stay local; redact the actual key even if an upstream error echoes it.
  let stdout = '', stderr = '', timedOut = false, processError, terminationFailed = false, forcedTimer;
  const child = spawn(executable.command, [...executable.prefix, ...args], {
    cwd, shell: false, windowsHide: true, detached: process.platform !== 'win32',
    env: { ...childEnvironment(), CPA_SUBAGENT_API_KEY: provider.key }, stdio: ['pipe', 'pipe', 'pipe'],
  });
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  child.stdin.on('error', () => {});
  child.stdin.end(prompt);
  let timer;
  const exitCode = await new Promise(resolve => {
    child.on('error', error => { processError = error.code || 'SPAWN_FAILED'; resolve(null); });
    child.on('close', code => resolve(code));
    timer = setTimeout(() => {
      timedOut = true;
      terminateChild(child);
      forcedTimer = setTimeout(() => {
        terminationFailed = true;
        child.stdout.destroy(); child.stderr.destroy(); child.stdin.destroy(); child.unref();
        resolve(null);
      }, 5000);
    }, timeout * 1000);
  });
  clearTimeout(timer); clearTimeout(forcedTimer);
  const redact = text => text.split(provider.key).join('[REDACTED]');
  stdout = redact(stdout); stderr = redact(stderr);
  fs.writeFileSync(stdoutFile, stdout); fs.writeFileSync(stderrFile, stderr);
  const parsed = parseEvents(stdout);
  const result = { route: 'codex-cli-child', requestedModel: options.model, model, cwd, started, ended: new Date().toISOString(),
    exitCode, timedOut, processError, terminationFailed, pid: child.pid,
    processCompleted: !timedOut && exitCode === 0 && parsed.completed && !parsed.failed && !!parsed.finalText,
    acceptanceVerified: false, finalText: parsed.finalText, toolCalls: parsed.toolCalls, usage: parsed.usage,
    evidence: { stdoutFile, stderrFile } };
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!['models', 'run'].includes(command)) throw new Error('Usage: node codex-cpa.mjs models | run --model ID --cwd DIR --prompt-file FILE --out-dir DIR [--access read-only|workspace-write] [--timeout 180] [--effort high]');
  const options = {};
  const allowed = new Set(['model', 'cwd', 'prompt-file', 'out-dir', 'access', 'timeout', 'effort']);
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || !allowed.has(key) || !args[i + 1] || options[key]) throw new Error('Invalid or duplicate option.');
    options[key] = args[i + 1];
  }
  const provider = loadProvider();
  const models = await listModels(provider);
  if (command === 'models') { console.log(JSON.stringify({ models }, null, 2)); return; }
  for (const key of ['model', 'cwd', 'prompt-file', 'out-dir']) if (!options[key]) throw new Error(`Missing --${key}`);
  const model = resolveModel(options.model, models);
  const result = await run(options, provider, model);
  console.log(JSON.stringify(result, null, 2));
  if (!result.processCompleted) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
