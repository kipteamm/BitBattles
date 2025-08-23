function getCookie(name) {
    const cookieString = document.cookie;
    const cookies = cookieString.split(';');

    for (const cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) return cookieValue;
    }

    return null;
}