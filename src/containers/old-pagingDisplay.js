import React, { Component, useRef, useReducer, useEffect } from 'react'
import Load from '../util/load'
import ContentSearch from '../util/search'
import Alerts from '../components/alerts'
import queryString from 'query-string'
import ReactToPrint from 'react-to-print';
import _ from 'lodash'
import { getFormattedDate } from '../util/helpers';
import { Row, Col, Table, Navbar, Button, Badge, Form, FormGroup, Label, Input , Card, CardBody} from 'reactstrap'
import localforage from 'localforage'
import { success, failure } from '../components/toastAlerts'
import ReactTable from 'react-table'
import { Link } from 'react-router-dom'
import 'react-table/react-table.css'


function PagingDisplay(props){

    const initialState = {
        results: [],
        loading: false,
        count: 0,
        defaultSortDesc: true,
        sorted: [],
        pickBackup: []
    }

    const pagingReducer = (state, action) => {
        switch(action.type){
            case 'LOCAL':
                return {
                    ...state,
                    results: action.results,
                    count: action.results.length
                }
            case 'RESET':
                return{
                    ...state,
                    results: [],
                    count: 0
                }
            case 'RESET_SORT':
                return{
                    ...state,
                    sort: []
                }
            case 'UPDATE_DATA':
                return{
                    ...state,
                    results: action.results
                }
            case 'UPDATE_COUNT':
                return{
                    ...state,
                    count: action.count
                }
            case 'UPDATE_SORT':
                return{
                    ...state,
                    sorted: action.sorted
                }
            case 'UPDATE_ALL':
                return{
                    ...state,
                    results: action.results,
                    loading: action.loading,
                    count: action.count,
                    pickBackup: action.pickBackup
                }
            default:
            return state
        }
    }

    const [data, dispatch] = useReducer(pagingReducer, initialState)

    useEffect(() => {
        const getLocalItems = async () => {
            const local = await handleLocalStorage('paging') || []
            local.filter(n => n)
            dispatch({ type: 'LOCAL', results: local, count: local.length})
        }
        getLocalItems()
    }, [])

    useEffect(() => {
        if(data.results.length > 0){
            localforage.setItem('paging', data.results)
        }
    }, [data.results])


    const handleLocalStorage = async (key) => {
        const results = await localforage.getItem(key)
        return results
    }

    const clearLocal = () => {
        dispatch({ type: 'RESET' })
        localforage.setItem('paging', [])
    }

    const getBarcodes = async () => {
            const results = await Load.processBarcodes(data.results)
              if(results && results.code === 200 ){
                  success(results.message)
                  clearLocal()
              } else {
                  failure(results.message)
              }
    }

    const removeItem = (barcode) => {
        const items = data.results.filter(item => item.barcode !== barcode);
        dispatch({ type: 'UPDATE_DATA', results: items})
    }

    const handleSort = (e) => {
        if(e.target.value === 'reset') {
          order()
        } else {
         const list = data.results
         const item = _.orderBy(list, [e.target.value], ['asc'])
         dispatch({ type: 'UPDATE_DATA', results: item})
        }
      }

    const order = () => {
        const list = data.results
        const item = _.orderBy(list,
          ['row', 'ladder', 'shelf_number'],
          ['asc', 'asc', 'asc'])
        dispatch({
            type: 'UPDATE_ALL',
            results: item,
            count: item.length,
            loading: false,
            pickBackup: item
        })
      }

    const handleMarkAll = e => {
        const item  = data.results.map((items, index) => {
            return {...items, 'status': e.target.value}
        })
        dispatch({ type: 'UPDATE_DATA', results: item})
    }

    const resetSort = () => {
        dispatch({ type: 'RESET_SORT'})
    }

    const onSortedChange = value => {
        dispatch({ type: 'UPDATE_SORT', sorted: value})
    }

    const handleStatusUpdate = (e, key) => {
        const items = data.results
        items[key]['status'] = e.target.value
        dispatch({ type: 'UPDATE_DATA', results: items})
    }


    return(
        <div className="main-paging">
            <div className="main-paging-options" style={{padding: "20px"}}>
                <Options
                    count={data.count}
                    clearLocal={clearLocal}
                    getBarcodes={getBarcodes}
                    handleSort={handleSort}
                    handleMarkAll={handleMarkAll}
                    resetSort={resetSort}
                    data={data.results}
                />
            </div>
            <div className="main-paging-display" style={{backgroundColor: "#fff"}}>
                <Card>
                    <CardBody>
                        <Display
                            data={data}
                            count={data.count}
                            onSortedChange={onSortedChange}
                            handleStatusUpdate={handleStatusUpdate}
                        />
                    </CardBody>
                </Card>
            </div>
        </div>
    )
}

export default PagingDisplay

// export default class PagingDisplay extends Component {

//     state = {
//         data: [],
//         loading: false,
//         count: 0,
//         defaultSortDesc: true,
//         sorted: []
//     }

//     // componentDidMount = async () => {
//     //     const local = await this.handleLocalStorage('paging') || []
//     //     const localLength = local ? Object.keys(local) : {}
//     //     this.setState({
//     //         data: local,
//     //         count: localLength.length
//     //     })
//     // }

//     // handleLocalStorage = async (key) => {
//     //     const results = await localforage.getItem(key)
//     //     return results
//     // }

//     // updateStatus = (key, data) => {
//     //   const items = this.state.pick
//     //   const back = this.state.pickBackup
//     //   items[key] = data;
//     //   back[key] = data
//     //   this.setState({
//     //     items,
//     //     back
//     //   })
//     // }

//     // handleMarkAll = (e) => {
//     //     const item  = this.state.data.map((items, index) => {
//     //         return {...items, 'status': e.target.value}
//     //     })
//     //     this.setState({data: item})
//     // }

//     handleDelete = (e, key, barcode) =>{
//         const data = this.state.pick
//         this.setState((prevState) => ({
//           pick: prevState.pick.filter((_, i) => i != key)
//         }), () =>
//         this.order()
//       );
//     }

//     // clearLocal = () => {
//     //     this.setState({
//     //         data : [],
//     //         count: 0
//     //     }, () => {
//     //         localforage.setItem('paging', this.state.data)
//     //     })
//     // }


//     // handleSort = (e) => {
//     //   if(e.target.value === 'reset') {
//     //     this.order()
//     //   } else {
//     //    const list = this.state.data
//     //    const item = _.orderBy(list, [e.target.value], ['asc'])
//     //    this.setState({data: item})
//     //   }
//     // }

//     // order = () => {
//     //   const list = this.state.data
//     //   const item = _.orderBy(list,
//     //     ['row', 'ladder', 'shelf_number'],
//     //     ['asc', 'asc', 'asc'])
//     //   this.setState({
//     //       data: item,
//     //       count: item.length,
//     //       loading: false,
//     //       pickBackup: item
//     //     })
//     // }


//     clearFilters = (e) => {
//       e.preventDefault()
//       this.setState({
//         pick: this.state.pickBackup
//       })
//     }

//     handleColumn = (e) => {
//         this.setState({
//             [e.target.name]: e.target.checked
//         })
//     }

//     // resetSort = async () => {
//     //     this.setState({
//     //         sorted: []
//     //     })
//     // }

//     // onSortedChange = value => {
//     //     this.setState({
//     //         sorted: value
//     //     })
//     // }

//     // handleStatusUpdate = (e, key) => {
//     //     const { data } = this.state
//     //     data[key]['status'] = e.target.value
//     //     this.setState({
//     //         data
//     //     })
//     // }


//     //   getBarcodes = () => {
//     //       const { data } = this.state
//     //       Object.keys(data).map(async (items, idx) => {
//     //           if(data[items].tray_id){
//     //             const set = {
//     //                 'tray': data[items].tray_id,
//     //                 'status': data[items].status
//     //             }
//     //             const results = await Load.processBarcodes(set)
//     //             if(results){
//     //                 Alerts.success(`${data[items].barcode.trim()} status updated successfully`)
//     //                 this.removeItem(data[items].barcode)
//     //                 this.setState({
//     //                     count: 0
//     //                 })
//     //             }
//     //          }
//     //       })
//     //   }

//       removeItem = (barcode) => {
//         const items = this.state.data.filter(item => item.barcode !== barcode);
//         this.setState({
//             data: items
//         }, () => {
//             localforage.setItem('paging', this.state.data)
//         })
//      }

//     render(){
//         const { data, count } = this.state
//         return(
//             <div className="main-paging">
//                 <div className="main-paging-options" style={{padding: "20px"}}>
//                     <Options
//                         count={count}
//                         clearLocal={this.clearLocal}
//                         getBarcodes={this.getBarcodes}
//                         handleSort={this.handleSort}
//                         handleMarkAll={this.handleMarkAll}
//                         resetSort={this.resetSort}
//                         data={data}
//                     />
//                 </div>
//                 <div className="main-paging-display" style={{backgroundColor: "#fff"}}>
//                     <Display
//                         state={this.state}
//                         count={count}
//                         onSortedChange={this.onSortedChange}
//                         handleStatusUpdate={this.handleStatusUpdate}
//                     />
//                 </div>
//             </div>
//         )
//     }
// }


const TableHead = ({ }) => (
    <thead>
        <tr>
            <th className="asc">Status</th>
            <th>Height</th>
            <th>Barcode</th>
            <th>Tray Barcode</th>
            <th>Shelf Barcode</th>
            <th>Shelf Depth</th>
            <th>Shelf Position</th>
            <th>Collection</th>
            <th className="title">Title</th>
            <th>Call Number</th>
            <th className="timestamp">Last Update</th>
        </tr>
    </thead>
)

const TableData = ({ list, index }) => (
    <tr key={index}>
        <td>
            {list.status}
        </td>
        <td>{list.height}</td>
        <td>{list.barcode}</td>
        <td>{list.tray_barcode}</td>
        <td>{list.shelf_barcode}</td>
        <td>{list.shelf_depth}</td>
        <td>{list.shelf_position}</td>
        <td>{list.stream}</td>
        <td className="title">{list.title}</td>
        <td>{list.call_number}</td>
        <td className="timestamp">{list.timestamp}</td>
    </tr>
)

const TablePrint = ({ data }) => (
    Object.keys(data).map((list, idx) =>
        <TableData
            list={data[list]}
            key={idx}
            index={idx}
        />
    )
)



const Display = props => (
        <ReactTable
            data={props.data.results}
            columns={
                [{
                    Header: "Status",
                    accessor: "status",
                    filterable: false,
                    Cell: function(prop){
                        return(
                        <FormGroup>
                            <Input value={prop.value} onChange={(e) => props.handleStatusUpdate(e, prop.index)} type="select" name="status">
                            <option>Available</option>
                            <option>Off Campus</option>
                            <option>Missing</option>
                            </Input>
                        </FormGroup>
                        )
                    }
                },{
                    Header: "Height",
                    accessor: "height",
                    width: 50,
                },{
                    Header: "Barcode",
                    accessor: "barcode",
                },{
                    Header: "Tray Barcode",
                    accessor: "tray_barcode",
                    width: 100,
                },{
                    Header: "Shelf Barcode",
                    accessor: "shelf_barcode",
                    width: 100,
                },{
                    Header: "Shelf Position",
                    accessor: "shelf_position",
                    width: 50,
                },{
                    Header: "Collection",
                    accessor: "stream",
                },{
                    Header: "Title",
                    accessor: "title",
                },{
                    Header: "Call Number",
                    accessor: "call_number",
                },{
                    Header: "Last Update",
                    accessor: "timestamp",
                }
                ]
            }
            showPagination={false}
            pageSize={props.data.results.length}
            filterable={true}
            onSortedChange={props.onSortedChange}
            sorted={props.data.sorted}
            handleStatusUpdate={props.handleStatusUpdate}
            className="-striped -highlight"
        />
)

const Options = ({ count, getBarcodes, print, handleSort, handleMarkAll, clearLocal, resetSort, data }) => {
    const componentRef = useRef()
    return(
    <div>
        <Navbar color="light" light>
        <Col>
            <Button color="primary" outline>
                Items <Badge color="secondary">{count}</Badge>
            </Button>{' '}
         <Button color="info" onClick={() => {if(window.confirm('This will process all records and send them to the server.  It will also erase the local paging slip file.  Are you sure you want to continue?')) {getBarcodes()}}}>Process Data</Button>{ ' ' }
         <ReactToPrint
            trigger={() => <Button color="info">Print</Button>}
            content={() => componentRef.current}
         />{' '}
         <div style={{ display: "none" }}><TableToPrint data={data} ref={componentRef} /></div>
         {/* <Button color="info" onClick={() => window.print()}>Print</Button>{' '} */}
         <Button color="danger" onClick={() => {if(window.confirm('This will clear all the records from your display. You will not be able to recover these once they are cleared. Are you sure you want to continue?')) {clearLocal()}}}>Clear</Button>{ ' ' }
         <Button color="warning" onClick={() => resetSort()}>Reset Sort</Button>{' '}
         <Link className="btn btn-primary" to="/paging-add">Paging Add</Link>
         </Col>
         <Col xs="auto">
         <select className="form-control pickDisplaySort" onChange={(e) => handleMarkAll(e)}>
             <option value="">Mark All</option>
             <option value="Available">Available</option>
             <option value="Off Campus">Found</option>
         </select>
         </Col>
    </Navbar>
 </div>
    )
}


//Built to handle Printing of the table.  React-table does not format tables correctly for printing.
class TableToPrint extends React.Component {
    render() {
        const { data } = this.props
      return (
        <Table>
        <thead>
            <tr>
            <th className="asc">Status</th>
            <th>Height</th>
            <th>Barcode</th>
            <th>Tray Barcode</th>
            <th>Shelf Barcode</th>
            <th>Shelf Depth</th>
            <th>Shelf Position</th>
            <th>Collection</th>
            <th className="title">Title</th>
            <th>Call Number</th>
            <th className="timestamp">Last Update</th>
            </tr>
        </thead>
          <tbody>
          {Object.keys(data).map((list, idx) =>
          <tr key={idx}>
        <td>
            {data[list].status}
        </td>
        <td>{data[list].height}</td>
        <td>{data[list].barcode}</td>
        <td>{data[list].tray_barcode}</td>
        <td>{data[list].shelf_barcode}</td>
        <td>{data[list].shelf_depth}</td>
        <td>{data[list].shelf_position}</td>
        <td>{data[list].stream}</td>
        <td className="title">{data[list].title}</td>
        <td>{data[list].call_number}</td>
        <td className="timestamp">{data[list].timestamp}</td>
        </tr>
          )}
          </tbody>
        </Table>
      );
    }
  }