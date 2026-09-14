import OpenAI, { AzureOpenAI } from "openai";

// Isolated behind this one function per TDD §2.5, so the provider can be
// swapped without touching call sites. Currently defaults to a standard
// OpenAI API key (temporary — see docs/TDD.md §2.5) and falls back to
// Azure OpenAI if OPENAI_API_KEY isn't set. Revert to Azure OpenAI before
// this goes near a real federal customer (data residency / enterprise
// terms) — see docs/PRD.md §11.
export async function generateCompletion(prompt: string): Promise<string> {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey) {
    const client = new OpenAI({ apiKey: openaiApiKey });
    const model = process.env.OPENAI_MODEL || "gpt-4o";

    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("OpenAI returned an empty completion");
    return content;
  }

  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
  // No confident default exists for very recent model families — get the
  // exact value from Azure OpenAI Studio's "View Code" sample for this
  // deployment if generation fails with a version/model-support error.
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    throw new Error(
      "No AI provider configured — set OPENAI_API_KEY, or AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_API_KEY/AZURE_OPENAI_DEPLOYMENT_NAME",
    );
  }

  const client = new AzureOpenAI({ endpoint, apiKey, deployment, apiVersion });

  const response = await client.chat.completions.create({
    model: deployment,
    messages: [{ role: "system", content: prompt }],
    response_format: { type: "json_object" },
    // Omitted (not set to a fixed value) for the Azure path: reasoning-tier
    // "-mini" model deployments have historically rejected a non-default
    // temperature outright (400 error) — safer to take the model's default
    // than guess, since we can't confirm this model family's exact
    // constraints. Standard OpenAI path above keeps temperature since
    // gpt-4o-class chat models support it fine.
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Azure OpenAI returned an empty completion");
  return content;
}
