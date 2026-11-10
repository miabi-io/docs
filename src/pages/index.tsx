import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import CodeBlock from '@theme/CodeBlock';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

import styles from './index.module.css';

const GITHUB_URL = 'https://github.com/miabi-io/miabi';
const DEMO_URL = 'https://demo.miabi.io';

const INSTALL_EXAMPLE = `curl -fsSL https://get.miabi.io | sudo MIABI_DOMAIN=miabi.example.com \\
  MIABI_ADMIN_EMAIL=you@example.com bash`;

const MANIFEST_EXAMPLE = `apiVersion: miabi.io/v1
kind: Database
metadata: { name: guestbook-db }
spec:
  engine: postgres
  version: "17-alpine"
---
apiVersion: miabi.io/v1
kind: Database
metadata: { name: guestbook-cache }
spec:
  engine: redis
  version: "8-alpine"
---
apiVersion: miabi.io/v1
kind: Application
metadata: { name: guestbook }
spec:
  image: miabi/guestbook:3.2.0
  ports:
    - { name: http, container: 8080 }
  env:
    DATABASE_URL: "{{ .databases.guestbook-db.url }}"
    REDIS_URL: "{{ .databases.guestbook-cache.url }}"
  healthcheck:
    type: http
    path: /healthz
    port: 8080
  deployment:
    strategy: canary
---
apiVersion: miabi.io/v1
kind: Route
metadata: { name: guestbook }
spec:
  hosts: [guestbook.example.com]
  app: guestbook
  port: http`;

const CLI_EXAMPLE = `miabi login --server https://miabi.example.com

# Preview the change, then converge the workspace to it
miabi apply -f miabi/ --dry-run
miabi apply -f miabi/

# Watch the rollout
miabi logs guestbook --follow`;

function HomepageHeader() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={clsx('container', styles.heroInner)}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} aria-hidden="true" />
          Open source &amp; self-hosted
        </span>

        <p className={styles.heroKicker}>
          Kubernetes is overkill. Docker Compose isn’t enough anymore.
        </p>

        <Heading as="h1" className={styles.heroTitle}>
          The self-hosted PaaS for{' '}
          <span className={styles.gradientText}>shipping apps, not infrastructure</span>
        </Heading>

        <p className={styles.heroSubtitle}>
          Deploy from a Git repo, a container image, or a template onto servers you own. Miabi
          handles builds, domains, automatic TLS, databases, backups, zero-downtime and canary
          releases, and GitOps, from one web console or one YAML file.
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
            Deploy your first app
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

        <p className={styles.heroDemo}>
          Or <a href={DEMO_URL}>try the live demo</a> first.
        </p>

        <ul className={styles.stats}>
          {[
            {value: 'One binary', label: 'API + web console'},
            {value: 'Docker & Swarm', label: 'One VPS to many clusters'},
            {value: 'Multi-tenant', label: 'Workspaces, RBAC, quotas'},
            {value: 'API-first', label: 'REST, CLI, Terraform, MCP'},
          ].map((stat) => (
            <li key={stat.value} className={styles.statItem}>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}

type Row = {label: string; compose: string; miabi: string; k8s: string};

const GAP_ROWS: Row[] = [
  {label: 'Zero-downtime and canary releases', compose: 'No', miabi: 'Built in', k8s: 'With a service mesh'},
  {label: 'One-click rollback', compose: 'No', miabi: 'Built in', k8s: 'Built in'},
  {label: 'GitOps reconciliation', compose: 'No', miabi: 'Built in', k8s: 'Argo CD or Flux'},
  {label: 'Domains and automatic TLS', compose: 'By hand', miabi: 'Built in', k8s: 'Ingress + cert-manager'},
  {label: 'Managed databases and backups', compose: 'By hand', miabi: 'Built in', k8s: 'Operators'},
  {label: 'Teams, tenants and quotas', compose: 'No', miabi: 'Built in', k8s: 'Namespaces + policy'},
  {label: 'What you operate', compose: 'One file', miabi: 'One binary on Docker', k8s: 'A cluster and a team'},
];

function TheGap() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Why Miabi</p>
          <Heading as="h2" className={styles.sectionTitle}>
            The middle ground you were missing
          </Heading>
          <p className={styles.sectionLead}>
            You get the parts of Kubernetes you actually wanted, on plain Docker, without
            Kubernetes to run.
          </p>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.gapTable}>
            <thead>
              <tr>
                <th scope="col"><span className={styles.srOnly}>Capability</span></th>
                <th scope="col">Docker Compose</th>
                <th scope="col" className={styles.gapMiabi}>Miabi</th>
                <th scope="col">Kubernetes</th>
              </tr>
            </thead>
            <tbody>
              {GAP_ROWS.map((r) => (
                <tr key={r.label}>
                  <th scope="row">{r.label}</th>
                  <td>{r.compose}</td>
                  <td className={styles.gapMiabi}>{r.miabi}</td>
                  <td>{r.k8s}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function WaysToShip() {
  return (
    <section className={clsx(styles.section, styles.sectionMuted)}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Your workflow</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Click, declare, or script it
          </Heading>
          <p className={styles.sectionLead}>
            The console, the manifests, and the CLI all drive the same API, so you can start in the
            browser and move to Git when you're ready.
          </p>
        </div>

        <div className={styles.tabsWrap}>
          <Tabs groupId="ship" queryString>
            <TabItem value="console" label="Web console" default>
              <ol className={styles.steps}>
                <li>
                  <strong>Create an application</strong> from a Git repo, a container image, or a
                  marketplace template.
                </li>
                <li>
                  <strong>Attach a domain.</strong> Miabi verifies it and issues a TLS certificate
                  automatically.
                </li>
                <li>
                  <strong>Add a database</strong> and wire its credentials into the app's environment.
                </li>
                <li>
                  <strong>Deploy.</strong> Each release is kept, so a rollback is one click away.
                </li>
              </ol>
              <Link to="/docs/getting-started/quickstart">Follow the quick start →</Link>
            </TabItem>
            <TabItem value="manifest" label="Manifest">
              <CodeBlock language="yaml" title="miabi/guestbook.yaml">
                {MANIFEST_EXAMPLE}
              </CodeBlock>
              <Link to="/docs/cicd/manifest-reference">Read the manifest reference →</Link>
            </TabItem>
            <TabItem value="cli" label="CLI">
              <CodeBlock language="bash" title="Terminal">
                {CLI_EXAMPLE}
              </CodeBlock>
              <Link to="/docs/cicd/gitops">Set up GitOps →</Link>
            </TabItem>
          </Tabs>
        </div>
      </div>
    </section>
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
            The installer adds Docker if needed, generates secrets, and starts Miabi behind Goma
            Gateway with automatic TLS. It also runs alongside containers you already have.
          </p>
        </div>

        <div className={styles.installBlock}>
          <CodeBlock language="bash" title="Install Miabi">
            {INSTALL_EXAMPLE}
          </CodeBlock>
        </div>

        <div className={styles.codeCta}>
          <Link to="/docs/getting-started/installation">Full installation guide</Link>
          <span aria-hidden="true">·</span>
          <Link to="/docs/getting-started/existing-server">Install on a server you already use</Link>
          <span aria-hidden="true">·</span>
          <Link to="/docs/getting-started/air-gapped">Air-gapped install</Link>
        </div>
      </div>
    </section>
  );
}

type FeatureItem = {title: string; description: string; link: string};
type FeatureGroup = {name: string; items: FeatureItem[]};

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    name: 'Ship',
    items: [
      {
        title: 'Applications',
        description: 'Deploy from Git (Dockerfile or buildpacks), an image, or a template. Releases, rollbacks, jobs, stacks, and environments.',
        link: '/docs/applications/overview',
      },
      {
        title: 'Rolling and canary releases',
        description: 'Old containers keep serving until the new release is healthy, and traffic shifts to it gradually. No service mesh.',
        link: '/docs/applications/canary-deployments',
      },
      {
        title: 'GitOps and manifests',
        description: 'Declare a workspace in miabi.io/v1 YAML. Plan, apply, prune, or let a Git source keep it in sync.',
        link: '/docs/cicd/gitops',
      },
      {
        title: 'Pipelines and runners',
        description: 'Pipeline-as-code with dedicated build runners, version policies, git-push deploy, and signed webhooks.',
        link: '/docs/cicd/pipelines',
      },
      {
        title: 'Marketplace',
        description: 'Versioned templates such as WordPress, Ghost, Nextcloud, n8n, and Gitea, with release notes and safe upgrades.',
        link: '/docs/marketplace/overview',
      },
    ],
  },
  {
    name: 'Run',
    items: [
      {
        title: 'Domains, routing, and TLS',
        description: 'DNS-verified domains, automatic certificates (HTTP-01, DNS-01, wildcard), and 20+ gateway middlewares.',
        link: '/docs/networking/domains',
      },
      {
        title: 'Databases',
        description: 'PostgreSQL, MySQL, MariaDB, Redis, MongoDB, and libSQL with managed credentials and in-place upgrades.',
        link: '/docs/databases/overview',
      },
      {
        title: 'Storage and backups',
        description: 'Volumes, storage classes, and scheduled database and volume backups to S3-compatible storage.',
        link: '/docs/storage/backups',
      },
      {
        title: 'Built-in registry',
        description: 'A private registry namespaced per workspace, on local disk or S3, distributed to every node.',
        link: '/docs/registry/overview',
      },
      {
        title: 'Nodes and clusters',
        description: 'Start on one server. Add nodes over an outbound agent tunnel, or run Docker Swarm clusters as locations.',
        link: '/docs/nodes/overview',
      },
    ],
  },
  {
    name: 'Operate and secure',
    items: [
      {
        title: 'Monitoring and analytics',
        description: 'Container metrics, logs, request latency, and cookieless web analytics, all derived from the gateway.',
        link: '/docs/operations/analytics',
      },
      {
        title: 'Alerts',
        description: 'Stateful alerts on app events with deduplication and auto-resolve, in every member’s inbox.',
        link: '/docs/operations/alerts',
      },
      {
        title: 'Workspaces and teams',
        description: 'Every resource belongs to a workspace, with members, organizations, roles, plans, and quotas.',
        link: '/docs/workspaces/overview',
      },
      {
        title: 'Identity and security',
        description: 'SSO, passkeys, 2FA, API tokens, service accounts, secrets encrypted per workspace, and an audit log.',
        link: '/docs/security/authentication',
      },
      {
        title: 'Migration and upgrades',
        description: 'Move workspaces between installs, import running containers, and upgrade Miabi in place.',
        link: '/docs/operations/migration',
      },
    ],
  },
];

function Features() {
  return (
    <section className={clsx(styles.section, styles.sectionMuted)}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Features</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Everything you need to run apps on your own servers
          </Heading>
        </div>

        {FEATURE_GROUPS.map((group) => (
          <div key={group.name} className={styles.featureGroup}>
            <Heading as="h3" className={styles.groupTitle}>{group.name}</Heading>
            <div className={styles.featureGrid}>
              {group.items.map((f) => (
                <Link key={f.title} to={f.link} className={styles.card}>
                  <span className={styles.cardTitle}>{f.title}</span>
                  <p className={styles.cardDescription}>{f.description}</p>
                  <span className={styles.cardArrow} aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const START_HERE: FeatureItem[] = [
  {title: 'New to Miabi', description: 'What it is and how the pieces fit.', link: '/docs/getting-started/introduction'},
  {title: 'Coming from Docker Compose', description: 'Import running containers or deploy a stack.', link: '/docs/nodes/docker-import'},
  {title: 'Automating', description: 'CLI, manifests, GitHub Actions, and Terraform.', link: '/docs/cicd/cli'},
  {title: 'Running the platform', description: 'Nodes, settings, backups, and upgrades.', link: '/docs/administration/platform-admin'},
];

function StartHere() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <p className={styles.eyebrow}>Start here</p>
          <Heading as="h2" className={styles.sectionTitle}>
            Pick your path
          </Heading>
        </div>
        <div className={styles.pathGrid}>
          {START_HERE.map((p) => (
            <Link key={p.title} to={p.link} className={styles.pathCard}>
              <span className={styles.cardTitle}>{p.title}</span>
              <p className={styles.cardDescription}>{p.description}</p>
            </Link>
          ))}
        </div>

        <div className={styles.cta}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to run your own platform?
          </Heading>
          <p className={styles.ctaLead}>
            Community edition is AGPL-3.0 and fully functional. Enterprise features unlock with an
            offline license key.
          </p>
          <div className={styles.buttons}>
            <Link className="button button--primary button--lg" to="/docs/getting-started/installation">
              Install Miabi
            </Link>
            <Link className="button button--secondary button--lg" to="/docs/editions/community-vs-enterprise">
              Compare editions
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
      description={`${siteConfig.title}: ${siteConfig.tagline}`}>
      <HomepageHeader />
      <main>
        <TheGap />
        <WaysToShip />
        <QuickStart />
        <Features />
        <StartHere />
      </main>
    </Layout>
  );
}
