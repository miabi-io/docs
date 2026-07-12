import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/introduction',
        'getting-started/installation',
        'getting-started/configuration',
        'getting-started/quickstart',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/architecture',
        'concepts/web-console',
        'concepts/resource-model',
      ],
    },
    {
      type: 'category',
      label: 'Applications',
      items: [
        'applications/overview',
        'applications/deploy-from-git',
        'applications/deploy-from-image',
        'applications/environment-variables',
        'applications/releases-and-rollbacks',
        'applications/scaling-and-resources',
        'applications/gpus',
        'applications/jobs',
        'applications/stacks',
        'applications/environments',
        'applications/container-labels',
        'applications/logs-and-timeline',
      ],
    },
    {
      type: 'category',
      label: 'Domains, Networking & TLS',
      items: [
        'networking/domains',
        'networking/dns-providers',
        'networking/tls-certificates',
        'networking/routing-and-middlewares',
        'networking/reverse-proxy-and-traefik',
        'networking/port-forwarding',
        'networking/networks-and-subnets',
      ],
    },
    {
      type: 'category',
      label: 'Databases',
      items: [
        'databases/overview',
        'databases/provisioning',
        'databases/access-and-credentials',
        'databases/version-upgrades',
      ],
    },
    {
      type: 'category',
      label: 'Storage & Backups',
      items: [
        'storage/volumes',
        'storage/backups',
        'storage/backup-targets',
      ],
    },
    {
      type: 'category',
      label: 'Marketplace',
      items: [
        'marketplace/overview',
        'marketplace/using-templates',
        'marketplace/creating-a-template',
      ],
    },
    {
      type: 'category',
      label: 'Multi-node & Clustering',
      items: [
        'nodes/overview',
        'nodes/adding-a-node',
        'nodes/agent',
        'nodes/cluster-mode',
        'nodes/housekeeping',
        'nodes/docker-import',
      ],
    },
    {
      type: 'category',
      label: 'Container Registry',
      items: [
        'registry/overview',
        'registry/administration',
      ],
    },
    {
      type: 'category',
      label: 'CI/CD & GitOps',
      items: [
        'cicd/cli',
        'cicd/pipelines',
        'cicd/runners',
        'cicd/gitops',
        'cicd/git-push-deploy',
        'cicd/webhooks-and-notifications',
      ],
    },
    {
      type: 'category',
      label: 'Monitoring & Operations',
      items: [
        'operations/monitoring',
        'operations/log-storage',
        'operations/audit-log',
        'operations/platform-settings',
      ],
    },
    {
      type: 'category',
      label: 'Workspaces & Teams',
      items: [
        'workspaces/overview',
        'workspaces/members-and-invitations',
        'workspaces/organizations',
        'workspaces/roles-and-permissions',
        'workspaces/plans-and-quotas',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: [
        'security/authentication',
        'security/api-tokens',
        'security/two-factor-auth',
        'security/sso',
        'security/siem',
        'security/encryption',
        'security/container-security-profile',
      ],
    },
    {
      type: 'category',
      label: 'Administration',
      items: [
        'administration/platform-admin',
        'administration/nodes-and-capacity',
        'administration/upgrades',
      ],
    },
    {
      type: 'category',
      label: 'Editions & Licensing',
      items: [
        'editions/community-vs-enterprise',
        'editions/licensing',
      ],
    },
    {
      type: 'link',
      label: 'API Reference',
      href: 'https://demo.miabi.io/docs',
    },
  ],
};

export default sidebars;
