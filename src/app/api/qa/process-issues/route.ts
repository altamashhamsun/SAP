import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const { date, rounds, branches, departments } = await req.json();

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }
    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json({ error: "No notepad rounds found for this date" }, { status: 400 });
    }

    const branchListText = branches.map((b: { code: string; name: string }) => `- ${b.code} (${b.name})`).join("\n");
    const deptListText = departments.map((d: { code: string; name: string }) => `- ${d.code} (${d.name})`).join("\n");

    const roundsText = rounds
      .map(
        (r: { branch_code: string; round_number: number; content: string }) =>
          `--- Round ${r.round_number} | Branch ${r.branch_code} ---\n${r.content}`
      )
      .join("\n\n");

    const prompt = `You are a Quality Assurance analyst converting raw notepad notes into a structured issue list.

Date: ${date}

Available branches:
${branchListText}

Available departments:
${deptListText}

Raw notes from all rounds of the day:
${roundsText}

Analyze every line/distinct item in the notes and output a JSON array. Each element must have:
- "branch_code": the branch code from the available list that the issue belongs to (best match; use the most likely one)
- "department": the most relevant department from the available list (name only). If unclear, use "General".
- "description": the issue written in clear, concise English
- "category": one of "Performance", "Compliance", "Non issue", "Development", or "FIR (MAINTENANCE)".
  - Performance = where employee performance lacks
  - Compliance = not meeting standard/compliance requirements
  - Non issue = noted but not actually a problem
  - Development = area for improvement/development
  - FIR (MAINTENANCE) = facility/equipment/image-related/repair issues
- "status": always "Open"
- "repeated": boolean. TRUE if the same or a very similar issue appears more than once across the rounds (duplicates of the same issue).

Rules:
- Merge repeated duplicates of the same issue into a single entry and set repeated=true for it.
- Skip empty lines and pure chatter that is not an issue; "Non issue" categories can be included but flagged.
- Return ONLY a valid JSON array. No extra text, no markdown, no explanation.`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Gemini API error: ${errText}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI did not return valid JSON", raw: text }, { status: 500 });
    }

    const issues = JSON.parse(jsonMatch[0]);

    const cleaned = issues.map((i: Record<string, unknown>, idx: number) => ({
      date,
      issue_number: `QA-${String(idx + 1).padStart(3, "0")}`,
      branch_code: String(i.branch_code || ""),
      department: String(i.department || "General"),
      category: String(i.category || "Non issue"),
      severity: "",
      status: "Open",
      repeated: Boolean(i.repeated),
      description: String(i.description || ""),
      source_rounds: [],
    }));

    return NextResponse.json({ issues: cleaned });
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err}` }, { status: 500 });
  }
}