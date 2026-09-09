# AI Interview Prep Kit Generator 🚀

> An end-to-end, AI-powered interview preparation platform and CLI evaluator. It transforms job descriptions and company URLs into structured, personalized interview prep kits featuring company research briefs, requirement-mapped question banks, flashcards, interactive practice modes, and difficulty-weighted study schedules.

---

## 🌐 Live Application & Walkthrough

* **Live Web App**: [https://interview-prep-kit-av2m.onrender.com/](https://interview-prep-kit-av2m.onrender.com/)
* **Video Walkthrough (YouTube)**: [https://youtu.be/wqhCc3W8lPI](https://youtu.be/wqhCc3W8lPI)
* **API Health Check**: [https://interview-prep-kit-av2m.onrender.com/api/health](https://interview-prep-kit-av2m.onrender.com/api/health)

---

## 📑 Table of Contents
1. [Overview & Tech Stack](#-overview--tech-stack)
2. [Quick Start & Local Setup](#-quick-start--local-setup)
3. [Batch CLI Evaluation](#-batch-cli-evaluation)
4. [LLM Provider & Model Selection](#-llm-provider--model-selection)
5. [System Architecture & Pipeline Sequencing](#-system-architecture--pipeline-sequencing)
6. [Retrieval Approach & Web Research Engine](#-retrieval-approach--web-research-engine)
7. [State Representation & Regeneration Logic (`_state`)](#-state-representation--regeneration-logic-_state)
8. [Deterministic Schedule Allocation Algorithm](#-deterministic-schedule-allocation-algorithm)
9. [Creative Features](#-creative-features)
10. [Security & Crawler Protection](#-security--crawler-protection)
11. [Edge-Case Handling Matrix](#-edge-case-handling-matrix)
12. [Key Design Decisions & Trade-Offs](#-key-design-decisions--trade-offs)

---

## 💡 Overview & Tech Stack

### Tech Stack & Justification

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend UI** | Next.js 14 (App Router), TypeScript, Tailwind CSS | High performance, instant page navigation, responsive grid layouts, and high-contrast monochromatic black & white accessibility theme. |
| **Backend API** | Node.js, Express, TypeScript | Non-blocking, asynchronous execution framework optimized for multi-step pipeline orchestration and real-time Server-Sent Events (SSE). |
| **Persistence** | Dual Storage Engine (MongoDB + In-Memory Fallback) | Zero-setup immediate local execution (`inMemoryDb.ts`) fallback if MongoDB is unavailable, with full MongoDB Mongoose schema compatibility. |
| **AI / LLM Engine** | `@google/generative-ai` (Google Gemini 3.5 Flash Lite) | Low latency (~1.2s response speed), structured JSON output support, high context window (1M tokens), and resilient generation capabilities. |
| **Testing** | Vitest | Fast, native ESM unit test runner validating SSRF security, scraper cleaner, TTL cache, rate limiter, DI container, pipeline engine, coverage calculations, scheduling algorithms, SM-2 spaced repetition, and schema repair (66/66 passing across 11 test files). |

---

## ⚡ Quick Start & Local Setup

### 1. Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher
* **Google Gemini API Key** (`GEMINI_API_KEY`)

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GEMINI_MODEL="gemini-3.5-flash-lite"
PORT=3001
JWT_SECRET="super-secret-jwt-key-2026"
MONGODB_URI="mongodb://127.0.0.1:27017/interview_prep_kit"
```

### 3. Installation & Run
```bash
# Install all dependencies (workspaces auto-linked)
npm run setup

# Start both backend API (port 3001) and client frontend (port 3000)
npm run dev
```

Open `http://localhost:3000` in your web browser.

---

## 🧪 Batch CLI Evaluation

The application includes an automated batch CLI evaluator script (`scripts/evaluate.ts`) that reads batch job descriptions and outputs fully structured prep kits matching Appendix B schemas.

### Usage Command
```bash
npm run evaluate -- --input test-cases.json --output test-kits.json
```

### Input Format (`test-cases.json`)
```json
[
  {
    "id": "case-01",
    "jd": "We are seeking a Senior Backend Engineer to build scalable payment APIs...",
    "company_url": "https://stripe.com",
    "days": 5
  }
]
```

### Output Format (`test-kits.json`)
Outputs an array of complete prep kits matching Appendix B specifications, including role breakdown, requirement mapping, questions, flashcards, and study schedule.

---

## 🤖 LLM Provider & Model Selection

* **Provider**: Google Gemini API via official `@google/generative-ai` SDK.
* **Model**: `gemini-3.5-flash-lite`.
* **Justification**: Selected for its exceptional response speed (avg ~1.2 seconds), cost efficiency, native JSON schema mode, and large context window allowing full raw JD text and crawled web pages to be processed in a single prompt context.

---

## 🏗️ System Architecture & Pipeline Sequencing

The core processing engine uses a **Chain of Responsibility** pattern. When a user requests a kit, `runPipeline()` sequentially invokes 8 distinct pipeline step handlers while emitting progress updates over SSE:

```
[JD + Company URL]
       │
       ▼
 1. Extract Requirements  ──► Extracts role title, seniority, responsibilities & requirement IDs
       │
       ▼
 2. Crawl & Research      ──► Crawls company website + searches public interview discussions
       │
       ▼
 3. Generate Brief        ──► Synthesizes company mission, tech stack & interview process
       │
       ▼
 4. Generate Questions    ──► Creates technical, behavioural & situational questions
       │
       ▼
 5. Gap Filling Loop      ──► Deterministic coverage check + LLM gap-filling passes
       │
       ▼
 6. Generate Flashcards   ──► Creates flashcards linked to requirement IDs
       │
       ▼
 7. Build Schedule        ──► Difficulty-weighted daily study time allocator
       │
       ▼
 8. Assemble Kit          ──► Validates schema, repairs missing fields & saves to database
```

### Coverage Pass Strategy (Max 3 Passes)

The pipeline runs a maximum of **3 coverage passes**, chosen as a balance between thoroughness and LLM token budget:

1. **Pass 1 (Initial)**: After generating all questions across 4 categories, the deterministic coverage checker identifies any must-have requirements with zero question coverage.
2. **Pass 2 (Gap Fill)**: Uncovered requirements are sent to the LLM with targeted gap-filling prompts. This resolves the vast majority of gaps (typically 90%+).
3. **Pass 3 (Final)**: A final pass catches any remaining edge cases — requirements where the gap-fill LLM response missed the target or returned malformed output.

Stopping at 3 passes prevents infinite loops when the LLM consistently fails to produce questions that reference a specific requirement ID. Any remaining uncovered requirements after 3 passes are recorded honestly in `coverage.uncovered_requirement_ids`.

---

## 🌐 Retrieval Approach & Web Research Engine

1. **Company Site Crawler (`crawler.ts`)**:
   * Domain-locked traversal to prevent crawler escape.
   * Token-bucket rate limiter: 2-request burst capacity, ~1.5s refill per domain, preventing aggressive scraping.
   * Parses `robots.txt` rules prior to scraping.
   * Strips HTML navigation, footers, scripts, and styling tags to extract clean text.

2. **Public Discussion Scraper (`scraper.service.ts`)**:
   * Uses DuckDuckGo search scraper to find public interview experiences (e.g. Glassdoor, Reddit, Blind).
   * Aggregates interview formats, technical question styles, and common hiring steps.

3. **Attribution & Source Transparency**:
   * All fetched URLs are logged in `source.pages_used` and `company_brief.sources`.

---

## 🔄 State Representation & Regeneration Logic (`_state`)

To allow users to reshape their kit without losing manual edits during regeneration:

* **Item Provenance Field (`_state`)**:
  * `'generated'`: Created automatically by the AI pipeline.
  * `'edited'`: Modified inline by the user.
  * `'user_created'`: Manually added by the user.

* **Non-Clobbering Regeneration Policy**:
  * When a user triggers category regeneration or gap-filling, items tagged `'edited'` or `'user_created'` are **pinned and preserved**.
  * Only items with `_state === 'generated'` are refreshed or replaced.

---

## ⏱️ Deterministic Schedule Allocation Algorithm

Allocates available study days ($D$) into integer minute daily study budgets:

1. **Question Difficulty Weighting**:
   $$W(q) = \text{difficulty}(q) \times (\text{category} == \text{'technical'} ? 1.5 : 1.0)$$

2. **Daily Proportional Time Budget**:
   $$\text{Minutes}(d) = \left\lfloor \frac{\sum_{q \in Q_d} W(q)}{\sum_{q \in Q} W(q)} \times (D \times 60) \right\rfloor$$

3. **Remainder Adjustment**: Any rounding remainder between $\sum \text{Minutes}(d)$ and $D \times 60$ is assigned to the day with the heaviest workload. A floor of 15 minutes minimum per day is strictly enforced.

---

## 🌟 Creative Features

1. **Interactive Live AI Mock Practice Mode**:
   * Users can enter timed mock interview mode for any question.
   * Responses are evaluated by AI to produce a **0–100 score**, key strengths breakdown, areas for improvement, and a model ideal answer.

2. **Spaced-Repetition Flashcard Trainer**:
   * Interactive flashcards with confidence rating options (1–5).
   * Cards with lower confidence ratings are automatically prioritized in subsequent review sessions.

3. **Calculated Readiness Index & Printable Cheatsheet**:
   * Aggregates requirement coverage, flashcard mastery, and practice test scores into an overall percentage readiness score.
   * Provides a clean 1-page printable interview summary format.

---

## 🛡️ Security & Crawler Protection

1. **SSRF Prevention & URL Validation (`urlValidator.ts`)**:
   * All user-submitted URLs are validated prior to HTTP request dispatch.
   * Private IPv4/IPv6 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.1`, `169.254.169.254`, `::1`) and `localhost` are rejected with `400 Bad Request`.

2. **Sanitization & Size Caps**:
   * Response bodies capped at 5MB per page.
   * Untrusted HTML content stripped of executable scripts (`<script>`), inline event handlers (`onload`), and external resources.

3. **Rate Limiting**:
   * Express endpoints protected with rate limiters (`100 requests / 15 minutes`).

---

## 📊 Edge-Case Handling Matrix

| Scenario | Handled Behavior |
|---|---|
| **Thin Job Description** (<100 chars) | Activates multi-key sentence/bullet point fallback extractor producing 5–8 synthetic requirements. |
| **Invalid / Unreachable Company URL** | Logs warning, skips crawl step gracefully, and proceeds using JD-only text. |
| **No Public Discussion Discovered** | Brief engine falls back to domain-level analysis and standard industry interview practices. |
| **Malformed LLM JSON Response** | Triggers regex JSON extractor + default fallback schema repair loop. |
| **Transient LLM Rate Limit (429)** | Exponential backoff retry (up to 3 attempts with 2s/4s delays). |
| **Short (1-Day) or Long (60-Day) Schedule** | Dynamic time budget algorithm scales linearly while clamping daily minutes (15 min min, 240 min max). |
| **Duplicate JD + Company Submission** | Returns existing kit if same user has already generated one for the same JD text and company URL. |

---

## ⚖️ Key Design Decisions & Trade-Offs

1. **Dual Storage Engine (In-Memory + MongoDB)**:
   * *Trade-off*: In-memory mode clears saved kits when the backend server restarts.
   * *Decision*: Ensures zero friction for immediate review and testing without requiring a live MongoDB cluster connection.

2. **Cheerio HTML Parser vs Headless Puppeteer**:
   * *Trade-off*: Cheerio cannot execute client-side JavaScript rendering on Single Page Applications (SPAs).
   * *Decision*: Cheerio yields 10x faster crawl speeds and significantly lower memory footprint without heavy browser dependencies.

3. **Server-Sent Events (SSE) for Progress**:
   * *Trade-off*: SSE is unidirectional (server -> client).
   * *Decision*: Ideal lightweight fit for real-time progress bar streaming without the overhead of full WebSockets.

---

## 📜 Submission Verification & Test Health

- **Live URL**: [https://interview-prep-kit-av2m.onrender.com/](https://interview-prep-kit-av2m.onrender.com/)
- **Unit Tests**: 66 / 66 Vitest unit tests passing across 11 test files (`npm test`)
- **CLI Batch Evaluator**: Fully operational (`npm run evaluate -- --input test-cases.json --output test-kits.json`)
