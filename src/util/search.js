import Alerts from '../components/alerts';
import Load from './load';

const itemAPI = `${process.env.REACT_APP_DATABASE_URL}/item-api/`
const trayAPI = `${process.env.REACT_APP_DATABASE_URL}/tray-api/`
const collectionAPI = `${process.env.REACT_APP_DATABASE_URL}/collection-api/`
const itemLogAPI = `${process.env.REACT_APP_DATABASE_URL}/itemlog-api/`
const trayLogAPI = `${process.env.REACT_APP_DATABASE_URL}/traylog-api/`


class ContentSearch {

  collections = async () => {
    let search = await this.search(`${collectionAPI}`);
    return search;
  }

  trays = async (searchTerm) => {
    let search = await this.search(`${trayAPI}search/?query=${searchTerm}`);
    return search;
  }

  items = async (searchTerm) => {
    let results = await this.search(`${itemAPI}browse/?query=${searchTerm ? searchTerm : ''}`);
    // Add title and call number information from FOLIO via the Load.infoFromFolio() method.
    // We want to fetch the information in parallel, so we use Promise.all() to wait for all
    // the requests to complete.
    results = await Promise.all(results.map(async item => {
      // Get the info from FOLIO
      let info = await Load.infoFromFolio(item.barcode);
      // Add the info to the item
      item.title = info.title;
      item.callNumber = info.callNumber;
      return item;
    }));
    return results;
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
    } catch (e) {
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
        // headers: {
        //   "Access-Control-Expose-Headers": "X-Pagination-Total-Count, X-Pagination-Current-Page, X-Pagination-Page-Count, X-Pagination-Per-Page",
        //   'Access-Control-Allow-Origin': '*',
        //   'Content-ype': 'application/json; charset=UTF-8',
        // },
        body: JSON.stringify(data)
      })
       return this.responseHandling(response)
    } catch(e) {
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
