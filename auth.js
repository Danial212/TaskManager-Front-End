import { REFRESH_TOKEN, ACCESS_TOKEN, DomainURL, getCookies, setCookies } from "./sharedData.js"
export { getAuthTokens }


//  Getting both Access and Refresh tokens, and saving in cookies
async function getAuthTokens(username, password) {
    console.log("loging with", username, password);
    const AuthURL = DomainURL + 'auth/jwt/create';
    const loginData = {
        username: username,
        password: password
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
