var firebaseConfig = {
    apiKey: "AIzaSyADcIy_uyXHOR7DakkZklpqNMLHAOBoyyI",
    authDomain: "aalsozluk1.firebaseapp.com",
    databaseURL: "https://aalsozluk1.firebaseio.com",
    projectId: "aalsozluk1",
    storageBucket: "aalsozluk1.appspot.com",
    messagingSenderId: "543786190600",
    appId: "1:543786190600:web:ab6749b481da8af4488ebd",
    measurementId: "G-MS0VCJS1Z9"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

let users = [];
let docIds = [];

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function syncUsersFromServer() {
    return new Promise(
        (resolve, reject) => {
            console.log("sync users from server starts");
            db.collection("users").get().then(
                querySnapshot => {
                    querySnapshot.forEach(doc => {
                        users.push(doc.data());
                        docIds[doc.data().userId] = doc.id;
                    })
                    resolve();
                }
            ).catch((e) => {
                reject(e);
            })
        }
    );
}

function getUserIP() {
    return new Promise(
        (resolve, reject) => {
            console.log("get user ip starts");
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4 && this.status == 200) {
                    console.log("request return with 200 status code, resolving promise with local ip");
                    resolve(this.response);
                } else if (this.readyState == 4 && this.status != 200) {
                    console.log("ip get request return with bad status code, rejecting promise");
                    reject(this.statusText);
                }
            };
            xhttp.open("GET", "https://api.ipify.org/", true);
            console.log("get request sending");
            xhttp.send();
        }
    );
}
function loacalAreaUpdater() {
    userLocal = JSON.parse(localStorage.getItem("userLocal"));
    if (Date.now() > userLocal.lastLogin + 43200000) {
        userLocal.balloon.area += 1;
        userLocal.lastLogin = Date.now();
        localStorage.setItem("userLocal", JSON.stringify(userLocal));
        document.getElementById(userLocal.userId).remove();
        generateBalloon(userLocal);
        return true;
    } else {
        return false;
    }

}

function localIpsUpdater(ip) {
    userLocal = JSON.parse(localStorage.getItem("userLocal"));
    if (!userLocal.ips.includes(ip)) {
        userLocal.ips.push(ip);
        localStorage.setItem("userLocal", JSON.stringify(userLocal));
        return true;
    } else {
        return false;
    }
}

function syncLocalUserWithServer() {
    return new Promise(
        (resolve, reject) => {
            console.log("sync local user with server starts");
            userLocal = JSON.parse(localStorage.getItem("userLocal")); console.log("local user getting from local storage");
            if (userLocal) {
                console.log("local user found in local storage ");
                db.collection("users").doc(docIds[userLocal.userId]).set(userLocal)
                    .then(() => {
                        console.log("local user synced wit server");
                        resolve();
                    })
                    .catch(e => {
                        console.log("local user couldn't sync with server");
                        reject(e);
                    });
            } else {
                console.log("user not found in local storage");
                console.log("local user yok");
            }
        }
    );
}

async function userLogin() {
    try {
        console.log("call for login ");
        await firebase.auth().signInAnonymously();
        console.log("wait for logged in state");
        firebase.auth().onAuthStateChanged(async user => {
            if (user) {
                console.log("logged in");
                try {
                    await syncUsersFromServer(); console.log("get all users");
                    generateBalloons(); console.log("put ballons in DOM");
                    let ip = await getUserIP(); console.log("get local ip");

                    userLocal = JSON.parse(localStorage.getItem("userLocal")); console.log("user getting from local storage");

                    if (userLocal) {
                        console.log("local user found");

                        let findedUser = users.find((user) => {
                            console.log("searchin local user's userID in users array from server");
                            return user.userId == userLocal.userId;
                        });

                        if (findedUser) {
                            console.log("local users's userId found in users array");
                            localStorage.setItem("userLocal", JSON.stringify(findedUser)); console.log("local user updating with server instance");
                            let ipsUpload = localIpsUpdater(ip); console.log("local ips updater called");
                            let areaUpload = loacalAreaUpdater(); console.log("local area updater called");

                            if (ipsUpload || areaUpload) {
                                console.log("local area updater or local ips udater updated local user");
                                await syncLocalUserWithServer(); console.log("local user sync with server called");
                            } else {
                                console.log("local area updater or local ips udater didn't update local user");
                            }

                        } else {
                            console.log("local users's userId couldn't find in user array from server");
                        }

                    } else {
                        console.log("there is no user in local");
                        let findedUser = users.find((user) => {
                            console.log("searching local ip in users array from server");
                            return user.ips.includes(ip);
                        });

                        if (findedUser) {
                            console.log("local ip found in users array from server");
                            localStorage.setItem("userLocal", JSON.stringify(findedUser)); console.log("finded user saved to local storage");
                            let areaUpload = loacalAreaUpdater(); console.log("local area updater called");

                            if (areaUpload) {
                                console.log("local area uploader updated local user");
                                await syncLocalUserWithServer(); console.log("updated user sync with server called");
                            } else {
                                console.log("local area uploader didn't update local user");
                            }

                        } else {
                            console.log("local ip not found in users array");
                            let newUser = {
                                userId: user.uid,
                                ips: [ip],
                                lastLogin: Date.now(),
                                balloon: createNewBalloon()
                            }; console.log("new user created with ananonym login user uid and local ip");

                            await db.collection("users").add(newUser); console.log("new user adding to server");
                            localStorage.setItem("userLocal", JSON.stringify(newUser)); console.log("new user adding to local storage");
                            console.log("users.push(newUser); //new user adding users array");
                            generateBalloon(newUser); console.log("new user adding to DOM");
                        }
                    }

                } catch (e) {
                    console.log(e); console.log("error during await events after logged in");
                }
            } else {
                console.log("not logged in"); console.log("login not succesful");
            }
        })

    } catch (e) {
        console.log(e); console.log("error during login");
    }
}

window.onload = () => {
    userLogin();
};


function createNewBalloon() {
    return {
        area: 1,
        x: Math.random() * 81 + 10,
        y: Math.random() * 81 + 10,
        color: getRandomColor()
    };
}

const container = document.getElementById("balloon_container");

function generateBalloons() {
    users.forEach(user => {
        generateBalloon(user);
    });
}

function generateBalloon(user) {
    balloon = user.balloon;
    let b = document.createElement("div");
    b.classList.add("balloon");
    b.style.top = balloon.y + "%";
    b.style.left = balloon.x + "%";
    let diameter = 2 * Math.sqrt(balloon.area / Math.PI);
    b.style.width = diameter + "rem";
    b.style.height = diameter + "rem";
    b.style.backgroundColor = balloon.color;
    b.id = user.userId;
    container.appendChild(b);
}