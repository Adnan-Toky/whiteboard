function ParticipantsTab(props) {
    return (
        <div className="participants-tab">
            <ul>
                {props.list.map((data, indx) => (
                    <li key={indx}>{data.name}{data.id}</li>
                ))}
            </ul>
        </div>
    )
}

export default ParticipantsTab;