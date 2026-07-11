import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Miabi',
  tagline: 'The open-source, self-hosted Platform-as-a-Service for Docker',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.miabi.io',
  baseUrl: '/',

  organizationName: 'miabi-io',
  projectName: 'miabi',

  onBrokenLinks: 'warn',

  // Screenshots are added later (see static/img/screenshots/README.md), so a
  // missing image should warn rather than fail the build.
  markdown: {
    hooks: {
      onBrokenMarkdownImages: 'warn',
    },
  },

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
          editUrl: 'https://github.com/miabi-io/miabi-docs/tree/main/',
          routeBasePath: 'docs',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/miabi-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Miabi',
      logo: {
        alt: 'Miabi Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-white.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/miabi-io/miabi',
          label: 'API Reference',
          position: 'left',
        },
        {
          href: 'https://github.com/miabi-io/miabi',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Introduction', to: '/docs/getting-started/introduction'},
            {label: 'Installation', to: '/docs/getting-started/installation'},
            {label: 'API Reference', href: 'https://github.com/miabi-io/miabi'},
          ],
        },
        {
          title: 'Features',
          items: [
            {label: 'Applications', to: '/docs/applications/overview'},
            {label: 'Domains & TLS', to: '/docs/networking/domains'},
            {label: 'Databases', to: '/docs/databases/overview'},
            {label: 'Marketplace', to: '/docs/marketplace/overview'},
          ],
        },
        {
          title: 'Ecosystem',
          items: [
            {label: 'GitHub', href: 'https://github.com/miabi-io/miabi'},
            {label: 'Goma Gateway', href: 'https://github.com/jkaninda/goma-gateway'},
            {label: 'Posta', href: 'https://github.com/goposta/posta'},
            {label: 'Okapi', href: 'https://github.com/jkaninda/okapi'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Jonas Kaninda. Community edition licensed under AGPL-3.0-or-later.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'go', 'yaml', 'toml', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
