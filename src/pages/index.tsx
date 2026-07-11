import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';

import styles from './index.module.css';

const GITHUB_URL = 'https://github.com/miabi-io/miabi';

const INSTALL_EXAMPLE = `curl -fsSL https://raw.githubusercontent.com/miabi-io/miabi/main/deploy/install.sh \\
  | sudo bash`;

const INSTALL_NOTE = `# Then open your domain and register —
# the first account becomes the platform admin.
# Create a workspace, deploy an app, attach a
# domain, and get automatic SSL. No Docker
# commands, no CLI required.`;

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={clsx('container', styles.heroInner)}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          Open Source &amp; Self-Hosted
        </span>

        <Heading as="h1" className={styles.heroTitle}>
          The Self-Hosted{' '}
          <span className={styles.gradientText}>PaaS for Docker</span>
        </Heading>

        <p className={styles.heroSubtitle}>
          Your own Heroku, on your own server. Push an app — from a Git repo, a
          Docker image, or a marketplace template — and Miabi handles build,
          deploy, domains, automatic SSL, databases, scaling, backups, and
          monitoring. All from one web interface, in minutes.
        </p>

        <div className={styles.buttons}>
          <Link
            className="button button--primary button--lg"
            to="/docs/getting-started/introduction">
            Get Started
          </Link>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started/quickstart">
            Quick Start
          </Link>
          <Link
            className={clsx('button button--secondary button--outline button--lg', styles.githubButton)}
            href={GITHUB_URL}>
            <svg className={styles.githubIcon} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub
          </Link>
        </div>

        <div className={styles.stats}>
          {[
            {value: 'API-First', label: 'Every feature is an API'},
            {value: 'Docker', label: 'Single & multi-node'},
            {value: 'Multi-Tenant', label: 'Workspaces + RBAC'},
            {value: 'AGPL-3.0', label: 'Open core'},
          ].map((stat) => (
            <div key={stat.value} className={styles.statItem}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

function QuickStart() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>One-line install</p>
          <Heading as="h2" className={styles.sectionTitle}>
            From a fresh server to a running PaaS
          </Heading>
          <p className={styles.sectionLead}>
            The installer adds Docker if needed, fetches the production stack,
            generates secrets, and brings everything up behind Goma Gateway with
            automatic TLS.
          </p>
        </div>

        <div className={styles.codeColumns}>
          <CodeBlock language="bash" title="Install Miabi">
            {INSTALL_EXAMPLE}
          </CodeBlock>
          <CodeBlock language="bash" title="What happens next">
            {INSTALL_NOTE}
          </CodeBlock>
        </div>

        <div className={styles.codeCta}>
          <Link to="/docs/getting-started/installation">
            Read the full installation guide →
          </Link>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {
  title: string;
  description: string;
  link: string;
};

const FEATURES: FeatureItem[] = [
  {
    title: 'Applications & Deployments',
    description: 'Deploy from Git, a Docker image, or a template. Builds, releases, one-click rollback, zero-downtime updates, and per-app resource limits.',
    link: '/docs/applications/overview',
  },
  {
    title: 'Domains, Networking & TLS',
    description: 'DNS-verified domains, routing through Goma Gateway, automatic HTTP-01 SSL, and managed wildcard / DNS-01 certificates.',
    link: '/docs/networking/domains',
  },
  {
    title: 'Databases',
    description: 'Provision PostgreSQL, MySQL, MariaDB, Redis, and MongoDB with managed credentials and in-place version upgrades.',
    link: '/docs/databases/overview',
  },
  {
    title: 'Storage & Backups',
    description: 'Persistent volumes plus scheduled and manual database and volume backups to local, MinIO, or S3.',
    link: '/docs/storage/backups',
  },
  {
    title: 'Marketplace',
    description: 'One-click installs from versioned official templates: WordPress, Ghost, Nextcloud, n8n, Gitea, Umami, and more.',
    link: '/docs/marketplace/overview',
  },
  {
    title: 'Multi-node & Clustering',
    description: 'Add remote Docker hosts via an outbound agent tunnel, with optional auto-detected Docker Swarm cluster mode.',
    link: '/docs/nodes/overview',
  },
  {
    title: 'CI/CD & GitOps',
    description: 'Pipeline-as-code, declarative GitOps reconciliation from miabi.io/v1 manifests, git-push deploy, and signed webhooks.',
    link: '/docs/cicd/pipelines',
  },
  {
    title: 'Monitoring & Operations',
    description: 'Container CPU/memory/disk metrics with retained history, a Prometheus client, and an append-only audit log.',
    link: '/docs/operations/monitoring',
  },
  {
    title: 'Workspaces & Teams',
    description: 'Multi-tenant workspaces own every resource, with members, invitations, organizations, and role-based access.',
    link: '/docs/workspaces/overview',
  },
  {
    title: 'Security',
    description: 'JWT sessions with revocation, API tokens, 2FA, OAuth/OIDC SSO, and per-workspace encryption with key rotation.',
    link: '/docs/security/authentication',
  },
  {
    title: 'RBAC & Plans',
    description: 'Owner, Admin, Developer, and Viewer roles enforced in middleware and by workspace scoping, plus per-workspace quotas.',
    link: '/docs/workspaces/roles-and-permissions',
  },
  {
    title: 'Open Core',
    description: 'AGPL-3.0 and fully functional Community edition, with Enterprise features unlocked by a signed, offline license key.',
    link: '/docs/editions/community-vs-enterprise',
  },
];

function Feature({title, description, link}: FeatureItem) {
  return (
    <Link to={link} className={styles.card}>
      <Heading as="h3" className={styles.cardTitle}>{title}</Heading>
      <p className={styles.cardDescription}>{description}</p>
      <span className={styles.cardArrow} aria-hidden="true">→</span>
    </Link>
  );
}

function Features() {
  return (
    <section className={clsx(styles.section, styles.sectionMuted)}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Features</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Everything you need to run apps on your own server
          </Heading>
          <p className={styles.sectionLead}>
            A complete PaaS — applications, domains, TLS, databases, storage,
            backups, a marketplace, multi-node clustering, CI/CD, monitoring,
            teams, and security — driven entirely from the web console.
          </p>
        </div>

        <div className={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <Feature key={feature.title} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CallToAction() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.cta}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to run your own platform?
          </Heading>
          <p className={styles.ctaLead}>
            Install Miabi on a fresh Linux host and deploy your first app in
            minutes — no Docker commands, no CLI required.
          </p>
          <div className={styles.buttons}>
            <Link
              className="button button--primary button--lg"
              to="/docs/getting-started/installation">
              Install Miabi
            </Link>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/quickstart">
              Quick Start
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Documentation"
      description={`${siteConfig.title} — ${siteConfig.tagline}`}>
      <HomepageHeader />
      <main>
        <QuickStart />
        <Features />
        <CallToAction />
      </main>
    </Layout>
  );
}
