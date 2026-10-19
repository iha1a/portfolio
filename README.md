# Eng. Hala Samer Makkawi — Portfolio

Software engineer · web, data, networking, security & AI

**Live site:** https://hala-samer-makkawi.vercel.app

Every project below runs in the browser with no build step and no server, and is deployed on Vercel.

| Project | Area | What it does | Stack |
|---|---|---|---|
| [ShopMind](projects/shopmind/) | AI · e-commerce | Natural-language product search, a shopping assistant and cart recommendations using sentence embeddings computed on the device | Transformers.js (all-MiniLM-L6-v2), ONNX Runtime / WebAssembly |
| [StockSense](projects/stocksense/) | Smart system | Demand forecasting with self-tuning Holt exponential smoothing, anomaly detection, safety stock, reorder point and EOQ | JavaScript, statistics, SVG charts |
| [Review Insights AI](projects/ai-reviews/) | AI · NLP | Sentence-level sentiment analysis of customer reviews, aggregated by topic | Transformers.js, DistilBERT (SST-2) |
| [SecureKit](projects/security/) | Cybersecurity | Password audit with k-anonymity breach check, phishing URL analyser, AES-256-GCM encryption | Web Crypto API, PBKDF2, HIBP range API |
| [Office Network & VLSM Planner](projects/network/) | Networking | VLAN design, VLSM address planning and generated Cisco IOS configuration | Subnetting, 802.1Q, DHCP, ACLs |
| [Store Database & SQL Playground](projects/database/) | Databases | 3NF schema with constraints, trigger, view and indexes, queryable live | SQL, SQLite (sql.js / WebAssembly) |
| [Glow Studio](projects/glow/) | Web · e-commerce | Makeup store with shade finder and wishlist | HTML, CSS, JavaScript |
| [Bloom & Petal](projects/bloom/) | Web · e-commerce | Flower shop with search, filters, sizes and a saved bag; bouquets drawn in SVG | HTML, CSS, JavaScript, SVG |

Also featured on the site:

- **Dr.A** — medical German exam trainer, web platform and Android app (Next.js, React, TypeScript, Supabase) — https://dr-a-med.vercel.app
- **HaNotes** — Windows desktop notes app (Electron)
- **FSP Trainer** — interactive case-presentation practice app

## Run locally

Any static server works, for example:

```bash
npx serve .
```

Then open http://localhost:3000.

## Design choices

- Light and dark themes follow the system setting; all motion respects `prefers-reduced-motion`.
- Keyboard accessible: visible focus, dialogs that trap and restore focus, ARIA tabs and live regions.
- The portfolio page uses GSAP (ScrollTrigger) and Lenis for motion and smooth scrolling, with a plain fallback if they fail to load.
- AI models are downloaded once from the Hugging Face hub and cached by the browser; nothing typed is sent to a server.

## Contact

6.ih1a7@gmail.com · Hama, Syria
