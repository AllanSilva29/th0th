import fs from "fs";
import path from "path";
import os from "os";
import { Th0thConfig, defaultTh0thConfig } from "./th0th-config";

const CONFIG_DIR = path.join(os.homedir(), ".config", "th0th");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function configExists(): boolean {
  return fs.existsSync(CONFIG_FILE);
}

export function loadConfig(): Th0thConfig {
  if (!fs.existsSync(CONFIG_FILE)) {
    return defaultTh0thConfig;
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, "utf-8");
    const userConfig = JSON.parse(content);
    
    return {
      ...defaultTh0thConfig,
      ...userConfig,
      embedding: { ...defaultTh0thConfig.embedding, ...userConfig.embedding },
      compression: { ...defaultTh0thConfig.compression, ...userConfig.compression },
      cache: { ...defaultTh0thConfig.cache, ...userConfig.cache },
      logging: { ...defaultTh0thConfig.logging, ...userConfig.logging },
    };
  } catch (error) {
    console.error(`Error loading config from ${CONFIG_FILE}:`, error);
    return defaultTh0thConfig;
  }
}

export function saveConfig(config: Th0thConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function initConfig(): void {
  if (!fs.existsSync(CONFIG_FILE)) {
    saveConfig(defaultTh0thConfig);
    console.log(`Created default config at ${CONFIG_FILE}`);
  }
}

export function getConfigForEnv(): Record<string, string> {
  const config = loadConfig();
  const env: Record<string, string> = {};

  if (config.embedding.provider === "ollama") {
    env.OLLAMA_EMBEDDING_MODEL = config.embedding.model;
    env.OLLAMA_BASE_URL = config.embedding.baseURL || "http://localhost:11434";
    if (config.embedding.dimensions) {
      env.OLLAMA_EMBEDDING_DIMENSIONS = String(config.embedding.dimensions);
    }
  } else if (config.embedding.provider === "mistral") {
    env.MISTRAL_API_KEY = config.embedding.apiKey || "";
    env.MISTRAL_TEXT_EMBEDDING_MODEL = config.embedding.model;
  } else if (config.embedding.provider === "openai") {
    env.OPENAI_API_KEY = config.embedding.apiKey || "";
    env.OPENAI_EMBEDDING_MODEL = config.embedding.model;
  }

  env.LOG_LEVEL = config.logging.level;
  env.ENABLE_METRICS = String(config.logging.enableMetrics);

  return env;
}
