import React from 'react';
import { initializeApp } from '@firebase/app';
import { getFirestore } from "firebase/firestore";
import { collection, doc, addDoc, setDoc, getDocs } from "firebase/firestore";
import { getDatabase, ref, set, onValue } from '@firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen } from '@fortawesome/free-solid-svg-icons'

import "./../css/canvas.css";

const firebaseConfig = {
    apiKey: "AIzaSyB79GSw0yI2tSGXzeOSjeqj5K89fDj9Cyc",
    authDomain: "test-32310.firebaseapp.com",
    databaseURL: "https://test-32310-default-rtdb.firebaseio.com",
    projectId: "test-32310",
    storageBucket: "test-32310.appspot.com",
    messagingSenderId: "22709255986",
    appId: "1:22709255986:web:e691d35563c243796a212b"
};

initializeApp(firebaseConfig);
const db = getFirestore();
const rtdb = getDatabase();
const auth = getAuth();

class Whiteboard {
    constructor(container, role, whiteboardId, bgColor, changePointer) {
        this.bgColor = bgColor;
        this.pages = [];
        this.ctx = [];
        this.dataList = [];
        this.activePage = 0;
        this.role = role;
        this.tmpCtx = undefined;
        this.container = container;
        this.createNewPage();
        this.createTempCanvas();
        this.activePage = -1;
        this.navigatePage(0);
        this.whiteboardId = whiteboardId;
        this.lastData = undefined;
        this.drawing = false;
        this.currentObjectIndex = 0;
        onValue(ref(rtdb, whiteboardId), (snapshot) => {
            if (!snapshot.val()) return;

            var data = snapshot.val();
            if (!this.lastData || this.lastData.x !== data.x || this.lastData.y !== data.y || this.lastData.a !== data.a || this.lastData.p !== data.p || this.lastData.o !== data.o) {
                this.drawTmp(data);
            }
        });

        this.loadData();

        this.drawingProps = {
            activeObject: 0
        }

        this.changePointer = changePointer;
    }

    async loadData() {
        console.log("data loading")
        const querySnapshot = await getDocs(collection(db, "sessions", this.whiteboardId, "objects"));
        querySnapshot.forEach((doc) => {
            // console.log(doc.id, " => ", doc.data());
            this.dataList[doc.data().indx] = JSON.parse(doc.data().data);
            this.draw(doc.data().indx);
        });
    }

    async syncData(indx) {
        try {
            await setDoc(doc(db, "sessions", this.whiteboardId, "objects", "" + indx), {
                data: JSON.stringify(this.dataList[indx]),
                indx: indx
            });
        }
        catch (err) {
            console.log("Error sync data, Err:", err);
        }
        // console.log(this.dataList[this.dataList.length - 1]);
    }

    mouseDownListener(e) {
        if (this.role !== "editor") return;
        this.drawing = true;
        this.currentObjectIndex = this.dataList.length;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: 0,
            p: this.activePage,
            o: this.drawingProps.activeObject,
            i: this.currentObjectIndex
        });
    }

    mouseMoveListener(e) {
        if (this.role !== "editor") return;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.drawing ? 1 : 3,
            p: this.activePage,
            o: this.drawingProps.activeObject,
            i: this.currentObjectIndex
        });
    }

    mouseUpListener(e) {
        if (this.role !== "editor") return;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.drawing ? 2 : 3,
            p: this.activePage,
            o: this.drawingProps.activeObject,
            i: this.currentObjectIndex
        });
        // console.log(this.dataList, "*****");
        if (this.drawing) this.syncData(this.currentObjectIndex);
        this.drawing = false;
    }

    draw(indx) {
        while (this.pages.length <= this.dataList[indx].page) this.createNewPage(this.container);
        if (this.dataList[indx].o === 0) {
            let data = this.dataList[indx];
            // this.ctx[data.page].strokeStyle = "#000";
            this.ctx[data.page].globalCompositeOperation = "source-over";
            this.ctx[data.page].beginPath();
            this.ctx[data.page].lineWidth = 4;
            this.ctx[data.page].lineJoin = "round";
            this.ctx[data.page].lineCap = "round";
            this.ctx[data.page].moveTo(data.s[0], data.s[1]);

            for (let i = 0; i < data.p.length; i++) {
                this.ctx[data.page].lineTo(data.p[i][0], data.p[i][1]);
            }
            this.ctx[data.page].stroke();
            this.ctx[data.page].closePath();
            this.tmpCtx.clearRect(0, 0, 500, 500);
        }
        else if (this.dataList[indx].o === 1) {
            let data = this.dataList[indx];
            // this.ctx[data.page].strokeStyle = this.bgColor;
            this.ctx[data.page].globalCompositeOperation = "destination-out";
            this.ctx[data.page].beginPath();
            this.ctx[data.page].lineWidth = 10;
            this.ctx[data.page].lineJoin = "round";
            this.ctx[data.page].lineCap = "round";
            this.ctx[data.page].moveTo(data.s[0], data.s[1]);

            for (let i = 0; i < data.p.length; i++) {
                this.ctx[data.page].lineTo(data.p[i][0], data.p[i][1]);
            }
            this.ctx[data.page].stroke();
            this.ctx[data.page].closePath();
            this.tmpCtx.clearRect(0, 0, 500, 500);
        }
    }



    drawTmp(data) {
        if (!data) return;
        while (this.pages.length <= data.p) this.createNewPage(this.container);
        this.navigatePage(data.p);
        this.changeActiveObject(data.o);

        if (data.a === 3) {
            this.changePointer({
                top: data.y,
                left: data.x,
                vis: this.role == "editor" ? "none" : "inline-block"
            });
        }
        else {
            if (data.o == 0) {
                this.changePointer({
                    top: data.y - 15,
                    left: data.x,
                    vis: this.role == "editor" ? "none" : "inline-block"
                })
            }
        }

        if (data.o === 0) {
            if (data.a === 0) {
                this.dataList[data.i] = {
                    s: [data.x, data.y],
                    o: data.o,
                    page: data.p,
                    p: [],
                    e: []
                };

                this.tmpCtx.strokeStyle = "#000";
                this.tmpCtx.beginPath();
                this.tmpCtx.lineWidth = 4;
                this.tmpCtx.lineJoin = "round";
                this.tmpCtx.lineCap = "round";
                this.tmpCtx.moveTo(data.x, data.y);
            }
            else if (data.a === 1) {
                if (!this.dataList[data.i]) return;
                this.dataList[data.i].p.push([data.x, data.y]);
                this.tmpCtx.lineTo(data.x, data.y);
                this.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                // console.log(this.dataList[data.i], data.i);
                if (!this.dataList[data.i]) return;
                this.dataList[data.i].e.push(data.x);
                this.dataList[data.i].e.push(data.y);
                this.tmpCtx.moveTo(data.x, data.y);
                this.tmpCtx.closePath();
                this.draw(data.i);
            }
        }
        else if (data.o === 1) {
            if (data.a === 0) {
                this.dataList[data.i] = {
                    s: [data.x, data.y],
                    o: data.o,
                    page: data.p,
                    p: [],
                    e: []
                };

                this.tmpCtx.strokeStyle = this.bgColor;
                this.tmpCtx.beginPath();
                this.tmpCtx.lineWidth = 10;
                this.tmpCtx.lineJoin = "round";
                this.tmpCtx.lineCap = "round";
                this.tmpCtx.moveTo(data.x, data.y);
            }
            else if (data.a === 1) {
                if (!this.dataList[data.i]) return;
                this.dataList[data.i].p.push([data.x, data.y]);
                this.tmpCtx.lineTo(data.x, data.y);
                this.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                // console.log(this.dataList[data.i], data.i);
                if (!this.dataList[data.i]) return;
                this.dataList[data.i].e.push(data.x);
                this.dataList[data.i].e.push(data.y);
                this.tmpCtx.moveTo(data.x, data.y);
                this.tmpCtx.closePath();
                this.draw(data.i);
            }
        }
    }

    changeActiveObject(objectCode) {
        if (this.drawingProps.activeObject === objectCode) return;
        this.drawingProps.activeObject = objectCode;
    }

    navigatePage(page) {
        if (this.activePage === page || page >= this.pages.length || page < 0) return;
        for (let i = 0; i < this.pages.length; i++) {
            this.pages[i].style.display = "none";
        }
        this.pages[page].style.display = "block";
        this.activePage = page;
    }

    createNewPage() {
        const canvas = document.createElement("canvas");
        canvas.height = 500;
        canvas.width = 500;
        canvas.classList.add("drawing-canvas");
        canvas.style.backgroundColor = this.bgColor;
        console.log(this.bgColor);
        this.pages.push(canvas);
        this.container.appendChild(canvas);
        this.ctx.push(canvas.getContext("2d"));
        this.navigatePage(this.pages.length - 1);
    }

    createTempCanvas() {
        let canvas = document.createElement("canvas");
        canvas.height = 500;
        canvas.width = 500;
        canvas.classList.add("tmp-canvas");
        // canvas.style.backgroundColor = "#77f";
        this.container.appendChild(canvas);
        canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
        canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));
        canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
        canvas.addEventListener("mouseout", this.mouseUpListener.bind(this));
        this.tmpCtx = canvas.getContext("2d");
    }
}

class Pointer extends React.Component {
    render() {
        return (
            <div style={{
                height: this.props.size,
                width: this.props.size,
                position: "absolute",
                top: this.props.top,
                left: this.props.left,
                zIndex: 1001,
                display: this.props.vis
            }}><FontAwesomeIcon icon={faPen} /></div>
        )
    }
}


class Canvas extends React.Component {
    constructor(props) {
        super(props);
        this.board = null;

        this.state = {
            left: 0,
            top: 0,
            size: 10,
            vis: "none"
        }

        this.createNewSession = this.createNewSession.bind(this);
        this.joinExistingSession = this.joinExistingSession.bind(this);
        this.handleAddNewPage = this.handleAddNewPage.bind(this);
        this.handleGoNextPage = this.handleGoNextPage.bind(this);
        this.handleGoPrevPage = this.handleGoPrevPage.bind(this);
        this.handleActivePen = this.handleActivePen.bind(this);
        this.handleActiveEraser = this.handleActiveEraser.bind(this);
        this.handleChangePointer = this.handleChangePointer.bind(this);
    }

    async createNewSession() {
        console.log("Starting New Session");
        try {
            const ref = await addDoc(collection(db, "sessions"), {
                host: "user-1",
                participants: [],
                pageCount: 1,
                objectCount: 0
            });
            console.log("Session Stublished with ID: ", ref.id);
            console.log("Setting Up Whiteboard Parameters");
            try {
                // const ref2 = await setDoc(doc(db, "sessions", ref.id, "objects", "start"), {});
                console.log("Session Startted");
                this.board = new Whiteboard(document.getElementById("canvas-container"), "editor", ref.id, "#999", this.handleChangePointer);
            }
            catch (e) {
                console.log("Something went wrong, Err:", e);
            }
        }
        catch (e) {
            console.log("Unable to stablish connection, Err:", e);
        }
    }

    async joinExistingSession() {
        this.board = new Whiteboard(document.getElementById("canvas-container"), "viewer", document.getElementById("session-id").value, "#999", this.handleChangePointer);
    }

    handleAddNewPage() {
        if (!this.board || this.board.role !== "editor") return;
        this.board.createNewPage();
    }

    handleGoNextPage() {
        if (!this.board || this.board.role !== "editor") return;
        this.board.navigatePage(this.board.activePage + 1);
    }

    handleGoPrevPage() {
        if (!this.board || this.board.role !== "editor") return;
        this.board.navigatePage(this.board.activePage - 1);
    }

    handleActivePen() {
        if (!this.board || this.board.role !== "editor") return;
        this.board.changeActiveObject(0);
    }

    handleActiveEraser() {
        if (!this.board || this.board.role !== "editor") return;
        this.board.changeActiveObject(1);
    }

    handleChangePointer(obj) {
        this.setState(obj);
    }

    componentDidMount() {
        signInAnonymously(auth).then(() => {
            console.log("Signed in as:");
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log(user.uid);
                }
                else {
                    console.log("logged out...");
                }
            });
        }).catch((err) => {
            console.log("Error Login:", err);
        });
    }

    render() {
        return (
            <div>
                <div id="canvas-container"></div>
                <button onClick={this.createNewSession}>Start New Session</button>
                <input type="text" id="session-id" />
                <button onClick={this.joinExistingSession}>Join Session</button>
                <button onClick={this.handleAddNewPage}>Add New Page</button>
                <button onClick={this.handleGoPrevPage}>Prev</button>
                <button onClick={this.handleGoNextPage}>Next</button>
                <button onClick={this.handleActivePen}>Pen</button>
                <button onClick={this.handleActiveEraser}>Eraser</button>
                <Pointer size={this.state.size} top={this.state.top} left={this.state.left} vis={this.state.vis} />
            </div>
        )
    }
}

export default Canvas;



/*
    actionType:
        0 -> start
        1 -> move
        2 -> end
        3 -> undo
        4 -> redo

    objectType:
        0 -> pencil
        1 -> eraser
        2 -> shape

    objectIndex
    pageIndex
*/


/*
1. Number of pages
2. Authorized meeting
3. Join permission
4. Session lock
5. Number of participants
6. Save session
7. Time limit

# Whiteboard
# Blackboard

=> Static Board
=> Shareable board

*/