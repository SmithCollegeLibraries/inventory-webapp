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
    const errorPath = "https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233574/error.mp3";
    var audio = new Audio(errorPath);
    audio.play();
    toast.error(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    });
}

export const warning = message => {
    const warningPath = "https://res.cloudinary.com/dxfq3iotg/video/upload/v1557233563/warning.mp3";
    var audio = new Audio(warningPath);
    audio.play();
    toast.warn(message, {
        position: "top-right",
        autoClose: 6000,
        hideProgressBar: false,
        closeOnClick: true,
    })
}