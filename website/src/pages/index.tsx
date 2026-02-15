import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const logoUrl = useBaseUrl('/img/logo.svg');
  return (
    <header className={clsx('hero', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <img src={logoUrl} alt="CDK Power Constructs" />
          </div>
          <div className={styles.heroText}>
            <Heading as="h1" className={styles.heroTitle}>
              {siteConfig.title}
            </Heading>
            <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
            <div className={styles.buttons}>
              <Link
                className={styles.buttonPrimary}
                to="/docs/intro">
                Get Started
              </Link>
              <Link
                className={styles.buttonSecondary}
                to="/api/typescript/">
                API Reference
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function Feature({title, description, icon}: {title: string; description: string; icon: string}) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureIcon}>{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.featuresGrid}>
          <Feature
            icon="🏗️"
            title="Infrastructure Patterns"
            description="Opinionated constructs for common infrastructure challenges like networking, security, and observability."
          />
          <Feature
            icon="📊"
            title="Data Solutions"
            description="Refined patterns for data pipelines, analytics, and storage solutions that scale with your needs."
          />
          <Feature
            icon="🤖"
            title="AI/ML Ready"
            description="Purpose-built constructs for machine learning workflows, model deployment, and AI infrastructure."
          />
          <Feature
            icon="🎯"
            title="Opinionated Design"
            description="Battle-tested decisions baked in, so you can focus on your business logic instead of configuration."
          />
          <Feature
            icon="🔒"
            title="Security First"
            description="Security best practices built-in by default, following AWS Well-Architected Framework principles."
          />
          <Feature
            icon="⚡"
            title="Production-Ready"
            description="Refined through real-world usage, ready to deploy to production with confidence."
          />
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Reusable AWS CDK constructs for common infrastructure patterns">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
