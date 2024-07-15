const FIRST_NAMES_ONLY = true;
const LAST_NAME_INITIAL = false;

export function firstName(str) {
    const strTrim = str.trim();
    if (!strTrim.includes(' ')) {
        return strTrim;
    }
    else if (FIRST_NAMES_ONLY) {
        return strTrim.split(' ')[0];
    }
    else if (LAST_NAME_INITIAL) {
        return `${strTrim.split(' ')[0]} ${strTrim.split(' ')[1].charAt(0)}.`;
    }
    else {
        return strTrim;
    }
};

export function getFormattedDate() {
    let date = new Date();

    let month = date.getMonth() + 1;
    let day = date.getDate();
    let hour = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();

    month = (month < 10 ? "0" : "") + month;
    day = (day < 10 ? "0" : "") + day;
    hour = (hour < 10 ? "0" : "") + hour;
    min = (min < 10 ? "0" : "") + min;
    sec = (sec < 10 ? "0" : "") + sec;

    return `${date.getFullYear() + "-" + month + "-" + day + " " +  hour + ":" + min + ":" + sec}`;
}

export function numericPortion(str) {
    return str.replace(/\D/g, '');
}

export function itemError(barcode) {
    return `Item barcode ${barcode} is not valid. Please check with a Five Colleges staff member if you are unsure of what an item barcode should look like.`;
}

export function trayError(barcode) {
    return `Tray barcode ${barcode} is not valid. Please check with a Five Colleges staff member if you are unsure of what a tray barcode should look like.`;
}
