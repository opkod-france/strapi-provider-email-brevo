import type { StrapiApp } from '@strapi/strapi/admin';
import { PLUGIN_ID, permissions } from '../../common';
import trads from './translations';

export default {
  register(app: StrapiApp) {
    app.addSettingsLink('global', {
      id: PLUGIN_ID,
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.section.item`,
        defaultMessage: 'Brevo Email',
      },
      to: PLUGIN_ID,
      Component: () => import('./pages/Settings'),
      permissions: [
        { action: permissions.render(permissions.settings.read), subject: null },
      ],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: PLUGIN_ID,
    });
  },

  bootstrap() {},

  async registerTrads({ locales }: { locales: string[] }) {
    return Promise.all(
      locales.map(async (locale) => {
        if (locale in trads) {
          const typedLocale = locale as keyof typeof trads;
          return trads[typedLocale]().then(({ default: trad }) => {
            return { data: trad, locale };
          });
        }
        return {
          data: {},
          locale,
        };
      })
    );
  },
};
