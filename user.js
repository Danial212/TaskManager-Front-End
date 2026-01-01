import { getAuthTokens } from "./auth.js"
import { REFRESH_TOKEN, ACCESS_TOKEN, DomainURL, getCookies, setCookies, removeCookies } from "./sharedData.js"
export { getUser, authenticatedFetch, logout_user, navigate_login, logged_in }



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


/**
 * Check if the given JWT token is expired/invalid
 */
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

function logged_in() {
    const cookies = document.cookie.split(';');
    console.log(cookies.length);

    cookies.forEach(cookie => {
        let [name, value] = cookie.split('=');
        if ((name == ACCESS_TOKEN || name == REFRESH_TOKEN) && (value == '' || value == null))
            return false;
    });
    return true && (cookies.length > 1);
}

function logout_user() {
    removeCookies();
    localStorage.clear();
    navigate_login()
    console.log("User Logged Out");
}

function navigate_login() {
    location.replace('login.html');
}
