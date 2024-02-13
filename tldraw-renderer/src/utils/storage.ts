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
        response = await chrome.runtime.sendMessage({ action: "getData" })
        console.log("response", response)
        if (response.error) {
            console.error(response.error);
        };
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
    }
    return response.json()
}
