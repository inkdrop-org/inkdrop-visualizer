export const sendData = async (data: Object) => {
    fetch('/senddata', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
}

export const getData = async () => {
    let response
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id && chrome.runtime.sendMessage) {
        const r = await chrome.runtime.sendMessage({ action: "getData" })
        response = {
            message: "Current state",
            state: r.data
        }
        return response
    } else {
        response = await fetch('/getdata', {
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

export const fetchIsDemo = async () => {
    try {
        const response = await fetch('/is-demo');
        const data = await response.json();
        return data.value;
    } catch (error) {
        console.error('Failed to fetch /is-demo', error);
        return false;
    }
}
