import { toast } from 'react-toastify';
const errorPath = "https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233574/error.mp3";
const warningPath = "https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233563/warning.mp3";
const errorAudio = new Audio(errorPath);
const warningAudio = new Audio(warningPath);

export const success = message => {
    toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
    });
}

export const failure = message => {
    errorAudio.play();
    toast.error(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    });
}

export const warning = message => {
    warningAudio.play();
    toast.warn(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    })
}
