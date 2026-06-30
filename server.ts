import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with lazy check to prevent startup crash if API key is not yet set
let aiClient: GoogleGenAI | null = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY is not set or is using placeholder. AI features will fallback to deterministic rules.");
      return null;
    }
    try {
      aiClient = new GoogleGenAI({ apiKey });
    } catch (err) {
      console.error("Failed to initialize GoogleGenAI client:", err);
      return null;
    }
  }
  return aiClient;
}

// ------------------ API ROUTES ------------------

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running normally." });
});

// Generate Proactive Daily Brief & Suggestions
app.post("/api/ai/brief", async (req, res) => {
  try {
    const { tasks, goals, history } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Fallback response if Gemini is not initialized or key is missing
      return res.json({
        summary: "Welcome to your Productivity Companion! Your Gemini API key is currently not active in the Secrets tab. We are operating in Local Mode.",
        priorities: [
          "Check upcoming deadlines and organize high priority tasks.",
          "Set actionable daily milestones linked to your key goals.",
          "Use the Pomodoro timer to focus for 25-minute intervals."
        ],
        proactiveTips: [
          "Configure your GEMINI_API_KEY in the Secrets panel to unlock full AI-driven behavioral analysis, contextual reminds, and automated workflow suggestions.",
          "Keep task titles descriptive to allow the offline prioritization engine to evaluate deadlines accurately."
        ]
      });
    }

    const systemPrompt = `You are an expert Productivity Coach & Planning Specialist. Analyze the user's tasks, goals, and history, and generate a highly personalized, motivating daily productivity brief.`;
    
    const userPrompt = `
Analyze the following productivity telemetry:
- ACTIVE TASKS: ${JSON.stringify(tasks)}
- GOALS: ${JSON.stringify(goals)}
- PAST WORKFLOW / RECENT HISTORY: ${JSON.stringify(history)}

Based on this:
1. Write a 2-3 sentence personalized encouragement summary pointing out critical deadlines, workflow trends (e.g. fatigue, afternoon peaks, neglected goals).
2. Recommend the top 3-4 specific priorities they should focus on today, based on upcoming deadlines, task dependencies, or linked goals.
3. Formulate 2 pro-active workflow tips (e.g. 'You have 3 heavy coding tasks due tomorrow; start with the hardest during your high-focus Pomodoro session').

Return a JSON object in this format (strictly match keys, with NO extra markdown formatting outside JSON):
{
  "summary": "...",
  "priorities": ["priority 1", "priority 2", ...],
  "proactiveTips": ["tip 1", "tip 2"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const contentText = response.text || "{}";
    const data = JSON.parse(contentText.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Error in AI daily brief generation:", error);
    res.status(500).json({ error: error.message || "Failed to generate brief" });
  }
});

// Smart Task Breakdown & Subtasks Creation
app.post("/api/ai/breakdown", async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Offline fallback: Simple generic breakdown
      return res.json({
        subtasks: [
          { title: "Define initial requirements & research", duration: 20, priority: "high" },
          { title: "Execute main task deliverables", duration: 45, priority: "medium" },
          { title: "Review, refine, and perform quality checks", duration: 15, priority: "low" }
        ],
        estimatedTotalTime: 80,
        tips: "Tip: Connect your Gemini API Key in AI Studio to receive dynamic, custom task breakdowns tailored precisely to this task's domain."
      });
    }

    const systemPrompt = `You are a Work Management Engine. Your job is to take a large task and break it down into actionable, bite-sized micro-tasks. Each micro-task should be highly realistic, estimated in minutes, and assigned a specific priority level.`;

    const userPrompt = `
Break down the task: "${title}"
Description: "${description || 'None'}"
Category: "${category || 'General'}"

Generate a list of 3 to 5 realistic sequential subtasks.
Return a JSON object in this format:
{
  "subtasks": [
    { "title": "Subtask Name", "duration": 25, "priority": "high" | "medium" | "low" },
    ...
  ],
  "estimatedTotalTime": 90, // Sum of durations
  "tips": "A helpful tips paragraph on how to execute this task successfully."
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse((response.text || "{}").trim());
    res.json(data);
  } catch (error: any) {
    console.error("Error in task breakdown:", error);
    res.status(500).json({ error: error.message || "Failed to generate breakdown" });
  }
});

// Proactive Smart Recommendations Based on History
app.post("/api/ai/recommend-tasks", async (req, res) => {
  try {
    const { history, currentTasks, goals } = req.body;
    const ai = getAIClient();

    if (!ai) {
      return res.json({
        recommendations: [
          { title: "Review upcoming goal deadlines", description: "Stay aligned with your active objectives.", priority: "medium", category: "Planning" },
          { title: "Clean up completed task logs", description: "Keep your workspace tidy.", priority: "low", category: "Maintenance" }
        ]
      });
    }

    const systemPrompt = `You are a proactive AI planning assistant. Predict and recommend next-step tasks the user should create based on their goals and workflow patterns to ensure deadlines are never missed.`;

    const userPrompt = `
Review this context:
- Goals: ${JSON.stringify(goals)}
- Active Tasks: ${JSON.stringify(currentTasks)}
- Workflow History: ${JSON.stringify(history)}

Recommend 2-3 specific, proactive, next-step tasks they should add to their schedule. Ensure these tasks relate to their current goals or fill a gap in their history (e.g. if they have a 'Presentation' task but no 'Practice Presentation' task).
Return a JSON object in this format:
{
  "recommendations": [
    {
      "title": "Recommend Task Name",
      "description": "Why we recommend this, connected to their goals/history",
      "priority": "high" | "medium" | "low",
      "category": "Work" | "Study" | "Personal" | "Health" | "Planning",
      "duration": 30 // Estimated minutes
    },
    ...
  ]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json"
      }
    });

    const data = JSON.parse((response.text || "{}").trim());
    res.json(data);
  } catch (error: any) {
    console.error("Error recommending tasks:", error);
    res.status(500).json({ error: error.message || "Failed to recommend tasks" });
  }
});

// Smart Notepad Refiner & Action Item Extractor
app.post("/api/ai/notepad", async (req, res) => {
  try {
    const { content, action } = req.body;
    const ai = getAIClient();

    if (!content || content.trim() === "") {
      return res.json({ result: "Please write some text in your notepad first!" });
    }

    if (!ai) {
      return res.json({
        result: `### [Local Mode Fallback]\n\nYour Gemini API Key is missing. Here is a simulated response:\n\n**Action Requested:** ${action}\n\n**Raw Draft Content Preview:**\n> ${content.substring(0, 150)}...\n\n*To enable true Gemini AI summaries, action point extraction, or smart layout refinement, configure the GEMINI_API_KEY environment variable in your secrets panel.*`
      });
    }

    let instruction = "";
    if (action === "summarize") {
      instruction = "Generate a beautifully structured markdown summary of the note, highlighting key takeaways with neat bold points, and grouping themes.";
    } else if (action === "refine") {
      instruction = "Rewrite and polish the note to make it highly professional, clean, grammatically perfect, and exceptionally clear. Maintain markdown formatting if any exists.";
    } else if (action === "extract-tasks") {
      instruction = "Scan the note carefully, identify any implied or explicit actions, to-dos, or follow-ups. Output them as an elegant bulleted list of actionable tasks with recommended priorities and estimated durations (in minutes). Add an introductory sentence.";
    } else {
      instruction = "Analyze the provided text and structure it clearly using markdown headings, lists, and clean typography.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Perform action: ${action}\n\nContent:\n${content}`,
      config: {
        systemInstruction: `You are an AI editor and project management analyst. ${instruction}`
      }
    });

    res.json({ result: response.text || "No response generated." });
  } catch (error: any) {
    console.error("Error refining note:", error);
    res.status(500).json({ error: error.message || "Failed to process note" });
  }
});


// ------------------ VITE / STATIC ROUTING ------------------

async function initServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve pre-built static assets from /dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Productivity Companion running on http://localhost:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
