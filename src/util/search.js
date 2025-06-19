import Alerts from '../components/alerts';

const itemAPI = `${process.env.REACT_APP_DATABASE_URL}/item-api/`
const trayAPI = `${process.env.REACT_APP_DATABASE_URL}/tray-api/`
const shelfAPI = `${process.env.REACT_APP_DATABASE_URL}/shelf-api/`
const collectionAPI = `${process.env.REACT_APP_DATABASE_URL}/collection-api/`
const itemLogAPI = `${process.env.REACT_APP_DATABASE_URL}/itemlog-api/`
const trayLogAPI = `${process.env.REACT_APP_DATABASE_URL}/traylog-api/`


class ContentSearch {

  collections = async () => {
    let search = await this.search(`${collectionAPI}`);
    return search;
  }

  trays = async (trayBarcode, freeSpace, flaggedOnly, unshelvedOnly) => {
    let search = await this.search(`${trayAPI}search/?barcode=${trayBarcode}&free_space=${freeSpace}&flagged_only=${flaggedOnly}&unshelved_only=${unshelvedOnly}`);
    return search;
  }

  shelves = async (shelfBarcode, trayBarcode, size, collection, positionsfree) => {
    let search = await this.search(`${shelfAPI}search/?shelf=${shelfBarcode}&tray=${trayBarcode}&size=${size}&collection=${collection}&positionsfree=${positionsfree}`);
    return search;
  }

  items = async (itemBarcode, flaggedOnly) => {
    // If a barcode was provided, do an exact search
    if (itemBarcode) {
      let results = await this.search(`${itemAPI}search/?barcode=${itemBarcode}&flagged_only=${flaggedOnly}`);
      return results;
    }
    // Otherwise, show the most recent items
    else {
      let results = await this.search(`${itemAPI}browse/?flagged_only=${flaggedOnly}`);
      return results;
    }
  }

  trayLogs = async (barcode, action, details) => {
    let search = await this.searchPost(`${trayLogAPI}browse`, {barcode, action, details});
    return search;
  }

  itemLogs = async (barcode, action, details) => {
    let search = await this.searchPost(`${itemLogAPI}browse`, {barcode, action, details});
    return search;
  }
  search = async (string) => {
    const storage = JSON.parse(sessionStorage.getItem('account'))
    const { account } = storage || ''
    const { access_token } = account || ''
    try {
      let response = await fetch(string.includes('?') ? `${string}&access-token=${access_token}` : `${string}?access-token=${access_token}`)
      return this.responseHandling(response)
    }
    catch (e) {
      this.catchError('', e)
    }
  }

  searchPost = async (string, data) => {
    const storage = JSON.parse(sessionStorage.getItem('account'))
    const { account } = storage || ''
    const { access_token } = account || ''
    try {
      let response =  await fetch(`${string}?access-token=${access_token}`, {
        method: "POST",
        body: JSON.stringify(data)
      })
       return this.responseHandling(response)
    }
    catch(e) {
      this.catchError('', e)
    }
  }

  responseHandling = async response => {
    switch(response.status){
      case 200:
      case 201:
      case 304:
        return await response.json()
      case 204:
        return {}
      case 400:
        return await this.catchError('Bad Request', response.statusText)
      case 401:
      case 403:
        return await this.catchError('Authentication failed', response.statusText)
      case 404:
        return await this.catchError("Doesn't exist", response.statusText)
      case 405:
        return await this.catchError('Method not allowed', response.statusText)
      case 422:
        return await this.catchError('Data validation failed', response.statusText)
      case 500:
        return await this.catchError('Internal server error', response.statusText)
      default:
        return await this.catchError('There was an error. Check your internet connection', '')
    }
  }

  catchError = (value, e) => {
    const error = {
      name: value,
      message: e
    }
    return Alerts.error(error)
  }

}

const contentSearch = new ContentSearch();
export default contentSearch;
