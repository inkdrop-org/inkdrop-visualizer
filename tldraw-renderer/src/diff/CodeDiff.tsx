import { DiffEditor } from '@monaco-editor/react';

interface CodeDiffProps {
    oldCode: string
    newCode: string
}
const CodeDiff = ({
    oldCode, newCode
}: CodeDiffProps) => {

    return (
        <>
            <DiffEditor
                theme="vs-dark"
                width={"100%"}
                height={"60vh"}
                original={oldCode}
                modified={newCode}
                options={{
                    readOnly: true,
                    renderSideBySide: true
                }}
                language='hcl'
            />
        </>
    )
}

export default CodeDiff