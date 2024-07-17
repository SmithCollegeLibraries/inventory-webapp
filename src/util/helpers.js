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

export function twoDigits(i) {
    var formattedNumber = ("0" + i).slice(-2);
    return formattedNumber;
}

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

// Take a list of items, with the barcode, flag and status given.
// Return a string that displays the items in the list in a human-readable format.
// list in a human-readable format, with the status displayed as a color:
// "danger" red if the item has a flag, and "info" teal if the item
// does not have status Trayed.
export function displayItemList(items) {
    return items.map(item => <span key={item.barcode} className={ item.flag || item.status === "Missing" ? "text-danger" : (item.status === "Trayed") ? "" : "text-info" }>{item.barcode}<br /></span>);
}
