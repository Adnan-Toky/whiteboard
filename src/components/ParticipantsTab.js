import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const colors = ["#1a436b", "#1a432d", "#1a43c1", "#c8a065", "#af6850", "#bb68d5"];

function FirstLetterCircle(props) {
    return (
        <div style={{
            height: 45,
            width: 45,
            background: colors[props.indx % colors.length],
            borderRadius: "50%",
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 25,
            color: "#fff",
            fontFamily: "arial"
        }}>
            <div>{props.letter}</div>
        </div>
    )
}

function ParticipantsTab(props) {
    return (
        <div className="participants-tab">
            <div style={{
                margin: "20px 20px",
                fontSize: 18,
                fontWeight: 800,
                color: "#565656"
            }}>
                <span>Participants</span>
                <IconButton onClick={props.onClose} style={{
                    position: "absolute",
                    right: 15,
                    top: 12
                }}>
                    <CloseIcon />
                </IconButton>
            </div>
            <ul>
                {props.list.map((data, indx) => (
                    <li key={indx}>
                        <div style={{
                            display: "flex"
                        }}>
                            <div style={{
                                display: "inline-block"
                            }}>
                                <FirstLetterCircle letter={data.name.slice(0, 1).toUpperCase()} indx={indx} />
                            </div>
                            <div style={{
                                display: "inline-block",
                                marginLeft: 10,
                                marginTop: 3,
                                width: 140
                            }}>
                                <div style={{
                                    fontSize: 17,
                                    color: "#1665c0",
                                    textOverflow: "ellipsis",
                                    height: 20,
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    marginBottom: 0
                                }}>{data.name}</div><br />
                                <div style={{
                                    fontSize: 13,
                                    color: "#636b6f",
                                    marginTop: -15
                                }}><span style={{
                                    fontWeight: 500
                                }}>ID:</span> {data.id.slice(0, 6).toUpperCase()}</div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div >
    )
}

export default ParticipantsTab;