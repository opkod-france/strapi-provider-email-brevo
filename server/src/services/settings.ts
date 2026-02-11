import type { Core } from '@strapi/strapi';
import { PLUGIN_ID, Settings, DEFAULT_SETTINGS } from '../../../common';

function isConfigUsable(config: Partial<Settings> | undefined): boolean {
  if (!config) return false;
  return !!(config.apiKey?.trim() && config.defaultFrom?.trim());
}

function fillWithDefaults(candidate: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...candidate,
  };
}

const settingsService = ({ strapi }: { strapi: Core.Strapi }) => {
  function getPluginStore() {
    return strapi.store
      ? strapi.store({ type: 'plugin', name: PLUGIN_ID })
      : { get: async () => DEFAULT_SETTINGS, set: async () => {}, delete: async () => {} };
  }

  function getConfigFromFile(): Partial<Settings> {
    const plugin = strapi.plugin(PLUGIN_ID);
    if (!plugin) return {};

    return {
      enabled: plugin.config<boolean>('enabled'),
      apiKey: plugin.config<string>('apiKey'),
      defaultFrom: plugin.config<string>('defaultFrom'),
      defaultFromName: plugin.config<string>('defaultFromName'),
      defaultReplyTo: plugin.config<string>('defaultReplyTo'),
    };
  }

  async function getConfigFromDb(): Promise<Partial<Settings> | undefined> {
    try {
      return (await getPluginStore().get({ key: 'config' })) as Partial<Settings>;
    } catch (error) {
      strapi.log.warn(`[${PLUGIN_ID}] Failed to read settings from database: ${(error as Error).message}`);
      return undefined;
    }
  }

  async function getSettings(): Promise<Settings> {
    const dbCfg = await getConfigFromDb();
    if (isConfigUsable(dbCfg)) {
      return fillWithDefaults(dbCfg);
    }

    const fileCfg = getConfigFromFile();
    if (isConfigUsable(fileCfg)) {
      return fillWithDefaults(fileCfg);
    }

    return DEFAULT_SETTINGS;
  }

  async function updateSettings(settings: Settings): Promise<Settings> {
    const store = getPluginStore();
    await store.set({ key: 'config', value: settings });
    return getSettings();
  }

  return { getSettings, updateSettings };
};

export default settingsService;
