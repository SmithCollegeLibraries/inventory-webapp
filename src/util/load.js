import { base } from '../config/endpoints';
import Alerts from '../components/alerts';
import { getFormattedDate } from '../util/date';

const account = `${base}user/`
// const settings = `${base}settings/`
const trayAPI = `${base}tray-api/`
const collectionAPI = `${base}collection-api/`
const shelfAPI = `${base}shelf-api/`
const itemAPI = `${base}item-api/`

const newtray = base + "tray-api/new-tray/"
const insertshelf = base + "shelf-api/shelf-insert/"
// const searchaleph = base + "tray-api/search-barcode/"
// const searchalephpost = base + "tray-api/search-barcode-post/"
// const traysearch  = base + "tray-api/search-tray/"
// const shelfsearch = base + "shelf-api/search-shelf/"
// const shelfsearchall = base + "shelf-api/search-all-shelf/"
// const titlesearch = base + "tray-api/search-title/"
// const oclcsearch = base + "tray-api/search-oclc/"
// const callnumbersearch = base + "tray-api/search-call/"
// const managetray = base + "/tray-api/search-tray-id/"
const managetrayupdate = base + "tray-api/tray-status-update/"
// const shelfmanagement = base + "shelf-api/search-shelf-id/"
// const shelfmanagementupdate = base + "shelf-api/"
// const pagingslips = base + 'tray-api/paging-slips/'
// const internalrequests = base + 'internal-requests/'
// const internalrequestscomments = base + 'internal-requests-comments/'
// const statistics = base + 'statistics/'
const history = base + 'history/'
// const inProcess = base + 'in-process/'


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
    const get = await this.handleAccount(`${account}account-exists/`, 'GET', data);
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

  newTray = async (data) => {
    const insert = await this.handleUpdate(`${trayAPI}new-tray/`, 'POST', data);
    return insert;
  };

  /**
    * @desc Item
  */

  itemSearch = async (data) => {
    const search = await this.handleUpdate(`${itemAPI}search/`, 'POST', data);
    return search;
  };

  // Returns a simple true/false whether an item is in FOLIO
  itemInFolio = async (barcode) => {
    const data = {
      "barcode": barcode
    };
    const verify = await this.handleUpdate(`${itemAPI}check-folio/`, 'POST', data);
    return verify;
  };

  /**
    * @desc Tray management
  */

  // transfer = async (data) => {
  //   const transfer = await this.handleUpdate(`${trayAPI}transfer-tray-items/`, 'POST', data)
  //   return transfer
  // }

  // updateEntireTrays = async (data, id) => {
  //   const update = await this.handleUpdate(updateEntireTray, 'POST', data)
  //   return update
  // }

  // deleteTrayAndItems = async (data) => {
  //   const deleteTray = await this.handleUpdate(`${trayAPI}handle-tray-delete/`, 'POST', data)
  //   return deleteTray
  // }

  // deleteTrayAndUnlink = async (data) => {
  //   const deleteUnlink = await this.handleUpdate(`${trayAPI}handle-tray-delete-and-unlink/`, 'POST', data)
  //   return deleteUnlink
  // }

  // updateIndividualTrayItems = async (data) => {
  //   const update = await this.handleUpdate(`${trayAPI}update-individual-items/`, 'POST', data)
  //   return update
  // }

  // deleteIndividualTrayItems = async (data) => {
  //   const deleteItem = await this.handleUpdate(`${trayAPI}delete-individual-items/`, 'POST', data)
  //   return deleteItem
  // }

  // deleteMultiple = async (data) => {
  //   const deleteMultiple = await this.handleUpdate(`${trayAPI}delete-multiple-barcodes/`, 'POST', data)
  //   return deleteMultiple
  // }

  // inProcessPaging = async (data) => {
  //   return await this.handleUpdate(`${inProcess}create`, 'POST', data)
  // }

  /**
    * @desc Collection management
  */

  createNewCollection = async (data) => {
    const create = await this.handleUpdate(`${collectionAPI}new-collection/`, 'POST', data);
    return create;
  }

  collectionHasItems = async (data) => {
    const get = await this.handleUpdate(`${collectionAPI}collection-has-items/`, 'GET', data);
    return get;
  }

  collectionExists = async (data) => {
    const get = await this.handleUpdate(`${collectionAPI}collection-exists/`, 'GET', data);
    return get;
  }

  updateCollection = async (data) => {
    const update = await this.handleUpdate(`${collectionAPI}update-collection/`, 'POST', data);
    return update;
  }

  deleteCollection = async (data) => {
    const deleteCollection = await this.handleUpdate(`${collectionAPI}delete-collection/`, 'POST', data);
    return deleteCollection;
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

  newTray = async (data) => {
    return await this.handleUpdate(newtray, 'POST', data)
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
