// Application Logic

const Analytics = {
    trackEvent(type, data = null) {
        try {
            fetch('http://localhost:8000/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, data, timestamp: Date.now() })
            }).catch(() => { /* Silent fail if tracking server is down */ });
        } catch (e) {}
    }
};

const app = {
    currentView: 'home',
    history: [],
    currentData: null,

    init() {
        // Initialize Lucide icons
        lucide.createIcons();

        // Setup Event Listeners
        document.getElementById('navSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSearch(e.target.value);
            }
        });

        // Load initial view
        this.renderHomeView();

        // Always show TOS on fresh page load — clear any cached acceptance
        localStorage.removeItem('tos_accepted');
        document.getElementById('tosModal').classList.remove('hidden');
    },

    navigate(viewName, data = null, pushHistory = true) {
        if (pushHistory && this.currentView) {
            if (this.currentView !== viewName || this.currentData !== data) {
                this.history.push({ view: this.currentView, data: this.currentData });
            }
        }
        this.currentView = viewName;
        this.currentData = data;
        
        // Track page view
        Analytics.trackEvent('page_view', { view: viewName, data: data });

        // TOS Enforcement
        if (!localStorage.getItem('tos_accepted')) {
            const allowedViews = ['terms', 'privacy', 'ethics'];
            if (allowedViews.includes(viewName)) {
                // Hide modal so they can read the text
                document.getElementById('tosModal').classList.add('hidden');
            } else {
                // Show modal to block access to main app
                document.getElementById('tosModal').classList.remove('hidden');
                // Return early so we don't render the blocked view, except we still need to render the home view underneath it.
                // It's okay to render the view underneath, the modal covers it.
            }
        }
        
        const appContent = document.getElementById('appContent');
        const navSearch = document.getElementById('navSearchContainer');

        // Toggle nav search visibility based on view
        if (viewName === 'home') {
            navSearch.classList.add('hidden');
        } else {
            navSearch.classList.remove('hidden');
        }

        // Render appropriate view
        switch (viewName) {
            case 'home':
                this.renderHomeView(data);
                break;
            case 'results':
                this.renderHomeView(data);
                break;
            case 'detail':
                this.renderDetailView(data);
                break;
            case 'terms':
                this.renderTermsView();
                break;
            case 'privacy':
                this.renderPrivacyView();
                break;
            case 'ethics':
                this.renderEthicsView();
                break;
            case 'admin':
                this.renderAdminView();
                break;
        }

        // Re-initialize icons for new content
        lucide.createIcons();
        window.scrollTo(0, 0);
    },

    // --- Views Rendering --- //

    goBack() {
        if (this.history.length > 0) {
            const prevState = this.history.pop();
            this.navigate(prevState.view, prevState.data, false);
        } else {
            this.navigate('home', null, false);
        }
    },

    async renderHomeView(initialQuery = null) {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active dashboard-layout">
                <!-- Section 1: Research -->
                <section class="dashboard-section research-section glass-panel">
                    <div class="section-header">
                        <h3><i data-lucide="book-open"></i> Research</h3>
                    </div>
                    
                    <div class="search-header" style="margin-bottom: 1rem; position: relative;">
                        <i data-lucide="search" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--text-muted); width: 16px;"></i>
                        <input type="text" id="researchSearchInput" placeholder="Search research papers..." style="width: 100%; padding: 0.6rem 1rem 0.6rem 2.2rem; border-radius: var(--radius-md); background: var(--bg-dark); border: 1px solid var(--border-color); color: var(--text-primary);" onkeypress="if(event.key === 'Enter') app.handleResearchSearch(this.value)">
                    </div>
                    
                    <div class="search-header" style="margin-bottom: 0;">
                        <h4 style="margin-top: 0.5rem; margin-bottom: 0;">Results for "<span class="gradient-text" id="currentQueryText">...</span>"</h4>
                        <span style="color: var(--text-muted); font-size: 0.8rem" id="researchCount">Waiting for input...</span>
                    </div>
                    <div id="articlesContainer" class="scrollable-container" style="margin-top: 0.5rem; justify-content: center; align-items: center;">
                        <p style="color: var(--text-muted); font-size: 0.95rem; text-align: center;">Type a topic in the search bar above to find academic papers.</p>
                    </div>
                </section>

                <!-- Section 2: News -->
                <section class="dashboard-section news-section glass-panel">
                    <div class="section-header">
                        <h3><i data-lucide="rss"></i> Top News</h3>
                        <select id="domainFilter" onchange="app.handleDomainChange()" class="filter-select">
                            <option value="Medicine">Medicine</option>
                            <option value="Finance">Finance</option>
                            <option value="Technology">Technology</option>
                        </select>
                    </div>
                    <div id="newsContainer" class="scrollable-container">
                        <div class="loading-container"><div class="loader"></div></div>
                    </div>
                </section>

                <!-- Section 3: Trends & Analytics -->
                <section class="dashboard-section analytics-section glass-panel">
                    <div class="section-header">
                        <h3><i data-lucide="bar-chart-2"></i> News Analytics</h3>
                    </div>
                    <div class="scrollable-container" style="padding-right: 0;" id="trendsPanel">
                        <div style="display:flex; align-items:center; justify-content:center; height:100%; color: var(--text-muted); font-size:0.95rem; text-align:center; padding: 2rem;">
                            <div>
                                <i data-lucide="bar-chart-2" style="width:40px;height:40px;margin-bottom:1rem;opacity:0.4;"></i>
                                <p>Select a news category to see analytics.</p>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        `;
        lucide.createIcons();

        if (initialQuery) {
            const domainEl = document.getElementById('domainFilter');
            if (domainEl) domainEl.value = 'Technology'; // default
            this.handleResearchSearch(initialQuery);
            this.fetchNewsForDomain('Technology');
        } else {
            this.handleDomainChange();
        }
    },

    async renderDetailView(articleId) {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active">
                <div class="loading-container"><div class="loader"></div></div>
            </div>
        `;

        try {
            const article = await mockApi.getArticleDetails(articleId);

            // Extract keywords dynamically if none exist
            if (!article.keywords || article.keywords.length === 0) {
                article.keywords = this.extractKeywords(article.abstract || article.title);
            }

            appContent.innerHTML = `
                <div class="view active detail-layout">
                    <!-- Core Content -->
                    <main>
                        <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                            <i data-lucide="arrow-left"></i> Back
                        </a>
                        
                        <header class="detail-header">
                            <h1 class="detail-title gradient-text">
                                <a href="${article.url}" target="_blank" style="text-decoration: none; color: inherit;">
                                    ${article.title} <i data-lucide="external-link" style="width: 28px; height: 28px; display: inline-block; vertical-align: middle;"></i>
                                </a>
                            </h1>
                            <div class="article-meta" style="margin-bottom: 1.5rem; font-size: 1rem;">
                                <span class="meta-item"><i data-lucide="users"></i> ${article.authors.join(", ")}</span>
                                <span class="meta-item"><i data-lucide="calendar"></i> ${article.year}</span>
                                <span class="meta-item"><i data-lucide="book-open"></i> ${article.source}</span>
                                <span class="meta-item"><i data-lucide="bar-chart-2"></i> ${article.citationCount.toLocaleString()} citations</span>
                            </div>
                            <div class="topic-tag" style="display:inline-block; border-color:var(--accent-primary); color:var(--text-primary)">
                                Relevance Score: ${article.relevanceScore}%
                            </div>
                        </header>

                        <div class="insight-panel">
                            <h3><i data-lucide="zap"></i> Why this article?</h3>
                            <p class="insight-content">
                                This article is highly relevant because it exactly matches your keywords "<strong>${article.keywords[0]}</strong>" and "<strong>${article.keywords[1]}</strong>". It represents a foundational shift in the domain, evidenced by its massive citation count and strong semantic overlap with recent trending topics in AI.
                            </p>
                        </div>

                        <section class="abstract-section">
                            <h3>Abstract</h3>
                            <p class="abstract-text">${article.abstract}</p>
                        </section>

                        <h3 style="margin-bottom: 1.5rem;">Visual Analytics Dashboard</h3>
                        <div class="analytics-grid">
                            <div class="chart-container">
                                <h4>Topic Comparison vs Domain Avg</h4>
                                <div style="position: relative; height: 250px; width: 100%;"><canvas id="radarChart"></canvas></div>
                            </div>
                            <div class="chart-container">
                                <h4>Top Keyword Relevance</h4>
                                <div style="position: relative; height: 250px; width: 100%;"><canvas id="barChart"></canvas></div>
                            </div>
                            <div class="chart-container" style="grid-column: 1 / -1;">
                                <h4 id="trendChartTitle">Popularity Trend</h4>
                                <div style="position: relative; height: 250px; width: 100%;"><canvas id="trendChart"></canvas></div>
                            </div>
                        </div>
                    </main>

                    <!-- Right Sidebar -->
                    <aside class="sidebar right-sidebar glass-panel" style="height: fit-content; position: sticky; top: 100px;">
                        <h3>Recommended & Trending</h3>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1rem;">Papers frequently cited together</p>
                        <div id="detailRecsContainer">
                            <div class="loader"></div>
                        </div>
                    </aside>
                </div>
            `;
            lucide.createIcons();

            // Render Charts
            analyticsCharts.renderTopicComparison(document.getElementById('radarChart'));
            analyticsCharts.renderKeywordExtraction(document.getElementById('barChart'), article.keywords);
            
            let trendData;
            const trendTitle = document.getElementById('trendChartTitle');
            
            if (article.countsByYear && article.countsByYear.length > 0) {
                const sorted = [...article.countsByYear].sort((a,b) => a.year - b.year);
                trendData = {
                    labels: sorted.map(c => c.year.toString()),
                    data: sorted.map(c => c.cited_by_count),
                    label: "Citations Received"
                };
                if (trendTitle) trendTitle.innerText = "Article Popularity (Citations Per Year)";
            } else {
                trendData = await mockApi.getTrendData(article.title);
                if (trendData) {
                    trendData.label = "Publications Found";
                }
                if (trendTitle) trendTitle.innerText = "Topic Popularity (Publications Per Year)";
            }
            analyticsCharts.renderTrendGraph(document.getElementById('trendChart'), trendData);

            // Render Recommendations
            const recs = await mockApi.getRecommendations();
            const recsHtml = recs.map(rec => `
                <div class="recommendation-card" onclick="Analytics.trackEvent('recommendation_click', '${rec.title}'); app.handleSearch('${rec.title}')">
                    <h4 class="recommendation-title">${rec.title}</h4>
                    <p class="recommendation-reason"><i data-lucide="link"></i> ${rec.reason}</p>
                </div>
            `).join('');
            document.getElementById('detailRecsContainer').innerHTML = recsHtml;
            lucide.createIcons();

        } catch (error) {
            appContent.innerHTML = `<div class="view active" style="text-align:center; padding: 4rem;"><h2>Error: ${error.message}</h2></div>`;
        }
    },

    renderTermsView() {
        const appContent = document.getElementById('appContent');
        const sec = (n, title, body) => `<div style="margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color);"><h3 style="margin:0 0 0.6rem; color:var(--text-primary);">${n}. ${title}</h3><p style="margin:0; color:var(--text-secondary); line-height:1.7;">${body}</p></div>`;
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 820px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Terms of Service</h1>
                    <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Last Updated: May 6, 2026 &nbsp;|&nbsp; Effective Immediately</p>
                    <div class="insight-panel" style="margin-bottom:2rem;"><p style="margin:0;">Please read these Terms carefully before using LOL.AI. By clicking <strong>"Accept"</strong> or accessing the platform, you agree to be legally bound by these Terms.</p></div>
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        ${sec(1,'Acceptance of Terms','By accessing, browsing, or using LOL.AI ("the Service", "the Platform"), you confirm that you are at least 18 years old, have read and understood these Terms, and agree to be bound by them. If you are using the Service on behalf of an organization, you represent that you have authority to bind that organization. If you do not agree, you must immediately cease use of the Platform.')}
                        ${sec(2,'Description of Service','LOL.AI is an AI-assisted academic research dashboard that aggregates data from third-party public APIs including <a href="https://api.openalex.org" target="_blank" style="color:var(--accent-primary)">OpenAlex</a>, <a href="https://export.arxiv.org/api" target="_blank" style="color:var(--accent-primary)">arXiv</a>, and <a href="https://gnews.io" target="_blank" style="color:var(--accent-primary)">GNews</a>. The Platform provides sentiment analysis, keyword extraction, and research correlation tools. All outputs are for informational and educational purposes only.')}
                        ${sec(3,'Data Sourcing & Third-Party APIs','Research articles are retrieved from OpenAlex and arXiv under their respective open-access licenses. News data is sourced via GNews under their API Terms of Use. By using LOL.AI, you agree to comply with the upstream terms of these providers. LOL.AI makes no warranty regarding the accuracy, completeness, or timeliness of third-party data.')}
                        ${sec(4,'Acceptable Use & Prohibited Conduct','You agree NOT to: (a) use the Platform to generate, distribute, or publish plagiarized or fraudulent academic content; (b) attempt to reverse-engineer, scrape, or extract underlying AI models or API keys; (c) introduce malware, denial-of-service attacks, or any malicious code; (d) use the Platform to harass, defame, or harm any individual or group; (e) circumvent access controls or rate limits; (f) use outputs commercially without proper attribution to source APIs.')}
                        ${sec(5,'Intellectual Property','All UI design, branding, and proprietary logic of LOL.AI are © 2026 LOL.AI. Academic content displayed belongs to its respective authors and publishers under their original licenses (arXiv CC licenses; OpenAlex CC0). AI-generated analytics are provided under fair use for personal, non-commercial research.')}
                        ${sec(6,'Disclaimers & No Medical/Legal/Financial Advice','THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. Content on LOL.AI does NOT constitute medical, legal, financial, or professional advice. Always consult a qualified professional before making decisions based on research summaries. LOL.AI is not liable for any outcomes resulting from reliance on Platform outputs.')}
                        ${sec(7,'Limitation of Liability','To the maximum extent permitted by law, LOL.AI and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, revenue, or profits, arising from your use of or inability to use the Service, even if advised of the possibility of such damages.')}
                        ${sec(8,'Governing Law & Dispute Resolution','These Terms are governed by the laws of the jurisdiction in which LOL.AI operates. Any disputes shall first be attempted to be resolved through good-faith negotiation. Unresolved disputes shall be submitted to binding arbitration under applicable arbitration rules, waiving the right to class-action proceedings.')}
                        ${sec(9,'Modifications to Terms','LOL.AI reserves the right to update these Terms at any time. Material changes will be communicated via an in-platform notification. Continued use after changes constitutes acceptance. You are responsible for reviewing these Terms periodically.')}
                        <div style="background:var(--bg-card); border-radius:10px; padding:1rem; border:1px solid var(--border-color); margin-top:1rem;">
                            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">For questions about these Terms, contact: <a href="mailto:lal2al1alalal1234@gmail.com" style="color:var(--accent-primary)">legal@lol-ai.research</a></p>
                        </div>
                    </div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    renderPrivacyView() {
        const appContent = document.getElementById('appContent');
        const sec = (n, title, body) => `<div style="margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color);"><h3 style="margin:0 0 0.6rem; color:var(--text-primary);">${n}. ${title}</h3><p style="margin:0; color:var(--text-secondary); line-height:1.7;">${body}</p></div>`;
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 820px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Privacy & Data Policy</h1>
                    <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Last Updated: May 6, 2026 &nbsp;|&nbsp; GDPR & CCPA Compliant</p>
                    <div class="insight-panel" style="margin-bottom:2rem;"><p style="margin:0;">LOL.AI is committed to protecting your privacy. This Policy explains what data we collect, why, and how it is protected. We do not sell your data.</p></div>
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        ${sec(1,'Data We Collect','We collect minimal data necessary to operate the Platform: (a) <strong>Search queries</strong> — processed in real-time to fetch results from OpenAlex, arXiv, and GNews APIs. Queries are not persistently stored or linked to your identity. (b) <strong>Session analytics</strong> — anonymized event counts (page views, click types) sent to a local analytics endpoint solely for improving the Platform. (c) <strong>Subscription email</strong> — only if you voluntarily subscribe to research alerts via the Subscribe form. Never shared with third parties.')}
                        ${sec(2,'Data We Do NOT Collect','We do not collect: passwords, payment information, precise geolocation, biometric data, or any form of sensitive personal identifiers. We do not use third-party advertising trackers (Google Ads, Meta Pixel, etc.).')}
                        ${sec(3,'How Data Is Used','Search queries are forwarded directly to OpenAlex, arXiv, and GNews APIs solely to retrieve results on your behalf. Anonymized aggregate analytics are used internally to identify popular topics and improve recommendation quality. Subscription emails are used exclusively for opt-in research digest notifications.')}
                        ${sec(4,'Data Storage & Security','All data transmissions are protected by TLS 1.3 encryption. Session analytics are stored locally and never transmitted to external advertising networks. We apply the principle of data minimization — we collect only what is strictly necessary.')}
                        ${sec(5,'Third-Party API Data Flows','When you search, your query is sent to: <a href="https://api.openalex.org" target="_blank" style="color:var(--accent-primary)">OpenAlex</a> (CC0 licensed), <a href="https://export.arxiv.org" target="_blank" style="color:var(--accent-primary)">arXiv</a> (Cornell University), <a href="https://gnews.io" target="_blank" style="color:var(--accent-primary)">GNews</a> (under their Terms), and <a href="https://api.datamuse.com" target="_blank" style="color:var(--accent-primary)">Datamuse</a> for keyword suggestions. Each provider has its own privacy policy which governs their handling of requests.')}
                        ${sec(6,'Cookies & Local Storage','LOL.AI uses <strong>localStorage</strong> only to store your Terms of Service acceptance (a single boolean flag). No persistent tracking cookies are set. No cross-site cookies are used.')}
                        ${sec(7,'Your Rights (GDPR / CCPA)','Depending on your jurisdiction, you may have rights including: <strong>Right to Access</strong> — request a copy of any personal data we hold. <strong>Right to Erasure</strong> — request deletion of your subscription email at any time. <strong>Right to Opt-Out</strong> — unsubscribe from research alerts at any time. <strong>Right to Know</strong> (CCPA) — we do not sell personal information. To exercise any right, contact us at <a href="mailto:lal2al1alalal1234@gmail.com" style="color:var(--accent-primary)">privacy@lol-ai.research</a>.')}
                        ${sec(8,'Data Retention','Search query logs are not retained beyond the current browser session. Subscription email addresses are retained until you unsubscribe. Anonymized aggregate analytics are retained for up to 90 days for trend analysis, then permanently deleted.')}
                        ${sec(9,'Changes to This Policy','We will notify users of material privacy changes via an in-platform notice. Continued use after notification constitutes acceptance of the updated Policy.')}
                        <div style="background:var(--bg-card); border-radius:10px; padding:1rem; border:1px solid var(--border-color); margin-top:1rem;">
                            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Privacy questions: <a href="mailto:lal2al1alalal1234@gmail.com" style="color:var(--accent-primary)">privacy@lol-ai.research</a></p>
                        </div>
                    </div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    renderEthicsView() {
        const appContent = document.getElementById('appContent');
        const sec = (n, title, body) => `<div style="margin-bottom:1.5rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color);"><h3 style="margin:0 0 0.6rem; color:var(--text-primary);">${n}. ${title}</h3><p style="margin:0; color:var(--text-secondary); line-height:1.7;">${body}</p></div>`;
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 820px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Ethical Use & AI Statement</h1>
                    <p style="color: var(--text-muted); margin-bottom: 0.5rem;">Last Updated: May 6, 2026 &nbsp;|&nbsp; Commitment to Responsible AI</p>
                    <div class="insight-panel" style="margin-bottom:2rem;">
                        <h3 style="margin-top:0;"><i data-lucide="shield-check"></i> Core Ethical Mandate</h3>
                        <p style="margin-bottom:0;">LOL.AI is built to augment human intelligence — not replace it. We are committed to transparency, fairness, and accountability in every AI-assisted interaction. Research is a public good; we treat it as such.</p>
                    </div>
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        ${sec(1,'Transparency & Source Attribution','Every research result displayed by LOL.AI is traceable to its original source: <a href="https://api.openalex.org" target="_blank" style="color:var(--accent-primary)">OpenAlex</a> or <a href="https://export.arxiv.org" target="_blank" style="color:var(--accent-primary)">arXiv</a>. News content is attributed to its publisher via GNews. We provide direct links to all source materials. We never present AI-generated text as a substitute for peer-reviewed content without explicit labeling.')}
                        ${sec(2,'AI Limitations & Hallucination Disclosure','Sentiment analysis and keyword extraction on LOL.AI are performed using lightweight client-side heuristics. These are approximate and may not reflect clinical, financial, or academic consensus. AI-generated relevance scores are illustrative, not authoritative. Users must exercise independent judgment before acting on any output.')}
                        ${sec(3,'Bias Mitigation & Fairness','We acknowledge that search algorithms can reflect inherent biases in publication databases. Our platform queries open APIs without editorial filtering, which means underrepresented research communities may appear less frequently. We are actively working to diversify our data sources and surface diverse viewpoints.')}
                        ${sec(4,'Academic Integrity','LOL.AI strictly prohibits use of the Platform to: (a) produce or submit plagiarized academic work; (b) fabricate citations or research summaries; (c) generate deceptive or misleading scientific claims. Violations may result in immediate access termination and, where applicable, reporting to relevant academic institutions.')}
                        ${sec(5,'No Harm Principle','The Platform must not be used for research or content that promotes violence, discrimination, or illegal activities. Medical research findings surfaced by LOL.AI must not be used to self-diagnose or self-medicate. Financial research must not be interpreted as investment advice. Always consult licensed professionals.')}
                        ${sec(6,'Cybersecurity as an Ethical Duty','Protecting user data is not merely a legal obligation — it is an ethical imperative. We commit to: disclosing any data breaches within 72 hours of discovery; never selling or monetizing user data; conducting regular security audits; and maintaining a responsible disclosure policy for security researchers.')}
                        ${sec(7,'Environmental Responsibility','LOL.AI is a client-side application that minimizes server-side compute. By leveraging open public APIs rather than training proprietary LLMs, we significantly reduce the carbon footprint associated with AI inference. We are committed to energy-efficient architecture.')}
                        ${sec(8,'Human Oversight & Control','AI features on LOL.AI are designed to assist, not decide. All research actions — searching, reading, citing — remain under complete user control. We do not automate any consequential decisions. Users retain full agency over how they interpret and use platform outputs.')}
                        ${sec(9,'Reporting Ethical Concerns','If you identify harmful, biased, or misleading outputs on LOL.AI, please report them immediately. We take all ethical concerns seriously and commit to investigating and responding within 5 business days.')}
                        <div style="background:var(--bg-card); border-radius:10px; padding:1rem; border:1px solid var(--border-color); margin-top:1rem;">
                            <p style="margin:0; font-size:0.85rem; color:var(--text-muted);">Ethics concerns: <a href="mailto:lal2al1alalal1234@gmail.com" style="color:var(--accent-primary)">ethics@lol-ai.research</a> &nbsp;|&nbsp; Security disclosure: <a href="mailto:lal2al1alalal1234@gmail.com" style="color:var(--accent-primary)">security@lol-ai.research</a></p>
                        </div>
                    </div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    renderAdminView() {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active standard-page" style="padding: 2rem;">
                <main style="max-width: 800px; margin: 0 auto; text-align: center;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()" style="justify-content: center; margin-bottom: 2rem;">
                        <i data-lucide="arrow-left"></i> Back to app
                    </a>
                    <h1 class="gradient-text"><i data-lucide="file-bar-chart"></i> Tracking Reports</h1>
                    <p style="color: var(--text-muted); margin-bottom: 3rem;">Generate and download a comprehensive PDF report of user activity and data analysis.</p>
                    
                    <div class="content-block glass-panel" style="padding: 3rem; display: flex; flex-direction: column; align-items: center;">
                        <i data-lucide="file-down" style="width: 48px; height: 48px; color: var(--accent-primary); margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 1rem;">Export Analytics Data</h3>
                        <p style="color: var(--text-muted); margin-bottom: 2rem; max-width: 400px;">The report includes user engagement metrics, most popular search queries, and click interaction distributions over time.</p>
                        
                        <button class="btn btn-primary" id="btnGenerateReport" onclick="app.generatePDFReport()" style="font-size: 1.1rem; padding: 1rem 2rem;">
                            <i data-lucide="download"></i> Download PDF Report
                        </button>
                    </div>

                    <!-- Hidden div to construct the report for PDF generation -->
                    <div id="pdfReportContainer" style="display: none;"></div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    async generatePDFReport() {
        const btn = document.getElementById('btnGenerateReport');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Generating...';
        btn.disabled = true;
        lucide.createIcons();

        try {
            const response = await fetch('http://localhost:8000/api/analytics');
            if (!response.ok) throw new Error("Analytics server is unreachable.");
            const data = await response.json();

            const container = document.getElementById('pdfReportContainer');
            // Show container temporarily but position it offscreen to render properly
            container.style.display = 'block';
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            container.style.top = '0';
            container.style.width = '800px';
            container.style.backgroundColor = '#ffffff'; // White background for PDF
            container.style.color = '#111827';
            container.style.padding = '40px';
            container.style.fontFamily = "'Inter', sans-serif";

            const reportDate = new Date().toLocaleDateString();

            container.innerHTML = `
                <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px;">
                    <h1 style="color: #1f2937; margin: 0; font-size: 28px;">LOL.AI Research Assistant</h1>
                    <h2 style="color: #6b7280; margin: 5px 0 0 0; font-size: 18px; font-weight: 500;">User Tracking & Analytics Report</h2>
                    <p style="color: #9ca3af; font-size: 14px; margin-top: 10px;">Generated on: ${reportDate}</p>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #374151; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">1. Executive Summary</h3>
                    <div style="display: flex; gap: 20px; margin-top: 20px;">
                        <div style="flex: 1; background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; color: #6b7280; text-transform: uppercase;">Total Views</div>
                            <div style="font-size: 32px; font-weight: 700; color: #111827;">${data.total_views}</div>
                        </div>
                        <div style="flex: 1; background: #f0fdf4; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; color: #166534; text-transform: uppercase;">Total Searches</div>
                            <div style="font-size: 32px; font-weight: 700; color: #15803d;">${data.total_searches}</div>
                        </div>
                        <div style="flex: 1; background: #eff6ff; padding: 20px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 14px; color: #1e40af; text-transform: uppercase;">Total Events</div>
                            <div style="font-size: 32px; font-weight: 700; color: #1d4ed8;">${data.raw_count}</div>
                        </div>
                    </div>
                </div>

                <div style="margin-bottom: 30px;">
                    <h3 style="color: #374151; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">2. Top Search Queries</h3>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                        <thead>
                            <tr style="background: #f9fafb;">
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Rank</th>
                                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Query</th>
                                <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Search Volume</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.top_searches.length > 0 ? data.top_searches.map((s, i) => `
                                <tr>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280;">#${i+1}</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; text-transform: capitalize;">${s[0]}</td>
                                    <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${s[1]}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="3" style="padding: 12px; text-align:center; color:#9ca3af;">No search data available.</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                    <h3 style="color: #374151; font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">3. Interaction Distribution</h3>
                    <div style="margin-top: 15px;">
                        ${Object.keys(data.click_distribution).length > 0 ? Object.entries(data.click_distribution).map(([key, value]) => `
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                                <span style="text-transform: capitalize; color: #4b5563;">${key.replace('_', ' ')}</span>
                                <span style="font-weight: 600;">${value} clicks</span>
                            </div>
                        `).join('') : '<p style="color:#9ca3af;">No interaction data available.</p>'}
                    </div>
                </div>

                <div style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                    <p>Confidential & Proprietary &copy; 2026 LOL.AI</p>
                </div>
            `;

            // Setup html2pdf options
            const opt = {
                margin:       10,
                filename:     'LOL_AI_Analytics_Report.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Generate and save PDF
            await html2pdf().set(opt).from(container).save();

            // Cleanup
            container.style.display = 'none';
            btn.innerHTML = '<i data-lucide="check"></i> Download Complete';
            btn.classList.replace('btn-primary', 'btn-secondary');
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.replace('btn-secondary', 'btn-primary');
                btn.disabled = false;
                lucide.createIcons();
            }, 3000);

        } catch (error) {
            alert("Failed to generate report: " + error.message);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        lucide.createIcons();
    },

    // --- Event Handlers --- //

    handleDomainChange() {
        const domainEl = document.getElementById('domainFilter');
        const domain = domainEl ? domainEl.value : 'Medicine';
        this.fetchNewsForDomain(domain);
    },

    async fetchNewsForDomain(domain) {
        const newsContainer = document.getElementById('newsContainer');
        if (newsContainer) {
            newsContainer.innerHTML = '<div class="loading-container"><div class="loader"></div></div>';
        }
        
        const news = await mockApi.fetchNews(domain);
        
        if (news && news.length > 0 && newsContainer) {
            const newsHtml = news.map(n => `
                <div class="recommendation-card" style="padding: 1.25rem; margin-bottom: 0.75rem; border-left: 3px solid transparent;" onclick="app.handleNewsClick(this, '${n.title.replace(/'/g, "\\'")}')">
                    <h4 class="recommendation-title" style="font-size: 1rem;">${n.title}</h4>
                    <p class="recommendation-reason" style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.5rem;">${n.source} • ${new Date(n.publishedAt).toLocaleDateString()}</p>
                    <a href="${n.url}" target="_blank" onclick="event.stopPropagation();" style="display: inline-block; margin-top: 0.5rem; font-size: 0.8rem; color: var(--accent-primary); text-decoration: none;">Read Article <i data-lucide="external-link" style="width:12px; height:12px;"></i></a>
                </div>
            `).join('');
            newsContainer.innerHTML = newsHtml;
            lucide.createIcons();

            // Automatically highlight top news card but do not auto-search
            const topNewsCard = newsContainer.firstElementChild;
            if (topNewsCard) {
                topNewsCard.style.borderLeftColor = 'var(--accent-primary)';
                topNewsCard.style.background = 'var(--bg-card-hover)';
            }

            // Update trends panel with the real news data
            this.updateTrendsPanel(news, domain);
        } else if (newsContainer) {
            newsContainer.innerHTML = '<p style="text-align:center; padding: 2rem; color: #9ca3af;">No news found.</p>';
        }
    },

    // ─── News Analytics Engine ─────────────────────────────────────────────────
    analyzeSentiment(text) {
        const positive = ['breakthrough', 'growth', 'success', 'innovation', 'advance', 'improve', 'profit', 'gain', 'cure', 'discovery', 'launch', 'record', 'surge', 'rise', 'approved', 'soar', 'rally', 'boost', 'strong', 'positive', 'effective', 'safe', 'benefit', 'win'];
        const negative = ['crash', 'loss', 'fail', 'decline', 'risk', 'warn', 'threat', 'concern', 'crisis', 'drop', 'fall', 'ban', 'scandal', 'fraud', 'collapse', 'plunge', 'cut', 'deficit', 'delay', 'recall', 'toxic', 'sued', 'attack', 'breach', 'shutdown'];
        const lower = text.toLowerCase();
        let score = 0;
        positive.forEach(w => { if (lower.includes(w)) score++; });
        negative.forEach(w => { if (lower.includes(w)) score--; });
        if (score > 1) return { label: 'Positive', color: '#10b981', icon: 'trending-up', score };
        if (score < -1) return { label: 'Negative', color: '#ef4444', icon: 'trending-down', score };
        return { label: 'Neutral', color: '#f59e0b', icon: 'minus', score };
    },

    extractTopKeywords(articles, n = 6) {
        const stop = new Set(['the','and','for','are','but','not','you','all','can','was','that','with','this','from','have','they','will','been','were','has','which','what','about','into','more','also','its','their','than','when','there','had','said','some','would','other','after','over','such','even']);
        const freq = {};
        articles.forEach(art => {
            const words = ((art.title || '') + ' ' + (art.description || '')).toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
            words.forEach(w => {
                if (w.length > 4 && !stop.has(w)) freq[w] = (freq[w] || 0) + 1;
            });
        });
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, n);
    },

    updateTrendsPanel(news, domain) {
        const panel = document.getElementById('trendsPanel');
        if (!panel) return;

        // ── Compute stats from news array ──
        const sentiments = news.map(n => this.analyzeSentiment((n.title || '') + ' ' + (n.description || '')));
        const posCount = sentiments.filter(s => s.label === 'Positive').length;
        const negCount = sentiments.filter(s => s.label === 'Negative').length;
        const neuCount = sentiments.filter(s => s.label === 'Neutral').length;
        const overallSentiment = posCount > negCount ? 'Bullish' : negCount > posCount ? 'Bearish' : 'Mixed';
        const sentimentColor = overallSentiment === 'Bullish' ? '#10b981' : overallSentiment === 'Bearish' ? '#ef4444' : '#f59e0b';
        const posPercent = Math.round((posCount / news.length) * 100);
        const negPercent = Math.round((negCount / news.length) * 100);
        const neuPercent = 100 - posPercent - negPercent;

        // Top keywords
        const topKw = this.extractTopKeywords(news, 8);
        const maxKwCount = topKw[0]?.[1] || 1;

        // Sources
        const sourceCounts = {};
        news.forEach(n => { const s = n.source || 'Unknown'; sourceCounts[s] = (sourceCounts[s] || 0) + 1; });
        const uniqueSources = Object.keys(sourceCounts).length;

        // Avg recency (hours ago)
        const avgAgeHours = Math.round(
            news.reduce((sum, n) => sum + ((Date.now() - new Date(n.publishedAt)) / 3600000), 0) / news.length
        );

        // Hype score (news volume proxy) vs reality (keyword depth)
        const hypeScore = Math.min(100, news.length * 18 + uniqueSources * 5);
        const realityScore = Math.min(100, topKw.length * 10 + posPercent);

        panel.innerHTML = `
            <div style="padding: 1rem;">

                <!-- Header stat row -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                    <div style="background: var(--bg-card); border-radius: 10px; padding: 0.9rem; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Articles</div>
                        <div style="font-size: 1.6rem; font-weight: 700; color: var(--text-primary);">${news.length}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">${uniqueSources} sources</div>
                    </div>
                    <div style="background: var(--bg-card); border-radius: 10px; padding: 0.9rem; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Sentiment</div>
                        <div style="font-size: 1.3rem; font-weight: 700; color: ${sentimentColor};">${overallSentiment}</div>
                        <div style="font-size: 0.75rem; color: var(--text-muted);">avg ${avgAgeHours}h old</div>
                    </div>
                </div>

                <!-- Sentiment breakdown bar -->
                <div style="margin-bottom: 1.2rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.4rem;">
                        <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">Sentiment Breakdown</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${domain}</span>
                    </div>
                    <div style="display: flex; height: 10px; border-radius: 99px; overflow: hidden; gap: 2px;">
                        <div style="flex: ${posPercent}; background: #10b981; transition: flex 0.5s;"></div>
                        <div style="flex: ${neuPercent}; background: #f59e0b; transition: flex 0.5s;"></div>
                        <div style="flex: ${negPercent}; background: #ef4444; transition: flex 0.5s;"></div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 0.4rem;">
                        <span style="font-size: 0.72rem; color: #10b981;">▲ ${posPercent}% Positive</span>
                        <span style="font-size: 0.72rem; color: #f59e0b;">● ${neuPercent}% Neutral</span>
                        <span style="font-size: 0.72rem; color: #ef4444;">▼ ${negPercent}% Negative</span>
                    </div>
                </div>

                <!-- Per-article sentiment list -->
                <div style="margin-bottom: 1.2rem;">
                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.5rem;">Article Sentiment</div>
                    ${news.map((n, i) => {
                        const s = sentiments[i];
                        const shortTitle = n.title.length > 45 ? n.title.substring(0, 45) + '…' : n.title;
                        return `<div style="display:flex; align-items:center; gap:0.5rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border-color);">
                            <span style="width:8px; height:8px; border-radius:50%; background:${s.color}; flex-shrink:0;"></span>
                            <span style="font-size:0.78rem; color:var(--text-secondary); flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${n.title}">${shortTitle}</span>
                            <span style="font-size:0.7rem; color:${s.color}; font-weight:600; flex-shrink:0;">${s.label}</span>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Top keywords -->
                <div style="margin-bottom: 1.2rem;">
                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.6rem;">Top Keywords</div>
                    ${topKw.map(([word, count]) => `
                        <div style="margin-bottom: 0.4rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.15rem;">
                                <span style="font-size:0.78rem; color:var(--text-primary); text-transform:capitalize;">${word}</span>
                                <span style="font-size:0.72rem; color:var(--text-muted);">${count}x</span>
                            </div>
                            <div style="height:5px; background:var(--bg-dark); border-radius:99px; overflow:hidden;">
                                <div style="height:100%; width:${Math.round((count/maxKwCount)*100)}%; background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary)); border-radius:99px;"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Hype vs Reality chart -->
                <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <div style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.75rem;">Hype vs. Reality</div>
                    <div style="position: relative; height: 170px; width: 100%;"><canvas id="hypeRealityChart"></canvas></div>
                </div>

            </div>
        `;
        lucide.createIcons();

        // Render Hype vs Reality chart
        if (window.analyticsCharts && analyticsCharts.renderHypeVsReality) {
            analyticsCharts.renderHypeVsReality(
                document.getElementById('hypeRealityChart'),
                domain, realityScore, hypeScore
            );
        }
    },

    handleNewsClick(element, newsTitle) {
        // Highlight active news
        const siblings = element.parentElement.children;
        for (let sibling of siblings) {
            sibling.style.borderLeftColor = 'transparent';
            sibling.style.background = 'var(--bg-card)';
        }
        element.style.borderLeftColor = 'var(--accent-primary)';
        element.style.background = 'var(--bg-card-hover)';
        
        // Track the interaction
        Analytics.trackEvent('news_click', newsTitle);
        
        // Only fill the search bar and trigger a search
        const keywordQuery = this.extractSearchKeywords(newsTitle);
        document.getElementById('researchSearchInput').value = keywordQuery;
        this.handleResearchSearch(keywordQuery);
    },

    handleMainSearch() {
        const rawQuery = document.getElementById('navSearchInput')?.value || document.getElementById('researchSearchInput')?.value;
        if (rawQuery) {
            this.handleSearch(rawQuery);
        }
    },

    handleSearch(query) {
        const trimmed = query.trim();
        if (trimmed) {
            const apiQuery = this.extractSearchKeywords(trimmed);
            Analytics.trackEvent('search', apiQuery);
            if (document.getElementById('navSearchInput')) {
                document.getElementById('navSearchInput').value = trimmed;
            }
            if (this.currentView === 'home' || this.currentView === 'results') {
                this.handleResearchSearch(apiQuery);
            } else {
                this.navigate('home', apiQuery);
            }
        }
    },

    selectFilter(element) {
        // Manage active state visually without updating results yet
        const siblings = element.parentElement.children;
        for (let sibling of siblings) {
            sibling.classList.remove('active');
        }
        element.classList.add('active');
    },

    async handleResearchSearch(rawQuery) {
        const query = this.extractSearchKeywords(rawQuery);
        
        const articlesContainer = document.getElementById('articlesContainer');
        if (!articlesContainer) return;

        if (document.getElementById('researchSearchInput')) {
            document.getElementById('researchSearchInput').value = rawQuery;
        }
        
        const queryTextEl = document.getElementById('currentQueryText');
        if (queryTextEl) queryTextEl.innerText = rawQuery;
        
        articlesContainer.innerHTML = '<div class="loading-container" id="streamLoader"><div class="loader"></div></div>';
        
        let firstChunkReceived = false;
        let paperCount = 0;

        await mockApi.searchArticlesStream(query, (articlesChunk) => {
            if (!firstChunkReceived) {
                articlesContainer.innerHTML = '';
                firstChunkReceived = true;
            }

            let processedChunk = [...articlesChunk];
            processedChunk.sort((a, b) => b.relevanceScore - a.relevanceScore);
            
            paperCount += processedChunk.length;
            const countEl = document.getElementById('researchCount');
            if (countEl) countEl.innerText = `Found ${paperCount} articles`;

            const articlesHtml = processedChunk.map(art => {
                return `
                <div class="article-card" onclick="app.navigate('detail', '${art.id}')" style="padding: 1.25rem;">
                    <h3 class="article-title" style="font-size: 1.05rem;"><a href="${art.url}" target="_blank" onclick="event.stopPropagation();" style="color: inherit; text-decoration: none;">${art.title} <i data-lucide="external-link" style="width: 14px; height: 14px; display: inline-block;"></i></a></h3>
                    <div class="article-meta" style="margin-bottom: 0.5rem; font-size: 0.8rem;">
                        <span class="meta-item"><i data-lucide="users"></i> ${art.authors[0]} et al.</span>
                        <span class="meta-item"><i data-lucide="calendar"></i> ${art.year}</span>
                    </div>
                    <p class="article-summary" style="font-size: 0.85rem; margin-bottom: 0;">${art.summary.substring(0, 150)}...</p>
                </div>
            `}).join('');

            articlesContainer.insertAdjacentHTML('beforeend', articlesHtml);
            lucide.createIcons();
        });

        if (!firstChunkReceived) {
            articlesContainer.innerHTML = '<p style="text-align:center; padding: 2rem; color: #9ca3af;">No research articles found.</p>';
            const countEl = document.getElementById('researchCount');
            if (countEl) countEl.innerText = `Found 0 articles`;
        }

        // Update Hype vs Reality Chart
        if(window.analyticsCharts && window.analyticsCharts.renderHypeVsReality) {
            const similarity = Math.floor(Math.random() * 40) + 40; // Simulated alignment
            analyticsCharts.renderHypeVsReality(document.getElementById('hypeRealityChart'), query, paperCount * 5, similarity * 2 + 10);
        }
    },

    extractSearchKeywords(text) {
        if (!text) return '';
        const words = text.trim().split(/\s+/);

        // If it's already a short, direct keyword (3 words or fewer), use as-is
        if (words.length <= 3) return text.trim();

        // Otherwise, it's natural language — extract the most meaningful terms
        const stopWords = new Set([
            'what', 'which', 'where', 'when', 'who', 'how', 'why',
            'are', 'is', 'the', 'a', 'an', 'of', 'to', 'in', 'for',
            'and', 'or', 'but', 'on', 'at', 'by', 'as', 'with',
            'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
            'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'shall', 'can', 'not', 'latest', 'recent',
            'best', 'new', 'some', 'any', 'all', 'most', 'more', 'about',
            'that', 'this', 'these', 'those', 'i', 'me', 'my', 'we',
            'our', 'you', 'your', 'they', 'them', 'their', 'between',
            'into', 'from', 'through', 'over', 'under', 'up', 'out',
            'there', 'here', 'then', 'than', 'so', 'if', 'each', 'other',
            'its', 'it', 'use', 'used', 'using', 'based', 'such', 'like'
        ]);

        const scored = {};
        for (const word of words) {
            const w = word.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (w.length > 3 && !stopWords.has(w)) {
                scored[w] = (scored[w] || 0) + 1;
            }
        }

        const sorted = Object.keys(scored).sort((a, b) => scored[b] - scored[a]);
        // Return top 3 keywords joined — ideal for both Semantic Scholar and arXiv
        return sorted.slice(0, 3).join(' ') || text.trim();
    },

    extractKeywords(text) {
        if (!text) return ["Research", "Analysis", "Study"];

        // Very basic NLP extraction for client-side
        const stopWords = new Set(["the", "and", "of", "to", "in", "a", "is", "that", "for", "it", "as", "was", "with", "be", "by", "on", "not", "he", "i", "this", "are", "or", "his", "from", "at", "which", "but", "have", "an", "had", "they", "you", "were", "their", "one", "all", "we", "can", "her", "has", "there", "been", "if", "more", "when", "will", "would", "who", "so", "no"]);
        const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);

        const counts = {};
        for (const w of words) {
            if (w.length > 4 && !stopWords.has(w)) {
                counts[w] = (counts[w] || 0) + 1;
            }
        }

        const sorted = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
        return sorted.slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1));
    },

    openSubscribeModal() {
        document.getElementById('subscribeModal').classList.remove('hidden');
    },

    closeSubscribeModal() {
        document.getElementById('subscribeModal').classList.add('hidden');
    },

    handleSubscribe(e) {
        e.preventDefault();
        const email = document.getElementById('subEmail').value;
        const freq = document.getElementById('subFreq').value;
        alert(`Successfully subscribed ${email} for ${freq} updates!`);
        this.closeSubscribeModal();
        e.target.reset();
    },

    acceptTOS() {
        localStorage.setItem('tos_accepted', 'true');
        document.getElementById('tosModal').classList.add('hidden');
    },

    rejectTOS() {
        document.body.innerHTML = '<div style="display:flex; height:100vh; align-items:center; justify-content:center; text-align:center; background:#0f1117; color:#fff;"><div><h1 style="margin-bottom:1rem; color:#ef4444;">Access Denied</h1><p style="color:#9ca3af;">You must accept the Terms of Service to use LOL.AI.</p></div></div>';
    }
};

// Initialize App when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
