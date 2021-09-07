import React from 'react';
import { initializeApp } from '@firebase/app';
import { getFirestore } from "firebase/firestore";
import { collection, doc, addDoc, setDoc, getDocs } from "firebase/firestore";
import { getDatabase, ref, set, onValue } from '@firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faPen } from '@fortawesome/free-solid-svg-icons';
import { faEraser } from '@fortawesome/free-solid-svg-icons';

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
    constructor(props) {
        this.config = {
            sessionId: props.sessionId,
            hostId: props.hostId,
            userId: props.userId,
            sessionPassword: props.sessionPassword,
            role: props.role
        };
        this.canvas = {
            bgColor: props.bgColor,
            pages: [],
            activePage: -1,
            ctx: [],
            tmpPage: null,
            tmpCtx: null,
            dataList: [],
            activeObject: 0,
            currentObject: -1,
            height: props.height,
            width: props.width,
            container: props.container,
            drawing: false,
            undoStackCount: 0
        };
        this.action = {
            updatePointer: props.updatePointer
        }

        this.createNewPage();
        this.navigatePage(0);
        this.createTempCanvas();
        this.connectRTDB();
        this.loadData();
    }

    changeActiveObject(objectCode) {
        if (this.canvas.activeObject === objectCode) return;
        this.canvas.activeObject = objectCode;
    }

    connectRTDB() {
        this.lastData = null;
        onValue(ref(rtdb, this.config.sessionId), (snapshot) => {
            if (!snapshot.val()) return;

            var data = snapshot.val();
            if (!this.lastData || this.lastData.x !== data.x || this.lastData.y !== data.y || this.lastData.a !== data.a || this.lastData.p !== data.p || this.lastData.o !== data.o || data.a === 4 || data.a === 5) {
                this.drawTmp(data);
                this.lastData = data;
            }
        });
    }

    async loadData() {
        console.log("data loading");
        const querySnapshot = await getDocs(collection(db, "sessions", this.config.sessionId, "objects"));
        querySnapshot.forEach((doc) => {
            // console.log(doc.id, " => ", doc.data());
            this.canvas.dataList[doc.data().indx] = JSON.parse(doc.data().data);
            this.draw(doc.data().indx);
        });
    }

    async syncData(indx) {
        try {
            await setDoc(doc(db, "sessions", this.config.sessionId, "objects", "" + indx), {
                data: JSON.stringify(this.canvas.dataList[indx]),
                indx: indx
            });
        }
        catch (err) {
            console.log("Error sync data, Err:", err);
        }
    }

    mouseDownListener(e) {
        if (this.config.role !== "editor") return;
        this.canvas.drawing = true;
        this.canvas.undoStackCount = 0;
        this.canvas.currentObject = this.canvas.currentObject + 1;
        set(ref(rtdb, this.config.sessionId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: 0,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject
        });
    }

    mouseMoveListener(e) {
        if (this.config.role !== "editor") return;
        set(ref(rtdb, this.config.sessionId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.canvas.drawing ? 1 : 3,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject
        });
    }

    mouseUpListener(e) {
        if (this.config.role !== "editor") return;
        set(ref(rtdb, this.config.sessionId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.canvas.drawing ? 2 : 3,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject
        });
        if (this.canvas.drawing) this.syncData(this.canvas.currentObject);
        this.canvas.drawing = false;
    }

    undo(indx) {
        this.canvas.undoStackCount++;
        for (let i = 0; i < this.canvas.ctx.length; i++) {
            this.canvas.ctx[i].clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.canvas.currentObject = indx;
        for (let i = 0; i <= indx; i++) {
            this.draw(i);
        }
    }

    redo(indx) {
        this.canvas.undoStackCount--;
        for (let i = 0; i < this.canvas.ctx.length; i++) {
            this.canvas.ctx[i].clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.canvas.currentObject = indx;
        for (let i = 0; i <= indx; i++) {
            this.draw(i);
        }
    }

    handleUndo() {
        if (this.config.role !== "editor") return;
        if (this.canvas.currentObject < 0) return;
        set(ref(rtdb, this.config.sessionId), {
            a: 4,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject - 1
        });
    }

    handleRedo() {
        if (this.config.role !== "editor") return;
        if (!this.canvas.dataList[this.canvas.currentObject + 1]) return;
        if (this.canvas.undoStackCount <= 0) return;
        set(ref(rtdb, this.config.sessionId), {
            a: 5,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject + 1
        });
    }

    draw(indx) {
        if (!this.canvas.dataList[indx]) return;
        while (this.canvas.pages.length <= this.canvas.dataList[indx].page) this.createNewPage();
        if (this.canvas.dataList[indx].o === 0) {
            let data = this.canvas.dataList[indx];
            this.canvas.ctx[data.page].globalCompositeOperation = "source-over";
            this.canvas.ctx[data.page].beginPath();
            this.canvas.ctx[data.page].lineWidth = 4;
            this.canvas.ctx[data.page].lineJoin = "round";
            this.canvas.ctx[data.page].lineCap = "round";
            this.canvas.ctx[data.page].moveTo(data.s[0], data.s[1]);

            for (let i = 0; i < data.p.length; i++) {
                this.canvas.ctx[data.page].lineTo(data.p[i][0], data.p[i][1]);
            }
            this.canvas.ctx[data.page].stroke();
            this.canvas.ctx[data.page].closePath();
            this.canvas.tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        else if (this.canvas.dataList[indx].o === 1) {
            let data = this.canvas.dataList[indx];
            this.canvas.ctx[data.page].globalCompositeOperation = "destination-out";
            this.canvas.ctx[data.page].beginPath();
            this.canvas.ctx[data.page].lineWidth = 20;
            this.canvas.ctx[data.page].lineJoin = "round";
            this.canvas.ctx[data.page].lineCap = "round";
            this.canvas.ctx[data.page].moveTo(data.s[0], data.s[1]);

            for (let i = 0; i < data.p.length; i++) {
                this.canvas.ctx[data.page].lineTo(data.p[i][0], data.p[i][1]);
            }
            this.canvas.ctx[data.page].stroke();
            this.canvas.ctx[data.page].closePath();
            this.canvas.tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawTmp(data) {
        if (!data) return;
        while (this.canvas.pages.length <= data.p) this.createNewPage();
        this.navigatePage(data.p);
        this.canvas.activeObject = data.o;

        if (data.a === 3) {
            this.action.updatePointer({
                top: data.y,
                left: data.x,
                icon: data.o,
                vis: this.config.role === "editor" ? "none" : "inline-block"
            });
        }
        else if (data.a === 4) {
            this.undo(data.i);
            return;
        }
        else if (data.a === 5) {
            this.redo(data.i);
            return;
        }
        else {
            if (data.o === 0) {
                this.action.updatePointer({
                    top: data.y - 15,
                    left: data.x,
                    icon: 0,
                    vis: this.config.role === "editor" ? "none" : "inline-block"
                });
            }
            else if (data.o === 1) {
                this.action.updatePointer({
                    top: data.y - 15,
                    left: data.x,
                    icon: 1,
                    vis: this.config.role === "editor" ? "none" : "inline-block"
                });
            }
        }

        if (data.o === 0) {
            if (data.a === 0) {
                this.canvas.currentObject = data.i; // updating current object index
                this.canvas.dataList[data.i] = {
                    s: [data.x, data.y],
                    o: data.o,
                    page: data.p,
                    p: [],
                    e: []
                };

                this.canvas.tmpCtx.strokeStyle = "#000";
                this.canvas.tmpCtx.beginPath();
                this.canvas.tmpCtx.lineWidth = 4;
                this.canvas.tmpCtx.lineJoin = "round";
                this.canvas.tmpCtx.lineCap = "round";
                this.canvas.tmpCtx.moveTo(data.x, data.y);
            }
            else if (data.a === 1) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].p.push([data.x, data.y]);
                this.canvas.tmpCtx.lineTo(data.x, data.y);
                this.canvas.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].e.push(data.x);
                this.canvas.dataList[data.i].e.push(data.y);
                this.canvas.tmpCtx.moveTo(data.x, data.y);
                this.canvas.tmpCtx.closePath();
                this.draw(data.i);
            }
        }
        else if (data.o === 1) {
            if (data.a === 0) {
                this.canvas.currentObject = data.i;
                this.canvas.dataList[data.i] = {
                    s: [data.x, data.y],
                    o: data.o,
                    page: data.p,
                    p: [],
                    e: []
                };

                this.canvas.tmpCtx.strokeStyle = this.canvas.bgColor;
                this.canvas.tmpCtx.beginPath();
                this.canvas.tmpCtx.lineWidth = 20;
                this.canvas.tmpCtx.lineJoin = "round";
                this.canvas.tmpCtx.lineCap = "round";
                this.canvas.tmpCtx.moveTo(data.x, data.y);
            }
            else if (data.a === 1) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].p.push([data.x, data.y]);
                this.canvas.tmpCtx.lineTo(data.x, data.y);
                this.canvas.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].e.push(data.x);
                this.canvas.dataList[data.i].e.push(data.y);
                this.canvas.tmpCtx.moveTo(data.x, data.y);
                this.canvas.tmpCtx.closePath();
                this.draw(data.i);
            }
        }
    }

    navigatePage(page) {
        if (this.canvas.activePage === page || page >= this.canvas.pages.length || page < 0) return;
        for (let i = 0; i < this.canvas.pages.length; i++) {
            this.canvas.pages[i].style.display = "none";
        }
        this.canvas.pages[page].style.display = "block";
        this.canvas.activePage = page;
    }

    createNewPage() {
        const canvas = document.createElement("canvas");
        canvas.height = this.canvas.height;
        canvas.width = this.canvas.width;
        canvas.classList.add("drawing-canvas");
        canvas.style.backgroundColor = this.canvas.bgColor;
        this.canvas.pages.push(canvas);
        this.canvas.container.appendChild(canvas);
        this.canvas.ctx.push(canvas.getContext("2d"));
        this.navigatePage(this.canvas.pages.length - 1);
        console.log("added new page");
    }

    createTempCanvas() {
        let canvas = document.createElement("canvas");
        canvas.height = this.canvas.height;
        canvas.width = this.canvas.width;
        canvas.classList.add("tmp-canvas");
        this.canvas.container.appendChild(canvas);
        this.canvas.tmpCtx = canvas.getContext("2d");
        this.canvas.tmpPage = canvas;
        canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
        canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));
        canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
        canvas.addEventListener("mouseout", this.mouseUpListener.bind(this));
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
            }}><FontAwesomeIcon icon={this.props.icon === 0 ? faPen : faEraser} /></div>
        )
    }
}


class Session extends React.Component {
    constructor(props) {
        super(props);
        this.board = null;

        this.state = {
            left: 0,
            top: 0,
            size: 10,
            vis: "none",
            icon: 0,
            sessionId: "",
            userId: "",
            loggedIn: false,
            role: "",
            hostId: ""
        }

        this.createNewSession = this.createNewSession.bind(this);
        this.joinExistingSession = this.joinExistingSession.bind(this);
        this.handleAddNewPage = this.handleAddNewPage.bind(this);
        this.handleGoNextPage = this.handleGoNextPage.bind(this);
        this.handleGoPrevPage = this.handleGoPrevPage.bind(this);
        this.handleActivePen = this.handleActivePen.bind(this);
        this.handleActiveEraser = this.handleActiveEraser.bind(this);
        this.handleChangePointer = this.handleChangePointer.bind(this);
        this.handleUndo = this.handleUndo.bind(this);
        this.handleRedo = this.handleRedo.bind(this);
    }

    async createNewSession() {
        if (!this.state.loggedIn) return;
        console.log("Starting New Session");
        try {
            const ref = await addDoc(collection(db, "sessions"), {
                host: this.state.userId,
                participants: [this.state.userId],
                pageCount: 1,
                objectCount: 0,
                width: window.innerWidth,
                height: window.innerHeight
            });
            console.log("Session Stublished with ID: ", ref.id);
            this.setState({
                sessionId: ref.id,
                role: "editor",
                hostId: this.state.userId
            });
            console.log("Setting Up Whiteboard Parameters");
            try {
                // const ref2 = await setDoc(doc(db, "sessions", ref.id, "objects", "start"), {});
                console.log("Session Started");
                // this.board = new Whiteboard(document.getElementById("canvas-container"), "editor", ref.id, "#999", this.handleChangePointer);
                this.board = new Whiteboard({
                    sessionId: ref.id,
                    sessionPassword: "",
                    hostId: this.state.userId,
                    userId: this.state.userId,
                    role: "editor",
                    bgColor: "#bbb",
                    height: 500,
                    width: 600,
                    container: document.getElementById("canvas-container"),
                    updatePointer: this.handleChangePointer
                });
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
        // this.board = new Whiteboard(document.getElementById("canvas-container"), "viewer", document.getElementById("session-id").value, "#999", this.handleChangePointer);
        this.board = new Whiteboard({
            sessionId: document.getElementById("session-id").value,
            sessionPassword: "",
            hostId: "",
            userId: this.state.userId,
            role: "viewer",
            bgColor: "#bbb",
            height: 500,
            width: 600,
            container: document.getElementById("canvas-container"),
            updatePointer: this.handleChangePointer
        });
    }

    handleAddNewPage() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.createNewPage();
    }

    handleGoNextPage() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.navigatePage(this.board.canvas.activePage + 1);
    }

    handleGoPrevPage() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.navigatePage(this.board.canvas.activePage - 1);
    }

    handleActivePen() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeActiveObject(0);
    }

    handleActiveEraser() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeActiveObject(1);
    }

    handleChangePointer(obj) {
        this.setState(obj);
    }

    handleUndo() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.handleUndo();
    }

    handleRedo() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.handleRedo();
    }

    componentDidMount() {
        signInAnonymously(auth).then(() => {
            console.log("Signed in as:");
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    console.log(user.uid);
                    this.setState({
                        userId: user.uid,
                        loggedIn: true
                    });
                }
                else {
                    this.setState({
                        userId: "",
                        loggedIn: false
                    });
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
                <button onClick={this.handleUndo}>Undo</button>
                <button onClick={this.handleRedo}>Redo</button>
                <Pointer size={this.state.size} top={this.state.top} left={this.state.left} vis={this.state.vis} icon={this.state.icon} />
                <div id="session-id">{this.state.sessionId}</div>
            </div>
        )
    }
}

export default Session;