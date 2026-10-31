// Replaces %MIABI_VERSION%-style tokens in prose and code blocks with the
// stable releases published on versions.miabi.io, read once per build.

const INDEX_URL = 'https://versions.miabi.io/v1/index.json';

// Used when versions.miabi.io can't be reached, so an offline build still succeeds.
const FALLBACK = {
  MIABI_VERSION: '1.10.22',
  GATEWAY_VERSION: '1.2.0',
  AGENT_VERSION: '0.6.2',
  RUNNER_VERSION: '0.2.0',
  CLI_VERSION: '0.20.5',
};

const TOKEN = /%(MIABI|GATEWAY|AGENT|RUNNER|CLI)_VERSION%/g;

let versionsPromise;

async function fetchVersions() {
  try {
    const res = await fetch(INDEX_URL, {signal: AbortSignal.timeout(5000)});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const {components: c} = await res.json();
    const stable = (name) => c?.[name]?.stable?.version;
    const tested = c?.miabi?.stable?.components ?? {};
    return {
      MIABI_VERSION: stable('miabi') ?? FALLBACK.MIABI_VERSION,
      // The gateway and runner a Miabi release was tested with, not the newest ones.
      GATEWAY_VERSION: tested.gateway ?? stable('gateway') ?? FALLBACK.GATEWAY_VERSION,
      RUNNER_VERSION: tested.runner ?? stable('runner') ?? FALLBACK.RUNNER_VERSION,
      AGENT_VERSION: stable('agent') ?? FALLBACK.AGENT_VERSION,
      CLI_VERSION: stable('cli') ?? FALLBACK.CLI_VERSION,
    };
  } catch (err) {
    console.warn(`[miabi-versions] ${INDEX_URL} unreachable (${err.message}), using fallback versions`);
    return FALLBACK;
  }
}

function replaceTokens(node, versions) {
  if (typeof node.value === 'string' && ['text', 'inlineCode', 'code'].includes(node.type)) {
    node.value = node.value.replace(TOKEN, (match, name) => versions[`${name}_VERSION`] ?? match);
  }
  node.children?.forEach((child) => replaceTokens(child, versions));
}

export default function miabiVersions() {
  return async (tree) => {
    versionsPromise ??= fetchVersions();
    replaceTokens(tree, await versionsPromise);
  };
}
