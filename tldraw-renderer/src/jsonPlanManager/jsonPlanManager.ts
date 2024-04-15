const isEqual = require('lodash.isequal');

const stringify = (value: any, indentLevel: number = 1): string => {
    const indent = '&nbsp;'.repeat(indentLevel * 4);
    const deeperIndent = '&nbsp;'.repeat((indentLevel + 1) * 4);

    if (Array.isArray(value)) {
        const nonEmptyItems = value.filter(item => !isEmptyValue(item));
        return nonEmptyItems.length > 0
            ? `[\n${nonEmptyItems.map(item => `${deeperIndent}${stringify(item, indentLevel + 1)}`).join(",\n")}\n${indent}]`
            : '';
    } else if (typeof value === 'object' && value !== null) {
        const nonEmptyEntries = Object.entries(value).filter(([_, v]) => !isEmptyValue(v));
        return nonEmptyEntries.length > 0
            ? `{\n${nonEmptyEntries.map(([key, val]) => `${deeperIndent}${key} = ${stringify(val, indentLevel + 1)}`).join(",\n")}\n${indent}}`
            : '';
    } else if (typeof value === 'string') {
        return `"${value}"`;
    } else if (value === null || value === undefined) {
        return '';
    }

    return String(value);
};

// Checks if the value is considered empty (null, undefined, empty array, or empty object)
const isEmptyValue = (value: any): boolean => {
    return (
        value === null ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0) ||
        (typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    );
};


// Updated getValueString function to use stringify utility
const getValueString = (value: any) => stringify(value);


const isEmptyArray = (value: any) => {
    return Array.isArray(value) && value.length === 0
}

// Updated isValid function to check for objects
const isValid = (value: any) => {
    return value !== undefined && value !== null && value !== '' && !isEmptyArray(value) && !isEmptyObject(value);
};

// Check if value is an empty object
const isEmptyObject = (value: any) => {
    return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0;
};

const getColoredAction = (action: string) => {
    switch (action) {
        case "create":
            return `<span class="green-text">${action}</span>`
        case "read":
            return `<span class="blue-text">${action}</span>`
        case "update":
            return `<span class="yellow-text">${action}</span>`
        case "delete":
            return `<span class="red-text">${action}</span>`
        case "no-op":
            return `<span class="gray-text">unchanged</span>`
        default:
            return action
    }
}

const getChanges = (result: string, before: any, after: any, after_unknown: any, showAll: boolean) => {
    before && Object.entries(before).forEach(([key, value]) => {
        const valueString = getValueString(value);
        if (isValid(value) && after && isValid(after[key])) {
            if (!isEqual(after[key], value)) {
                const afterValueString = getValueString(after[key]);
                if (afterValueString !== '') {
                    result += `<span class="yellow-text">~</span> ${key} = ${valueString} <span class="yellow-text">-></span> ${afterValueString}<br>`;
                }
            } else {
                if (valueString !== '' && showAll) {
                    result += `<span class="gray-text">#</span> ${key} = ${valueString}<br>`;
                }
            }
        } else if (isValid(value) && showAll && after_unknown && after_unknown[key] === true) {
            result += `<span class="yellow-text">~</span> ${key} = ${valueString} <span class="yellow-text">-></span> (known after apply)<br>`;
        }
    });

    after && Object.entries(after).forEach(([key, value]) => {
        if (isValid(value) && (!before || !isValid(before[key]))) {
            const valueString = getValueString(value);
            if (valueString !== '') {
                result += `<span class="green-text">+</span> ${key} = ${valueString}<br>`;
            }
        }
    });

    showAll && after_unknown && Object.entries(after_unknown).forEach(([key, value]) => {
        if (value === true && (!before || !before.hasOwnProperty(key) || !isValid(before[key]))) {
            result += `<span class="green-text">+</span> ${key} = (known after apply)<br>`;
        }
    });

    before && Object.entries(before).forEach(([key, value]) => {
        if (isValid(value) && (!after || !after.hasOwnProperty(key) || !isValid(after[key])) && (!after_unknown || after_unknown[key] === false)) {
            const valueString = getValueString(value);
            if (valueString !== '') {
                result += `<span class="red-text">-</span> ${key} = ${valueString}<br>`;
            }
        }
    });

    return result.replace(/\n/g, '<br>'); // Convert newline characters to <br> for HTML display
};

const getResourceId = (mainNodeChange: any) => {
    return mainNodeChange?.change?.before?.id || mainNodeChange?.change?.after?.id;
}

export const nodeChangesToString = (nodeChanges: Object[], showAll: boolean) => {
    let result = "";
    nodeChanges.forEach((nodeChange: any, index) => {
        result += `${nodeChange.address}:<br>\
        actions: ${nodeChange.change.actions.map((action: string) => {
            return getColoredAction(action);
        }).join(", ")}<br>`;
        result = getChanges(result, nodeChange.change.before, nodeChange.change.after, nodeChange.change.after_unknown, showAll)
        if (index !== nodeChanges.length - 1) {
            result += "<br><br>"
        }
    });
    const resourceId = getResourceId(nodeChanges[0])
    return { textToShow: result, resourceId };
};

export type ChangesBreakdown = {
    create: number;
    update: number;
    delete: number;
    unchanged: number;
}

export const getChangesBreakdown = (nodeChanges: Object[]) => {
    const breakdown: ChangesBreakdown = {
        create: 0,
        update: 0,
        delete: 0,
        unchanged: 0
    };

    nodeChanges.forEach((nodeChange: any) => {
        if (nodeChange.change.actions) {
            if (nodeChange.change.actions.length === 1) {
                switch (nodeChange.change.actions[0]) {
                    case "create":
                        breakdown.create++;
                        break;
                    case "update":
                        breakdown.update++;
                        break;
                    case "delete":
                        breakdown.delete++;
                        break;
                    default:
                        breakdown.unchanged++;
                        break
                }
            } else {
                if (nodeChange.change.actions.includes("create") || nodeChange.change.actions.includes("delete") || nodeChange.change.actions.includes("update")) {
                    breakdown.update++;
                } else {
                    breakdown.unchanged++;
                }
            }
        }
    });

    return breakdown;
}