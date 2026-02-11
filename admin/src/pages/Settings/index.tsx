import { Page } from '@strapi/strapi/admin';
import { permissions } from '../../../../common';
import SettingsPage from './Settings';

const SettingsPageWrapper = () => {
  return (
    <Page.Protect
      permissions={[{ action: permissions.render(permissions.settings.read), subject: null }]}
    >
      <SettingsPage />
    </Page.Protect>
  );
};

export default SettingsPageWrapper;
