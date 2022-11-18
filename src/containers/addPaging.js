import React, { Component, useReducer, useEffect, useState } from 'react'
import Load from '../util/load'
import ContentSearch from '../util/search'
import Alerts from '../components/alerts'
import queryString from 'query-string'
import _ from 'lodash'
import { Row, Col, Button, ButtonGroup, Form, FormGroup, Input, Label, Table } from 'reactstrap'
import localforage from 'localforage'
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton'
import { Link } from 'react-router-dom'
import ReactTable from 'react-table'
import FoldableTableHOC from "react-table/lib/hoc/foldableTable";
import 'react-table/react-table.css'
import { success, warning } from '../components/toastAlerts'

const FoldableTable = FoldableTableHOC(ReactTable);

const initialState = {
  unsortedList: [],
  add: [],
  pick: [],
  checked: [],
  count: 0,
  loading: false,
  searchObject: [],
  additionalBarcodes: [],
  liftHeight: 0,
  sorted: [],
  initial: true
};

const addPagingReducer = (state, action) => {
  switch (action.type) {
    case 'UPDATE_LIFTHEIGHT':
      return {
          ...state,
          liftHeight: action.liftHeight
      };
    case 'LOCAL_DATA':
      return {
          ...state,
          add: action.unsortedList.concat(state.add),
          count: action.count,
      };
    case 'UPDATE_LOADING':
      return {
        ...state,
        loading: action.loading
      };
    case 'UPDATE_UNSORTED':
      return {
        ...state,
        unsortedList: action.unsortedList.concat(state.unsortedList),
        count: action.count,
        initial: false
      };
    case 'UPDATE_DATA':
      return {
        ...state,
        add: action.add,
        count: action.count,
        initial: false
      };
    case 'RESET_ADD':
      return {
        ...state,
        add: [],
        initial: false
      };
    case 'UPDATE_PICK':
      return {
        ...state,
        pick: action.pick.concat(state.pick)
      };
    case 'FILTER_PICK':
      return {
        ...state,
        pick: action.pick
      };
    case 'UPDATE_CHECKED':
      return {
        ...state,
        checked: action.checked
      };
    case 'UPDATE_SEARCHOBJECT':
      return {
        ...state,
        searchObject: action.searchObject
      };
    case 'UPDATE_SORTED':
      return {
        ...state,
        sorted: action.sorted
      };
    default:
      return state;
    }
  };

function AddPaging(props) {
    const [data, dispatch] = useReducer(addPagingReducer, initialState);

    // console.log(data);
    useEffect(() => {
      const getLocalItems = async () => {
          const local = await handleLocalStorage('add') || []
          const paging = await handleLocalStorage('paging') || []
          dispatch({ type: "LOCAL_DATA", unsortedList: local, count: local.length})
          dispatch({ type: "UPDATE_PICK", pick: paging })
      };
      getLocalItems();
    }, []);

    useEffect(() => {
      if(props){
        const getLocalSettings = async () => {
          const { settings } = props || '';
          let liftHeight = 0;
          if (settings !== '') {
            Object.keys(settings).map(items => {
              if (settings[items].type === 'lift_height') {
                liftHeight = parseInt(settings[items].value);
              }
            });
            dispatch({ type: 'UPDATE_LIFTHEIGHT', liftHeight: liftHeight});
          }
        };
        getLocalSettings();
      }
    },[props]);

    useEffect(() => {
      if (data.initial !== true) {
        localforage.setItem('add', data.add);
      }
    }, [data.add]);

    useEffect(() => {
      if (data.unsortedList.length > 0) {
        order();
      }
    }, [data.unsortedList]);

    useEffect(() => {
      if (data.pick.length > 0) {
        pickOrder();
        inProcess();
      }
    }, [data.pick]);

    // Pulls local storage data by key
    const handleLocalStorage = async (key) => {
      const results = await localforage.getItem(key);
      return results;
    };

    const getPagingSlips = async (e, day) => {
      dispatch({ type: 'UPDATE_LOADING', loading: true });
      // const add = data.add
      const search = await ContentSearch.pagingSlips(day)
      search.filter(n => n)
      if (search && search.length > 0) {
          dispatch({
            type: "UPDATE_UNSORTED",
            unsortedList: search,
            count: data.unsortedList.length + search.length
          });
      } else {
        dispatch({
          type: 'UPDATE_LOADING',
          loading: false
        });
        warning('Could not find any paging slips');
      }
    };

    const handleOptions = (e, option) => {
        const list = data.add
        switch(option){
            case 'onlyFloor':
                const floor = _.filter(list, {height: 'floor'})
                const remainingLift = _.filter(list, _.conforms({'height': _.partial(_.includes, ['lift', 'none'])}))
                handlePickList(floor, 'Non-lift')
                handleAddUpdate(remainingLift)
            break
            case 'onlyLift':
                const lift = _.filter(list, {height: 'lift'})
                let remainingFloor = _.filter(list, _.conforms({'height': _.partial(_.includes, ['floor', 'none'])}))
                handlePickList(lift, 'Lift')
                handleAddUpdate(remainingFloor)
            break
            case 'onlyNone':
                const none = _.filter(list, {height: 'none'})
                let remaining = _.filter(list, _.conforms({'height': _.partial(_.includes, ['floor', 'lift'])}))
                handlePickList(none, 'No Location')
                handleAddUpdate(remaining)
            break
            case 'addAll':
                handlePickList(list, 'All')
                dispatch({ type: "RESET_ADD" })
            break
            case 'removeAll':
                dispatch({ type: "RESET_ADD" })
            break
        }
    }

    const handlePickList = (set, type) => {
        let checked = data.checked
        Object.keys(set).map(items =>
            checked[set[items].barcode] = set[items]
        )

        for( var i=set.length - 1; i>=0; i--){
            for( var j=0; j<data.pick.length; j++){
                if(set[i] && (set[i].barcode === data.pick[j].barcode)){
                    set.splice(i, 1);
                }
            }
        }
        // const setPush = set.filter(item => !data.pick.includes(item.barcode));

        // const setPush = Object.keys(data.pick).map(items =>
        //     Object.keys(set).map(setList =>{
        //         if(data.pick[items].barcode !== set[setList].barcode){
        //             console.log
        //             return set[setList]
        //         }
        //     }
        //     )
        // )


        dispatch({ type: "UPDATE_PICK", pick: set})
        dispatch({ type: 'UPDATE_CHECKED', checked: checked})
        success(`${type} items have been added to paging list`)
    }

    const handleAddUpdate = (items) => {
        dispatch({ type: "UPDATE_DATA", add: items, count: items.length})
        // dispatch({ type: 'UPDATE_LOADING', loading: true })
    }

    const handleBarcodeAdd = (e) => {
        const add = data.add
        const barcodeArray = []
        Object.keys(add).map(items => {
            barcodeArray.push(add[items].barcode)
        })
        const verify = barcodeArray.includes(e.target.value)
        if(verify === false){
            dispatch({ type: 'UPDATE_SEARCHOBJECT', searchObject: e.target.value.split(/\r?\n/)})
        } else {
            warning(`${e.target.value} is already in your list`)
        }
    }

    const getRecords = async () => {
        dispatch({ type: 'UPDATE_LOADING', loading: true })
        const unique = new Set(data.searchObject)
        const uniqueArray = [...unique]
        const search = await ContentSearch.recordData({
            barcode: uniqueArray.join(',')
        })
        if(search && search[0] !== false){
            dispatch({ type: "UPDATE_SEARCHOBJECT", searchObject: []})
            dispatch({ type: "UPDATE_UNSORTED", unsortedList: search, count: data.unsortedList.length + search.length})
        } else {
            warning('Unable to match barcode')
            dispatch({ type: 'UPDATE_LOADING', loading: false })
        }
      }

    const handleChange = (e, values, index, type) => {
        if(type === 'add'){
            addPick(values, index)
            addChecked(values, index)
        } else {
            removePick(values, index)
            removeChecked(values, index)
        }
    }

    const addPick = (items, index) => {
        dispatch({ type: "UPDATE_PICK", pick: [items]})
        success(`Added ${items.barcode} to paging list`)
    }

    const addChecked = (items) => {
        const list = data.checked
        list[items.barcode] = items
        dispatch({ type: 'UPDATE_CHECKED', checked: list})
    }

    const removePick = (values, index) => {
        const filtered = Object.keys(data.pick)
        .filter(key => data.pick[key].barcode != index)
        .reduce((obj, key) => {
            obj[key] = data.pick[key];
            return obj;
        }, []);
        dispatch({ type: "FILTER_PICK", pick: filtered})
        // dispatch({ type: 'UPDATE_CHECKED', checked: filtered})
        success(`${index} removed from paging list`)
    }

    const removeChecked = (values, index) => {
        const filtered = Object.keys(data.checked)
        .filter(key => key != index)
        .reduce((obj, key) => {
            obj[key] = data.checked[key];
            return obj;
        }, []);
        dispatch({ type: 'UPDATE_CHECKED', checked: filtered})
    }

    const onSortedChange = value => {
        dispatch({ type: 'UPDATE_SORTED', sorted: value})
    }

    const pickOrder = () => {
        const list = data.pick
        const item = _.orderBy(list,
            ['row', 'ladder', 'shelf_number'],
            ['asc', 'asc', 'asc'])
        localforage.setItem('paging', item)
    }


    const order = () => {
        const item = _.orderBy(data.unsortedList,
          ['call_number'],
          ['asc']);
        dispatch({ type: "UPDATE_DATA", add: item, count: item.length})

        dispatch({ type: 'UPDATE_LOADING', loading: false })
    }

    const sort = (target, order) => {
        const list = data.add
        const item = _.orderBy(list, target, [order])
        dispatch({ type: "UPDATE_DATA", add: item, count: item.length})
    }

    const inProcess = async () => {
        const list = []
        Object.keys(data.pick).map(items => {
            list.push({
                barcode: data.pick[items].barcode.replace(/\D/g,'') ,
                status: "In process"
            })
        })
        await Load.inProcessPaging(list)
    }


    return(
        <div style={{marginTop: "30px"}}>
            <OptionGroup
                getPagingSlips={getPagingSlips}
                handleOptions={handleOptions}
                pagingCount={data.pick}
                add={data.add}
            />
            <Row>
                <Col md="2">
                    <RequestForm
                        add={data.add}
                        handleBarcodeAdd={handleBarcodeAdd}
                        processNewBarcodes={getRecords}
                        searchObject={data.searchObject}
                    />

                </Col>
                <Col>
                    <SlipDisplay
                        data={data.add}
                        checked={data.checked}
                        sort={sort}
                        handleChange={handleChange}
                        loading={data.loading}
                        onSortedChange={onSortedChange}
                        sorted={data.sorted}
                    />
                </Col>
            </Row>
        </div>
    )
}

export default AddPaging

// export default class AddPaging extends Component {

//     state = {
//         add: [],
//         pick: [],
//         count: 0,
//         loading: false,
//         searchObject: [],
//         additionalBarcodes: [],
//         liftHeight: 0,
//         loading: false,
//         sorted: []
//     }

//     componentDidMount = async () => {
//         const { settings } = this.props || ''
//         const local = await this.handleLocalStorage('add') || []
//         let liftHeight = 0
//         if(settings !== ''){
//         Object.keys(settings).map(items => {
//             if(settings[items].type === 'lift_height'){
//                 liftHeight = parseInt(settings[items].value)
//             }
//         })
//         this.setState({
//             liftHeight: liftHeight,
//             add: local
//         })
//         }
//     }

//     handleLocalStorage = async (key) => {
//         const results = await localforage.getItem(key)
//         return results
//     }


//     // getPagingSlips = async (e, day) => {
//     //     e.preventDefault()
//     //     this.setState({ loading: true })
//     //     const add = {...this.state.add}
//     //     const search = await ContentSearch.pagingSlips(day)
//     //     if(search){
//     //         Object.keys(search).map(items =>
//     //             add[search[items].barcode] = search[items]
//     //         )
//     //     }
//     //     this.order(add)
//     //   }


//     handleChange = (e, values, index) => {
//         if(e.target.checked === true) {
//             this.addPick(values)
//         } else {
//             this.removePick(values, index)
//         }
//     }

//     addPick = (items) => {
//         const pick = {...this.state.pick}
//         pick[items.barcode] = items
//         this.setState({
//             pick
//         }, () => {
//             this.pickOrder()
//             Alerts.success(`Added ${items.barcode} to paging list`)
//         })
//     }




//     removePick = (values, index) => {
//         const filtered = Object.keys(this.state.pick)
//         .filter(key => key != index)
//         .reduce((obj, key) => {
//             obj[key] = this.state.pick[key];
//             return obj;
//         }, {});
//         this.setState({
//             pick: filtered
//         }, () => {
//             this.pickOrder()
//             Alerts.success(`${index} removed from paging list`)
//         })
//     }

//     // handleOptions = (e, option) => {
//     //     e.preventDefault()
//     //     const list = this.state.add
//     //     switch(option){
//     //         case 'onlyFloor':
//     //             const floor = _.filter(list, {height: 'floor'})
//     //             const remainingLift = _.filter(list, _.conforms({'height': _.partial(_.includes, ['lift', 'none'])}))
//     //             this.handlePickList(floor, 'Non-lift')
//     //             this.handleAddUpdate(remainingLift)
//     //         break
//     //         case 'onlyLift':
//     //             const lift = _.filter(list, {height: 'lift'})
//     //             let remainingFloor = _.filter(list, _.conforms({'height': _.partial(_.includes, ['floor', 'none'])}))
//     //             this.handlePickList(lift, 'Lift')
//     //             this.handleAddUpdate(remainingFloor)
//     //         break
//     //         case 'onlyNone':
//     //             const none = _.filter(list, {height: 'none'})
//     //             let remaining = _.filter(list, _.conforms({'height': _.partial(_.includes, ['floor', 'lift'])}))
//     //             this.handlePickList(none, 'No Location')
//     //             this.handleAddUpdate(remaining)
//     //         break
//     //         case 'addAll':
//     //             this.handlePickList(list, 'All')
//     //             this.setState({ add: []}, () => localforage.setItem('add', this.state.add))
//     //         break
//     //         case 'removeAll':
//     //             this.setState({ add: []}, () => localforage.setItem('add', this.state.add))
//     //         break
//     //     }
//     // }

//     handlePickList = (set, type) => {
//         let pick = {...this.state.pick}
//         Object.keys(set).map(items =>
//             pick[set[items].barcode] = set[items]
//         )
//         this.setState({
//             pick
//         }, () => {
//             this.pickOrder()
//             Alerts.success(`${type} items have been added to paging list`)
//         })
//     }

//     handleAddUpdate= (items) => {
//         this.setState({ add: []}, () => {
//         const add = {...this.state.add}
//         Object.keys(items).map(set =>
//             add[items[set].barcode] = items[set]
//         )
//         this.order(add)
//         })
//     }

//     pickOrder = () => {
//         const list = this.state.pick
//         const item = _.orderBy(list,
//             ['row', 'ladder', 'shelf_number'],
//             ['asc', 'asc', 'asc'])
//         this.setState({
//             pick: item
//         }, () => {
//             localforage.setItem('paging', this.state.pick)
//         })
//     }

//     order = (data) => {
//         const item = _.orderBy(data,
//           ['call_number'],
//           ['asc']);
//         this.setState({
//             add: item,
//             count: item.length,
//             loading: false
//         }, () => {
//             localforage.setItem('add', this.state.add)
//         })
//     }

//     sort = (target, order) => {
//          const list = this.state.add
//          const item = _.orderBy(list, target, [order])
//          this.setState({add: item})
//     }

//     handleBarcodeAdd = (e) => {
//         const { add } = this.state
//         const barcodeArray = []
//         Object.keys(add).map(items => {
//             barcodeArray.push(add[items].barcode)
//         })
//         const verify = barcodeArray.includes(e.target.value)
//         if(verify === false){
//         this.setState({
//             searchObject: e.target.value.split(/\r?\n/)
//         }, () => console.log(this.state.searchObject))
//         } else {
//             Alerts.info(`${e.target.value} is already in your list`)
//         }
//     }


//       getRecords = async () => {
//         const add = {...this.state.add}
//         const unique = new Set(this.state.searchObject)
//         const uniqueArray = [...unique]
//         const search = await ContentSearch.recordData(uniqueArray.join(','))
//         if(search && search[0] !== false){
//             Object.keys(search).map(items =>
//                 add[search[items].barcode] = search[items]
//             )
//             this.setState({
//                 searchObject: []
//             })
//             this.order(add)
//         } else {
//             Alerts.info('Unable to match barcode')
//             this.setState({loading: false, })
//         }
//       }

//     processNewBarcodes = (e) => {
//         e.preventDefault()
//         this.getRecords()
//     }

//     onSortedChange = value => {
//         this.setState({
//             sorted: value
//         })
//     }

//     render(){

//         const { add, loading, sorted, searchObject } = this.state || []
//         return(
//             <div style={{marginTop: "30px"}}>
//             <OptionGroup
//                 getPagingSlips={this.getPagingSlips}
//                 handleOptions={this.handleOptions}
//             />
//             <Row>
//                 <Col md="2">
//                     <RequestForm
//                         add={this.state.add}
//                         handleBarcodeAdd={this.handleBarcodeAdd}
//                         processNewBarcodes={this.getRecords}
//                         searchObject={searchObject}
//                     />

//                 </Col>
//                 <Col>
//                     <SlipDisplay
//                         data={add}
//                         sort={this.sort}
//                         handleChange={this.handleChange}
//                         loading={loading}
//                         onSortedChange={this.onSortedChange}
//                         sorted={sorted}
//                     />
//                 </Col>
//             </Row>
//             </div>
//         )
//     }
// }

const OptionGroup = ({ getPagingSlips, handleOptions, pagingCount, add }) => {
    const floor = _.filter(add, {height: 'floor'})
    const lift = _.filter(add, {height: 'lift'})
    const none = _.filter(add, {height: 'none'})

    return(
    <Row style={{paddingTop: "20px", paddingBottom: "40px"}}>
        <Col md="8" >
        <Button style={{padding: "5px"}} color="success" onClick={(e) => getPagingSlips(e, 'morning')}>Morning Slips</Button>{' '}
        <Button style={{padding: "5px"}} color="success" onClick={(e) => getPagingSlips(e, 'evening')}>Evening Slips</Button>{' '}
        <Button style={{padding: "5px"}} color="info"   onClick={(e) => handleOptions(e, 'onlyFloor')}>Add Non-Lift items ({floor.length})</Button>{' '}
        <Button style={{padding: "5px"}} color="info"  onClick={(e) => handleOptions(e, 'onlyLift')}>Add Lift items ({lift.length})</Button>{' '}
        <Button style={{padding: "5px"}} color="info"  onClick={(e) => handleOptions(e, 'onlyNone')}>Add No Location items ({none.length})</Button>{' '}
        <Button style={{padding: "5px"}} color="info"  onClick={(e) => handleOptions(e, 'addAll')}>Add All ({add.length})</Button>{' '}
        <Button style={{padding: "5px"}} color="danger" onClick={(e) => handleOptions(e, 'removeAll')}>Remove All</Button>{' '}
        </Col>
        <Col>
            <div className="d-flex justify-content-end">
                <Link className="btn btn-primary" to="/paging-display">Paging Display ({Object.keys(pagingCount).map(items => items).length})</Link>
            </div>
        </Col>
    </Row>
    )
}

const TableHead = ({ }) => (
    <thead>
        <tr>
            <th></th>
            <th>Barcode</th>
            <th>Height </th>
            <th>Call Number</th>
            <th>Shelf</th>
            <th>Row</th>
        </tr>
    </thead>
)

const TableBody = ({ items, idx, handleChange }) => {
    let heightDisplay
    const { height } = items
    if(height === 'lift'){
        heightDisplay = <span style={{ color: 'red' }}>{height}</span>
    } else if(height === 'floor') {
        heightDisplay = <span style={{ color: 'blue' }}>{height}</span>
    } else {
        heightDisplay = <span style={{ color: 'black' }}>{height}</span>
    }
    return(
    <tr key={idx}>
        <td>
            <div>
                <input type="checkbox" onClick={(e) => handleChange(e, items, items.barcode)}/>
            </div>
        </td>
        <td>{items.barcode ? items.barcode : ''}</td>
        <td>{heightDisplay}</td>
        <td>{items.call_number ? items.call_number : ''}</td>
        <td>{items.shelf_number ? items.shelf_number : ''}</td>
        <td>{items.row ? items.row : ''}</td>
    </tr>
    )
}

const TableBodySkeleton = () => (
    [...Array(20)].map((x, i) =>
    <tr key={i}>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
        <td><Skeleton /></td>
    </tr>
    )
)

const SlipDisplay = ({ data , sort, handleChange, loading , onSortedChange, sorted, checked}) => (
    <ReactTable
        data={data}
        columns={
            [{
                Header: '',
                accessor: 'select',
                sortable: false,
                filterable: false,
                width: 100,
                Cell: function(props){
                        return (
                            <Button color={checked[props.original.barcode] ? 'danger' : "primary"} onClick={(e) => handleChange(e, props.original, props.original.barcode, checked[props.original.barcode] ? 'remove' : 'add')}>{checked[props.original.barcode] ? 'Remove' : 'Add'}</Button>
                            // <input checked={checkedItem[props.index]} type="checkbox" onChange={(e) => handleChange(e, props.original, props.index)}/>
                        )
                },
            },{
                Header: "Height",
                accessor: "height",
                foldable: true,
                maxWidth: 100
            },{
                Header: "Barcode",
                accessor: "barcode",
                foldable: true
            },{
                Header: "Call Number",
                accessor: "call_number",
                foldable: true
            },{
                Header: "Shelf",
                accessor: 'shelf',
                foldable: true
            },{
                Header: "Row",
                accessor: 'row',
                foldable: true,
                maxWidth: 100
            },{
                Header: "Collection",
                accessor: 'stream',
                foldable: true,
            }
            ]
        }
        loading={loading}
        showPagination={false}
        pageSize={data && data.length ? data.length : 0 }
        filterable={true}
        onSortedChange={onSortedChange}
        sorted={sorted}
    />
)

const RequestForm = ({ add, handleBarcodeAdd, processNewBarcodes, searchObject }) => {
  const inputValue = searchObject.includes(',') ? searchObject.split(',') : searchObject;
  return (
    <div>
    <p style={{marginLeft: '20px'}}>Number of items <strong>{add ? Object.keys(add).length : 0}</strong></p>
    <Form>
        <FormGroup>
            <Label for="barcodes">Barcodes</Label>
            <Input type="textarea" rows="15" name="barcodes" value={inputValue} onChange={(e) => handleBarcodeAdd(e)}  />
        </FormGroup>
        <Button color="primary" onClick={(e) => processNewBarcodes(e)}>Add</Button>
    </Form>
    </div>
  );
};
