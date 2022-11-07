import React, { useState, useEffect, useReducer, Fragment } from 'react'
import ContentSearch from '../util/search'
import Load from '../util/load'
import { getFormattedDate } from '../util/date'
import { Button, Form, FormGroup, Label, Input, Col, Row, Card, CardBody, Badge } from 'reactstrap'
import localforage from 'localforage'
import PropTypes from 'prop-types';
import useDebounce from '../components/debounce';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { success, failure, warning } from '../components/toastAlerts'

const initialState = {
        original: {
            collection: '',
            tray: '',
            barcodes: []
        },
        verify: {
            tray: '',
            barcodes: []
        },
        verified: [],
        form: 'original',
        trayValid: false,
        trayLength: 8,
        timeout: 0,
        email: '',
        locked: false,
        disable: false
}

const trayReducer = (state, action) => {
    switch (action.type){
        case 'ADD_ORIGINAL':
            return {
                ...state,
                original: action.original
            }
        case 'ADD_VERIFY':
            return {
                ...state,
                verify: action.verify
            }
        case 'ADD_VERIFIED':
            return {
                ...state,
                verified: action.verified
            }
        case 'LOCAL_VERIFIED':
            return {
                ...state,
                verified: action.verified
            }
        case 'CHANGE_FORM':
            return {
                ...state,
                form: action.form
            }
        case 'VALIDATE_TRAY':
        case 'UPDATE_TRAY_LENGTH':
            return {
                ...state, trayLength: action.trayLength
            }
        case 'UPDATE_EMAIL':
        case 'REMOVE_ITEM':
            const remove = state.verified.filter((_, i) => i !== action.id);
        case 'RESET':
            return {
                ...state,
                form: "original",
                original: {
                    collection: state.locked === true ? state.original.collection : '',
                    tray: '',
                    barcodes: []
                },
                verify: {
                    collection: state.locked === true ? state.verify.collection : '',
                    tray: '',
                    barcodes: []
                }
            }
        case 'LOCK_COLLECTION':
            return {
                ...state,
                locked: !state.locked
            }
        case 'DISABLE_VERIFY':
            return {
                ...state,
                disable: !state.disable
            }
        default:
            return state
    }
}

const Tray = (props) => {
    const [data, dispatch] = useReducer(trayReducer, initialState)

    const debouncedSearchTerm = useDebounce(data.original.barcodes, 500);
    const barcodeChecker = useDebounce(data.original.barcodes, 2000)

    useEffect(() => {
        const getLocalItems = async () => {
            const local = await handleLocalStorage('tray') || []
            dispatch({ type: 'LOCAL_VERIFIED', verified: local})
        }
        getLocalItems()

    }, [])

    useEffect(() => {
        if (props) {
            const { settings } = props || ''
            let trayLength = 8
            if (settings !== '') {
                Object.keys(settings).map(items => {
                    if(settings[items].type === 'tray_barcode_length'){
                        trayLength = parseInt(settings[items].value)
                    }
                })
            }
            dispatch({ type: 'UPDATE_TRAY_LENGTH', trayLength: trayLength})
        }
    },[props])

    useEffect(() => {
        if(debouncedSearchTerm && debouncedSearchTerm.length > 0){
            const barcodeVerify = debouncedSearchTerm.split('\n')
            barcodeVerify.map(items => {
                if(items !== '' && items.length === 15 && items.startsWith('3101')) {
                    handleBarcodeVerify(items)
                }
            })
        }
    },[debouncedSearchTerm])

    useEffect(() => {
        if(debouncedSearchTerm && debouncedSearchTerm.length > 0){
            const barcodeVerify = debouncedSearchTerm.split('\n')
            barcodeVerify.map(items => {
                if(items !== ''){
                    if(!items.startsWith('3101')){
                        warning(`${items} does not begin with 3101`)
                    }

                    if(items.length < 15 || items.length > 15){
                        warning(`${items} meeds to be 15 characters long. You currently have ${items.length}`)
                    }
                }
            })
        }
    },[debouncedSearchTerm])

    const handleLocalStorage = async (key) => {
        const results = await localforage.getItem(key)
        return results
    }


    const handleOriginal = e => {
        e.preventDefault()
        // handleAlephRecordVerify(e)
        let value = e.target.value
        if(e.target.name === 'tray'){
            value = e.target.value.replace(/\D/g,'')
        }
        if(data.disable){
            const original = data.original
            original[e.target.name] = value
            const verify = data.verify
            verify[e.target.name] = value
            dispatch({ type: 'ADD_ORIGINAL', original: original})
            dispatch({ type: 'ADD_VERIFY', verify: verify})
        } else {
            const original = data.original
            original[e.target.name] = value
            dispatch({ type: 'ADD_ORIGINAL', original: original})
        }
    }

    const handleBarcodeVerify = async (barcode) => {
            const data = {
                barcodes: barcode
            }

            console.log(data)
            const barcodeVerify = await Load.barcodeVerify(data)
            if(barcodeVerify && barcodeVerify[0] && barcodeVerify[0]["id"]){
                barcodeVerify.map(items => {
                    failure(`${items["barcode"]} is already attached to ${items["boxbarcode"]} on collection ${items["stream"]}`)
                })
            } else {
                return false
            }
    }

    const handleAlephRecordVerify = async (e) => {
        if(e.target.name === 'barcodes'){
            const data = {
                barcodes: e.target.value
            }
            const timeout = setTimeout(async () => {
                const alephVerify = await Load.alephVerify(data)
                if(alephVerify){
                alephVerify.map(items => {
                    if(!items["title"]){
                        failure(`Unable to locate Aleph record.  Please verify record exists before submitting this barcode`)
                    }
                })
                }
            }, 2000)
            return () => clearTimeout(timeout)
        }
    }

    const handleOriginalSubmit = e => {
        e.preventDefault()
        const { original, trayLength } = data
        if(handleErrors() !== true){
            dispatch({ type: 'CHANGE_FORM', form: 'verify'})
        }
    }

    const handleErrors = () => {
        const { original, trayLength, errors } = data
        if(original.collection === ''){
            failure(`You must select a collection`)
            return true
        }
        if(original.tray.length !== trayLength){
            failure(`Tray barcode must be ${trayLength} characters`)
            return true
        }
    }

    const handleVerify = e => {
        e.preventDefault()
        const verify = data.verify
        let value = e.target.value
        if(e.target.name === 'tray'){
            value = e.target.value.replace(/\D/g,'')
        }
        verify[e.target.name] = value
        dispatch({ type: 'ADD_VERIFY', verify: verify})
    }


    const handleVerifySubmit = e => {
        e.preventDefault()
        if(data.original.tray.trim() !== data.verify.tray.trim()){
            warning('Mismatch! \n Original Tray: \n' + data.original.tray + ' \n Verify Tray: \n' + data.verify.tray)
        } else if(data.original.barcodes.trim() !== data.verify.barcodes.trim()) {
            warning('Mismatch! \n Original Barcodes: \n' + data.original.barcodes + ' \n Verify Barcodes: \n' + data.verify.barcodes)
        } else {
            let verified = data.verified
            verified[Date.now()] = {
                collection: data.original.collection,
                tray: data.verify.tray,
                barcodes: data.verify.barcodes
            }
            localforage.setItem('tray', verified)
            dispatch({ type: 'ADD_VERIFIED', verified: verified})
            dispatch({ type: "RESET" })
        }
    }


    const handleDisplayChange = (e, key) => {
        const verified = data.verified
        const values = {
            ...verified[key],
            [e.currentTarget.name]: e.currentTarget.value,
        }

        verified[key] = values
        localforage.setItem('tray', verified)
        dispatch({ type: 'ADD_VERIFIED', verified: verified})
    }

    const handleProcess =  async (e) => {
        e.preventDefault()
         Object.keys(data.verified).map(async (items, idx ) => {
            const load = await Load.insertTrays(data.verified[items])
            if(load === true){
                success(`${data.verified[items].tray} successfully added`)
                removeItem(items)
            } else {
                failure(`${load.barcode} in tray ${load.boxbarcode} was already added on ${load.added}`)
            }
         }
      )
    }

    const removeItem = index => {
        // dispatch({ type: 'REMOVE_ITEM', id: key})
        const filtered = Object.keys(data.verified)
        .filter(key => key != index)
        .reduce((obj, key) => {
            obj[key] = data.verified[key];
            return obj;
        }, {});

        dispatch({ type: 'ADD_VERIFIED', verified: filtered})
        localforage.setItem('tray', filtered)
    }


    const errorClass = (error) => {
        return(error.length === 0 ? '' : 'has-error');
    }

    const handleEnter = (event) => {
        if (event.keyCode === 13) {
          const form = event.target.form;
          const index = Array.prototype.indexOf.call(form, event.target);
          form.elements[index + 1].focus();
          event.preventDefault();
        }
    }

    const lockCollection = e => {
        dispatch({ type: 'LOCK_COLLECTION' })
    }

    const disableVerify = e => {
        dispatch({ type: 'DISABLE_VERIFY' })
    }

    const clearDisplayGrid = e => {
        dispatch({ type: "RESET" })
        dispatch({ type: 'ADD_VERIFIED', verified: []})
        localforage.setItem('tray', {})
    }


    return(
        <Fragment>
        <div style={{paddingTop: "10px"}}>
            <Button color={data.locked ? "success" : "primary"} onClick={(e) => lockCollection(e)}>{data.locked ? "Collection Locked" : "Lock Collection"}</Button>{' '}
            <Button color={data.disable ? "danger" : "primary"} onClick={(e) => disableVerify(e)}>{data.disable ? "Verify Disabled" : "Disable Verify"}</Button>{' '}
            <Button color="warning" onClick={(e) => clearDisplayGrid(e)}>Clear All</Button>
        </div>
            <div style={{marginTop: "50px"}}>
            <ToastContainer />
                <Row>
                    <Col md="4">
                        <Card>
                            <CardBody>
                            <TrayFormOriginal
                                handleOriginal={handleOriginal}
                                collections={props.collections}
                                handleOriginalSubmit={handleOriginalSubmit}
                                processRequests={handleProcess}
                                verified={data.verified}
                                trayLength={data.trayLength}
                                original={data.original}
                                handleEnter={handleEnter}
                                lockCollection={lockCollection}
                                handleVerifySubmit={handleVerifySubmit}
                                disable={data.disable}
                            />
                            </CardBody>
                        </Card>
                    </Col>
                    {data.form !== 'original' && data.disable === false ?
                    <Col md="4">
                        <Card>
                            <CardBody>
                            <TrayFormVerify
                                handleVerify={handleVerify}
                                collections={props.collections}
                                handleVerifySubmit={handleVerifySubmit}
                                original={data.original}
                                trayLength={data.trayLength}
                                verify={data.verify}
                                handleEnter={handleEnter}
                            />
                            </CardBody>
                        </Card>
                    </Col>
                    : ''}
                    <Col>
                        <Display
                            data={data.verified}
                            collections={props.collections}
                            handleDisplayChange={handleDisplayChange}
                            removeItem={removeItem}
                        />
                    </Col>
                </Row>
            </div>
            </Fragment>
    )
}

export default Tray

// export default class Trays extends Component {

//     state = {
//         original: {
//             collection: '',
//             tray: '',
//             barcodes: []
//         },
//         verify: {
//             tray: '',
//             barcodes: []
//         },
//         verified: [],
//         form: 'original',
//         trayValid: false,
//         trayLength : 8,
//         timeout: 0,
//         email: ''
//     }

//     componentDidMount = async () => {
//         const data = await this.handleLocalStorage('tray') || []
//         const { settings } = this.props || ''
//         let trayLength = 8
//         if(settings !== ''){
//         Object.keys(settings).map(items => {
//             if(settings[items].type === 'tray_barcode_length'){
//                 trayLength = parseInt(settings[items].value)
//             }
//         })
//         }
//         if(data){
//             this.setState({
//                 verified: data,
//                 trayLength: trayLength
//             })
//         }
//     }

//     handleOriginal = e => {
//         e.preventDefault()
//         this.handleBarcodeVerify(e)
//         this.handleAlephRecordVerify(e)
//         let value = e.target.value
//         if(e.target.name === 'tray'){
//             value = e.target.value.replace(/\D/g,'')
//         }
//         const original = this.state.original
//         original[e.target.name] = value
//         this.setState({
//             original
//         })
//     }

//     handleBarcodeVerify = async (e) => {
//         if(this.timeout) clearTimeout(this.timeout);
//         if(e.target.name === 'barcodes'){
//             const data = {
//                 barcodes: e.target.value
//             }
//             this.timeout = setTimeout(async () => {
//                 const barcodeVerify = await Load.barcodeVerify(data)
//             if(barcodeVerify && barcodeVerify[0] && barcodeVerify[0]["id"]){
//                 barcodeVerify.map(items => {
//                 const error = {
//                     name: "Barcode exists",
//                     message: `${items["barcode"]} is already attached to ${items["boxbarcode"]} on collection ${items["stream"]}`
//                 }
//                 return Alerts.error(error)
//                 })
//             }
//             }, 2000)
//         }
//     }

//     handleAlephRecordVerify = async (e) => {
//         if(this.timeout) clearTimeout(this.timeout);
//         if(e.target.name === 'barcodes'){
//             const data = {
//                 barcodes: e.target.value
//             }
//             this.timeout = setTimeout(async () => {
//                 const alephVerify = await Load.alephVerify(data)
//                 if(alephVerify){
//                 alephVerify.map(items => {
//                     if(!items["title"]){
//                         const error = {
//                             name: "Aleph record missing",
//                             message: `Unable to locate Aleph record.  Please verify record exists before submitting this barcode`
//                         }
//                         return Alerts.error(error)
//                     }
//                 })
//                 }
//             }, 2000)
//         }
//     }

//     handleOriginalSubmit = e => {
//         e.preventDefault()
//         const { original, trayLength } = this.state
//         if(this.handleErrors() !== true){
//         this.setState({
//             form: 'verify'
//         })
//         }
//     }

//     handleErrors = () => {
//         const { original, trayLength, errors } = this.state
//         if(original.collection === ''){
//             const error = {
//                 name: 'Collection error',
//                 message: `You must select a collection`
//             }
//             Alerts.error(error)
//             return true
//         }
//         if(original.tray.length !== trayLength){
//             const error = {
//                 name: 'Tray error',
//                 message: `Tray barcode must be ${trayLength} characters`
//             }
//             Alerts.error(error)
//             return true
//         }
//     }

//     handleVerify = e => {
//         e.preventDefault()
//         const verify = this.state.verify
//         let value = e.target.value
//         if(e.target.name === 'tray'){
//             value = e.target.value.replace(/\D/g,'')
//         }
//         verify[e.target.name] = value
//         this.setState({
//             verify
//         })
//     }


//     handleVerifySubmit = e => {
//         e.preventDefault()
//         const original = this.state.original
//         const verify = this.state.verify
//         const verified = this.state.verified

//         if(original.tray.trim() !== verify.tray.trim()){
//             return alert('Mismatch! \n Original Tray: \n' + original.tray + ' \n Verify Tray: \n' + verify.tray)
//         } else if(original.barcodes.trim() !== verify.barcodes.trim()) {
//             alert('Mismatch! \n Original Barcodes: \n' + original.barcodes + ' \n Verify Barcodes: \n' + verify.barcodes)
//         } else {
//             verified[Date.now()] = {
//                 collection: original.collection,
//                 tray: verify.tray,
//                 barcodes: verify.barcodes
//             }
//             localforage.setItem('tray', verified)
//             this.setState({
//                 verified,
//                 form: "original",
//                 original: {
//                     collection: '',
//                     tray: '',
//                     barcodes: []
//                 },
//                 verify: {
//                     collection: '',
//                     tray: '',
//                     barcodes: []
//                 }
//             })
//         }
//     }

//     handleLocalStorage = async (key) => {
//         const results = await localforage.getItem(key)
//         return results
//     }


//     handleDisplayChange = (e, key) => {
//         const verified = this.state.verified
//         const values = {
//             ...verified[key],
//             [e.currentTarget.name]: e.currentTarget.value,
//         }

//         verified[key] = values
//         localforage.setItem('tray', verified)
//         this.setState({
//             verified
//         })
//     }

//     handleProcess =  async (e) => {
//         e.preventDefault()
//          Object.keys(this.state.verified).map(async (items, idx ) => {
//             const load = await Load.insertTrays(this.state.verified[items])
//             if(load === true){
//                 Alerts.success(`${this.state.verified[items].tray} successfully added`)
//                 this.removeItem(items)
//             } else {
//                 const errorMessage = {
//                     name: 'Barcode already exists',
//                     message: `${load.barcode} in tray ${load.boxbarcode} was already added on ${load.added}`
//                 }
//                 Alerts.error(errorMessage)
//             }
//          }
//       )
//     }

//     removeItem = (set) => {
//         const filtered = Object.keys(this.state.verified)
//         .filter(key => key != set)
//         .reduce((obj, key) => {
//             obj[key] = this.state.verified[key];
//             return obj;
//         }, {});
//         this.setState({
//             verified: filtered
//         }, () => {
//             localforage.setItem('tray', this.state.verified)
//         })
//     }


//     errorClass = (error) => {
//         return(error.length === 0 ? '' : 'has-error');
//     }

//     handleEnter = (event) => {
//         if (event.keyCode === 13) {
//           const form = event.target.form;
//           const index = Array.prototype.indexOf.call(form, event.target);
//           form.elements[index + 1].focus();
//           event.preventDefault();
//         }
//     }

//     render(){
//         const { original, verify, verified, form, trayLength } = this.state || {}
//         return(
//             <div style={{marginTop: "50px"}}>
//                 <Row>
//                     <Col md="2">
//                         <TrayFormOriginal
//                             handleOriginal={this.handleOriginal}
//                             collections={this.props.collections}
//                             handleOriginalSubmit={this.handleOriginalSubmit}
//                             processRequests={this.handleProcess}
//                             verified={verified}
//                             trayLength={trayLength}
//                             original={original}
//                             handleEnter={this.handleEnter}
//                         />
//                     </Col>
//                     {form !== 'original' ?
//                     <Col md="2">
//                         <TrayFormVerify
//                             handleVerify={this.handleVerify}
//                             collections={this.props.collections}
//                             handleVerifySubmit={this.handleVerifySubmit}
//                             original={original}
//                             trayLength={trayLength}
//                             verify={verify}
//                             handleEnter={this.handleEnter}
//                         />
//                     </Col>
//                     : ''}
//                     <Col>
//                         <Display
//                             data={verified}
//                             collections={this.props.collections}
//                             handleDisplayChange={this.handleDisplayChange}
//                             removeItem={this.removeItem}
//                         />
//                     </Col>
//                 </Row>
//             </div>
//         )
//     }

// }

const TrayFormVerify = props => (
    <Form>
    <FormGroup>
      <Label for="collections">Collections</Label>
        <Input type="select" value={props.original.collection} onChange={(e) => props.handleVerify(e)} name="collection">
        {props.collections ? Object.keys(props.collections).map((items, idx) => (
            <option key={idx}>{props.collections[items].name}</option>
        )) : <option></option>}
      </Input>
    </FormGroup>
    <FormGroup>
      <Label for="tray">Tray
        {props.verify.tray.replace(/\D/g,'').length === props.trayLength ?
            <Badge color="success">{props.trayLength}</Badge>
            :
            <Badge color="danger">{props.verify.tray.replace(/\D/g,'').length}</Badge>
          }
      </Label>
      <Input type="text" onKeyDown={props.handleEnter} name="tray" value={props.verify.tray} onChange={(e) => props.handleVerify(e)}  placeholder="Tray barcode.." />
    </FormGroup>
    <FormGroup>
      <Label for="tray">Barcodes</Label>
      <Input type="textarea" rows="10" value={props.verify.barcodes} onChange={(e) => props.handleVerify(e)} name="barcodes" />
    </FormGroup>
        <Button onClick={(e) => props.handleVerifySubmit(e)} color="success">Verify</Button>
    </Form>
)

const TrayFormOriginal = props => (
    <div>
    <Form className="sticky-top">
        <FormGroup>
          <Label for="collections">Collections
        </Label>
            <Input type="select" value={props.original.collection} onChange={(e) => props.handleOriginal(e)} name="collection">
            <option>Select Collection</option>
            {props.collections ? Object.keys(props.collections).map((items, idx) => (
                <option value={props.collections[items].name} key={idx}>{props.collections[items].name}</option>
            )) : <option></option>}
          </Input>
        </FormGroup>
        <FormGroup>
        <Label for="tray">Tray{ ' ' }
        {props.original.tray.replace(/\D/g,'').length === props.trayLength ?
            <Badge color="success">{props.trayLength}</Badge>
            :
            <Badge color="danger">{props.original.tray.replace(/\D/g,'').length}</Badge>
          }
        </Label>
          <Input type="text" name="tray" onKeyDown={props.handleEnter} value={props.original.tray} onChange={(e) => props.handleOriginal(e)}  placeholder="Tray barcode.." />
        </FormGroup>
        <FormGroup>
          <Label for="tray">Barcodes</Label>
          <Input type="textarea" value={props.original.barcodes} rows="10" onChange={(e) => props.handleOriginal(e)} name="barcodes" />
        </FormGroup>
        {props.original.tray.replace(/\D/g,'').length === props.trayLength ?
            props.disable
                ? <Button onClick={(e) => props.handleVerifySubmit(e)} color="success">Submit</Button>
                : <Button onClick={(e) => props.handleOriginalSubmit(e)} color="primary">Submit</Button>
        :   <Button onClick={e => (e.preventDefault)} color="secondary">Submit</Button>
        }
    </Form>
    <br />
    {Object.keys(props.verified).map(items => items).length ?
            <ProcessForm
                processRequests={props.processRequests}
            />
        : ''}
    </div>
)

const ProcessForm = props => (
    <Form>
        <Button onClick={(e) => props.processRequests(e)} color="success">Process Requests</Button>
    </Form>

)

const Display = props => (
    Object.keys(props.data).map((items, idx) => {
        return(
        <Card key={items}>
            <CardBody>
                <dl className="row">
                    <dt className="col-sm-3">Tray Barcode</dt>
                        <dd className="col-sm-9">
                            {props.data[items].tray}
                            {/* <input
                                type="numbers"
                                className="form-control"
                                value={data[items].tray}
                                name="tray"
                                placeholder="Tray Barcode"
                                onChange={(e) => handleDisplayChange(e, items)}
                            /> */}
                        </dd>
                        <dt className="col-sm-3">Barcodes</dt>
                            <dd className="col-sm-9">
                                {props.data[items].barcodes}
                                {/* <textarea
                                    className="form-control"
                                    name="barcodes"
                                    value={data[items].barcodes}
                                    onChange={(e) => handleDisplayChange(e, items)}
                                >
                                </textarea> */}
                            </dd>
                        <dt className="col-sm-3">Collection</dt>
                        <dd className="col-sm-9">
                            {props.data[items].collection}
                            {/* <select className="form-control"
                                value={data[items].collection}
                                name="collection"
                                onChange={(e) => handleDisplayChange(e, items)}
                            >
                            <option>Select Collection</option>
                            {collections ? Object.keys(collections).map((items, idx) => (
                            <option key={idx}>{collections[items].name}</option>
                            )) : <option></option>}
                            </select> */}
                        </dd>
                </dl>
                <Button color="danger" onClick={() => props.removeItem(items)}>Delete</Button>

            </CardBody>
        </Card>
        )
    })
)
