import React from 'react';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import Button from "@material-ui/core/Button";
import useWindowSize from './useWindowSize';

const colorList = [
    '#212121', '#323232', '#454545', '#616161', '#757575', '#909090', '#A9A9A9', '#CCCCCC', '#DDDDDD', '#FAFAFA',
    '#263238', '#37474F', '#455A64', '#546E7A', '#607D8B', '#78909C', '#90A4AE', '#B0BEC5', '#CFD8DC', '#ECEFF1',
    '#4A148C', '#6A1B9A', '#7B1FA2', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8', '#CE93D8', '#E1BEE7', '#F3E5F5',
    '#311B92', '#4527A0', '#512DA8', '#5E35B1', '#673AB7', '#7E57C2', '#9575CD', '#B39DDB', '#D1C4E9', '#EDE7F6',
    '#1A237E', '#283593', '#303F9F', '#3949AB', '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9', '#E8EAF6',
    '#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD',
    '#01579B', '#0277BD', '#0288D1', '#039BE5', '#03A9F4', '#29B6F6', '#4FC3F7', '#81D4FA', '#B3E5FC', '#E1F5FE',
    '#006064', '#00838F', '#0097A7', '#00ACC1', '#00BCD4', '#26C6DA', '#4DD0E1', '#80DEEA', '#B2EBF2', '#E0F7FA',
    '#004D40', '#00695C', '#00796B', '#00897B', '#009688', '#26A69A', '#4DB6AC', '#80CBC4', '#B2DFDB', '#E0F2F1',
    '#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9',
    '#33691E', '#558B2F', '#689F38', '#7CB342', '#8BC34A', '#9CCC65', '#AED581', '#C5E1A5', '#DCEDC8', '#F1F8E9',
    '#827717', '#9E9D24', '#AFB42B', '#C0CA33', '#CDDC39', '#D4E157', '#DCE775', '#E6EE9C', '#F0F4C3', '#F9FBE7',
    '#F57F17', '#F9A825', '#FBC02D', '#FDD835', '#FFEB3B', '#FFEE58', '#FFF176', '#FFF59D', '#FFF9C4', '#FFFDE7',
    '#FF6F00', '#FF8F00', '#FFA000', '#FFB300', '#FFC107', '#FFCA28', '#FFD54F', '#FFE082', '#FFECB3', '#FFF8E1',
    '#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800', '#FFA726', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFF3E0',
    '#BF360C', '#D84315', '#E64A19', '#F4511E', '#FF5722', '#FF7043', '#FF8A65', '#FFAB91', '#FFCCBC', '#FBE9E7',
    '#b71c1c', '#c62828', '#d32f2f', '#e53935', '#f44336', '#ef5350', '#e57373', '#ef9a9a', '#ffcdd2', '#ffebee',
    '#880E4F', '#AD1457', '#C2185B', '#D81B60', '#E91E63', '#EC407A', '#F06292', '#F48FB1', '#F8BBD0', '#FCE4EC',
    '#3E2723', '#4E342E', '#5D4037', '#6D4C41', '#795548', '#8D6E63', '#A1887F', '#BCAAA4', '#D7CCC8', '#EFEBE9',
];

function ColorPopup(props) {
    let [w, h] = useWindowSize();
    if (h === -1) return;
    let width = Math.min(460, w - 74);
    return (
        <Dialog
            fullWidth={false}
            // maxWidth={300}
            open={props.open}
            onClose={props.handleClose}
            aria-labelledby="max-width-dialog-title"
        >
            <div style={{
                height: 420,
                width: width,
                padding: 10,
                boxSizing: "border-box",
                textAlign: "center",
            }}>
                {
                    colorList.map((color, indx) => (
                        <Button
                            key={indx}
                            onClick={() => {
                                props.handlePick(color);
                                props.handleClose();
                            }}
                            size="large"
                            style={{
                                backgroundColor: color,
                                marginTop: -1,
                                borderRadius: 0,
                                maxWidth: (width - 20) / 10,
                                maxHeight: '22px',
                                minWidth: (width - 20) / 10,
                                minHeight: '22px'
                            }}
                        ></Button>
                    ))
                }
            </div>
            <DialogActions>
                <Button onClick={props.handleClose} color="primary">
                    Close
                </Button>
            </DialogActions>
        </Dialog >
    );
}

// function PickColor(props) {
//     const [open, setOpen] = React.useState(false);

//     const handleClose = () => {
//         setOpen(false);
//     }

//     return (
//         <div style={{ display: "inline-block" }}>
//             <Button style={{
//                 backgroundColor: props.value,
//                 height: 20
//             }} onClick={() => { setOpen(true) }}></Button>
//             <ColorPopup open={open} handleClose={handleClose} handlePick={props.handlePick} />
//         </div>
//     );
// }

export default ColorPopup;