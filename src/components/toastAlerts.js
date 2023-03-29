import { toast } from 'react-toastify';

export const success = message => {
    toast.success(message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
    });
}

export const failure = message => {
    const errorPath = process.env.PUBLIC_URL + "/error.mp3";;
    const errorAudio = new Audio(errorPath);
    errorAudio.play();
    toast.error(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    });
}

export const warning = message => {
    const warningPath = process.env.PUBLIC_URL + "/warning.mp3";
    const warningAudio = new Audio(warningPath);
    warningAudio.play();
    toast.warn(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    })
}
