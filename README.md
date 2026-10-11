# PRCBO-AI-LeadGen

An AI-powered B2B Lead Intelligence and Discovery Platform developed for **PRCBO Tech**.

## 📌 Project Overview
**PRCBO-AI-LeadGen** is designed to streamline and automate high-value lead acquisition. The system leverages automated business discovery (including Google Maps integrations and web scrapers/bots), robust data processing, and state-of-the-art AI analysis to score, categorize, and enrich potential client leads for PRCBO Tech.

---

## 👥 Team Responsibilities
This project is spearheaded by a 4-member internship team structured around core engineering tracks:

1. **Track 1: Full Stack Development**
   - Application architecture, React frontend portal, REST/GraphQL APIs, backend services, and user authentication integration.
2. **Track 2: AI Lead Intelligence**
   - Prompt engineering, intelligent lead scoring models, intent qualification, and business profile analysis.
3. **Track 3: Google Maps / Business Discovery / Bot**
   - Location-based lead discovery, Google Maps Places API integrations, automated scraping bots, and business enrichment pipelines.
4. **Track 4: Data Collection & Processing**
   - Ingestion pipelines for raw lead datasets, data sanitization, deduplication, schema validation, and database storage.

---

## 🛠️ Technology Stack
- **Frontend**: React (Modern component-driven UI)
- **Database & Storage**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **AI Intelligence**: Integrated AI engine (LLM Prompting, Lead Scoring & Analysis)
- **Business Discovery**: Google Maps API & Automated Discovery Crawlers
- **Development IDE**: Antigravity
- **Version Control**: Private GitHub Repository

---

## 📁 Repository Architecture
```text
PRCBO-AI-LeadGen/
├── frontend/               # React client application
├── backend/                # Server-side API & orchestration logic
├── supabase/               # Supabase configuration & migrations
│   ├── migrations/         # PostgreSQL schema definition migrations
│   ├── functions/          # Supabase Edge Functions / serverless handlers
│   └── seed/               # Initial seed data for development
├── ai/                     # AI & Intelligence services
│   ├── prompts/            # Structured prompts & prompt templates
│   ├── lead_scoring/       # Rule-based and model-based scoring algorithms
│   └── lead_analysis/      # Business profile evaluation & summarization
├── data/                   # Data pipelines and datasets
│   ├── imports/            # Raw scraped/imported lead datasets
│   └── processed/          # Sanitized, deduplicated, and enriched outputs
├── docs/                   # Engineering documentation, architectural specs & guides
├── .env.example            # Environment variable template
├── .gitignore              # Git ignore rules
└── README.md               # Main project documentation
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (v3.10+) or runtime designated for backend / data tasks
- Supabase CLI (optional for local emulation)

### 2. Environment Configuration
Copy the template environment file to create your local `.env`:
```bash
cp .env.example .env
```
Populate `.env` with the required keys for Supabase, AI providers, and Google Maps services.

---

## 🔒 Security & Code Standards
- **Zero Secrets Policy**: Never commit `.env`, private keys, API tokens, or production credentials to GitHub.
- **Data Privacy**: Keep raw personal identification data out of version control (handled via `.gitignore` rules in `data/`).
- Follow feature-branch workflows with Pull Request reviews before merging to `main`.
