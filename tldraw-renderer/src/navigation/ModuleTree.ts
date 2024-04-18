export const readTemplate = (template: any, data: any = { items: {} }, prefix: string = "/") => {
    if (!template) return []
    for (const [key, value] of Object.entries(template)) {
        data.items[prefix + key] = {
            index: prefix + key,
            canMove: false,
            isFolder: value !== null,
            children: value !== null ? Object.keys(value as object).map((k) => { return prefix + key + "/" + k }) : undefined,
            data: key.split(".")[1] || key,
            canRename: true
        };

        if (value !== null) {
            readTemplate(value, data, prefix + key + "/");
        }
    }
    return data;
};