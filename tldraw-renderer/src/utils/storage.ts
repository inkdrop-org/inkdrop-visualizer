export const sendData = async (data: Object) => {
    const isDemo = await fetchIsDemo()
    fetch(isDemo ? 'https://demo.inkdrop.ai/senddata' : 'http://localhost:3000/senddata', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
}

export const getData = async () => {
    const isDemo = await fetchIsDemo()
    let response
    if (!isDemo && typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const r = await chrome.runtime.sendMessage({ action: "getData" })
        response = {
            message: "Current state",
            state: r.data
        }
        return response
    } else {
        response = await fetch(isDemo ? 'https://demo.inkdrop.ai/getdata' : 'http://localhost:3000/getdata', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        if (response.status !== 200) {
            return null
        }
        return response.json()
    }
}

export async function fetchIsDemo(): Promise<boolean> {
    try {
        const response = await fetch('/is-demo');
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('Failed to fetch /is-demo', error);
        return false;
    }
}
