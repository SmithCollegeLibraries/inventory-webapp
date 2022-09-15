import { toast } from 'react-toastify';

export const success = message => {
        toast.success(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
        });
    }
    
export const failure = message => {
        toast.error(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
        });
    }

export const warning = message => {
        toast.warn(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,  
        })
    }