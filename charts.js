// Chart styling configuration to match dark theme
const chartColors = {
    primary: '#6366f1',
    primaryAlpha: 'rgba(99, 102, 241, 0.2)',
    secondary: '#ec4899',
    secondaryAlpha: 'rgba(236, 72, 153, 0.2)',
    tertiary: '#14b8a6',
    text: '#94a3b8',
    grid: 'rgba(255, 255, 255, 0.1)'
};

const commonOptions = {
    color: chartColors.text,
    plugins: {
        legend: { labels: { color: chartColors.text } }
    },
    scales: {
        x: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } },
        y: { grid: { color: chartColors.grid }, ticks: { color: chartColors.text } }
    }
};

class AnalyticsCharts {
    constructor() {
        this.trendChart = null;
        this.radarChart = null;
        this.barChart = null;
        this.relationChart = null;
    }

    renderTrendGraph(ctx, trendData = null) {
        if (this.trendChart) this.trendChart.destroy();
        
        const labels = trendData ? trendData.labels : ['2018', '2019', '2020', '2021', '2022', '2023'];
        const data = trendData ? trendData.data : [0, 0, 0, 0, 0, 0];
        const datasetLabel = trendData && trendData.label ? trendData.label : 'Publications Found';
        
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: datasetLabel,
                    data: data,
                    borderColor: chartColors.primary,
                    backgroundColor: chartColors.primaryAlpha,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                ...commonOptions,
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderTopicComparison(ctx) {
        if (this.radarChart) this.radarChart.destroy();

        this.radarChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['NLP', 'Deep Learning', 'Computer Vision', 'Reinforcement Learning', 'Ethics'],
                datasets: [
                    {
                        label: 'This Article',
                        data: [95, 80, 20, 40, 60],
                        borderColor: chartColors.primary,
                        backgroundColor: chartColors.primaryAlpha,
                        borderWidth: 2
                    },
                    {
                        label: 'Domain Average',
                        data: [60, 70, 50, 50, 40],
                        borderColor: chartColors.secondary,
                        backgroundColor: chartColors.secondaryAlpha,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                color: chartColors.text,
                plugins: { legend: { labels: { color: chartColors.text } } },
                scales: {
                    r: {
                        grid: { color: chartColors.grid },
                        angleLines: { color: chartColors.grid },
                        pointLabels: { color: chartColors.text, font: { size: 12 } },
                        ticks: { display: false }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderTopicRelation(ctx, topic, relatedKeywords = []) {
        if (this.relationChart) this.relationChart.destroy();
        
        const main = topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : 'Query';
        
        // Ensure we have exactly 5 labels and data points
        const labelsList = [main, ...relatedKeywords.map(kw => kw.word)];
        const dataList = [100, ...relatedKeywords.map(kw => kw.score)];
        
        while (labelsList.length < 5) {
            labelsList.push(`Related ${labelsList.length}`);
            dataList.push(40);
        }
        
        // Mock data to show relation between search topic and other fields
        this.relationChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: labelsList.slice(0, 5),
                datasets: [{
                    label: 'Semantic Relevance',
                    data: dataList.slice(0, 5),
                    backgroundColor: chartColors.primaryAlpha,
                    borderColor: chartColors.primary,
                    borderWidth: 2,
                    pointBackgroundColor: chartColors.secondary
                }]
            },
            options: {
                color: chartColors.text,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        grid: { color: chartColors.grid },
                        angleLines: { color: chartColors.grid },
                        pointLabels: { color: chartColors.text, font: { size: 10 } },
                        ticks: { display: false }
                    }
                },
                onClick: (event, activeElements, chart) => {
                    if (activeElements && activeElements.length > 0) {
                        const index = activeElements[0].index;
                        const label = chart.data.labels[index];
                        if (window.app && window.app.handleSearch) {
                            window.app.handleSearch(label);
                        }
                    }
                },
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderKeywordExtraction(ctx, keywords) {
        if (this.barChart) this.barChart.destroy();
        
        // Mock data weights for keywords
        const weights = keywords.map((_, i) => Math.max(10, 100 - (i * 15)));

        this.barChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: keywords,
                datasets: [{
                    label: 'Keyword Relevance Score',
                    data: weights,
                    backgroundColor: chartColors.tertiary,
                    borderRadius: 4
                }]
            },
            options: {
                ...commonOptions,
                indexAxis: 'y', // Horizontal bar chart
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderHypeVsReality(ctx, query, realityScore, hypeScore) {
        if (this.hypeChart) this.hypeChart.destroy();
        
        this.hypeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Reality (Papers)', 'Hype (News)'],
                datasets: [{
                    label: `Metrics for ${query}`,
                    data: [realityScore, hypeScore],
                    backgroundColor: [chartColors.primary, chartColors.secondary],
                    borderRadius: 6
                }]
            },
            options: {
                ...commonOptions,
                plugins: { legend: { display: false } },
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: chartColors.grid }, ticks: { color: chartColors.text } },
                    x: { grid: { display: false }, ticks: { color: chartColors.text } }
                }
            }
        });
    }
}

const analyticsCharts = new AnalyticsCharts();
