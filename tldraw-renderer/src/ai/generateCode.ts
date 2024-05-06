import OpenAI from 'openai';
import { promiseRetry } from '../utils/promiseUtils';

export type CodeChange = {
    resourceId: string;
    code: string;
}

const formatResponse = (response: string): CodeChange[] => {
    // Regex to match each resource section, capturing the ID and associated code block
    const resourceRegex = /Resource ID: ([^\n]+)\n```hcl\n([\s\S]+?)\n```/g;

    let match;
    const changes: CodeChange[] = [];
    // Iterate over each regex match and capture the groups to populate changes
    while ((match = resourceRegex.exec(response)) !== null) {
        const resourceId = match[1].trim();
        const code = match[2].trim();

        changes.push({ resourceId, code });
    }
    return changes;
}

export const generateCode = async (prompt: string) => {
    const openai = new OpenAI({
        apiKey: "xxx",
        dangerouslyAllowBrowser: true,
    });

    const gptResponse = await promiseRetry(() => openai.chat.completions.create({
        model: "gpt-4-1106-preview",
        messages: [{
            role: "user",
            content: prompt
        },
        ],
    }), 5, 3000);

    return formatResponse(gptResponse.choices[0].message?.content || "")
}