export const promptBuild = (userInput: string, selectedResource: {
    id:string,
    code: string
}, dependencies: {
    id: string,
    code: string
}[]) => {
    return `I have the following Terraform resource:
Resource ID: ${selectedResource.id}
\`\`\`hcl
${selectedResource.code}
\`\`\`
The above resource has the following dependencies:
${dependencies.map((d) => {
    return `Resource ID: ${d.id}
\`\`\`hcl
${d.code}
\`\`\``}).join('\n')}
Your task is: ${userInput}

Please make changes to the above code to achieve the task.

Structure your answer as follows:
Resource ID: <resource_id_1>
\`\`\`hcl
<new resource 1 code (in full)>
\`\`\`

Resource ID: <resource_id_2>
\`\`\`hcl
<new resource 2 code (in full)>
\`\`\`

...
`
}