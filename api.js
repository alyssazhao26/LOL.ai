// Live API Integration Service

const apiCache = new Map();

const mockApi = {
    // We maintain the same interface 'mockApi' so app.js doesn't break, but we now fetch real data.
    
    async fetchFromOpenAlex(query) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&filter=from_publication_date:${new Date().getFullYear() - 1}-01-01&per-page=35`;
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error("OpenAlex API failed");
            
            const data = await response.json();
            return data.results.map(work => ({
                id: work.id,
                title: work.title || "Untitled Paper",
                authors: work.authorships ? work.authorships.map(a => a.author.display_name) : ["Unknown"],
                year: work.publication_year || new Date().getFullYear(),
                publicationDate: work.publication_date || new Date().toISOString(),
                source: work.primary_location && work.primary_location.source ? work.primary_location.source.display_name : "OpenAlex",
                citationCount: work.cited_by_count || 0,
                relevanceScore: Math.floor(Math.random() * 20) + 80, // Pseudo-random relevance for demo
                summary: (work.abstract_inverted_index ? "Abstract available on source page..." : "No abstract available.") + ` [Cited by ${work.cited_by_count || 0}]`,
                abstract: work.abstract_inverted_index ? "Abstract available on source page..." : "No abstract available.",
                url: work.doi || work.id || "#",
                keywords: work.concepts ? work.concepts.map(c => c.display_name).slice(0, 3) : [],
                countsByYear: work.counts_by_year || []
            }));
        } catch (error) {
            console.error("OpenAlex failed:", error);
            return [];
        }
    },

    async searchArticlesStream(query, onChunk) {
        // Return from cache instantly if available
        if (apiCache.has(query)) {
            onChunk(apiCache.get(query));
            return; 
        }

        let combinedArticles = [];

        // OpenAlex Stream (Highly reliable)
        const openAlexPromise = this.fetchFromOpenAlex(query)
            .then(articles => {
                if (articles.length > 0) {
                    combinedArticles = combinedArticles.concat(articles);
                    onChunk(articles);
                }
            })
            .catch(err => console.warn("OpenAlex stream failed:", err));

        // arXiv Stream (Has newly published articles, but sometimes rate limits/blocks)
        const arxivPromise = this.fetchFromArxiv(query)
            .then(articles => {
                if (articles.length > 0) {
                    combinedArticles = combinedArticles.concat(articles);
                    onChunk(articles);
                }
            })
            .catch(err => console.warn("arXiv stream gracefully failed or timed out:", err));

        // Wait for both to finish
        await Promise.allSettled([openAlexPromise, arxivPromise]);
        
        if (combinedArticles.length > 0) {
            apiCache.set(query, combinedArticles);
        } else {
            console.warn("No articles found in any API for query:", query);
        }
    },

    async fetchFromArxiv(query) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); 

            // Use https but gracefully catch if it fails
            const arxivUrl = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5&sortBy=submittedDate&sortOrder=descending`;
            const response = await fetch(arxivUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error("arXiv API failed");
            
            const str = await response.text();
            
            await new Promise(resolve => setTimeout(resolve, 0));
            
            const data = new window.DOMParser().parseFromString(str, "text/xml");
            const entries = Array.from(data.querySelectorAll("entry"));

            return entries.map(entry => {
                const idEl = entry.querySelector("id");
                const idStr = idEl ? idEl.textContent.split('/abs/')[1] : Math.random().toString(36).substring(7);
                
                const titleEl = entry.querySelector("title");
                const title = titleEl ? titleEl.textContent.replace(/\n/g, ' ').trim() : "Unknown Title";

                const summaryEl = entry.querySelector("summary");
                const abstract = summaryEl ? summaryEl.textContent.replace(/\n/g, ' ').trim() : "No abstract available.";
                
                const authorEls = entry.querySelectorAll("author name");
                const authors = Array.from(authorEls).map(el => el.textContent);

                const publishedEl = entry.querySelector("published");
                const publishedStr = publishedEl ? publishedEl.textContent : new Date().toISOString();
                const year = new Date(publishedStr).getFullYear();

                return {
                    id: idStr,
                    title: title,
                    authors: authors.length > 0 ? authors : ["Unknown Author"],
                    year: year,
                    publicationDate: publishedStr,
                    source: "arXiv (New)",
                    citationCount: "N/A", 
                    relevanceScore: Math.floor(Math.random() * 20) + 80,
                    summary: abstract.substring(0, 200) + '...',
                    abstract: abstract,
                    url: idEl ? idEl.textContent : "#",
                    keywords: []
                };
            });
        } catch (arxivError) {
            throw new Error("arXiv fetch failed");
        }
    },

    async getArticleDetails(id) {
        // Find article in cache across all queries
        for (const [query, articles] of apiCache.entries()) {
            const article = articles.find(a => a.id === id);
            if (article) return article;
        }
        throw new Error("Article not found in current session cache. Please search again.");
    },

    async getRecommendations(query) {
        try {
            // Use OpenAlex for fast, reliable recommendations
            const fallbackQuery = query ? query + " review" : "artificial intelligence survey";
            const articles = await this.fetchFromOpenAlex(fallbackQuery);
            return articles.slice(0, 3).map(art => ({
                title: art.title,
                reason: art.authors[0] + " et al. • " + art.year,
                id: art.id
            }));
        } catch (error) {
            console.warn("Failed to fetch live recommendations", error);
            return [];
        }
    },
    
    async getRelatedKeywords(query) {
        try {
            if (!query) return [{word: "AI", score: 90}, {word: "Data", score: 85}, {word: "Ethics", score: 70}, {word: "Systems", score: 60}];
            // Extract the most meaningful word from query for Datamuse (last word is usually the core noun)
            const words = query.trim().split(/\s+/);
            const targetWord = words[words.length - 1];
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            
            const response = await fetch(`https://api.datamuse.com/words?rel_trg=${encodeURIComponent(targetWord)}&max=5`, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error("Datamuse failed");
            
            const data = await response.json();
            if (data && data.length > 0) {
                // Return object with normalized score for chart (typically datamuse scores are 1000-2000, normalize to 40-100)
                return data.map(item => ({
                    word: item.word.charAt(0).toUpperCase() + item.word.slice(1),
                    score: Math.min(100, Math.max(40, Math.floor(item.score / 20)))
                }));
            }
            throw new Error("No words returned");
        } catch (error) {
            console.warn("Datamuse semantic fetch failed, falling back", error);
            const q = query ? query.split(' ')[0] : 'Research';
            return [
                {word: `${q} Models`, score: 95}, 
                {word: `${q} Apps`, score: 80}, 
                {word: `${q} Ethics`, score: 65}, 
                {word: `${q} Theory`, score: 55}
            ];
        }
    },
    
    async getTrendData(query) {
        try {
            const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&group_by=publication_year`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error("OpenAlex trend failed");
            
            const data = await response.json();
            
            const currentYear = new Date().getFullYear();
            const years = Array.from({length: 6}, (_, i) => (currentYear - 5 + i).toString());
            
            const counts = years.map(yearStr => {
                const group = data.group_by.find(g => g.key === yearStr);
                return group ? group.count : 0;
            });
            
            return { labels: years, data: counts };
        } catch (error) {
            console.warn("Trend fetch failed", error);
            return null;
        }
    },

    async fetchNews(query) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            const apiKey = 'df335b95ab645fa5ffdc9e4aa7ab2b8c';
            const gnewsUrl = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=5&apikey=${apiKey}`;
            // Proxying through codetabs for fast, reliable CORS bypass
            const url = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(gnewsUrl)}`;
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errText}`);
            }
            
            const data = await response.json();
            return data.articles.map(article => ({
                title: article.title,
                description: article.description,
                url: article.url,
                source: article.source.name,
                publishedAt: article.publishedAt
            }));
        } catch (error) {
            console.warn("News API failed:", error);
            // Fallback mock news if API fails (e.g., rate limits or CORS)
            return [{
                title: `API Error: ${error.message}`,
                description: `The GNews API failed. Please verify the API key, rate limits, or check the browser console.`,
                url: '#',
                source: 'System Error',
                publishedAt: new Date().toISOString()
            }, ...Array.from({length: 4}, (_, i) => ({
                title: `Mock News: Latest developments in ${query} - Part ${i+1}`,
                description: `This is a simulated news summary discussing recent breakthroughs and market impacts in the field of ${query}.`,
                url: '#',
                source: 'Mock Journal',
                publishedAt: new Date().toISOString()
            }))];
        }
    },
    
    async getTrendingTopics() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve([
                    "Quantum Computing", "LLM Alignment", "CRISPR",
                    "Neuromorphic Engineering", "Fusion Energy", "Graph Neural Networks"
                ]);
            }, 100);
        });
    },



    calculateSimilarity(text1, text2) {
        // Lightweight pseudo-cosine similarity using basic word overlap (TF-IDF proxy)
        const getWords = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
        const w1 = getWords(text1);
        const w2 = getWords(text2);
        
        const set1 = new Set(w1);
        const set2 = new Set(w2);
        
        let intersection = 0;
        for (const w of set1) {
            if (set2.has(w)) intersection++;
        }
        
        if (set1.size === 0 || set2.size === 0) return 0;
        
        // Jaccard similarity mapped to a rough cosine approximation
        const jaccard = intersection / (set1.size + set2.size - intersection);
        return Math.min(100, Math.floor((jaccard * 1.5) * 100)); 
    }
};
