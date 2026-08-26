import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

export async function POST(req: NextRequest) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
  }

  try {
    const { items, standards, departmentName } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No findings provided" }, { status: 400 });
    }

    const findingsText = items.filter((i: string) => i.trim()).map((item: string, idx: number) => `${idx + 1}. ${item}`).join("\n");

    if (!findingsText) {
      return NextResponse.json({ error: "No valid findings" }, { status: 400 });
    }

    const prompt = `You are an expert ISO audit analyst. Analyze the following audit findings for the "${departmentName}" department.

The department is certified under these ISO standards: ${standards}

For EACH finding below, provide a JSON array where each element has:
- "original": the original finding text
- "rephrased": a clear, simple English rephrasing of the non-conformity
- "clause": the specific ISO clause number and name that is violated (e.g., "ISO 9001:2015 - Clause 8.5.1 Control of Production and Service Provision")
- "severity": one of "Major NC", "Minor NC", or "Observation"
- "corrective_action": a simple, actionable corrective action to fix the root cause
- "preventive_action": a simple, actionable preventive action to prevent recurrence

Return ONLY a valid JSON array. No extra text, no markdown, no explanation.

Findings:
${findingsText}`;

    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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

    const findings = JSON.parse(jsonMatch[0]);

    return NextResponse.json({ findings });
  } catch (err) {
    return NextResponse.json({ error: `Server error: ${err}` }, { status: 500 });
  }
}
