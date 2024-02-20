export const sendData = (data: Object) => {
    fetch('http://localhost:3000/senddata', {
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
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        const r = await chrome.runtime.sendMessage({ action: "getData" })
        response = {
            message: "Current state",
            state: r.data
        }
        return response
    } else {
        response = await fetch('http://localhost:3000/getdata', {
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
