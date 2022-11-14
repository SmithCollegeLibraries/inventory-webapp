import {
  collections,
  managetray,
  pagingslips,
  searchaleph,
  shelfsearchall,
  statistics,
  titlesearch,
  oclcsearch,
  callnumbersearch,
  traysearch,
  internalrequests,
  history,
  shelfmanagement,
  settings,
  trayAPI,
  searchalephpost
  } from '../config/endpoints';
import Alerts from '../components/alerts';

class ContentSearch {

  collections = async () => {
    let search = await this.search(`${collections}`)
    return search
  }

  setting = async () => {
    let search = await this.search(settings)
    return search
  }

  autocomplete = async (value) => {
    let search = await this.search(`${trayAPI}auto-complete-tray/?query=${value}`)
    return search
  }

  traymanagement = async (value) => {

    let search = await this.search(`${managetray}?query=${value.replace(/[^0-9]+/g, '')}`)
    return search
  }

  shelfmanagement = async (value) => {
    let search = await this.search(`${shelfsearchall}?query=${value}`)
    return search
  }

  traySearch = async (value) => {
    value.replace('SM', '')
    let search = await this.search(`${traysearch}?query=${value.replace(/[^0-9]+/g, '')}`)
    return search
  }

  pagingSlips = async (day) => {
    let search = await this.search(`${pagingslips}?day=${day}`)
    return search
  }

  recordData = async (barcodes) => {
    let search = await this.searchPost(`${searchalephpost}`, barcodes)
    return search
  }

  reports = async (endpoint, query) => {
    let search = await this.search(`${statistics}${endpoint}${query}`)
    return search
  }

  searchAleph = async (data) => {
    let search = await this.search(`${searchaleph}?${data}`)
    return search
  }

  getInternalRequests = async (completed) => {
    let search = await this.search(`${internalrequests}status?completed=${completed}`)
    return search
  }

  trayShelfSearch = async (value) => {
    let search = await this.search(`${shelfmanagement}?query=${value.replace(/[^0-9]+/g, '')}`)
    return search
  }

  ill = async (type, query) => {
    let search = ''
    switch(type){
      case 'title':
        search = await this.search(`${titlesearch}?query=${query}`)
      break;
      case 'oclc':
        search = await this.search(`${oclcsearch}?query=${query}`)
      break;
      case 'callnumber':
        search = await this.search(`${callnumbersearch}?query=${query}`)
      break;
      default:
        search = await this.search(`${titlesearch}?query=${query}`)
      break;
    }
    return search
  }

  getHistory = async () => {
    const search = await this.search(`${history}?sort=-timestamp`)
    return search
  }

  searchHistory = async query => {
    const search = await this.search(`${history}search?query=${query}`)
    return search
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
      break;
      case 204:
        return {}
      case 400:
        return await this.catchError('Bad Request', response.statusText)
      break;
      case 401:
      case 403:
        return await this.catchError('Authentication failed', response.statusText)
      break;
      case 404:
        return await this.catchError("Doesn't exist", response.statusText)
      break;
      case 405:
        return await this.catchError('Method not allowed', response.statusText)
      break;
      case 422:
        return await this.catchError('Data Validation Fail', response.statusText)
      break;
      case 500:
        return await this.catchError('Internal Server error', response.statusText)
      break;
      default:
        return await this.catchError('There was an error.  Check your internet connection', '')
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
