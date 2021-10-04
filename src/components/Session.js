import React from 'react';
import { initializeApp } from '@firebase/app';
import { getFirestore } from "firebase/firestore";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, where, onSnapshot } from "firebase/firestore";
import { getDatabase, ref, set, onValue, get } from '@firebase/database';
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPen, faEraser, faUndo, faRedo, faChevronLeft, faChevronRight, faPlus } from '@fortawesome/free-solid-svg-icons';
import Tooltip from '@material-ui/core/Tooltip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Button from '@mui/material/Button';
import ColorizeIcon from '@mui/icons-material/Colorize';
import PrettoSlider from './MUSlider';
import ColorPopup from "./ColorPicker";
import ShareDialog from './ShareDialog';
import RandomCodeGenerator from './RandomIdGenerator';
import TextField from '@mui/material/TextField';


import "./../css/canvas.css";
import RandomIdGenerator from './RandomIdGenerator';

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
            undoStackCount: 0,
            activeLineWidth: props.lineWidth * 100 / props.width,
            activeLineColor: props.lineColor
        };
        this.action = {
            updatePointer: props.updatePointer
        }


        this.createTempCanvas();
        this.createNewPage();
        this.navigatePage(0);
        this.connectRTDB();
        this.loadData();
    }

    changeActiveObject(objectCode) {
        if (this.canvas.activeObject === objectCode) return;
        this.canvas.activeObject = objectCode;
    }

    changeLineColor(color) {
        this.canvas.activeLineColor = color;
    }

    changeLineWidth(size) {
        this.canvas.activeLineWidth = size * 100 / this.canvas.width;
    }

    connectRTDB() {
        this.lastData = null;
        onValue(ref(rtdb, this.config.sessionId), (snapshot) => {
            if (!snapshot.val()) return;

            var data = snapshot.val();
            if (!this.lastData || this.lastData.x !== data.x || this.lastData.y !== data.y || this.lastData.a !== data.a || this.lastData.p !== data.p || this.lastData.o !== data.o || this.lastData.h !== data.h || this.lastData.w !== data.w || data.a === 4 || data.a === 5) {
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
            // this.draw(doc.data().indx);
        });

        get(ref(rtdb, this.config.sessionId)).then((snapshot) => {
            if (snapshot.exists()) {
                let data = snapshot.val();
                this.drawTmp(data);
                this.lastData = data;
            }
            for (let i = 0; i <= this.canvas.currentObject; i++) {
                this.draw(i);
            }
            if (this.config.userId === this.config.hostId) this.config.role = "editor";
        }).catch((err) => {
            console.log(err);
            if (this.config.userId === this.config.hostId) this.config.role = "editor";
        });

        // let intv = setInterval((function () {
        //     if (this.canvas.currentObject !== -1) {
        //         for (let i = 0; i <= this.canvas.currentObject; i++) {
        //             this.draw(i);
        //         }
        //         // console.log(this.canvas.currentObject);
        //         clearInterval(intv);
        //     }
        // }).bind(this), 100);
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
            h: this.canvas.height,
            w: this.canvas.width,
            a: 0,
            p: this.canvas.activePage,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject,
            l: this.canvas.activeLineWidth,
            c: this.canvas.activeLineColor
        });
    }

    mouseMoveListener(e) {
        if (this.config.role !== "editor") return;
        set(ref(rtdb, this.config.sessionId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            h: this.canvas.height,
            w: this.canvas.width,
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
            h: this.canvas.height,
            w: this.canvas.width,
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

    reRender() {
        for (let i = 0; i < this.canvas.ctx.length; i++) {
            this.canvas.ctx[i].clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        let indx = this.canvas.currentObject;
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
            p: this.canvas.dataList[this.canvas.currentObject - 1] ? this.canvas.dataList[this.canvas.currentObject - 1].page : 0,
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
            p: this.canvas.dataList[this.canvas.currentObject + 1] ? this.canvas.dataList[this.canvas.currentObject + 1].page : 0,
            o: this.canvas.activeObject,
            i: this.canvas.currentObject + 1
        });
    }

    draw(indx) {
        if (!this.canvas.dataList[indx]) return;
        while (this.canvas.pages.length <= this.canvas.dataList[indx].page) this.createNewPage();

        let data = this.canvas.dataList[indx];
        if (this.canvas.dataList[indx].o === 0) {
            this.canvas.ctx[data.page].globalCompositeOperation = "source-over";
            this.canvas.ctx[data.page].beginPath();
            this.canvas.ctx[data.page].strokeStyle = data.c;
            this.canvas.ctx[data.page].lineWidth = parseInt(data.l * this.canvas.width / 100);
            this.canvas.ctx[data.page].lineJoin = "round";
            this.canvas.ctx[data.page].lineCap = "round";
            this.canvas.ctx[data.page].moveTo(data.s[0] * this.canvas.width / data.w, data.s[1] * this.canvas.height / data.h);

            for (let i = 0; i < data.p.length; i++) {
                this.canvas.ctx[data.page].lineTo(data.p[i][0] * this.canvas.width / data.w, data.p[i][1] * this.canvas.height / data.h);
            }
            this.canvas.ctx[data.page].stroke();
            this.canvas.ctx[data.page].closePath();
            this.canvas.tmpCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        else if (this.canvas.dataList[indx].o === 1) {
            this.canvas.ctx[data.page].globalCompositeOperation = "destination-out";
            this.canvas.ctx[data.page].beginPath();
            this.canvas.ctx[data.page].lineWidth = 20;
            this.canvas.ctx[data.page].lineJoin = "round";
            this.canvas.ctx[data.page].lineCap = "round";
            this.canvas.ctx[data.page].moveTo(data.s[0] * this.canvas.width / data.w, data.s[1] * this.canvas.height / data.h);

            for (let i = 0; i < data.p.length; i++) {
                this.canvas.ctx[data.page].lineTo(data.p[i][0] * this.canvas.width / data.w, data.p[i][1] * this.canvas.height / data.h);
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
        this.canvas.currentObject = data.i;

        let x = data.x ? data.x * this.canvas.width / data.w : 0;
        let y = data.y ? data.y * this.canvas.height / data.h : 0;

        if (data.a === 3) {
            this.action.updatePointer({
                top: this.canvas.tmpPage.offsetTop + y,
                left: this.canvas.tmpPage.offsetLeft + x,
                icon: data.o,
                vis: this.config.role === "editor" ? "none" : "inline-block"
            });
        }
        else if (data.a === 4) {
            this.undo(data.i);
            this.navigatePage(data.p);
            return;
        }
        else if (data.a === 5) {
            this.redo(data.i);
            this.navigatePage(data.p);
            return;
        }
        else {
            if (data.o === 0) {
                this.action.updatePointer({
                    top: this.canvas.tmpPage.offsetTop + y - 15,
                    left: this.canvas.tmpPage.offsetLeft + x,
                    icon: 0,
                    vis: this.config.role === "editor" ? "none" : "inline-block"
                });
            }
            else if (data.o === 1) {
                this.action.updatePointer({
                    top: this.canvas.tmpPage.offsetTop + y - 15,
                    left: this.canvas.tmpPage.offsetLeft + x,
                    icon: 1,
                    vis: this.config.role === "editor" ? "none" : "inline-block"
                });
            }
        }

        if (data.o === 0) {
            if (data.a === 0) {
                // this.canvas.currentObject = data.i; // updating current object index
                this.canvas.dataList[data.i] = {
                    s: [data.x, data.y],
                    h: data.h,
                    w: data.w,
                    o: data.o,
                    page: data.p,
                    p: [],
                    e: [],
                    l: data.l,
                    c: data.c
                };

                this.canvas.tmpCtx.strokeStyle = data.c;
                this.canvas.tmpCtx.beginPath();
                this.canvas.tmpCtx.lineWidth = parseInt(data.l * this.canvas.width / 100);
                this.canvas.tmpCtx.lineJoin = "round";
                this.canvas.tmpCtx.lineCap = "round";
                this.canvas.tmpCtx.moveTo(x, y);
            }
            else if (data.a === 1) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].p.push([data.x, data.y]);
                this.canvas.tmpCtx.lineTo(x, y);
                this.canvas.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].e.push(x);
                this.canvas.dataList[data.i].e.push(y);
                this.canvas.tmpCtx.moveTo(x, y);
                this.canvas.tmpCtx.closePath();
                this.draw(data.i);
            }
        }
        else if (data.o === 1) {
            if (data.a === 0) {
                this.canvas.currentObject = data.i;
                this.canvas.dataList[data.i] = {
                    s: [data.x, data.y],
                    h: data.h,
                    w: data.w,
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
                this.canvas.tmpCtx.moveTo(x, y);
            }
            else if (data.a === 1) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].p.push([data.x, data.y]);
                this.canvas.tmpCtx.lineTo(x, y);
                this.canvas.tmpCtx.stroke();
            }
            else if (data.a === 2) {
                if (!this.canvas.dataList[data.i]) return;
                this.canvas.dataList[data.i].e.push(data.x);
                this.canvas.dataList[data.i].e.push(data.y);
                this.canvas.tmpCtx.moveTo(x, y);
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
        this.setDimensions();
    }

    createTempCanvas() {
        let canvas = document.createElement("canvas");
        canvas.height = this.canvas.height;
        canvas.width = this.canvas.width;
        canvas.classList.add("tmp-canvas");
        this.canvas.container.appendChild(canvas);
        this.canvas.tmpCtx = canvas.getContext("2d");
        this.canvas.tmpPage = canvas;
        this.canvas.tmpPage.style.touchAction = "none";
        canvas.addEventListener("pointerdown", this.mouseDownListener.bind(this));
        canvas.addEventListener("pointermove", this.mouseMoveListener.bind(this));
        canvas.addEventListener("pointerup", this.mouseUpListener.bind(this));
        canvas.addEventListener("pointerout", this.mouseUpListener.bind(this));
        // canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
        // canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));
        // canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
        // canvas.addEventListener("mouseout", this.mouseUpListener.bind(this));
    }

    setDimensions() {
        let lineWidth = this.canvas.activeLineWidth * this.canvas.width / 100;
        let canvasWidth = window.innerWidth;
        let canvasHeight = window.innerWidth * this.canvas.height / this.canvas.width;
        if (window.innerWidth * this.canvas.height > this.canvas.width * window.innerHeight) {
            canvasHeight = window.innerHeight;
            canvasWidth = window.innerHeight * this.canvas.width / this.canvas.height;
        }
        this.canvas.height = canvasHeight;
        this.canvas.width = canvasWidth;
        this.canvas.activeLineWidth = lineWidth * 100 / canvasWidth;
        for (let i = 0; i < this.canvas.pages.length; i++) {
            this.canvas.pages[i].height = canvasHeight;
            this.canvas.pages[i].width = canvasWidth;
            this.canvas.pages[i].style.top = (window.innerHeight - canvasHeight) / 2 + "px";
            this.canvas.pages[i].style.left = (window.innerWidth - canvasWidth) / 2 + "px";
        }
        this.canvas.tmpPage.height = canvasHeight;
        this.canvas.tmpPage.width = canvasWidth;
        this.canvas.tmpPage.style.top = (window.innerHeight - canvasHeight) / 2 + "px";
        this.canvas.tmpPage.style.left = (window.innerWidth - canvasWidth) / 2 + "px";
        this.reRender();
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

function PenToolBox(props) {
    // color picker
    const [open, setOpen] = React.useState(false);

    const handleClose = () => {
        setOpen(false);
    }
    // color picker

    const handlePick = (color) => {
        props.handleChangePenColor(props.indx, color);
    }

    return (
        <div className="tool-box-menu">
            <div className="tool-title">Color<span style={{
                display: "inline-block",
                position: "absolute",
                right: 20,
                fontWeight: 900,
                color: props.activeColor
            }}>{props.activeColor}</span></div>
            <button className={"color-btn" + (props.activeColor === "#000000" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#000000"); }} style={{
                backgroundColor: "#000000"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#e71224" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#e71224"); }} style={{
                backgroundColor: "#e71224"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#19acc0" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#19acc0"); }} style={{
                backgroundColor: "#19acc0"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#2bb335" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#2bb335"); }} style={{
                backgroundColor: "#2bb335"
            }}></button>

            <br />
            <button className={"color-btn" + (props.activeColor === "#ffffff" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#ffffff"); }} style={{
                backgroundColor: "#e5e5e5"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#ffc114" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#ffc114"); }} style={{
                backgroundColor: "#ffc114"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#5b2d90" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#5b2d90"); }} style={{
                backgroundColor: "#5b2d90"
            }}></button>
            <button className={"color-btn" + (props.activeColor === "#d20078" ? " color-btn-active" : "")} onClick={() => { props.handleChangePenColor(props.indx, "#d20078"); }} style={{
                backgroundColor: "#d20078"
            }}></button>
            <br />

            <div style={{
                marginTop: 10
            }}>
                <Button onClick={() => { setOpen(true) }} variant="outlined" color="primary" startIcon={<ColorizeIcon />} style={{
                    fontSize: 13
                }}>
                    Custom Color
                </Button>
                <ColorPopup open={open} handleClose={handleClose} handlePick={handlePick} />
            </div>
            <div className="tool-title" style={{
                marginTop: 20,
                fontSize: 15
            }}>Size<span style={{
                display: "inline-block",
                position: "absolute",
                right: 20,
                fontWeight: 900
            }}>{props.activeSize}</span></div>
            <div style={{
                margin: "5px 20px"
            }}>
                <PrettoSlider
                    valueLabelDisplay="auto"
                    aria-label="pretto slider"
                    value={props.activeSize}
                    max={30}
                    min={1}
                    onChange={(event, newVal) => {
                        props.handleChangePenSize(props.indx, newVal);
                    }}
                />
            </div>
        </div>);
}

class Session extends React.Component {
    constructor(props) {
        super(props);
        this.board = null;

        this.toolboxHeight = 322;

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
            hostId: "",
            participants: [],
            activeSession: false,
            toolboxTop: (window.innerHeight - this.toolboxHeight) / 2,
            activeTool: "pen1",
            penToolBox1: false,
            penToolBox2: false,
            penToolBox3: false,
            penToolBox4: false,
            pen1Color: "#000000",
            pen2Color: "#5b2d90",
            pen3Color: "#2bb335",
            pen4Color: "#ffc114",
            pen1Size: 5,
            pen2Size: 5,
            pen3Size: 5,
            pen4Size: 5
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
        this.handleUpdateDimension = this.handleUpdateDimension.bind(this);
        this.handleTogglePenToolBox = this.handleTogglePenToolBox.bind(this);
        this.handleClosePenToolBox = this.handleClosePenToolBox.bind(this);
        this.handleChangeLineColor = this.handleChangeLineColor.bind(this);
        this.handleChangeLineSize = this.handleChangeLineSize.bind(this);
        this.handleChangePenColor = this.handleChangePenColor.bind(this);
        this.handleChangePenSize = this.handleChangePenSize.bind(this);
    }

    async refreshParticipantsList(sessionId) {
        const querySnapshot = await getDocs(collection(db, "sessions", sessionId, "participants"));
        let participantsList = [];
        querySnapshot.forEach((doc) => {
            console.log(doc.data());
        });
    }

    async createNewSession() {
        if (!this.state.loggedIn) return;
        console.log("Starting New Session");
        try {
            let session_code = RandomCodeGenerator(6);
            while (true) {
                let code = RandomCodeGenerator(6);
                const q = query(collection(db, "session_details"), where("code", "==", code));
                const querySnapshot = await getDocs(q);
                let count = 0;
                querySnapshot.forEach((doc) => {
                    // console.log(doc.id, " => ", doc.data());
                    count++;
                });
                session_code = code;
                if (count === 0) break;
            }

            const ref = await addDoc(collection(db, "sessions"), {
                host: this.state.userId,
                participants: RandomIdGenerator(4),
                pageCount: 1,
                objectCount: 0,
                width: window.innerWidth,
                height: window.innerHeight,
                code: session_code
            });
            await addDoc(collection(db, "session_details"), {
                code: session_code,
                id: ref.id
            });
            await setDoc(doc(db, "sessions", ref.id, "participants", this.state.userId), {
                name: "anymous-host"
            });
            await setDoc(doc(db, "sessions", ref.id, "participants", "random"), {
                code: RandomIdGenerator(4)
            });

            console.log("Session Stublished with ID: ", ref.id);
            console.log("Session Stublished with Code: ", session_code);

            onSnapshot(doc(db, "sessions", ref.id, "participants", "random"), (doc) => {
                console.log("Current data: ", doc.data());
                this.refreshParticipantsList(ref.id);
            });

            this.setState({
                sessionId: ref.id,
                sessionCode: session_code,
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
                    bgColor: "#f2f3f5",
                    height: window.innerHeight,
                    width: window.innerWidth,
                    lineColor: this.state[this.state.activeTool + "Color"],
                    lineWidth: this.state[this.state.activeTool + "Size"],
                    container: document.getElementById("canvas-container"),
                    updatePointer: this.handleChangePointer
                });
                this.setState({
                    activeSession: true
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
        let sessionCode = document.getElementById("session-code").value;
        sessionCode = (sessionCode.trim()).toUpperCase();

        const q = query(collection(db, "session_details"), where("code", "==", sessionCode));
        const querySnapshot = await getDocs(q);
        let sessionId = undefined;
        querySnapshot.forEach((doc) => {
            sessionId = doc.data().id;
        });

        if (!sessionId) {
            console.log("Invalid Session Id");
            alert("Invalid Session Id");
            return;
        }

        const ref = doc(db, "sessions", sessionId);
        const docSnap = await getDoc(ref);

        if (docSnap.exists()) {
            let data = docSnap.data();
            await setDoc(doc(db, "sessions", ref.id, "participants", this.state.userId), {
                name: "anynomus"
            });
            await setDoc(doc(db, "sessions", ref.id, "participants", "random"), {
                code: RandomIdGenerator(4)
            });
            this.board = new Whiteboard({
                sessionId: sessionId,
                sessionPassword: "",
                hostId: data.host,
                userId: this.state.userId,
                role: "viewer",
                bgColor: "#f2f3f5",
                height: data.height,
                width: data.width,
                lineColor: this.state[this.state.activeTool + "Color"],
                lineWidth: this.state[this.state.activeTool + "Size"],
                container: document.getElementById("canvas-container"),
                updatePointer: this.handleChangePointer
            });
            this.setState({
                activeSession: true,
                sessionCode: sessionCode
            });
        }
        else {
            console.log("Unable To Join Session");
        }
    }

    handleAddNewPage() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.createNewPage();
    }

    handleGoNextPage() {
        // if (!this.board || this.board.config.role !== "editor" || true) return;
        if (this.board)
            this.board.navigatePage(this.board.canvas.activePage + 1);
    }

    handleGoPrevPage() {
        // if (!this.board || this.board.config.role !== "editor") return;
        if (this.board)
            this.board.navigatePage(this.board.canvas.activePage - 1);
    }

    handleActivePen(indx) {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeActiveObject(0);
        this.setState({
            activeTool: "pen" + indx
        });
        this.handleChangeLineColor(this.state["pen" + indx + "Color"]);
        this.handleChangeLineSize(this.state["pen" + indx + "Size"]);
    }

    handleActiveEraser() {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeActiveObject(1);
        this.setState({
            activeTool: "eraser"
        })
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

    handleChangeLineColor(color) {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeLineColor(color);
    }

    handleChangeLineSize(size) {
        if (!this.board || this.board.config.role !== "editor") return;
        this.board.changeLineWidth(size);
    }

    handleUpdateDimension() {
        if (this.state.activeSession && this.board) {
            this.board.setDimensions();
        }
        this.setState({
            toolboxTop: (window.innerHeight - this.toolboxHeight) / 2
        });
    }

    componentDidMount() {
        window.addEventListener('resize', this.handleUpdateDimension);
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

    componentWillUnmount() {
        window.removeEventListener('resize', this.handleUpdateDimension);
    }

    handleTogglePenToolBox(indx) {
        if (this.state.activeTool !== "pen" + indx) return;
        let obj = {};
        obj["penToolBox" + indx] = !this.state["penToolBox" + indx];
        this.setState(obj);
    }

    handleClosePenToolBox(indx) {
        let obj = {};
        obj["penToolBox" + indx] = false;
        this.setState(obj);
    }

    handleChangePenColor(indx, color) {
        let obj = {};
        obj["pen" + indx + "Color"] = color;
        this.setState(obj, () => {
            this.handleChangeLineColor(color);
        });
    }

    handleChangePenSize(indx, size) {
        let obj = {};
        obj["pen" + indx + "Size"] = size;
        this.setState(obj, () => {
            this.handleChangeLineSize(size);
        });
    }

    render() {
        return (
            <div>
                <div id="canvas-container"></div>
                <div id="participants" style={{
                    position: "fixed",
                    right: 100,
                    top: 100,
                    zIndex: 5000
                }}>
                    {this.state.participants.map((data, indx) => {
                        <div key={indx}>{data}</div>
                    })}

                </div>
                <Pointer size={this.state.size} top={this.state.top} left={this.state.left} vis={this.state.vis} icon={this.state.icon} />
                <div className="session-box" style={{
                    display: this.state.activeSession ? "none" : "flex",
                    justifyContent: "center",
                    width: "100%",
                    height: "100vh",
                    alignItems: "center",
                    background: "#eee",
                    zIndex: 2002
                }}>
                    <div style={{
                        display: "flex",
                        flexDirection: "column"
                    }}>

                        <Button variant="contained" onClick={this.createNewSession} style={{
                            marginBottom: 20
                        }}>Start New Session</Button>

                        <TextField variant="outlined" label="SESSION ID" id="session-code" />
                        <Button variant="contained" color="secondary" onClick={this.joinExistingSession} style={{
                            marginTop: 5
                        }}>Join Session</Button>
                        <div id="session-id">{this.state.sessionId}</div>
                    </div>
                </div>
                <ShareDialog sessionId={this.state.sessionCode} />
                <div className="tool-box-area" style={{
                    top: this.state.toolboxTop
                }}>
                    <div className="tool-box">
                        <div>
                            <Tooltip title={this.state.penToolBox1 ? "" : "Brush"} placement="right" arrow>
                                <div className={"tool-item " + (this.state.activeTool === "pen1" ? "active-tool" : "")} onClick={() => this.handleActivePen(1)}>
                                    <ClickAwayListener onClickAway={() => this.handleClosePenToolBox(1)}>
                                        <div className="tool-item">
                                            <div className="tool-item" onClick={() => this.handleTogglePenToolBox(1)}>
                                                <div className="tool-item-icon">
                                                    <FontAwesomeIcon icon={faPen} style={{
                                                        color: this.state.pen1Color
                                                    }} />
                                                </div>
                                            </div>
                                            {this.state.penToolBox1 ? (
                                                <PenToolBox indx={1} activeColor={this.state.pen1Color} activeSize={this.state.pen1Size} handleChangePenColor={this.handleChangePenColor} handleChangePenSize={this.handleChangePenSize} />
                                            ) : null}
                                        </div>
                                    </ClickAwayListener>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title={this.state.penToolBox2 ? "" : "Brush"} placement="right" arrow>
                                <div className={"tool-item " + (this.state.activeTool === "pen2" ? "active-tool" : "")} onClick={() => this.handleActivePen(2)}>
                                    <ClickAwayListener onClickAway={() => this.handleClosePenToolBox(2)}>
                                        <div className="tool-item">
                                            <div className="tool-item" onClick={() => this.handleTogglePenToolBox(2)}>
                                                <div className="tool-item-icon">
                                                    <FontAwesomeIcon icon={faPen} style={{
                                                        color: this.state.pen2Color
                                                    }} />
                                                </div>
                                            </div>
                                            {this.state.penToolBox2 ? (
                                                <PenToolBox indx={2} activeColor={this.state.pen2Color} activeSize={this.state.pen2Size} handleChangePenColor={this.handleChangePenColor} handleChangePenSize={this.handleChangePenSize} />
                                            ) : null}
                                        </div>
                                    </ClickAwayListener>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title={this.state.penToolBox3 ? "" : "Brush"} placement="right" arrow>
                                <div className={"tool-item " + (this.state.activeTool === "pen3" ? "active-tool" : "")} onClick={() => this.handleActivePen(3)}>
                                    <ClickAwayListener onClickAway={() => this.handleClosePenToolBox(3)}>
                                        <div className="tool-item">
                                            <div className="tool-item" onClick={() => this.handleTogglePenToolBox(3)}>
                                                <div className="tool-item-icon">
                                                    <FontAwesomeIcon icon={faPen} style={{
                                                        color: this.state.pen3Color
                                                    }} />
                                                </div>
                                            </div>
                                            {this.state.penToolBox3 ? (
                                                <PenToolBox indx={3} activeColor={this.state.pen3Color} activeSize={this.state.pen3Size} handleChangePenColor={this.handleChangePenColor} handleChangePenSize={this.handleChangePenSize} />
                                            ) : null}
                                        </div>
                                    </ClickAwayListener>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title={this.state.penToolBox4 ? "" : "Brush"} placement="right" arrow>
                                <div className={"tool-item " + (this.state.activeTool === "pen4" ? "active-tool" : "")} onClick={() => this.handleActivePen(4)}>
                                    <ClickAwayListener onClickAway={() => this.handleClosePenToolBox(4)}>
                                        <div className="tool-item">
                                            <div className="tool-item" onClick={() => this.handleTogglePenToolBox(4)}>
                                                <div className="tool-item-icon">
                                                    <FontAwesomeIcon icon={faPen} style={{
                                                        color: this.state.pen4Color
                                                    }} />
                                                </div>
                                            </div>
                                            {this.state.penToolBox4 ? (
                                                <PenToolBox indx={4} activeColor={this.state.pen4Color} activeSize={this.state.pen4Size} handleChangePenColor={this.handleChangePenColor} handleChangePenSize={this.handleChangePenSize} />
                                            ) : null}
                                        </div>
                                    </ClickAwayListener>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title="Eraser" placement="right" arrow>
                                <div className={"tool-item " + (this.state.activeTool === "eraser" ? "active-tool" : "")} onClick={this.handleActiveEraser}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faEraser} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title="Undo" placement="right" arrow>
                                <div className="tool-item" onClick={this.handleUndo}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faUndo} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title="Redo" placement="right" arrow>
                                <div className="tool-item" onClick={this.handleRedo}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faRedo} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                </div>
                <div className="page-control-area">
                    <div className="page-btn">
                        <div>
                            <Tooltip title="Previous Page" placement="top" arrow>
                                <div className="page-control-item" onClick={this.handleGoPrevPage}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faChevronLeft} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title="Add New Page" placement="top" arrow>
                                <div className="page-control-item" onClick={this.handleAddNewPage}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faPlus} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                        <div>
                            <Tooltip title="Next Page" placement="top" arrow>
                                <div className="page-control-item" onClick={this.handleGoNextPage}>
                                    <div className="tool-item-icon">
                                        <FontAwesomeIcon icon={faChevronRight} />
                                    </div>
                                </div>
                            </Tooltip>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}

export default Session;