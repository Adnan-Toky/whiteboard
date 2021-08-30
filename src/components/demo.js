import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { initializeApp } from '@firebase/app';
import { getDatabase, ref, set, onValue } from '@firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyB79GSw0yI2tSGXzeOSjeqj5K89fDj9Cyc",
    authDomain: "test-32310.firebaseapp.com",
    databaseURL: "https://test-32310-default-rtdb.firebaseio.com",
    projectId: "test-32310",
    storageBucket: "test-32310.appspot.com",
    messagingSenderId: "22709255986",
    appId: "1:22709255986:web:e691d35563c243796a212b"
};

const app = initializeApp(firebaseConfig);
var db = getDatabase();

console.log(db);

// ====================================

var display = document.createElement("h1");
document.body.appendChild(display);

var element = document.createElement("canvas");
document.body.appendChild(element);
element.height = 500;
element.width = 500;
element.style.backgroundColor = "rgb(13, 162, 203)";

element.style.position = "absolute";
element.style.margin = 0;
element.style.top = 0;
element.style.left = 0;
display.style.display = "none";

var ctx = element.getContext("2d");
var clicked = 0;

function mouseDownEvent(e) {
    clicked = 1;
    set(ref(db, "mouse"), {
        x: e.clientX,
        y: e.clientY,
        c: clicked
    });
}

function moveEvent(e) {
    set(ref(db, "mouse"), {
        x: e.clientX,
        y: e.clientY,
        c: clicked
    });
}

function mouseUpEvent(e) {
    clicked = 0;
    set(ref(db, "mouse"), {
        x: e.clientX,
        y: e.clientY,
        c: clicked
    });
}

element.addEventListener("mousedown", mouseDownEvent);
element.addEventListener("mouseup", mouseUpEvent);
element.addEventListener("mousemove", moveEvent);
element.addEventListener("mouseout", mouseUpEvent);
var z = 0;
var st = 0;

// ====================================

function App() {
    const [x, setX] = useState(0);

    const dbRef = ref(db, "mouse");
    onValue(dbRef, (snapshot) => {
        if (z != (snapshot.val().x * 1000 + snapshot.val().y) * 10 + (!!snapshot.val().c)) {

            z = (snapshot.val().x * 1000 + snapshot.val().y) * 10 + (!!snapshot.val().c);
            if (!st && snapshot.val().c) {
                ctx.beginPath();
                ctx.lineWidth = 5;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                st = 1;
                ctx.moveTo(snapshot.val().x, snapshot.val().y);
            }
            else if (st && snapshot.val().c == 0) {
                ctx.lineTo(snapshot.val().x, snapshot.val().y);
                ctx.stroke();
                ctx.closePath();
                st = 0;
            }
            else if (st) {
                ctx.lineTo(snapshot.val().x, snapshot.val().y);
                ctx.stroke();
            }



            // setX(snapshot.val().x + ", " + snapshot.val().y);

            // cursor.style.left = snapshot.val().x + "px";
            // cursor.style.top = snapshot.val().y + "px";
        }
    })

    return (
        <div></div>
    )
}

ReactDOM.render(
    <div>
        <App />
    </div>,
    document.getElementById('root')
);
