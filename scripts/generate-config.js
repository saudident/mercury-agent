#!/usr/bin/env node
/**
 * generate-config.js
 *
 * Generates ~/.mercury/mercury.yaml from environment variables before Mercury
 * starts, so the interactive setup wizard is skipped entirely. If the config
 * file already exists this script exits immediately, preserving any state
 * (approved Telegram users, paired devices, etc.) written at runtime.
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { stringify as stringifyYaml } from 'yaml';

const MERCURY_HOME = process.env.MERCURY_HOME || join(homedir(), '.mercury');
const CONFIG_PATH = join(MERCURY_HOME, 'mercury.yaml');

// Exit early if config already exists — don't overwrite runtime state.
if (existsSync(CONFIG_PATH)) {
  console.log(`☿ Config already exists at ${CONFIG_PATH}, skipping generation.`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function env(key, fallback = '') {
  return process.env[key] || fallback;
}

function envNum(key, fallback) {
  const val = process.env[key];
  return val ? parseInt(val, 10) : fallback;
}

function envBool(key, fallback) {
  const val = process.env[key]?.toLowerCase();
  if (val === 'true') return true;
  if (val === 'false') return false;
  return fallback;
}

// ---------------------------------------------------------------------------
// Validate required fields
// ---------------------------------------------------------------------------

const owner = env('MERCURY_OWNER');
if (!owner) {
  console.error('✗ MERCURY_OWNER environment variable is required but not set.');
  console.error('  Set it to the owner\'s name or identifier before starting Mercury.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Build config — mirrors getDefaultConfig() in src/utils/config.ts
// ---------------------------------------------------------------------------

const config = {
  identity: {
    name: env('MERCURY_NAME', 'Mercury'),
    owner,
    creator: env('MERCURY_CREATOR', 'Cosmic Stack'),
  },

  providers: {
    default: env('DEFAULT_PROVIDER', 'anthropic'),

    openai: {
      name: 'openai',
      apiKey: env('OPENAI_API_KEY'),
      baseUrl: env('OPENAI_BASE_URL', 'https://api.openai.com/v1'),
      model: env('OPENAI_MODEL', 'gpt-4o-mini'),
      enabled: envBool('OPENAI_ENABLED', true),
    },

    anthropic: {
      name: 'anthropic',
      apiKey: env('ANTHROPIC_API_KEY'),
      baseUrl: env('ANTHROPIC_BASE_URL', 'https://api.anthropic.com'),
      model: env('ANTHROPIC_MODEL', 'claude-sonnet-4-20250514'),
      enabled: envBool('ANTHROPIC_ENABLED', true),
    },

    deepseek: {
      name: 'deepseek',
      apiKey: env('DEEPSEEK_API_KEY'),
      baseUrl: env('DEEPSEEK_BASE_URL', 'https://api.deepseek.com/v1'),
      model: env('DEEPSEEK_MODEL', 'deepseek-chat'),
      enabled: envBool('DEEPSEEK_ENABLED', true),
    },

    grok: {
      name: 'grok',
      apiKey: env('GROK_API_KEY'),
      baseUrl: env('GROK_BASE_URL', 'https://api.x.ai/v1'),
      model: env('GROK_MODEL', 'grok-4'),
      enabled: envBool('GROK_ENABLED', true),
    },

    ollamaCloud: {
      name: 'ollamaCloud',
      apiKey: env('OLLAMA_CLOUD_API_KEY'),
      baseUrl: env('OLLAMA_CLOUD_BASE_URL', 'https://ollama.com/v1'),
      model: env('OLLAMA_CLOUD_MODEL', 'gpt-oss:120b'),
      enabled: envBool('OLLAMA_CLOUD_ENABLED', true),
    },

    ollamaLocal: {
      name: 'ollamaLocal',
      apiKey: '',
      baseUrl: env('OLLAMA_LOCAL_BASE_URL', 'http://127.0.0.1:11434/api'),
      model: env('OLLAMA_LOCAL_MODEL', ''),
      enabled: envBool('OLLAMA_LOCAL_ENABLED', false),
    },

    openaiCompat: {
      name: 'openaiCompat',
      apiKey: env('OPENAI_COMPAT_API_KEY'),
      baseUrl: env('OPENAI_COMPAT_BASE_URL', ''),
      model: env('OPENAI_COMPAT_MODEL', ''),
      enabled: envBool('OPENAI_COMPAT_ENABLED', false),
    },

    mimo: {
      name: 'mimo',
      apiKey: env('MIMO_API_KEY'),
      baseUrl: env('MIMO_BASE_URL', 'https://api.xiaomimimo.com/v1'),
      model: env('MIMO_MODEL', 'mimo-v2.5-pro'),
      enabled: envBool('MIMO_ENABLED', true),
    },

    mimoTokenPlan: {
      name: 'mimoTokenPlan',
      apiKey: env('MIMO_TOKEN_PLAN_API_KEY'),
      baseUrl: env('MIMO_TOKEN_PLAN_BASE_URL', 'https://token-plan-cn.xiaomimimo.com/v1'),
      model: env('MIMO_TOKEN_PLAN_MODEL', 'mimo-v2.5-pro'),
      enabled: envBool('MIMO_TOKEN_PLAN_ENABLED', false),
    },

    chatgptWeb: {
      name: 'chatgptWeb',
      apiKey: '',
      baseUrl: 'https://chatgpt.com/backend-api',
      model: env('CHATGPT_WEB_MODEL', 'gpt-5.4-mini'),
      enabled: envBool('CHATGPT_WEB_ENABLED', false),
    },

    githubCopilot: {
      name: 'githubCopilot',
      apiKey: '',
      baseUrl: '',
      model: env('GITHUB_COPILOT_MODEL', 'gpt-4o'),
      enabled: envBool('GITHUB_COPILOT_ENABLED', false),
    },
  },

  channels: {
    telegram: {
      enabled: envBool('TELEGRAM_ENABLED', true),
      botToken: env('TELEGRAM_BOT_TOKEN'),
      webhookUrl: env('TELEGRAM_WEBHOOK_URL'),
      allowedChatIds: env('TELEGRAM_ALLOWED_CHAT_IDS')
        .split(',')
        .filter(Boolean)
        .map(Number),
      streaming: envBool('TELEGRAM_STREAMING', true),
      admins: [],
      members: [],
      pending: [],
    },
  },

  github: {
    username: env('GITHUB_USERNAME'),
    email: env('GITHUB_EMAIL', 'mercury@cosmicstack.org'),
    defaultOwner: env('GITHUB_DEFAULT_OWNER'),
    defaultRepo: env('GITHUB_DEFAULT_REPO'),
  },

  memory: {
    shortTermMaxMessages: envNum('SHORT_TERM_MAX_MESSAGES', 20),
    secondBrain: {
      enabled: envBool('SECOND_BRAIN_ENABLED', true),
      maxRecords: envNum('SECOND_BRAIN_MAX_RECORDS', 50),
    },
  },

  heartbeat: {
    intervalMinutes: envNum('HEARTBEAT_INTERVAL_MINUTES', 60),
  },

  tokens: {
    dailyBudget: envNum('DAILY_TOKEN_BUDGET', 1_000_000),
  },

  subagents: {
    enabled: envBool('SUBAGENTS_ENABLED', true),
    maxConcurrent: envNum('SUBAGENTS_MAX_CONCURRENT', 0),
    mode: env('SUBAGENTS_MODE', 'auto'),
  },

  spotify: {
    enabled: envBool('SPOTIFY_ENABLED', false),
    clientId: env('SPOTIFY_CLIENT_ID'),
    clientSecret: env('SPOTIFY_CLIENT_SECRET'),
    redirectUri: env('SPOTIFY_REDIRECT_URI', 'http://127.0.0.1:8888/callback'),
    accessToken: '',
    refreshToken: '',
    expiresAt: '',
    scopes: [],
    deviceId: '',
    accountName: '',
    accountId: '',
    product: '',
  },
};

// ---------------------------------------------------------------------------
// Write config
// ---------------------------------------------------------------------------

if (!existsSync(MERCURY_HOME)) {
  mkdirSync(MERCURY_HOME, { recursive: true });
}

writeFileSync(CONFIG_PATH, stringifyYaml(config), 'utf-8');
console.log(`☿ Config written to ${CONFIG_PATH}`);
