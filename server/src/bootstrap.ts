import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../common';

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  try {
    const settings = await strapi.plugin(PLUGIN_ID).service('settings').getSettings();

    if (settings.enabled) {
      strapi.log.info(`[${PLUGIN_ID}] Plugin enabled with sender: ${settings.defaultFrom}`);
    } else {
      strapi.log.info(`[${PLUGIN_ID}] Plugin disabled - emails will be logged to console`);
    }
  } catch (error) {
    strapi.log.warn(`[${PLUGIN_ID}] Failed to load settings during bootstrap: ${(error as Error).message}`);
  }
};

export default bootstrap;
