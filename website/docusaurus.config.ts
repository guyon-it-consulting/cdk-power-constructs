import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'CDK Power Constructs',
  tagline: 'Reusable AWS CDK constructs for common infrastructure patterns',
  favicon: 'img/favicon.ico',

  url: 'https://guyon-it-consulting.github.io',
  baseUrl: process.env.BASE_URL || '/',

  organizationName: 'guyon-it-consulting',
  projectName: 'cdk-power-constructs',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/guyon-it-consulting/cdk-power-constructs/tree/main/website/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'CDK Power Constructs',
      logo: {
        alt: 'CDK Power Constructs Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          label: 'API Reference',
          position: 'left',
          items: [
            {
              label: 'TypeScript API',
              to: '/api/typescript/',
            },
            {
              label: 'Python API',
              href: 'https://pypi.org/project/cdk-power-constructs/',
            },
          ],
        },
        {
          href: 'https://github.com/guyon-it-consulting/cdk-power-constructs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'TypeScript API',
              to: '/api/typescript/',
            },
          ],
        },
        {
          title: 'Packages',
          items: [
            {
              label: 'npm',
              href: 'https://www.npmjs.com/package/cdk-power-constructs',
            },
            {
              label: 'PyPI',
              href: 'https://pypi.org/project/cdk-power-constructs/',
            },
            {
              label: 'Maven Central',
              href: 'https://search.maven.org/artifact/fr.guyon-it-consulting/cdk-power-constructs',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/guyon-it-consulting/cdk-power-constructs',
            },
            {
              label: 'Guyon IT Consulting',
              href: 'https://guyon-it-consulting.fr',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Jérôme GUYON. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'python', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
