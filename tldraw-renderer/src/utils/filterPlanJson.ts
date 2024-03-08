
function obfuscateSensitiveValues(obj: any, sensitiveInfo: any): void {
    Object.keys(sensitiveInfo).forEach((key) => {
        if (typeof obj[key] === 'object' && typeof sensitiveInfo[key] === 'object') {
            obfuscateSensitiveValues(obj[key], sensitiveInfo[key]);
        } else if (typeof sensitiveInfo[key] === 'boolean' && sensitiveInfo[key]) {
            obj[key] = "(sensitive)";
        }
    });
}

function sanitizeSensitiveResources(json: any): any {
    const keys = Object.keys(json);

    keys.forEach((key) => {
        if (key.endsWith('_sensitive')) {
            // Extract the corresponding key for non-sensitive data
            const baseKey = key.replace('_sensitive', '');

            if (json[baseKey] !== undefined && typeof json[key] === 'object') {
                // Perform recursive obfuscation
                obfuscateSensitiveValues(json[baseKey], json[key]);
            }
        }
    });

    return json;
}

function sanitizeSensitiveVars(jsonData: any): any {
    if (jsonData !== null && typeof jsonData === 'object') {
        Object.keys(jsonData).forEach(key => {
            const value = jsonData[key];

            // If the current value is an object, recursively process it
            if (typeof value === 'object' && value !== null) {
                sanitizeSensitiveVars(value);
            }

            // If the current key is 'variables', iterate through its properties
            if (key === 'variables' && typeof value === 'object') {
                Object.keys(value).forEach(variableKey => {
                    const variable = value[variableKey];

                    if (variable.sensitive) {
                        variable.default = '(sensitive)'; // Replace the default value
                    }
                });
            }
        });
    }

    return jsonData;
}


export const filterOutNotNeededArgs = (planJson: any) => {
    if (!planJson) return undefined


    const newPlanJson = {
        resource_changes: planJson.resource_changes.map((resourceChange: any) => {
            return {
                ...resourceChange,
                change: sanitizeSensitiveResources(resourceChange.change),
            }
        }),
        configuration: sanitizeSensitiveVars(planJson.configuration)
    }
    return newPlanJson
}