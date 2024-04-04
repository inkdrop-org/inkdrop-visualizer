type MacroCategory = 'Compute' | 'Networking' | 'Security' | 'Databases' | 'Other';

export const getMacroCategory = (category: string) => {
    const macroCategories: { [key: string]: MacroCategory } = {
        // Compute categories
        'Compute': 'Compute',
        'Container Orchestration': 'Compute',
        'Edge Computing': 'Compute',
        'Infrastructure': 'Compute',

        // Networking categories
        'Content Delivery': 'Networking',
        'DNS': 'Networking',
        'Networking': 'Networking',

        // Security categories
        'Access Management': 'Security',
        'Certificate Management': 'Security',
        'Compliance': 'Security',
        'DDoS Protection': 'Security',
        'Encryption': 'Security',
        'IAM': 'Security',
        'Identity Store': 'Security',
        'Secrets Management': 'Security',
        'Security': 'Security',
        'Web Security': 'Security',

        // Databases categories
        'Databases': 'Databases',
        'Data Management': 'Databases',
        'Graph Database': 'Databases',
        'In-Memory Database': 'Databases',
        'NoSQL Database': 'Databases',
        'Time Series Database': 'Databases',

        // This serves as a default for categories not explicitly mapped above
    };

    // Default to other if category doesn't match the predefined mappings
    return macroCategories[category] || 'Other';
}
