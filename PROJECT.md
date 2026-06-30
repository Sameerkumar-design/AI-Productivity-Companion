# FocusCompanion AI: Full-Stack Intelligent Cognitive Workspace
**A unified, context-aware productivity ecosystem powered by Gemini AI orchestration and Google Cloud Firestore.**

---

## 1. Problem Statement

Modern knowledge workers and students struggle with **productivity fragmentation**. Information and intent are scattered across disconnected single-purpose utilities:
* **Separated checklists** that fail to align tasks with high-level objectives.
* **Stand-alone timers** that do not log focus segments against actual deliverables.
* **Isolated notepad drafts** where valuable action items sit idle and unextracted.
* **Disconnected learning decks** requiring manual spaced-repetition tracking.
* **Disjointed calendars/backlogs** (Jira, Notion, Google Calendar) leading to constant context switching.

This fragmentation creates a **cognitive tax**: users spend more energy managing their planning tools than doing deep, high-impact work. Without contextual intelligence, productivity tools remain static logs of the past rather than proactive coaches of the future.

---

## 2. Solution Overview

**FocusCompanion AI** resolves this fragmentation by establishing a **unified, context-aware, full-stack productivity ecosystem**. It consolidates five essential workflows into a single interface, tied together by a server-side **Gemini AI Orchestration layer** and backed by a durable, offline-resilient **Google Cloud Firestore** database.

```
+-----------------------------------------------------------------------+
|                         FocusCompanion AI UI                          |
|  (Planner & Board | Pomodoro Arena | Notepad | Flashcard Pro | Sync)  |
+-----------------------------------+-----------------------------------+
                                    |
                    State Changes & Database Operations
                                    |
                                    v
                  +-----------------------------------+
                  |      Google Cloud Firestore       |
                  |  (Multi-Collection Client Sync)   |
                  +-----------------+-----------------+
                                    |
                         API Requests & Telemetries
                                    |
                                    v
                  +-----------------------------------+
                  |       Full-Stack Express          |
                  |     Server-Side API Proxy         |
                  +-----------------+-----------------+
                                    |
                     Secure SDK Call (Hidden API Key)
                                    |
                                    v
                  +-----------------------------------+
                  |      Gemini 2.5 Flash Engine      |
                  |   (Structured JSON Output API)    |
                  +-----------------------------------+
```

---

## 3. Core Workspace Modules & Workflows

### Module 1: AI Planner & Board
* **Functional Goal**: Tracks daily items, aligns deliverables with milestones, and prioritizes cognitive load.
* **Aesthetic**: Slate-accented borders, interactive priority badges (High, Medium, Low), and nested collapsible items.
* **AI Integration (Sequential Breakdown)**: Users can expand any task and click **"Generate Action Plan"**. This invokes a server-side Gemini request to break down large tasks into 3–5 bite-sized, sequential subtasks, estimated in minutes.
* **Dynamic Goal Alignment**: When checkboxes are completed, linked goal trackers calculate real-time progress percentages, directly persisting progress bars to Firestore.

### Module 2: Pomodoro Arena & Ambient Synth
* **Functional Goal**: Enables deep work blocks with native auditory isolation and performance metrics.
* **Features**:
  * **Interactive Clock**: Quick presets (Focus, Short Break, Long Break) with pulsing ambient visual halos.
  * **Focus Synthesizer**: Implements Web Audio API oscillators to generate clinical binaural beats (4Hz Theta waves for deep focus), low-pass filter ocean sweeps, or brownian-noise rain hums natively in the browser.
  * **Daily Focus Trends Chart**: Visualizes completed sessions over a rolling 7-day period using `recharts` to identify peak cognitive hours.

### Module 3: Smart Notepad Refiner
* **Functional Goal**: Autosaving scratchpad for stream-of-consciousness thoughts and meeting notes.
* **AI Integration**: Features a three-way prompt compiler:
  1. **Summarize**: Converts disorganized thoughts into beautifully structured Markdown summaries.
  2. **Rewrite & Polish**: Sharpens and refines copy for clarity and professional tone.
  3. **Extract To-Dos**: Scans notes, identifies explicit or implicit deliverables, and exposes them with a **"Add Checklist Items"** button, injecting them directly into the Planner.

### Module 4: Flashcard Pro & Learning Decks
* **Functional Goal**: Enhances memory retention with spaced-repetition mechanisms.
* **System**: Users create custom decks (e.g., AWS, Algorithms) and review them in a modern flip-card UI.
* **Recall Rating**: After flipping the card to review the answer, users rate their recall accuracy (Easy, Medium, Hard). This schedules future review intervals (e.g., immediate, 2 days, or 5 days) using spaced-repetition logic.

### Module 5: Connected Workspace Sync
* **Functional Goal**: Unifies external backlogs with the local schedule to combat task switching.
* **Workspace Sandbox Simulator**: Simulates external pipelines by connecting Trello, Atlassian Jira, Notion, and Google Calendar. Users can inject simulated tickets to test the workspace synchronization and imports.

---

## 4. System Architecture & Workflows

The application operates as a full-stack system to keep sensitive API keys hidden from client-side vulnerability.

### A. General Workspace State Workflow
```
+--------------+        1. User Completes Task        +------------------+
|              | -----------------------------------> |                  |
|  React App   |                                      |  Firestore DB    |
|   Client     | <----------------------------------- |  (Custom Named)  |
|              |        2. Real-Time Sync State       |                  |
+--------------+                                      +------------------+
       |
       | 3. POST /api/ai/brief (Telemetry Payload)
       v
+--------------+        4. Orchestrate Prompts        +------------------+
|  Express CJS | -----------------------------------> |  Gemini 2.5      |
|  Production  |                                      |  Flash API       |
|  Server      | <----------------------------------- |  (Structured)    |
|              |        5. Structured JSON Response   |                  |
+--------------+                                      +------------------+
```

### B. Notepad Refiner Sequence Workflow
```
[User Note Draft] --(Autosave 1s Delay)--> [Firestore Collection 'notes']
       |
  (Select Action: "Extract To-Dos" + Click "Enhance Notes")
       |
       v
[Express API POST /api/ai/notepad] 
       |
       +--(Bypass browser key exposure)--> [Initialize Gemini Client SDK]
                                                    |
                                                    v
                                      [Compile Context-Aware System Instruction]
                                                    |
                                                    v
                                      [Request Markdown formatted output]
                                                    |
                                                    v
[React UI Displays AI Panel] <----------------------+
       |
  (Click "Add Checklist Items")
       |
       v
[Parse Task Lines] ---> [Firestore Add Document 'tasks'] ---> [Planner Board Updated]
```

---

## 5. Technology Stack

* **Front-End Framework**: React 18 & TypeScript
* **Build System**: Vite (optimized asset building)
* **CSS & Typography**: Tailwind CSS paired with Google Fonts (**Inter** and **JetBrains Mono**)
* **Charting Engine**: `recharts` (custom Area charts, Tooltips, and responsive canvases)
* **Auditory Isolation Engine**: Browser-native Web Audio API (real-time noise buffers, biquad filters, and stereo panning oscillators)
* **Backend Ingress**: Node.js & Express (compiling TypeScript server-side logic into a standalone production bundle via `esbuild`)

---

## 6. Google Technologies Utilized

### 1. Google Gemini 2.5 Flash API (`@google/genai` SDK)
The core intelligence engine. By utilizing the modern `@google/genai` TypeScript SDK server-side, FocusCompanion AI leverages:
* **JSON Schema Outputs**: Constrains complex task-prioritization briefings and subtask breakdowns to rigid schemas, avoiding AI hallucinations.
* **System Instructions**: Configures custom personas for each route (e.g. Work Management Engine for breakdowns, Productivity Coach for briefings).
* **Token Protection**: Calls are routed entirely through secure Express API controllers, safeguarding the `GEMINI_API_KEY`.

### 2. Google Cloud Firestore
The database backbone. Structured data is persisted across multiple relational-style collections with an automatic LocalStorage fallback:
* **Custom Named Database ID**: Binds connection queries directly to the designated AI Studio Firebase instance (`ai-studio-aiproductivityco-b8b3be73-89ff-4efa-8f9f-b302fed12d83`), resolving connection mismatches.
* **Durable Collections**: Manages schemas for:
  * `tasks`: Task attributes, deadlines, goal mappings, and custom sequential subtask structures.
  * `goals`: Core objectives, categories, target dates, and progress ratios.
  * `pomodoro_sessions`: Timestamps, durations, and task IDs.
  * `flashcards` & `flashcard_decks`: Learning decks, front/back cards, next review intervals, and recall rating values.
  * `notes`: Draft notepad objects.

### 3. Google Cloud Run Ingress
FocusCompanion AI runs inside low-latency Cloud Run containers, configured to run on port `3000`. The Vite development configuration and Express production bundling scripts guarantee responsive, secure user interfaces and lightning-fast load times.
