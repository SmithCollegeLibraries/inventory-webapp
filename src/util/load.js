import { failure } from '../components/toastAlerts'
// import { getFormattedDate } from '../util/date';

const account = `${process.env.REACT_APP_DATABASE_URL}/user/`
const trayAPI = `${process.env.REACT_APP_DATABASE_URL}/tray-api/`
const collectionAPI = `${process.env.REACT_APP_DATABASE_URL}/collection-api/`
const shelfAPI = `${process.env.REACT_APP_DATABASE_URL}/shelf-api/`
const itemAPI = `${process.env.REACT_APP_DATABASE_URL}/item-api/`
const itemLogAPI = `${process.env.REACT_APP_DATABASE_URL}/item-log-api/`
const trayLogAPI = `${process.env.REACT_APP_DATABASE_URL}/tray-log-api/`
const picklistAPI = `${process.env.REACT_APP_DATABASE_URL}/picklist-api/`


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
   * @desc Shelf
   */

  getShelf = async (data) => {
    const get = await this.handleUpdate(`${shelfAPI}get-shelf`, 'POST', data);
    return get;
  }

  /**
    * @desc Tray
  */

  newTray = async (data) => {
    const insert = await this.handleUpdate(`${trayAPI}new-tray/`, 'POST', data);
    return insert;
  };

  getTray = async (data) => {
    const tray = await this.handleUpdate(`${trayAPI}get-tray/`, 'POST', data);
    return tray;
  };

  updateTray = async (data, id) => {
    const update = await this.handleUpdate(`${trayAPI}update-tray/`, 'POST', data);
    return update;
  }

  shelveTray = async (data) => {
    const update = await this.handleUpdate(`${trayAPI}shelve-tray/`, 'POST', data);
    return update;
  }

  deleteTrayAndItems = async (data) => {
    const results = await this.handleUpdate(`${trayAPI}delete-tray/`, 'POST', data);
    return results;
  }

  searchTraysByLocation = async (data) => {
    const results = await this.handleUpdate(`${trayAPI}search-by-location/`, 'POST', data);
    return results;
  }

  trayCount = async () => {
    const count = await this.handleUpdate(`${trayAPI}total-count/`, 'GET');
    return count;
  }


  // deleteTray = async (data, id) => {
  //   const historyItems = {
  //     action: 'deleted tray',
  //     item: data.boxbarcode,
  //     status_change: 'deleted',
  //     timestamp: getFormattedDate()
  //   };
  //   this.handleUpdate(`${history}create/`, 'POST', historyItems);
  //   const update = await this.handleUpdate(`${managetrayupdate}delete/${id}`, 'DELETE', data);
  //   return update;
  // }

  /**
    * @desc Item
  */

  itemSearch = async (data) => {
    const search = await this.handleUpdate(`${itemAPI}search/`, 'POST', data);
    return search;
  };

  itemSearchLocations = async (data) => {
    const search = await this.handleUpdate(`${itemAPI}search-locations/`, 'POST', data);
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

  // Gets title and call number information from FOLIO
  infoFromFolio = async (barcode) => {
    const data = {
      "barcode": barcode
    };
    const info = await this.handleUpdate(`${itemAPI}info-from-folio/`, 'POST', data);
    return info;
  };

  updateItem = async (data, id) => {
    const update = await this.handleUpdate(`${itemAPI}update-item/`, 'POST', data);
    console.log(data);
    return update;
  };

  newItem = async (data, id) => {
    const update = await this.handleUpdate(`${itemAPI}new-item/`, 'POST', data);
    console.log(data);
    return update;
  };

  deleteItem = async (data) => {
    const results = await this.handleUpdate(`${itemAPI}delete-item/`, 'POST', data);
    return results;
  };

  itemCount = async () => {
    const count = await this.handleUpdate(`${itemAPI}total-count/`, 'GET');
    return count;
  };

  bulkUpdate = async (data) => {
    const update = await this.handleUpdate(`${itemAPI}bulk-update/`, 'POST', data);
    return update;
  };

  /**
   * @desc Picklist management
  */

  getPicklist = async () => {
    const get = await this.handleUpdate(`${picklistAPI}get-picklist/`, 'GET');
    return get;
  }

  addFromFolio = async () => {
    const add = await this.handleUpdate(`${picklistAPI}add-from-folio/`, 'POST');
    return add;
  }

  addItems = async (data) => {
    const add = await this.handleUpdate(`${picklistAPI}add-items/`, 'POST', data);
    return add;
  }

  removeItems = async (data) => {
    const remove = await this.handleUpdate(`${picklistAPI}remove-items/`, 'POST', data);
    return remove;
  }

  assignItems = async (data) => {
    const assign = await this.handleUpdate(`${picklistAPI}assign-items/`, 'POST', data);
    return assign;
  }

  unassignItems = async (data) => {
    const unassign = await this.handleUpdate(`${picklistAPI}unassign-items/`, 'POST', data);
    return unassign;
  }

  assignAllToMe = async () => {
    const assign = await this.handleUpdate(`${picklistAPI}assign-all-to-me/`, 'POST');
    return assign;
  }

  unassignMine = async () => {
    const unassign = await this.handleUpdate(`${picklistAPI}unassign-mine/`, 'POST');
    return unassign;
  }

  /**
    * @desc Collection management
  */

  createNewCollection = async (data) => {
    const create = await this.handleUpdate(`${collectionAPI}new-collection/`, 'POST', data);
    return create;
  }

  collectionHasItems = async (data) => {
    const get = await this.handleUpdate(`${collectionAPI}collection-has-items/?query=${data.id}`, 'GET');
    return get;
  }

  collectionExists = async (data) => {
    const get = await this.handleUpdate(`${collectionAPI}collection-exists/?query=${data.id}`, 'GET');
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

  // getHistory = async (data, page='') => {
  //   const search = await this.handleUpdate(`${history}filter-columns/${page ? `?page=${page}` : ''}`, 'POST', data)
  //   return search
  // }

  // updateShelf = async (data, id) => {
  //   const update = await this.handleUpdate(`${shelfAPI}shelf-update`, 'POST', data);
  //   return update;
  // }

  // deleteShelf = async (data) => {
  //   const deleteShelf = await this.handleUpdate(`${shelfAPI}delete-individual-items`, 'POST', data);
  //   return deleteShelf;
  // }

  // processBarcodes = async (data) => {
  //   const update = await this.handleUpdate(`${managetrayupdate}`, 'POST', data)
  //   return update
  // }

  // insertShelf = async (data) => {
  //   const update = await this.handleUpdate(insertshelf, 'POST', data)
  //   return update
  // }

  newItemsLog = async () => {
    const itemsLog = await this.handleUpdate(`${itemLogAPI}statistics/`, 'GET');
    return itemsLog;
  }

  newTraysLog = async () => {
    const traysLog = await this.handleUpdate(`${trayLogAPI}added-statistics/`, 'GET');
    return traysLog;
  }

  traysShelvedLog = async () => {
    const traysShelvedLog = await this.handleUpdate(`${trayLogAPI}updated-statistics/`, 'GET');
    return traysShelvedLog;
  }

  handleAccount = async (string, method, data) => {
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
    const callURL = string.includes('?') ? `${string}&access-token=${access_token}` : `${string}?access-token=${access_token}`;

    let response = await fetch(
        callURL,
        {
          "method": `${method}`,
          "body": JSON.stringify(data)
        },
      );
    return this.responseHandling(response);
  }

  responseHandling = async response => {
    const info = await response.json();
    switch (response.status) {
      case 200:
      case 201:
      case 304:
        return info;
      case 204:
        return {};
      case 400:
        failure(info.message ? info.message : response.statusText);
        break;
      case 401:
        failure(info.message ? info.message : response.statusText);
        break;
      case 403:
        failure(info.message ? info.message : response.statusText);
        break;
      case 404:
      case 405:
      case 422:
      case 500:
        failure(info.message ? info.message : response.statusText);
        break;
      default:
        failure('There was an error. Please check your internet connection.');
    }
  }
}

const load = new Load();
export default load;
