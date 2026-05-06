# LOL.ai | Research-to-Market Intelligence Dashboard

**LOL.ai** is a platform that bridges the gap between academic research and industry trends. By synchronizing real-time news data with scholarly publications, LOL.ai identifies "Innovation Gaps"—areas where scientific breakthroughs haven't yet reached commercial saturation.

### 🚀 Key Features
* **Dual-Stream Synchronization:** Simultaneous tracking of **GNews** (Market Demand) and **ArXiv/OpenAlex** (Scientific Supply).
* **Automated Sentiment Analysis:** Real-time NLP processing of trending headlines to gauge market mood.
* **Visual Analytics:** Interactive radar charts and popularity trends to visualize keyword relevance and citation growth over time.
* **SOTA Orchestration:** Engineered using **Google Antigravity** agents for rapid prototyping and multi-agent data fetching.

---

## 🛠 Installation & Replication

This project is optimized for deployment via **Vercel** and uses a modular JavaScript architecture for easy API swapping.

### 1. Repository Setup
Clone or fork this repository to your local machine or your own GitHub account:
```bash
git clone https://github.com/alyssazhao26/LOL.ai.git
```

### 2. API Configuration
The application integrates with the following free-tier APIs:
* **GNews**: For real-time headlines.
* **OpenAlex & Semantic Scholar**: For academic metadata.
* **ArXiv**: For pre-print research access.

> [!IMPORTANT]
> To modify your endpoints or add paid keys for higher rate limits (GNews free tier is limited to 100 requests/day), navigate to `src/API.js`.

### 3. Deployment
This dashboard is designed for seamless CI/CD via Vercel:
1.  Navigate to the [Vercel Dashboard](https://vercel.com).
2.  Import your GitHub repository.
3.  Keep all settings as **default** (Vercel will automatically detect the build framework).
4.  Click **Deploy**. Your live analytics tool will be ready in seconds.

---

## ⚖️ Disclaimer
This tool is for educational and research purposes. All APIs used are publicly available. AI-generated insights and summaries are based on the latest available data but should be reviewed with professional judgment as they may occasionally include model hallucinations.
