var express = require('express');
var cors = require('cors');
var app = express();
var axios = require('axios');
app.use(cors());
var querystring = require("querystring");
var port = 4000;
var jwt = require('jsonwebtoken');
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID ||
  "521401557412-925s6ngqeu8epvb0fpr2iqbj5isjs94h.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET =
  process.env.GOOGLE_CLIENT_SECRET || "vB8KFa6iDk5YlddZfwq-M3wl";
 const SERVER_ROOT_URI = "http://localhost:4000";
 const UI_ROOT_URI = "http://localhost:3000";
 const JWT_SECRET = "shhhhh";
 const COOKIE_NAME = "auth_token";
const redirectURI = "google";

app.use(
    cors({
        // Sets Access-Control-Allow-Origin to the UI URI
        origin: UI_ROOT_URI,
        // Sets Access-Control-Allow-Credentials to true
        credentials: true,
    })
);

function getGoogleAuthURL() {
    const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
    const options = {
        redirect_uri: `${SERVER_ROOT_URI}/${redirectURI}`,
        client_id: GOOGLE_CLIENT_ID,
        access_type: "offline",
        response_type: "code",
        prompt: "consent",
        scope: [
            "https://www.googleapis.com/auth/userinfo.profile",
            "https://www.googleapis.com/auth/userinfo.email",
        ].join(" "),
    };

    return `${rootUrl}?${querystring.stringify(options)}`;
}

app.get("/auth/google/url", (req, res) => {
    return res.send(getGoogleAuthURL());
});


function getTokens({
    code,
    clientId,
    clientSecret,
    redirectUri,
}) {
    /*
     * Uses the code to get tokens
     * that can be used to fetch the user's profile
     */
    const url = "https://oauth2.googleapis.com/token";
    const values = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
    };

    return axios
        .post(url, querystring.stringify(values), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        })
        .then((res) => res.data)
        .catch((error) => {
            console.error(`Failed to fetch auth tokens`);
            throw new Error(error.message);
        });
}

app.get(`/${redirectURI}`, async (req, res) => {
    const code = req.query.code;
  
    const { id_token, access_token } = await getTokens({
      code,
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      redirectUri: `${SERVER_ROOT_URI}/${redirectURI}`,
    });
  
    // Fetch the user's profile with the access token and bearer
    const googleUser = await axios
      .get(
        `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
        {
          headers: {
            Authorization: `Bearer ${id_token}`,
          },
        }
      )
      .then((res) => res.data)
      .catch((error) => {
        console.error(`Failed to fetch user`);
        throw new Error(error.message);
      });
  
    const token = jwt.sign(googleUser, JWT_SECRET);
  
    res.cookie(COOKIE_NAME, token, {
      maxAge: 900000,
      httpOnly: true,
      secure: false,
    });
  
    res.redirect(UI_ROOT_URI);
  });
  
  // Getting the current user
  app.get("/auth/me", (req, res) => {
    console.log("get me");
    try {
      const decoded = jwt.verify(req.cookies[COOKIE_NAME], JWT_SECRET);
      console.log("decoded", decoded);
      return res.send(decoded);
    } catch (err) {
      console.log(err);
      res.send(null);
    }
  });

var server = app.listen(port, function () {
    console.log("express app listening on port " + port);
});
