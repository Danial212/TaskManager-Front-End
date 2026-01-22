import { REFRESH_TOKEN, ACCESS_TOKEN, DomainURL, getCookies, setCookies } from "./sharedData.js"


//  Getting both Access and Refresh tokens, and saving in cookies
export async function getAuthTokens(username, password) {
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


export async function signup(userName, password, email) {
    const AuthURL = DomainURL + 'auth/users/';
    const registerData = {
        username: userName,
        password: password,
        email: email,
        first_name: '',
        last_name: '',
    };

    // For singup (to get JWT tokens)
    let response = await fetch(AuthURL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData)
    })


    if (!response.ok)
        throw new Error(response.status);

    //  When everything worked fine

    let data = await response.json()
    console.log('Signup data:', data);
    return 201;
}
