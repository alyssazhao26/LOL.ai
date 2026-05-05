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
                this.renderHomeView();
                break;
            case 'results':
                this.renderResultsView(data);
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

    async renderHomeView() {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active home-container">
                <h1 class="gradient-text">Discover the Future of Research</h1>
                <p>AI-powered insights, real-time trends, and personalized academic exploration.</p>
                
                <div class="hero-search">
                    <i data-lucide="search" class="search-icon"></i>
                    <input type="text" id="mainSearchInput" placeholder="Search topics, keywords, or research questions...">
                    <button class="search-btn" onclick="app.handleMainSearch()">Explore</button>
                </div>

                <div class="trending-section">
                    <h3 style="margin-bottom: 1rem; color: var(--text-secondary);">Trending Topics</h3>
                    <div class="trending-topics" id="trendingTopicsContainer">
                        <div class="loader"></div>
                    </div>
                </div>
            </div>
        `;
        lucide.createIcons();

        // Handle enter key on main search
        document.getElementById('mainSearchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleMainSearch();
        });

        // Fetch and render trending topics
        const topics = await mockApi.getTrendingTopics();
        const topicsHtml = topics.map(topic =>
            `<div class="topic-tag" onclick="app.handleSearch('${topic}')">${topic}</div>`
        ).join('');
        document.getElementById('trendingTopicsContainer').innerHTML = topicsHtml;
    },

    async renderResultsView(query) {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active results-layout">
                <!-- Left Sidebar Filters -->
                <aside class="sidebar glass-panel">
                    <h3>Filters</h3>
                    


                    <div class="filter-group">
                        <h4>Sub Topics</h4>
                        <div class="filter-list" id="fieldFilters">
                            <div class="loading-container"><div class="loader"></div></div>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <h4>Publication Date</h4>
                        <div class="filter-list" id="timeFilters">
                            <div class="filter-tab active" onclick="app.selectFilter(this)">Any Time</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Newly Published</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Within 1 Year</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Within 3 Years</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Within 5 Years</div>
                        </div>
                    </div>
                    
                    <div class="filter-group">
                        <h4>Sort By</h4>
                        <div class="filter-list" id="sortFilters">
                            <div class="filter-tab active" onclick="app.selectFilter(this)">Most Relevant</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Most Cited</div>
                            <div class="filter-tab" onclick="app.selectFilter(this)">Most Recent</div>
                        </div>
                    </div>
                    
                    <button class="btn btn-primary full-width" onclick="app.applyFilters()" style="margin-top: 1rem;">
                        <i data-lucide="refresh-cw"></i> Update
                    </button>
                </aside>

                <!-- Main Column -->
                <section class="main-column">
                    <div class="search-header">
                        <div>
                            <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()" style="margin-bottom: 0.5rem;">
                                <i data-lucide="arrow-left"></i> Back
                            </a>
                            <h2 style="margin-top: 0.5rem;">Results for "<span class="gradient-text">${query}</span>"</h2>
                        </div>
                        <span style="color: var(--text-muted)">Found 4,205 articles</span>
                    </div>
                    <div id="articlesContainer">
                        <div class="loading-container"><div class="loader"></div></div>
                    </div>
                </section>

                <!-- Right Sidebar Recommendations -->
                <aside class="sidebar right-sidebar glass-panel">
                    <h3>Related to "${query}"</h3>
                    
                    <div class="chart-container" style="padding: 1rem; min-height: 220px; margin-bottom: 1.5rem; background: transparent; border: none;">
                        <h4 style="font-size: 0.9rem;">Topic Relation Graph</h4>
                        <div style="position: relative; height: 180px; width: 100%;"><canvas id="relationChart"></canvas></div>
                    </div>



                    <h3>Suggested Articles</h3>
                    <div id="recommendationsContainer">
                        <div class="loading-container"><div class="loader"></div></div>
                    </div>
                </aside>
            </div>
        `;
        lucide.createIcons();

        // Fetch and render data
        // Note: Articles are now fetched and rendered purely by applyFilters() to support streaming.
        const [recs, relatedKeywords] = await Promise.all([
            mockApi.getRecommendations(query),
            mockApi.getRelatedKeywords(query)
        ]);

        // Render Dynamic Sub Topics
        const fieldFilters = document.getElementById('fieldFilters');
        fieldFilters.innerHTML = `
            <div class="filter-tab active" onclick="app.selectFilter(this); app.handleSearch('${query}')">All ${query}</div>
            ${relatedKeywords.map(kw => `<div class="filter-tab" onclick="app.selectFilter(this); app.handleSearch('${kw.word}')">${kw.word}</div>`).join('')}
        `;

        // Render Recommendations
        const recsHtml = recs.map(rec => `
            <div class="recommendation-card" onclick="Analytics.trackEvent('recommendation_click', '${rec.title}'); app.handleSearch('${rec.title}')">
                <h4 class="recommendation-title">${rec.title}</h4>
                <p class="recommendation-reason"><i data-lucide="sparkles"></i> ${rec.reason}</p>
            </div>
        `).join('');
        document.getElementById('recommendationsContainer').innerHTML = recsHtml;

        // Render Relation Graph with dynamic keywords
        analyticsCharts.renderTopicRelation(document.getElementById('relationChart'), query, relatedKeywords);

        lucide.createIcons();
        
        // Trigger article fetching pipeline
        this.applyFilters();
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
                                <h4>Topic Popularity Trend (Citations Over Time)</h4>
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
            
            const trendData = await mockApi.getTrendData(article.title);
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
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 800px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Terms of Service</h1>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Last Updated: May 2026</p>
                    
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        <h3 style="margin-top: 0;">1. Acceptance of Terms</h3>
                        <p>By accessing or using LOL.AI ("the Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the Service.</p>
                        
                        <h3 style="margin-top: 1.5rem;">2. Data Sourcing and API Usage</h3>
                        <p>The research data presented on LOL.AI is sourced directly from third-party academic APIs, specifically the <a href="https://www.semanticscholar.org/product/api" target="_blank" style="color:var(--accent-primary)">Semantic Scholar Graph API</a> (provided by the Allen Institute for AI) and the <a href="https://info.arxiv.org/help/api/" target="_blank" style="color:var(--accent-primary)">arXiv API</a> (provided by Cornell University). By using this platform, you agree to comply with their respective Terms of Use and acknowledge their rate limits.</p>
                        
                        <h3 style="margin-top: 1.5rem;">3. Cybersecurity & Data Integrity</h3>
                        <p>We enforce strict cybersecurity protocols to protect your research and queries. You agree not to attempt to compromise the system's security, reverse-engineer our AI models, or inject malicious payloads. We maintain the right to terminate access for any suspicious or harmful activities.</p>
                        
                        <h3 style="margin-top: 1.5rem;">4. Intellectual Property</h3>
                        <p>The AI-generated summaries and analytics provided by LOL.AI are synthesized from third-party sources. You must appropriately cite original sources (Semantic Scholar and arXiv) and use the provided insights responsibly.</p>
                    </div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    renderPrivacyView() {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 800px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Privacy & Data Policy</h1>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Strict adherence to Global Data Protection Standards</p>
                    
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        <h3 style="margin-top: 0;">1. Zero-Log Policy on Search Queries</h3>
                        <p>Your research is your own. We do not persistently log, track, or sell your specific search queries. Queries are processed in real-time, encrypted in transit, and discarded after generating results.</p>
                        
                        <h3 style="margin-top: 1.5rem;">2. Data Anonymization</h3>
                        <p>Any telemetry or usage data collected to improve our AI models is strictly anonymized and aggregated. No personally identifiable information (PII) is ever linked to your research topics.</p>
                        
                        <h3 style="margin-top: 1.5rem;">3. Cybersecurity Protocols</h3>
                        <p>We employ end-to-end encryption (E2EE) for all data transmissions (TLS 1.3). Our infrastructure undergoes regular penetration testing and is audited against SOC 2 and ISO 27001 standards to ensure your data remains uncompromised.</p>
                        
                        <h3 style="margin-top: 1.5rem;">4. Third-Party Services</h3>
                        <p>We do not share your profile or research habits with third-party advertisers. Data exchanged with our academic API partners is sanitized to remove user identifiers.</p>
                    </div>
                </main>
            </div>
        `;
        lucide.createIcons();
    },

    renderEthicsView() {
        const appContent = document.getElementById('appContent');
        appContent.innerHTML = `
            <div class="view active standard-page">
                <main style="max-width: 800px; margin: 0 auto; padding: 2rem;">
                    <a href="#" class="back-btn" onclick="event.preventDefault(); app.goBack()">
                        <i data-lucide="arrow-left"></i> Back
                    </a>
                    <h1 class="gradient-text" style="margin-top: 1rem;">Ethical Use & AI Protocols</h1>
                    <p style="color: var(--text-muted); margin-bottom: 2rem;">Commitment to Responsible AI Research</p>
                    
                    <div class="content-block glass-panel" style="padding: 2rem;">
                        <div class="insight-panel" style="margin-bottom: 2rem;">
                            <h3 style="margin-top: 0;"><i data-lucide="shield-check"></i> Core Ethical Mandate</h3>
                            <p style="margin-bottom: 0;">LOL.AI is designed to augment human intelligence using verifiable public data from arXiv and Semantic Scholar. We prioritize truth, transparency, and the mitigation of bias in all AI-generated content.</p>
                        </div>

                        <h3>1. Bias Mitigation & Fairness</h3>
                        <p>Our AI models are continuously evaluated for systemic biases. We actively tune our retrieval-augmented generation (RAG) pipelines to ensure diverse perspectives and prevent the amplification of discriminatory or biased literature.</p>
                        
                        <h3 style="margin-top: 1.5rem;">2. Transparency & Hallucination Prevention</h3>
                        <p>AI can make mistakes. All AI-generated summaries on LOL.AI are strictly grounded in verifiable, peer-reviewed sources from the Semantic Scholar Graph API and arXiv. We provide transparency scores and direct links to origin materials to prevent hallucinations.</p>
                        
                        <h3 style="margin-top: 1.5rem;">3. Cybersecurity as an Ethical Duty</h3>
                        <p>We view cybersecurity not just as a technical requirement, but as an ethical imperative. Protecting user data against unauthorized access, leaks, and exploitation is fundamental to our trust model.</p>
                        
                        <h3 style="margin-top: 1.5rem;">4. Academic Integrity</h3>
                        <p>LOL.AI strictly prohibits the use of its platform to facilitate plagiarism, academic fraud, or the generation of deceptive research papers. Users are expected to uphold the highest standards of academic honesty and appropriately cite arXiv and Semantic Scholar.</p>
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

    handleMainSearch() {
        const rawQuery = document.getElementById('mainSearchInput').value.trim();
        if (rawQuery) {
            const apiQuery = this.extractSearchKeywords(rawQuery);
            Analytics.trackEvent('search', apiQuery);
            document.getElementById('navSearchInput').value = rawQuery; // Keep original in nav bar for display
            this.navigate('results', apiQuery);
        }
    },

    handleSearch(query) {
        const trimmed = query.trim();
        if (trimmed) {
            const apiQuery = this.extractSearchKeywords(trimmed);
            Analytics.trackEvent('search', apiQuery);
            document.getElementById('navSearchInput').value = trimmed;
            this.navigate('results', apiQuery);
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

    async applyFilters() {
        // Show loading state initially
        const articlesContainer = document.getElementById('articlesContainer');
        articlesContainer.innerHTML = '<div class="loading-container" id="streamLoader"><div class="loader"></div></div>';

        // Fetch new data with keyword-extracted query
        const rawQuery = document.getElementById('navSearchInput').value || "machine learning";
        const query = this.extractSearchKeywords(rawQuery);
        
        let firstChunkReceived = false;

        const timeFilterEl = document.querySelector('#timeFilters .filter-tab.active');
        const sortFilterEl = document.querySelector('#sortFilters .filter-tab.active');
        const timeFilter = timeFilterEl ? timeFilterEl.textContent : "Any Time";
        const sortFilter = sortFilterEl ? sortFilterEl.textContent : "Most Relevant";

        // Progressive stream rendering
        await mockApi.searchArticlesStream(query, (articlesChunk) => {
            if (!firstChunkReceived) {
                // Clear the full-screen loader on the first incoming chunk
                articlesContainer.innerHTML = '';
                firstChunkReceived = true;
            }

            // Clone to avoid mutating cache
            let processedChunk = [...articlesChunk];
            const now = new Date();
            
            // Filter by time
            if (timeFilter === "Newly Published") {
                processedChunk = processedChunk.filter(a => (now - new Date(a.publicationDate)) < 30*24*60*60*1000);
            } else if (timeFilter === "Within 1 Year") {
                processedChunk = processedChunk.filter(a => (now.getFullYear() - a.year) <= 1);
            } else if (timeFilter === "Within 3 Years") {
                processedChunk = processedChunk.filter(a => (now.getFullYear() - a.year) <= 3);
            } else if (timeFilter === "Within 5 Years") {
                processedChunk = processedChunk.filter(a => (now.getFullYear() - a.year) <= 5);
            }

            // Sort
            if (sortFilter === "Most Cited") {
                processedChunk.sort((a, b) => (b.citationCount === 'N/A' ? 0 : b.citationCount) - (a.citationCount === 'N/A' ? 0 : a.citationCount));
            } else if (sortFilter === "Most Recent") {
                processedChunk.sort((a, b) => new Date(b.publicationDate) - new Date(a.publicationDate));
            } else { // Most Relevant
                processedChunk.sort((a, b) => b.relevanceScore - a.relevanceScore);
            }

            if (processedChunk.length === 0 && firstChunkReceived) {
                articlesContainer.insertAdjacentHTML('beforeend', '<p style="text-align:center; padding: 2rem; color: #9ca3af;">No articles match the selected filters in this batch.</p>');
                return;
            }

            const articlesHtml = processedChunk.map(art => `
                <div class="article-card" onclick="app.navigate('detail', '${art.id}')">
                    <h3 class="article-title"><a href="${art.url}" target="_blank" onclick="event.stopPropagation();" style="color: inherit; text-decoration: none;">${art.title} <i data-lucide="external-link" style="width: 14px; height: 14px; display: inline-block;"></i></a></h3>
                    <div class="article-meta">
                        <span class="meta-item"><i data-lucide="users"></i> ${art.authors[0]} et al.</span>
                        <span class="meta-item"><i data-lucide="calendar"></i> ${art.year}</span>
                        <span class="meta-item"><i data-lucide="book-open"></i> ${art.source}</span>
                        <span class="meta-item"><i data-lucide="bar-chart-2"></i> ${typeof art.citationCount === 'number' ? art.citationCount.toLocaleString() : art.citationCount} citations</span>
                    </div>
                    <p class="article-summary">${art.summary}</p>
                    <div class="article-footer">
                        <span class="relevance-badge">Relevance: ${art.relevanceScore}%</span>
                        <button class="btn btn-secondary">View Details</button>
                    </div>
                </div>
            `).join('');

            articlesContainer.insertAdjacentHTML('beforeend', articlesHtml);
            lucide.createIcons();
        });

        // If both APIs returned zero results and stream ended
        if (!firstChunkReceived) {
            articlesContainer.innerHTML = `
                <div class="content-block" style="text-align:center; padding: 3rem;">
                    <i data-lucide="alert-circle" style="width:48px;height:48px;color:var(--text-muted);margin-bottom:1rem;"></i>
                    <h3 style="color:var(--text-primary)">No articles found</h3>
                    <p style="color:var(--text-secondary)">Please try refining your search keywords.</p>
                </div>
            `;
            lucide.createIcons();
        } else {
            // Remove the loader if it somehow remained (e.g. appended at bottom if we redesign it later)
            const loader = document.getElementById('streamLoader');
            if (loader) loader.remove();
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
