export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

export function getCurrentFormattedDate() {
    const now = new Date();

    const year = now.getFullYear().toString().slice(-2); // YY
    const month = ('0' + (now.getMonth() + 1)).slice(-2); // MM
    const day = ('0' + now.getDate()).slice(-2); // DD
    const hours = ('0' + now.getHours()).slice(-2); // HH
    const minutes = ('0' + now.getMinutes()).slice(-2); // mm
    const seconds = ('0' + now.getSeconds()).slice(-2); // ss

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}
