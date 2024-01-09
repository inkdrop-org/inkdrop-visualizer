export const sendData = (data: Object) => {
    fetch('http://127.0.0.1:3000/senddata', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
}

export const getData = async () => {
    const response = await fetch('http://127.0.0.1:3000/getdata', {
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
