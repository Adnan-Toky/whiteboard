import React from "react";

class Z extends React.Component {
    render() {
        return (
            <div style={{
                height: 500,
                width: 500,
                background: "#555"
            }}
                onPointerDown={() => { console.log("down") }}
                onPointerUp={() => { console.log("up") }}
                onPointerMove={() => { console.log("move") }}
                onPointerOut={() => { console.log("out") }}
                onPointerOver={() => { console.log("over") }}
                onPointerEnter={() => { console.log("enter") }}
                onPointerCancel={() => { console.log("cancel") }}
                onPointerLeave={() => { console.log("leave") }}
                onGotPointerCapture={() => { console.log("got") }}
                onLostPointerCapture={() => { console.log("lost") }}
            // onMouseDown={() => { console.log("down-m") }}
            // onMouseMove={() => { console.log("move-m") }}
            // onMouseUp={() => { console.log("up-m") }}
            // onDragEnd={() => { console.log("drag-m") }}
            // onMouseDown={() => { console.log("down-m") }}

            >

            </div>
        )
    }
}

export default Z;