const isValid = (value: any) => {
    return value !== undefined && value !== null && value !== "" && !isEmptyArray(value)
}

const isEmptyArray = (value: any) => {
    return Array.isArray(value) && value.length === 0
}

export const nodeChangesToString = (nodeChanges: Object[]) => {
    const hideKnownAfterApply = false
    let result = ""
    nodeChanges.forEach((nodeChange: any) => {
        result += `${nodeChange.address}:
        actions: ${nodeChange.change.actions.join(", ")}
        `
        nodeChange.change.before && Object.entries(nodeChange.change.before).forEach(([key, value]) => {
            if (isValid(value) && nodeChange.change.after && isValid(nodeChange.change.after[key]) && nodeChange.change.after[key] !== value) {
                result += `~ ${key} = ${value} -> ${nodeChange.change.after[key].toString()}
            `
            } else if (isValid(value) && !hideKnownAfterApply && nodeChange.change.after_unknown && nodeChange.change.after_unknown[key] === true) {
                result += `~ ${key} = ${value} -> (known after apply)
            `
            }
        })
        nodeChange.change.after && Object.entries(nodeChange.change.after).forEach(([key, value]) => {
            if (isValid(value) && (!nodeChange.change.before || !isValid(nodeChange.change.before[key]))) {
                result += `+ ${key} = ${value}
            `
            }
        })
        !hideKnownAfterApply && nodeChange.change.after_unknown && Object.entries(nodeChange.change.after_unknown).forEach(([key, value]) => {
            if (value === true && (!nodeChange.change.before || !isEmptyArray(nodeChange.change.before[key])) && (!nodeChange.change.before || !isValid(nodeChange.change.before[key]))) {
                result += `+ ${key} = (known after apply)
            `
            }
        })
        nodeChange.change.before && Object.entries(nodeChange.change.before).forEach(([key, value]) => {
            if (isValid(value) && (!nodeChange.change.after || !isValid(nodeChange.change.after[key])) && (!nodeChange.change.after_unknown || !nodeChange.change.after_unknown[key])) {
                result += `- ${key} = ${value}
            `
            }
        })
    })
    return result
}