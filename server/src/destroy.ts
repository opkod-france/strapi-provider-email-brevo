import type { Core } from '@strapi/strapi';
import { clearApiInstance } from './services/email';

const destroy = ({ strapi }: { strapi: Core.Strapi }) => {
  clearApiInstance();
};

export default destroy;
