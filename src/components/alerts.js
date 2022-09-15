import Alert from 'react-s-alert';

class Alerts {

    messageType = (type, data) => {
        switch(type){
            case 'error':
                this.error(data)
            break
            default:
            break;    
        }
    }

    error = (data) => {
        Alert.error(
            `<h5>${data.name}</h5><p>${data.message}</p>`, {
            html: true,
            position: 'top-left',
            timeout: 'none',
        });
    }

    success = message => {
        Alert.success(message, {
            position: 'top-left',
        })
    }

    info = message => {
        Alert.info(message, {
            position: 'top-left',
        })
    }

    duplicate = (tray, barcode) => {
        Alert.error(
            `<h5>Duplicate barcode found</h5><ul><li>Tray: ${tray}</li><li>Barcode: ${barcode}</li></ul>`, {
            html: true,
            position: 'top-left',
            timeout: 'none',
        });
    }
}

const contentAlerts = new Alerts()
export default contentAlerts