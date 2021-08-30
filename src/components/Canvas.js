import React from 'react';
import { initializeApp } from '@firebase/app';
import { getFirestore } from "firebase/firestore";
import { collection, doc, addDoc, setDoc } from "firebase/firestore";
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
const db = getFirestore();
const rtdb = getDatabase();

/*
class Whiteboard {
    constructor(container, numOfPages, data) {
        this.pages = [];
        this.ctxs = [];
        for (let i = 0; i < numOfPages; i++) {
            this.createNewPage(container);
        }
        // set up data
        this.dataList = [];
        this.startStatus = false;
        this.reloadStatus = false;
        this.expectedObjectIndex = 0;
        this.activePage = 0;
        this.requiredReloadAfterAction = false;
    }

    createNewPage(container){
        const canvas = document.createElement("canvas");
        canvas.height = 100;
        canvas.width = 100;
        canvas.style.backgroundColor = "red";
        canvas.style.margin = "5px";
        container.appendChild(canvas);
        this.pages.push(canvas);
        this.ctxs.push(canvas.getContext("2d"));
    }

    async reload(maxIndexFromLoadedData) {
        this.reloadStatus = true;
        // refreshing page
        console.log("Reloading...");
        this.reloadStatus = false;
    }

    refresh(dataIndx){
        let data = this.dataList[this.dataList];
        if(data["actionType"]==0){
            this.ctxs[data.pageIndex].beginPath();
            this.ctxs[data.pageIndex].moveTo(data.satrt[0], data.start[1]);
            for(let i = 0; i < data.points.length; i++){
                this.ctxs[data.pageIndex].lineTo(data.points[i][0], data.points[i][1]);
            }
            this.ctxs[data.pageIndex].stroke();
            this.ctxs[data.pageIndex].closePath();
        }
    }

    update(data) {
        if (data.actionType == 0) {
            // when starts drawing a new object, first check if the previous drawing has completed. if not, reload the data.
            if (this.startStatus) {
                this.reload(data.objectIndex - 1);
            }
            this.startStatus = true;
            // check if current object index mathches with the object index got from the server. if not, reload.
            if (data.objectIndex != this.expectedObjectIndex) {
                if (!this.reloadStatus) {
                    this.reload(this.objectIndex - 1);
                }
                this.expectedObjectIndex = data.objectIndex;
            }
            // check if the current page is active. if not, active page first.
            if (!this.activePage != data.pageIndex) {
                // if the page doesn't exists, create new page.
            }

            this.dataList[this.objectIndex] = {};
            this.dataList[this.objectIndex]["actionType"] = 0;
            this.dataList[this.objectIndex]["start"] = [data.x, data.y];
            this.dataList[this.objectIndex]["points"] = [];
            this.dataList[this.objectIndex]["pageIndex"] = data.pageIndex;

            if (data.objectType == 0) {
                this.ctxs[data.pageIndex].beginPath();
                this.ctxs[data.pageIndex].moveTo(data.x, data.y);
            }
        }
        else if (data.actionType == 1) {
            // when continues drawing a new object, first check if the drawing has started. if not, reload after getting an interval (end of action).
            // check if current object index mathches the object index got from the server. if not, reload after interval.
            // check if the current page is active. if not, reload after interval.
            if (!this.startStatus || data.objectIndex != this.expectedObjectIndex || !this.activePage != data.pageIndex) {
                this.requiredReloadAfterAction = true;
            }
            else {
                if (data.objectType == 0) {
                    this.dataList[data.objectIndex]["points"].push([data.x, data.y]);
                    this.ctxs[data.pageIndex].lineTo(data.x, data.y);
                    this.ctxs[data.pageIndex].stroke();
                }

            }
        }
        else if (data.actionType == 2) {
            // when ends drawing an object, check if the drawing started. if not, reload the data.
            // check if requires reload
            // check if current object index mathches the object index got from the server. if not, reload after interval.
            // check if the current page is active. if not, reload after interval.
            if (this.requiredReloadAfterAction || !this.startStatus || data.objectIndex != this.expectedObjectIndex || !this.activePage != data.pageIndex) {
                this.reload(data.objectIndex);
            }
            else {
                if (data.objectType == 0) {
                    this.dataList[data.objectIndex]["end"] = [data.x, data.y];
                    this.ctxs[data.pageIndex].lineTo(data.x, data.y);
                    this.ctxs[data.pageIndex].stroke();
                    this.ctxs[data.pageIndex].closePath();
                }
            }
        }

    }
}
*/

class Whiteboard {
    constructor(container, role, whiteboardId) {
        this.pages = [];
        this.ctx = [];
        this.dataList = [];
        this.activePage = 0;
        this.role = role;
        this.tmpCtx = undefined;
        this.container = container;
        this.createNewPage(container);
        this.createTempCanvas(container);
        this.whiteboardId = whiteboardId;
        this.lastData = undefined;
        this.drawing = false;
        onValue(ref(rtdb, whiteboardId), (snapshot) => {
            if (!snapshot.val()) return;

            var data = snapshot.val();
            if (!this.lastData || this.lastData.x != data.x || this.lastData.y != data.y || this.lastData.a != data.a || this.lastData.p != data.p || this.lastData.o != data.o) {
                this.drawTmp(data);
            }
        });
    }

    async loadData() {

    }

    async syncData() {
        try {
            await setDoc(doc(db, "sessions", this.whiteboardId, "objects", "" + (this.dataList.length - 1)), {
                data: JSON.stringify(this.dataList[this.dataList.length - 1]),
                indx: this.dataList.length - 1
            });
        }
        catch (err) {
            console.log("Error sync data, Err:", err);
        }
        console.log(this.dataList[this.dataList.length - 1]);
    }

    mouseDownListener(e) {
        if (this.role != "editor") return;
        this.drawing = true;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: 0,
            p: this.activePage,
            o: 0
        });
    }

    mouseMoveListener(e) {
        if (this.role != "editor") return;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.drawing ? 1 : 3,
            p: this.activePage,
            o: 0
        });
    }

    mouseUpListener(e) {
        if (this.role != "editor") return;
        set(ref(rtdb, this.whiteboardId), {
            x: e.clientX - e.target.offsetLeft,
            y: e.clientY - e.target.offsetTop,
            a: this.drawing ? 2 : 3,
            p: this.activePage,
            o: 0
        });
        if (this.drawing) this.syncData();
        this.drawing = false;
    }

    draw(indx) {
        if (this.dataList[indx].o == 0) {
            let data = this.dataList[indx];
            this.ctx[data.page].beginPath();
            this.ctx[data.page].moveTo(data.s[0], data.s[1]);

            for (let i = 0; i < data.p.length; i++) {
                this.ctx[data.page].lineTo(data.p[i][0], data.p[i][1]);
            }
            this.ctx[data.page].stroke();
            this.ctx[data.page].closePath();
        }
    }

    drawTmp(data) {
        if (!data) return;
        while (this.pages.length <= data.p) this.createNewPage(this.container);
        if (data.a == 0) {
            this.dataList.push({
                s: [data.x, data.y],
                o: data.o,
                page: data.p,
                p: [],
                e: []
            });

            this.tmpCtx.beginPath();
            this.tmpCtx.moveTo(data.x, data.y);
        }
        else if (data.a == 1) {
            this.dataList[this.dataList.length - 1].p.push([data.x, data.y]);
            this.tmpCtx.lineTo(data.x, data.y);
            this.tmpCtx.stroke();
        }
        else if (data.a == 2) {
            this.dataList[this.dataList.length - 1].e.push(data.x);
            this.dataList[this.dataList.length - 1].e.push(data.y);
            this.tmpCtx.moveTo(data.x, data.y);
            this.tmpCtx.closePath();
            this.draw(this.dataList.length - 1);
        }
    }

    createNewPage(container) {
        const canvas = document.createElement("canvas");
        canvas.height = 300;
        canvas.width = 600;
        canvas.style.backgroundColor = "#999";
        this.pages.push(canvas);
        container.appendChild(canvas);
        this.ctx.push(canvas.getContext("2d"));
    }

    createTempCanvas(container) {
        let canvas = document.createElement("canvas");
        canvas.height = 300;
        canvas.width = 600;
        canvas.style.backgroundColor = "#77f";
        container.appendChild(canvas);
        canvas.addEventListener("mousedown", this.mouseDownListener.bind(this));
        canvas.addEventListener("mousemove", this.mouseMoveListener.bind(this));
        canvas.addEventListener("mouseup", this.mouseUpListener.bind(this));
        canvas.addEventListener("mouseout", this.mouseUpListener.bind(this));
        this.tmpCtx = canvas.getContext("2d");
    }
}


class Canvas extends React.Component {
    constructor(props) {
        super(props);
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
                new Whiteboard(document.body, "editor", ref.id);
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
        new Whiteboard(document.body, "viewer", document.getElementById("session-id").value);
    }

    componentDidMount() {
        // this.createNewSession();
        // try {
        //     const docRef = await setDoc(doc(db, "sessions", "1"), {
        //         first: "Ada",
        //         last: "Lovelace",
        //         born: 1815
        //     });
        //     console.log("Document written with ID: ", docRef);
        // } catch (e) {
        //     console.log("Error ", e);
        // }

        // try {
        //     const ref = await setDoc(collection(db, "sessions", "1", "2"), {
        //         x: "xxx"
        //     });
        //     console.log("done");
        // } catch (e) {
        //     console.log(e);
        // }
    }

    render() {
        return (
            <div>
                <button onClick={this.createNewSession}>Start New Session</button>
                <input type="text" id="session-id" />
                <button onClick={this.joinExistingSession}>Join Session</button>
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