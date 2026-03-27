import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import React, { } from 'react';


export default function Chat() {
    const { siteConfig } = useDocusaurusContext();



    return (
        <Layout
            title={`Chat - ${siteConfig.title}`}
            description="RxDB Community Chat Rules"
        >
            <main>
                <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <a href="/">
                            <div className="logo" style={{ marginBottom: '1rem' }}>
                                <img src="/files/logo/logo_text.svg" alt="RxDB" width={160} />
                            </div>
                        </a>
                        <h1>💬 RxDB Chat Rules</h1>
                        <p style={{ fontSize: '1.2rem', color: 'var(--ifm-color-emphasis-600)' }}>
                            Please review our community guidelines before joining the chat.
                        </p>
                    </div>

                    <div className="rules-content" style={{ fontSize: '1.05rem', lineHeight: '1.6' }}>
                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📜 Server Rules</h2>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Introduce yourself in the 👋・introductions channel. Tell us who you are and what you&apos;re building.</li>
                                <li>Be respectful - no harassment, hate speech, or toxic behavior.</li>
                                <li>Keep discussions relevant to the channel topic.</li>
                                <li>No spam, self-promotion, or unsolicited links unless allowed.</li>
                                <li>Use clear and constructive communication - this is a professional space.</li>
                                <li>Follow all Discord Terms of Service.</li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🧠 Support & Help</h2>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Do not send direct messages to the maintainer for support.</li>
                                <li>Ask questions in the appropriate channels so others can benefit.</li>
                                <li>Be patient - not all questions get instant replies.</li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🚀 Community Culture</h2>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Share value - insights, progress, and lessons learned are encouraged.</li>
                                <li>Give feedback respectfully and constructively.</li>
                                <li>Avoid low-effort messages (e.g. "help pls", "it doesn&apos;t work").</li>
                                <li>Stay on topic - off-topic conversations go in designated channels.</li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '2rem' }}>
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚠️ Enforcement</h2>
                            <ul style={{ paddingLeft: '1.5rem' }}>
                                <li>Moderators can remove content or members at their discretion.</li>
                                <li>Repeated rule violations may result in a ban.</li>
                            </ul>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <a
                            href="/chat/"
                            className="button button--primary button--lg"
                            style={{ marginTop: '1rem' }}
                        >
                            I understand, open Chat
                        </a>
                    </div>

                </div>
            </main>
        </Layout >
    );
}
