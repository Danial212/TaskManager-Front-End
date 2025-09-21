export { getUser, authenticatedFetch }


const DomainURL = 'http://127.0.0.1:8000/'
const REFRESH_TOKEN = 'refresh_token'
const ACCESS_TOKEN = 'access_token'


//  Getting both Access and Refresh tokens, and saving in cookies
async function getAuthTokens() {
    const AuthURL = DomainURL + 'auth/jwt/create';
    const loginData = {
        username: 'user',
        password: 'user'
    };

    // For login (to get JWT tokens)
    let response = await fetch(AuthURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData)  // UNCOMMENT THIS!
    })

    if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

    let data = await response.json()
    console.log('JWT Tokens:', data);

    // Save tokens in cookies
    setCookies(ACCESS_TOKEN, data.access, 2);
    setCookies(REFRESH_TOKEN, data.refresh, 5);
}

async function getAccessToken() {
    const cachedToken = getCookies(ACCESS_TOKEN);
    console.log("we have: " + cachedToken);
    if (cachedToken != null && !isTokenExpired(cachedToken)) {
        console.log("Token worked");
        return cachedToken;
    }
    console.log("Fetching tokens");

    await updateAccessToken();
    return getCookies(ACCESS_TOKEN);
}

function isTokenExpired(token) {
    if (token == null)
        return true;

    try {
        // Every valid JWT has 3 parts: header, payload, signature
        const jwtParts = token.split('.');
        if (jwtParts.length != 3)
            return true;

        //  Decode the payload from token
        const payload = JSON.parse(atob(jwtParts[1]));

        const now = Math.floor(Date.now() / 1000);
        const exp = payload.exp;

        return (now + 60) >= exp;

    } catch (error) {
        console.log("Unexpected error at Checking token expiration");
    }
}

async function authenticatedFetch(url, options = {}) {
    const authOptions = {
        ...options,
        headers: {
            'AUTHORIZATION': 'JWT ' + (await getAccessToken()),
            ...options.headers
        },
    };

    let response = await fetch(url, authOptions);
    if (response.status == 401) {
        await updateAccessToken();
        authOptions.headers['AUTHORIZATION'] = 'JWT ' + (await getAccessToken());
        response = await fetch(url, authOptions);
    }

    if (!response.ok)
        throw new Error(`API call error, status: ${response.status}, ${response.statusText}`);

    return response
}

async function getUser() {
    const authURL = DomainURL + 'auth/users/me/';
    const response = await authenticatedFetch(authURL, { method: 'GET' });
    return await response.json();
}


async function updateAccessToken() {
    let refresh_token = getCookies(REFRESH_TOKEN)

    if (refresh_token == null) {
        console.log("Remaking all tokens");
        await getAuthTokens();
        return;
    }

    const UpdateTokenURL = DomainURL + 'auth/jwt/refresh/'
    const refreshData = { refresh: refresh_token };

    try {
        const response = await fetch(UpdateTokenURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(refreshData)
        })

        if (response.status == 401) {
            await getAuthTokens();
            throw Error("401 Unauthorized, your refresh token has expired, let's refresh it")
        }
        if (!response.ok)
            console.error(`Some Problems in here, ... getting ${response.status} status code`)

        const json = await response.json();
        setCookies(ACCESS_TOKEN, json.access, 3);
    } catch (error) {
        console.log(error);
    }

}

// Complete cookie functions
function setCookies(name, value, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/`;
}

function getCookies(name) {  // Remove the 'value' parameter
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [cookieName, cookieValue] = cookie.trim().split('=');
        if (cookieName === name) {
            return cookieValue;
        }
    }
    return null;
}

