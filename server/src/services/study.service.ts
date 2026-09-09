import { LLMClient } from './llm/client.js';

export class StudyService {
  /**
   * Generates a Mermaid mind map or flowchart for the specific question context.
   */
  static async generateMindmap(
    questionPrompt: string,
    answerOutline: string,
    llmClient: LLMClient
  ): Promise<string> {
    const prompt = `You are an expert tutor.
The student is studying for an interview.
Question: "${questionPrompt}"
Answer Context: "${answerOutline}"

Generate a highly structured Mermaid.js mindmap or flowchart that visually breaks down this concept.
Return ONLY valid markdown containing the mermaid code block. 
Example:
\`\`\`mermaid
mindmap
  root((Topic))
    Branch 1
      Detail A
    Branch 2
\`\`\`
Do not include any other text, just the mermaid markdown block. Always use quotes for node labels if using flowchart.`;

    const response = await llmClient.generate(prompt, { temperature: 0.3 });
    return response.trim();
  }

  /**
   * Explains the concept using a specific learning technique.
   */
  static async explainWithTechnique(
    questionPrompt: string,
    answerOutline: string,
    technique: string,
    llmClient: LLMClient
  ): Promise<string> {
    const prompt = `You are an expert technical interviewer and tutor.
The student is studying the following interview question:
Question: "${questionPrompt}"
Key Answer Points: "${answerOutline}"

Please explain this concept deeply using the "${technique}" learning technique.
Make it engaging, memorable, and clear. Format your response beautifully using markdown (bolding, lists, etc).
Do not simply repeat the answer outline. Restructure it according to the requested technique.`;

    const response = await llmClient.generate(prompt, { temperature: 0.5 });
    return response.trim();
  }

  /**
   * Interactive cross-question chat strictly bounded to the current question's topic.
   */
  static async chatWithQuestion(
    questionPrompt: string,
    answerOutline: string,
    message: string,
    history: { role: string; content: string }[],
    llmClient: LLMClient
  ): Promise<string> {
    const systemPrompt = `You are an interactive AI tutor helping a candidate prepare for an interview.
The candidate is currently studying the following specific question:
Question: "${questionPrompt}"
Answer Context: "${answerOutline}"

Your goal is to answer their follow-up queries, test their understanding, and clarify doubts regarding THIS topic.
Keep your answers concise, practical, and conversational. Use markdown for readability.`;

    let conversationContext = '';
    if (history && history.length > 0) {
      conversationContext = history.map(h => `${h.role === 'user' ? 'Student' : 'Tutor'}: ${h.content}`).join('\n') + '\n';
    }

    const fullPrompt = `${conversationContext}Student: ${message}\nTutor:`;

    const response = await llmClient.generate(fullPrompt, {
      systemPrompt,
      temperature: 0.5,
    });

    return response.trim();
  }
}
