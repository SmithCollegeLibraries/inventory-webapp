import {
    inserttrays,
    managetrayupdate,
    insertshelf,
    collections,
    history,
    account,
    updateEntireTray,
    trayAPI,
    shelfAPI,
    inProcess,
  } from '../config/endpoints';
import Alerts from '../components/alerts';
import { getFormattedDate } from '../util/date';


class Load {

  /**
    * @desc Account management
  */

  createAccount = async (data) => {
    const create = await this.handleAccount(`${account}create-account/`, 'POST', data);
    return create;
  };

  getAccount = async (data) => {
    const get = await this.handleAccount(`${account}login/`, 'POST', data);
    return get;
  };

  verifyAccount = async (data) => {
    const get = await this.handleAccount(`${account}account-exists/`, 'POST', data);
    return get;
  };

  getUsers = async (data) => {
    const get = await this.handleUpdate(`${account}get-users/`, 'GET', data);
    return get;
  };

  accountDelete = async (data) => {
    const get = await this.handleUpdate(`${account}delete-users/`, 'POST', data);
    return get;
  };

  accountUpdate = async (data) => {
    const get = await this.handleUpdate(`${account}update-account/`, 'POST', data);
    return get;
  };

  /**
    * @desc Tray
  */

  insertTrays = async (data) => {
    const insert = await this.handleUpdate(`${trayAPI}barcode-insert/`, 'POST', data)
    return insert
  }

  barcodeVerify = async (data) => {
    const verify = await this.handleUpdate(`${trayAPI}verify-barcode/`, 'POST', data)
    return verify
  }

  alephVerify = async (data) => {
    const verify = await this.handleUpdate(`${trayAPI}verify-aleph-record/`, 'POST', data)
    return verify
  }

  /**
    * @desc Tray management
  */

  transfer = async (data) => {
    const transfer = await this.handleUpdate(`${trayAPI}transfer-tray-items/`, 'POST', data)
    return transfer
  }

  updateEntireTrays = async (data, id) => {
    const update = await this.handleUpdate(updateEntireTray, 'POST', data)
    return update
  }

  deleteTrayAndItems = async (data) => {
    const deleteTray = await this.handleUpdate(`${trayAPI}handle-tray-delete/`, 'POST', data)
    return deleteTray
  }

  deleteTrayAndUnlink = async (data) => {
    const deleteUnlink = await this.handleUpdate(`${trayAPI}handle-tray-delete-and-unlink/`, 'POST', data)
    return deleteUnlink
  }

  updateIndividualTrayItems = async (data) => {
    const update = await this.handleUpdate(`${trayAPI}update-individual-items/`, 'POST', data)
    return update
  }

  deleteIndividualTrayItems = async (data) => {
    const deleteItem = await this.handleUpdate(`${trayAPI}delete-individual-items/`, 'POST', data)
    return deleteItem
  }

  deleteMultiple = async (data) => {
    const deleteMultiple = await this.handleUpdate(`${trayAPI}delete-multiple-barcodes/`, 'POST', data)
    return deleteMultiple
  }

  inProcessPaging = async (data) => {
    return await this.handleUpdate(`${inProcess}create`, 'POST', data)
  }

  /**
    * @desc Collection management
  */

  createNewCollection = async (data) => {
    const create = await this.handleUpdate(`${collections}new-collection/`, 'POST', data)
    return create
  }

  updateCollection = async (data) => {
    const update = await this.handleUpdate(`${collections}update-collection/`, 'POST', data)
    return update
  }

  deleteCollection = async (data) => {
    const deleteCollection = await this.handleUpdate(`${collections}delete-collection/`, 'POST', data)
    return deleteCollection
  }

  getHistory = async (data, page='') => {
    const search = await this.handleUpdate(`${history}filter-columns/${page ? `?page=${page}` : ''}`, 'POST', data)
    return search
  }

  updateShelf = async (data, id) => {
    const update = await this.handleUpdate(`${shelfAPI}shelf-update`, 'POST', data)
    return update
  }

  deleteShelf = async (data) => {
    const deleteShelf = await this.handleUpdate(`${shelfAPI}delete-individual-items`, 'POST', data)
    return deleteShelf
  }

  insertTrays = async (data) => {
    return await this.handleUpdate(inserttrays, 'POST', data)
  }

  deleteTrays = async (data, id) => {
    const historyItems = {
      action: 'deleted tray',
      item: data.boxbarcode,
      status_change: 'deleted',
      timestamp: getFormattedDate()
    }
    this.handleUpdate(`${history}create/`, 'POST', historyItems)
    const update = await this.handleUpdate(`${managetrayupdate}delete/${id}`, 'DELETE', data)
    return update
  }

  processBarcodes = async (data) => {
    const update = await this.handleUpdate(`${managetrayupdate}`, 'POST', data)
    return update
  }

  insertShelf = async (data) => {
    const update = await this.handleUpdate(insertshelf, 'POST', data)
    return update
  }

  handleAccount= async (string, method, data) => {
    try {
      let response =  await fetch(string, {
        method: `${method}`,
        body: JSON.stringify(data)
      });
      return this.responseHandling(response);
    } catch(e) {
      this.catchError('', e);
    }
  }

  handleUpdate = async (string, method, data) => {
    const storage = JSON.parse(sessionStorage.getItem('account'));
    const { account } = storage || '';
    const { access_token } = account || '';
    try {
      let response = await fetch(string.includes('?') ? `${string}&access-token=${access_token}` : `${string}?access-token=${access_token}`, {
        method: `${method}`,
        body: JSON.stringify(data)
      });
      return this.responseHandling(response);
    } catch(e) {
      return this.catchError('', e);
    }
  }

  responseHandling = async response => {
    switch(response.status){
      case 200:
      case 201:
      case 304:
        return await response.json();
      case 204:
        return {};
      case 400:
        this.catchError('Bad Request', response.statusText);
        break;
      case 401:
      case 403:
        this.catchError('Authentication failed', response.statusText);
        break;
      case 404:
        this.catchError("Doesn't exist", response.statusText);
        break;
      case 405:
        this.catchError('Method not allowed', response.statusText);
        break;
      case 422:
        this.catchError('Data Validation Fail', response.statusText);
        break;
      case 500:
        this.catchError('Internal Server error', response.statusText);
        break;
      default:
        this.catchError('There was an error.  Check your internet connection', '');
    }
  }

  catchError = (value, e) => {
    const error = {
      name: value,
      message: e
    }
    Alerts.error(error)
  }
}

const load = new Load();
export default load;
