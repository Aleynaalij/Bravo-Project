import { AzureOpenAI } from "openai";

// Thin wrapper around Azure OpenAI (TDD §2.5) — kept behind this one
// function so swapping providers later only touches this file.
export async function generateCompletion(prompt: string): Promise<string> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "Azure OpenAI is not configured — set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME",
    );
  }

  const client = new AzureOpenAI({
    endpoint,
    apiKey,
    deployment,
    apiVersion: "2024-10-21",
  });

  const response = await client.chat.completions.create({
    model: deployment,
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Azure OpenAI returned an empty completion");
  }

  return content;
}
