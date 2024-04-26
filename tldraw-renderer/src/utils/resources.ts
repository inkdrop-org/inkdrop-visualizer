export const getResourceNameAndType = (blockId: string) => {
    const resourceType = blockId.split(".") && blockId.split(".").filter(s => s.startsWith("aws_") || s.startsWith("google_")).length > 0 ?
        blockId.split(".").filter(s => s.startsWith("aws_") || s.startsWith("google_"))[0] : undefined
    const resourceName = resourceType && blockId.split(".").filter((s, index) => {
        return index > 0 && blockId.split(".")[index - 1] === resourceType
    })[0].split(" ")[0]
    return { resourceType, resourceName }
}