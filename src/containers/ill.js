import React, {Component} from 'react'
import Load from '../util/load'
import ContentSearch from '../util/search'
import excelToJson from 'convert-excel-to-json'
import XLSX from 'xlsx'
import Alerts from '../components/alerts'
import { Card, CardBody, Col, Row, Button, Navbar, Input } from 'reactstrap'
import localforage from 'localforage'
import _ from 'lodash'

export default class ILL extends Component {

    state = {
        pick: [],
        requests: [],
        searchResults: [],
        loading: false,
        file: '',
        paging: [],
        processed: false,
        alert: false
    }


  componentDidMount = async () => {
    const localPick = await this.handleLocalStorage('paging') || []
    const localPaging = await this.handleLocalStorage('illPaging') || []
    const local = await this.handleLocalStorage('ill') || []
    const localLength = local ? Object.keys(local) : []
    const localPickLength = localPick ? Object.keys(localPick) : []
    const localPagingLength = localPaging ? Object.keys(localPaging) : []
    this.setState({
        requests: local,
        pick : localPickLength,
        searchResults: localPaging
    })
  }


  handleSearch = async (type, searchValue, index) =>  {
    const search = await ContentSearch.ill(type, searchValue) 
    if(search){
    this.setState(prevState => ({
        searchResults:  [...prevState.searchResults, search]
    }), () => {
        this.removeItem(index)
        localforage.setItem('illPaging', this.state.searchResults)
    })
    } else {
        const errorMessage = {
            name: "Unable to locate",
            message: "Unable to locate this item"
        }
        Alerts.error(errorMessage)
    }
  }

  handleLocalStorage = async (key) => {
    const results = await localforage.getItem(key)
    return results
}


  getILLRequests = (files) => {
    const file = files;
    let reader = new FileReader();
    reader.onload = (event) => {
        let data = event.target.result;
        let workbook = XLSX.read(data, {
            type: 'binary'
        });
        const { SheetNames } = workbook || ''
        const names = SheetNames.map(items => items)
        if(SheetNames && names.includes('PrintQueue')){
            this.setState({
                requests: XLSX.utils.sheet_to_row_object_array(workbook.Sheets['PrintQueue']),
            }, () => {
                localforage.setItem('ill', this.state.requests)
                Alerts.success('Data successfully loaded')
            })
        } else {
            const error = {
                name: "Error loading file",
                message: "There was an error loading your file." + 
                "Please make sure you are loading Stacks.xlsx and that it contains a tab called PrintQueue" +
                "Stacks is typically found in users/YOURNAME/ILLiad"
            }       
            Alerts.error(error)
        }   
    };

    reader.onerror = function (ex) {
        console.log(ex);
    };

    reader.readAsBinaryString(file);
  }

  addPick = (items) => { 
    const pick = {...this.state.pick}
    pick[items.barcode] = items
    this.setState({
        pick
    }, () => {
        this.pickOrder()
        Alerts.success(`Added ${items.barcode} to paging list`)
    })
}

pickOrder = () => {
    const list = this.state.pick
    const item = _.orderBy(list,
        ['row', 'ladder', 'shelf_number'],
        ['asc', 'asc', 'asc'])
    this.setState({ 
        pick: item
    }, () => {
        localforage.setItem('paging', this.state.pick)
    })  
}

  processILL = () => {
      const data = this.state.requests
      Object.keys(data).map(key => {
         return this.handleSearch('oclc', data[key].Transactions_ESPNumber)
      })
      this.setState({
          processed: true
      })
  }


  handleOpenFile = (event) => { 
    this.getILLRequests(event.target.files[0])
  }

  handlePaging = () => {
    Object.keys(this.state.searchResults).map(items => {
        return this.handleUpdate(this.state.searchResults[items])
    })  
    this.updateAlert()
  }


  editOCLC(e, key) {
    const data = this.state.requests[key];
    const update = Object.assign({}, data, {[e.target.name]: e.target.value});
    data[key] = update
    this.setState({
        data
    })
  }

  handleClear = () => {
    this.setState({
      searchResults: [],
      requests: []
    })
  }

  handleUpdate = (data) => {
    this.setState(prevState => ({
        paging: [...prevState.paging, data],
    }))
  }

  updateAlert = () => {
      this.setState({ alert: true})
      setTimeout(() => {
          this.setState({alert: false })
      }, 3000)
  } 


  removeItem = (index) => {
    this.setState(({ requests }) => {
        const request = [ ...requests ]
        request.splice(index, 1)
        return { requests: request }
      }, () => {
            localforage.setItem('ill', this.state.requests)
      })
 }

 handleUpdate = (e, index) => {
     const { requests } = this.state
     requests[index][e.target.name] = e.target.value
     this.setState({
         requests
     }, () => {
        localforage.setItem('ill', this.state.requests) 
     })
 }


  render(){
    const { searchResults, data, processed, requests } = this.state
    const requestLength = requests.length
    return(
      <div className="container-fluid">
          <div style={{paddingTop: "20px"}}>
          <Options 
            processed={processed}
            handlePaging={this.handlePaging}
            processILL={this.processILL}
            handleOpenFile={this.handleOpenFile}
            handleClear={this.handleClear}
          />
          </div>
          <div>
          <Row>
          <Col>
              <h1 style={{textAlign: "center"}}>Spread Sheet Results</h1>
              {requests.length ? Object.keys(requests).map((items,idx) => 
                <ProcessedData
                    key={idx}
                    index={idx}
                    data={requests[items]}
                    handleSearch={this.handleSearch}
                    handleUpdate={this.handleUpdate}
                />
            ) :     <Input type="file" onChange={this.handleOpenFile}/>
            }
          </Col>
            <Col>
            <h1 style={{textAlign: "center"}}>Paging Data</h1>
              {Object.keys(searchResults).map((items,idx) => 
                <PagingData
                    key={idx}
                    index={idx}
                    data={searchResults[items]}
                    handleUpdate={this.handleUpdate}
                    handleAddToPaging={this.addPick}
                />
              )}
            </Col>
        </Row>
        </div>
      </div>
    )
  }
}

const Options = ({ processed, handlePaging, processILL, handleOpenFile, handleClear }) => (
    <Navbar color="light" light>
        <Col>
    {processed 
        ? <Button color="success" onClick={(e) => handlePaging(e)}>Add all to paging</Button>
        : ''
    }    
    <Button color="warning" onClick={() => processILL()}>Process All</Button>{' '}
    <Button color="danger" onClick={() => handleClear()}>Clear</Button>
    </Col>
  </Navbar>
)

const ProcessedData = ({index, data, handleSearch, handleUpdate }) => (
    <Card key={index}>
        <CardBody>
            <Col>
                <dl className="row">
                    <dt className="col-sm-3">Title</dt>
                    <dd className="col-sm-9"><strong>{data.Transactions_LoanTitle}</strong></dd>
                    <dt className="col-sm-3">Author</dt>
                    <dd className="col-sm-9">{data.Transactions_LoanAuthor}</dd>
                    <dt className="col-sm-3">Call Number</dt>
                    <dd className="col-sm-9">{data.Transactions_CallNumber}</dd>
                    <dt className="col-sm-3">OCLC Number</dt>
                    <dd className="col-sm-9">
                        <Input onChange={(e) => handleUpdate(e, index)} type="text" value={data.Transactions_ESPNumber} name="Transactions_ESPNumber"/>
                    </dd>
                </dl>
                <Button color="primary" onClick={() => handleSearch('oclc', data.Transactions_ESPNumber, index)}>OCLC Search</Button>{' '}
                <Button color="primary" onClick={() => handleSearch('callnumber', data.Transactions_CallNumber, index)}>Call Number Search</Button>
            </Col>
        </CardBody>    
    </Card>    
)

const PagingData = ({ index, data, handleUpdate, handleAddToPaging }) => (
    <Card key={index}>
        <CardBody>
            <Col>
                <dl className="row">
                    <dt className="col-sm-3">Title</dt>
                    <dd className="col-sm-9">{data.title}</dd>
                    <dt className="col-sm-3">Call Number</dt>
                    <dd className="col-sm-9">{data.call_number}</dd>
                    <dt className="col-sm-3">Description</dt>
                    <dd className="col-sm-9">{data.description}</dd>
                    <dt className="col-sm-3">Old Location</dt>
                    <dd className="col-sm-9">{data.old_location}</dd>
                    <dt className="col-sm-3">Tray</dt>
                    <dd className="col-sm-9">{data.tray_barcode}</dd>
                    <dt className="col-sm-3">Shelf</dt>
                    <dd className="col-sm-9">{data.shelf_barcode}</dd>
                </dl> 
                <Button color="info" onClick={(e) => handleAddToPaging(data)}>Add to paging</Button> 
            </Col>
        </CardBody>
    </Card>        
)


// class PagingButton extends Component {

//     state = {
//         status: "Add to Paging"
//     }

//     handleClick(){
//         const { details, index } = this.props;
//         this.setState({status: "Added"})
//         this.props.handleUpdate(index, details);
//     }

//     render(){
//         const { details, index } = this.props;
//         return(
//             <button type="button" key={index} className="btn btn-info" onClick={() => this.handleClick()}>
//                 {this.state.status}
//             </button>        
//         )
//     }
// }
