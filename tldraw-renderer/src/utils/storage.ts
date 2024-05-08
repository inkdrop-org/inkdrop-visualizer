import { CodeChange } from "../TLDWrapper"

export const getRenderInput = async () => {
    let response
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        const r = await chrome.runtime.sendMessage({ action: "getRenderInput" })
        response = r.data
        return response
    } else {
        response = await fetch('/get-render-input', {
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
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        try {
            const response = await fetch('/is-demo');
            const data = await response.json();
            return data.value;
        } catch (error) {
            console.error('Failed to fetch /is-demo', error);
            return false;
        }
    }
}

export const getResourceCode = async (resourceIds: string[]) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        try {
            const response = await fetch(`/resource-code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    resourceIds
                }),
            });
            const data = await response.json();
            return data.value;
        } catch (error) {
            console.error('Failed to fetch /resource-code', error);
            return '';
        }
    }
}

export const sendCodeChanges = async (changes: CodeChange[]) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        try {
            const response = await fetch('/change-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ changes }),
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Failed to fetch /code-changes', error);
        }
    }
}

export const generateCode = async (prompt: string) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        try {
            const response = await fetch('/generate-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt }),
            });
            const data = await response.json();
            return data.changes;
        } catch (error) {
            console.error('Failed to fetch /generate-code', error);
            return '';
        }
    }

}

export const sendDebugLog = async (log: string) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id) {
        try {
            await fetch('/debug-log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ log }),
            });
        } catch (error) {
            console.error('Failed to fetch /debug-log', error);
        }
    }
}

export const sendData = async (data: Object) => {
    fetch('/send-ci-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
        .then(response => response.json())
}

