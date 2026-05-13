import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Head from '@docusaurus/Head';
import React from 'react';

export default function LicensePreview() {
    const { siteConfig } = useDocusaurusContext();

    return (
        <>
            <Head>
                <link rel="canonical" href="/license-preview/" />
                <meta name="robots" content="noindex, nofollow" />
            </Head>
            <Layout
                title={`License Preview - ${siteConfig.title}`}
                description="Preview the RxDB Premium License Agreement"
            >
                <main>
                    <div className="block first">
                        <div className="content centered">
                            <h2>
                                RxDB Premium <b>License Agreement</b> (Preview)
                            </h2>
                            <div className="license-document" style={{ textAlign: 'left', marginTop: 40, minHeight: '50vh', padding: '20px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <p><strong>Date:</strong> [Short today's date]</p>
                                <p><strong>ID:</strong> [Deal ID]</p>
                                <p>This is the RxDB Premium License Agreement between</p>

                                <h3>The Vendor:</h3>
                                <p>
                                    [Deal owner]<br />
                                    [Deal Owner Address] <br />
                                </p>

                                <h3>The Customer:</h3>
                                <p>
                                    [Customer Name]<br />
                                    [Customer E-Mail]<br />
                                    Company: [Organization Name]<br />
                                    [Organization Address]
                                </p>

                                <p><strong>RxDB Tier included in this license:</strong> [Deal RxDB Premium Tier (Pro / Pro Plus)]</p>
                                <p><strong>Tax ID:</strong> [Organization TAX ID]</p>

                                <h3>The Software:</h3>
                                <p>
                                    The RxDB Premium Plugins are offered in different tiers. By signing this license the customer is granted access to the <strong>[Deal RxDB Premium Tier]</strong> tier, which includes the respective plugins as outlined on the RxDB Pricing page (https://rxdb.info/premium.html) and below:
                                </p>
                                <ul>
                                    <li><strong>Pro Tier:</strong> RxStorage OPFS, RxStorage IndexedDB, RxStorage SQLite, RxStorage Filesystem, WebCrypto Encryption, Fulltext Search.</li>
                                    <li><strong>Pro Plus Tier:</strong> Everything in Pro, plus RxStorage Worker, RxStorage Sharding, RxStorage Memory-Mapped, RxStorage Shared Worker, Localstorage Meta Optimizer, Query Optimizer, RxServer adapters (Fastify, Koa), Logger plugin.</li>
                                </ul>

                                <ol>
                                    <li><strong>Agreement.</strong> These terms, together with information above, make up a software license agreement. The software, the vendor, and the customer are all identified above.</li>

                                    <li><strong>Use</strong>
                                        <ul>
                                            <li><strong>Permitted use:</strong>
                                                <ul>
                                                    <li>The customer may use the software only in the project(s) called “[Deal Customer Project Name(s)]”.</li>
                                                    <li>The customer may distribute the software as a part of a full application that can be used by the end users of that application.</li>
                                                    <li>If the software is distributed to end users inside of an application, the software MUST be distributed to end users inside of a minified JavaScript file without source maps.</li>
                                                </ul>
                                            </li>
                                            <li><strong>Prohibited Uses:</strong>
                                                <ul>
                                                    <li>The customer may not sell, lease, license, or sublicense the software or documentation except as otherwise permitted in this agreement.</li>
                                                    <li>The customer may only install the software on devices used by a maximum of 3 developers at the same time. A single developer using multiple devices (such as a laptop and a desktop) will only count as one developer installation toward the device limit. Continuous integration servers used solely for automated testing or application bundling do not count as developer devices and are exempt from this limit.<br />
                                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderLeft: '4px solid var(--ifm-color-primary)', margin: '10px 0' }}>
                                                            <em>Side Note: The customer can purchase additional developer slots via the normal payment link.</em>
                                                        </div>
                                                    </li>
                                                    <li>The customer may not decompile, disassemble, or reverse engineer any part of the software.</li>
                                                    <li>The customer may not allow access to the software by others not licensed under this agreement.</li>
                                                    <li>The customer may not use the software as part of another software library that is intended to be used by other software developers as a dependency in their source code.</li>
                                                    <li>The customer may not share copies of the software or documentation with others not licensed under this agreement.</li>
                                                    <li>The customer may not make so much of the functionality of the software available to others as software-as-a-service that the service competes with the software for customers.</li>
                                                    <li>The customer may not assist or allow others to use the software against the terms of this agreement.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                        <p>If the customer violates any of the prohibited uses, the vendor is allowed to disable the access token so that the software can no longer be used.</p>
                                    </li>

                                    <li><strong>Access Token</strong>
                                        <p>The access token is given from the vendor to the customer and is used to download and decrypt the software inside of the Node package manager (npm). The customer agrees to share the access token only as required for use of the software as allowed under this agreement, and to secure its access token at least as well as its confidential business information.</p>
                                        <ul>
                                            <li>The customer may not store the access token at code repositories that are not owned by itself.</li>
                                            <li>The customer may not store the access token at code repositories that are not secured against the visibility from third parties.</li>
                                            <li>If the access token was leaked to any third parties, the customer is required to inform the vendor about that incident.</li>
                                        </ul>
                                    </li>

                                    <li><strong>Licenses</strong>
                                        <ul>
                                            <li><strong>Software Copyright License.</strong> The vendor grants the customer a standard license for any copyrights in the software that the vendor can license, to copy, install, back up, and use the software as allowed under this agreement.</li>
                                            <li><strong>Standard License Terms.</strong> A standard license means a nonexclusive license for the term of this agreement, for versions of the software covered by this agreement, that is conditional on payment of all fees as required by this agreement and subject to any use limits in this agreement.</li>
                                            <li><strong>No Other Licenses.</strong> Apart from the licenses in this agreement, this agreement does not license or assign any intellectual property rights.</li>
                                        </ul>
                                    </li>

                                    <li><strong>Open Source.</strong>
                                        <ul>
                                            <li><strong>Open Source Compliance.</strong> Some components of the software may be open source software available under free, public licenses. If the public license terms for any open source component conflict with the terms of this agreement, only the public license terms apply to that component, not the terms of this agreement. If the license terms for any open source component require an offer of source code or other information related to that component, the vendor agrees to provide on written request.</li>
                                            <li><strong>Dual Licensing.</strong> If any part of the software is or becomes available under a public license:
                                                <ul>
                                                    <li>While the customer's licenses continue, the customer must abide by this agreement, not the public license.</li>
                                                    <li>After the customer's licenses end, the customer must abide by the public license.</li>
                                                    <li>The customer must abide by the terms of the public license for any versions of the software not covered by this agreement.</li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </li>

                                    <li><strong>No Technical Support.</strong>
                                        <p>The vendor does not provide technical support for the software under this agreement.</p>
                                    </li>

                                    <li><strong>Distribution</strong>
                                        <ul>
                                            <li>The vendor provides the software by hosting it on the Node Package Manager (npm) in combination with the github pages service.</li>
                                            <li>The vendor does not guarantee the accessibility of these services.</li>
                                            <li>The customer may keep a local copy of the software as a backup.</li>
                                            <li>Installing the software package via npm on a device will send tracking information to a webserver of the vendor. This includes:
                                                <ul>
                                                    <li>The name, description and path of the package where the software is installed into.</li>
                                                    <li>Names of other installed dependencies and their versions.</li>
                                                    <li>Git user name and email address if available.</li>
                                                    <li>The IP address with which the device is connected to the internet during installation.</li>
                                                </ul>
                                            </li>
                                            <li>Using the software together with the RxDB ‘dev-mode’ plugin will send the same tracking information to the webserver of the vendor.</li>
                                            <li>The software consists of minified JavaScript code and package metadata.</li>
                                        </ul>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderLeft: '4px solid var(--ifm-color-primary)', margin: '20px 0' }}>
                                            <em>Side Note: By default, the software will be delivered as minified JavaScript code. The customer can purchase the additional option to get source code access via the normal payment link. It would then have the following license text:<br /><br />
                                                “...The vendor provides read-access to the (not minified) source code of the software. The customer is allowed to use a modified version of the source code at any time while the license is valid and not expired. If the customer uses a modified version of the source code, the customer MUST notify the vendor about all changes that have been made to the source code and a short description of the reasons for the modification. A modified version of the source code MUST be shipped to the end users in a minified format without any source code comments.”</em>
                                        </div>
                                    </li>

                                    <li><strong>Disclaimer of Warranty.</strong>
                                        <p>Unless required by applicable law or agreed to in writing, the Vendor provides the software on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. The customer is solely responsible for determining the appropriateness of using or redistributing the software and assume any risks associated with the customers exercise of permissions under this License.</p>
                                    </li>

                                    <li><strong>Limitation of Liability.</strong>
                                        <p>In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall the vendor be liable to the customer for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the software (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses).</p>
                                    </li>

                                    <li><strong>Dispute Resolution.</strong>
                                        <p>The parties agree to try to resolve any dispute related to this agreement by having an executive from each party meet, in person or by phone or by chat or by email, to try and resolve the dispute first. Only if that fails will they bring a lawsuit.</p>
                                        <p>This agreement is governed by the laws of the Federal Republic of Germany. The exclusive place of jurisdiction for all disputes arising out of or in connection with this agreement shall be Stuttgart, Germany.</p>
                                    </li>

                                    <li><strong>Payment</strong>
                                        <p>The Customer must pay the license fee of [Deal value] within 40 days after signing this agreement.</p>
                                        <p>If the Customer does not provide a valid tax ID, the Customer will be considered a private entity and 19% German VAT will be added to the invoice.</p>
                                        <p>After signing this license, an invoice will be sent to the Customer via Stripe.com.</p>
                                        <p>All payment processing is handled via Stripe (https://stripe.com), which supports most commonly used payment options such as credit cards, PayPal, SEPA transfers, and others. For additional information on available payment methods, please refer to: https://docs.stripe.com/payments/payment-methods/overview.</p>
                                    </li>

                                    <li><strong>Time and Renewal</strong>
                                        <p>This license is valid from the day of the payment of the license fee for the following 365 days.</p>
                                        <p>After the license is no longer valid, the customer is NOT allowed to use any version of the software, without purchasing a new license.</p>
                                        <p>The vendor is not required to provide access to any version of the software after the license has expired.</p>
                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderLeft: '4px solid var(--ifm-color-primary)', margin: '20px 0' }}>
                                            <em>Side Note: The customer can purchase the additional option to still use the software in already deployed projects via the normal payment link. It would then have the following license text:<br /><br />
                                                “...After the license is no longer valid, the customer is still allowed to use the newest version of the software, which existed at the last day when the license was valid. This is only allowed for already deployed releases and it is not allowed to build new releases with the software. Newer versions of the software cannot be used by the client without purchasing a new license. The vendor is not required to provide access to any version of the software after the license has expired. It will not be possible to install the software from npm.”</em>
                                        </div>
                                        <p>This license will renew itself automatically for successive one-year terms following the initial license term, unless either party gives the other written notice of its intention not to renew at least 30 days prior to the expiration of the current term. Upon renewal, the customer will be billed for the upcoming year's license fee, which is due within 40 days of the commencement of each new term. The license fee shall remain fixed at the initially agreed amount and shall not be subject to any increase for the duration of this agreement, including all renewal terms.</p>
                                    </li>

                                    <li><strong>Non-disclosure</strong>
                                        <p>The license fee and any other information in this agreement are confidential. Neither party may disclose any parts of it to third parties, unless required by law or for taxation purposes, or to such party’s professional advisers who are bound by obligations of confidentiality.</p>
                                    </li>
                                </ol>

                                <h3>Signatures:</h3>
                                <div style={{ marginTop: 40, display: 'flex', justifyContent: 'space-between' }}>
                                    <div>
                                        <strong>Vendor Signature:</strong><br /><br />
                                        ___________________________
                                    </div>
                                    <div>
                                        <strong>Customer Signature:</strong><br /><br />
                                        ___________________________
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </Layout>
        </>
    );
}
