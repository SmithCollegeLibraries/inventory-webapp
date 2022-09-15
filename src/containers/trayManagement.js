import React, { Component, useEffect, useState, useReducer } from 'react'
import { Card, CardBody, Button, Form, FormGroup, Label, Input, Row, Col, TabContent, TabPane, Nav, NavItem, NavLink, Alert  } from 'reactstrap'
import Load from '../util/load'
import ContentSearch from '../util/search'
import Alerts from '../components/alerts'
import AutoSuggest from 'react-autosuggest'
import classnames from 'classnames';
import { success, failure, warning } from '../components/toastAlerts'

const initialState = {
   display: 'entire_tray',
   tray: '',
   rawData: [],
   fields: {
       trayBarcode: '',
       newTrayBarcode: '',
       trayStream: '',
       shelf: '',
       shelf_number: 0,
       shelf_position: 0,
       shelf_depth: '',
       barcodes: []
   },
   newTray: {
        trayBarcode: '',
        trayStream: '',
        barcodes: []
   },
   trayTransferForm: false,
   suggestions: [],
   value: '',
   barcodesToDelete: [],
   loading: false
}

const reducer = (state, action) => {
    switch(action.type){
        case 'CHANGE_DISPLAY':
            return {
                ...state,
                display: action.payload
            }
        case 'FORM_CHANGE':
            return {
                ...state,
                tray: action.payload
            }     
        case 'UPDATE_FIELDS':
            return {
                ...state,
                fields: action.payload.data,
                rawData: action.payload.rawData
            }   
        case 'AUTO_COMPLETE':
            return {
                ...state,
                value: action.payload
            }    
        case 'UPDATE_SUGGESTIONS':
            return {
                ...state,
                suggestions: action.payload.suggestion,
                tray: action.payload.tray
            }   
        case 'CLEAR_SUGGESTIONS':
            return {
                ...state,
                suggestions: action.payload
            }      
            
        case 'SELECT_SUGGESTION':
            return {
                ...state,
                tray: action.payload
            }    
        case 'UPDATE_FORM': 
            const data = state.fields
            data[action.payload.field] = action.payload.value
            return{
                ...state,
                fields: data  
            }   
        case 'UPDATE_DATA':
            const rawData = state.rawData
            rawData[action.payload.key][action.payload.name] = action.payload.value
            return {
                ...state,
                rawData
            } 
        case 'UPDATE_NEW_TRAY':
            const newTray = state.newTray
            newTray[action.payload.name] = action.payload.value
            return {
                ...state, newTray
            }
        case 'TRANSFER_BARCODES':
            const newTrayBarcodes = state.newTray
            newTrayBarcodes['barcodes'] = action.payload.value
            return {
                ...state, newTray: newTrayBarcodes
            }
        case 'DELETE_BARCODE':
            return {
                ...state,
                rawData: state.rawData.filter((_, i) => i != action.payload)
            }
        case 'ADD_BARCODE_DELETES':
            return {
                ...state,
                barcodesToDelete: action.payload
            }    
        case 'UPDATE_LOADING':
            return{
                ...state,
                loading: action.loading
            }
        case 'RESET':
            return {
                ...state,
                tray: '',
                rawData: [],
                fields: {
                    trayBarcode: '',
                    newTrayBarcode: '',
                    trayStream: '',
                    shelf: '',
                    shelf_number: 0,
                    shelf_position: 0,
                    shelf_depth: '',
                    barcodes: []
                },
                newTray: {
                     trayBarcode: '',
                     trayStream: '',
                     barcodes: []
                },
                trayTransferForm: false,
                suggestions: [],
                value: '',
                barcodesToDelete: []
            }
        default: 
            throw new Error()      
    }
}

function TrayManagement(props){
    const [ state, dispatch ] = useReducer(reducer, initialState)
    const [activeTab, setActiveTab ] = useState('entire_tray')
    const theme = {
        container: 'autocomplete',
        input: 'form-control',
        suggestionsContainer: 'dropdownList',
        suggestionsList: `dropdown-menu ${state.suggestions.length ? 'show' : ''}`,
        suggestion: 'dropdown-item',
        suggestionHighlighted: 'active'
    }

    const autoCompleteValue = state.value

    const onChange = (e) => {
        dispatch({ type: "FORM_CHANGE", payload: e.target.value})
    }

    const inputProps = {
        autoCompleteValue,
        onChange: onChange
    }

    const toggle = tab => {
        if(activeTab !== tab) setActiveTab(tab);
    }

    const onSuggestionsFetchRequested = async ({ value }) => {
        const search = await ContentSearch.autocomplete(value)
        dispatch({ type: 'UPDATE_SUGGESTIONS', payload: { suggestion: search, tray: value}})
      }

    const onSuggestionsClearRequested = () => {
        dispatch({ type: 'CLEAR_SUGGESTIONS', payload: []})
    }

    const renderSuggestion = suggestion => {
        return (
          <div className="result">
            <div>{suggestion.boxbarcode}</div>
          </div>
        )
    }

    const onSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
        dispatch({ type: 'SELECT_SUGGESTION', payload: suggestion.barcode})
    }

    const handleDisplayChange = e => {
        dispatch({ type: 'CHANGE_DISPLAY', payload: e.target.value})
    }

    const handleFormChange = e => {
        dispatch({ type: 'FORM_CHANGE', payload: e.target.value})
    }

    const handleTrayChange = e => {
        dispatch({ type: "UPDATE_FORM", payload: { field: e.target.name, value: e.target.value}})
    }

    const handleSearch = async e => {
        e.preventDefault()
        const search = await ContentSearch.traymanagement(state.tray)
        let barcodes = []
        if(search && search[0]){
            const data = {
                trayBarcode: search[0].tray_barcode ? search[0].tray_barcode : '',
                trayStream : search[0].collection ? search[0].collection : '',
                shelf:  search[0].shelf ? search[0].shelf : '',
                shelf_number: search[0].shelf_number ? search[0].shelf_number : 0,
                shelf_position: search[0].shelf_position ? search[0].shelf_position : 0,
                shelf_depth: search[0].shelf_depth ? search[0].shelf_depth : '',
                barcodes: barcodes
            }
            Object.keys(search).map((items, idx) => {
                barcodes.push(search[items].barcode)
            })
            dispatch({ type: 'UPDATE_FIELDS', payload: { data: data, rawData: search}})
        } else {
            warning('No results found')
        } 
    }

    const handleTrayUpdate = async e => {
        e.preventDefault()
        const data = {
            tray: state.fields.trayBarcode,
            newTrayBarcode: state.fields.newTrayBarcode,
            collection: state.fields.trayStream,
            shelf: state.fields.shelf,
            shelf_position: state.fields.shelf_position,
            shelf_depth: state.fields.shelf_depth
        }
        const load = await Load.updateEntireTrays(data)
        if(load && load["code"] === 200){
            success(load["data"])
            dispatch({ type: 'RESET', payload: ''})

        } else {
            failure(load["message"])
        }
    } 

    const handleTrayDelete = async (e, id) => {
        const data = {
            tray: id
        }
        const deleteTray = await Load.deleteTrayAndItems(data)
        if(deleteTray === true){
            success("Tray and items successfully deleted")
            dispatch({ type: 'RESET', payload: '' })
        } else {
            failure('There was an error deleting the tray')
        }
    }

    const handleTrayDeleteAndUnlink = async (e, id) => {
        const data = {
            tray: id
        }
        const deleteTray = await Load.deleteTrayAndUnlink(data)
                if(deleteTray === true){
                    success('Tray deleted successfully and unlinked from shelf')
                    dispatch({ type: 'RESET', payload: '' })
                } else {
                    failure('There was an error deleting the tray')
                }
            }


    const handleIndividualTrayUpdate = async (e, index, type) => {
        e.preventDefault()
        const item = state.rawData[index]
        const load = await Load.updateIndividualTrayItems(item)
        if(load === true){
            success('Update successful')
        } else {
            failure('There was an error updating this record')
        }
    }

    const handleTrayUpdateChange = (e, key) => {
        dispatch({ type: 'UPDATE_DATA', payload: { name: e.currentTarget.name, value: e.currentTarget.value, key: key }})
    }

    const handleIndividualTrayDelete = async (e, item, key) => {
        e.preventDefault()
        const deleteItem = await Load.deleteIndividualTrayItems(item)
        if(deleteItem === true){
            success(`${item.barcode} was deleted from tray ${item.tray_barcode}`)
            dispatch({ type: 'DELETE_BARCODE', payload: key})
        } else {
            failure("There was a problem deleting this item")
        }
    }

    const handleNewTrayChange = e => {
        dispatch({ type: 'UPDATE_NEW_TRAY', payload: { name: e.currentTarget.name, value: e.currentTarget.value }})
    }

    const handleTrayTransfer = () => {

    }

    const trayTransferForm = () => {

    }

    const handleTrayTransferProcess =  async (e) => {
        const data = {
            originalTray: state.tray,
            newTray: state.newTray,  
            newBarcodes: state.newTray.barcodes       
        }
        const load = await Load.transfer(data)
        if(load && load["code"] === 200){
            success(load["data"])
            dispatch({ type: 'RESET', payload: '' })
        } else {
            failure(load["data"])
        }
        // if(load === true){
        //     Alerts.success(`Barcodes transferred successfully`)
           
        // } else {
        //     const errorMessage = {
        //         name: 'Error',
        //         message: `There was an error transferring the barcodes`
        //     }
        //     Alerts.error(errorMessage)
        // } 
    }
    
    const handleBarcodeTransfer = () => {
        dispatch({ type: 'TRANSFER_BARCODES', payload: { value: state.fields.barcodes }})
    }

    const handleBarcodeDeletes = e => {
        dispatch({ type: 'ADD_BARCODE_DELETES', payload: e.target.value })
    }

    const handleBarcodeDeleteProcess = async e => {
        e.preventDefault()
        const data = {
            barcodes: state.barcodesToDelete
        }
        const load = await Load.deleteMultiple(data)
        if(load === true){
            success(`Barcodes deleted successfully`)
            dispatch({ type: 'RESET', payload: '' })
        } else {
            failure(`There was an error deleting the barcodes`)
        } 
    }


    return(
        <div>
        <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
            <div style={{paddingBottom: '50px'}}>
            <SearchForm 
                tray={state.tray}
                handleSearch={handleSearch}
                onChange={onChange}
            />
            </div>
            {/* <FormGroup>
                <Label for="management">Tray Management Options</Label>
                <Input type="select" onChange={(e) => handleDisplayChange(e)} name="management">
                <option>Select tray management</option>
                <option value="entire_tray">Entire Tray</option>
                <option value="individual_items">Individual items</option>
                <option value="transfer_items">Transfer items</option>
                </Input>
            </FormGroup> */}
            <Nav tabs>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'entire_tray' })}
                        onClick={() => { toggle('entire_tray'); }}
                    >
                    Entire Tray
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'individual_items' })}
                        onClick={() => { toggle('individual_items'); }}
                    >
                    Individual Items
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'transfer_items' })}
                        onClick={() => { toggle('transfer_items'); }}
                    >
                    Transfer Items
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={classnames({ active: activeTab === 'delete_items' })}
                        onClick={() => { toggle('delete_items'); }}
                    >
                    Delete Items
                    </NavLink>
                </NavItem>
            </Nav>
            <br />
            <TabContent activeTab={activeTab}>
                <TabPane tabId="entire_tray">
                    <EntireTray 
                        fields={state.fields}
                        trayBarcode={state.tray}
                        loading={state.loading}
                        handleTrayChange={handleTrayChange}
                        handleTrayUpdate={handleTrayUpdate}
                        collections={props.collections}
                        handleTrayDelete={handleTrayDelete}
                        handleTrayDeleteAndUnlink={handleTrayDeleteAndUnlink}
                    />
                 </TabPane>
                 <TabPane tabId="individual_items">
                    <IndividualItems
                        rawData={state.rawData}
                        handleIndividualTrayUpdate={handleIndividualTrayUpdate}
                        handleTrayUpdateChange={handleTrayUpdateChange}
                        handleIndividualTrayDelete={handleIndividualTrayDelete}
                        collections={props.collections}
                    />
                </TabPane>
                <TabPane tabId='transfer_items'>
                    <Transfer
                        rawData={state.rawData}
                        trayBarcode={state.fields.trayBarcode} 
                        trayStream={state.fields.trayStream} 
                        barcodes={state.fields.barcodes} 
                        handleTrayChange={handleTrayChange}
                        handleNewTrayChange={handleNewTrayChange}
                        handleTrayTransfer={handleTrayTransfer} 
                        trayTransferForm={trayTransferForm}
                        handleTrayUpdate={handleTrayUpdate}
                        handleTrayTransferProcess={handleTrayTransferProcess}
                        handleBarcodeTransfer={handleBarcodeTransfer}
                        newTray={state.newTray}
                        collections={props.collections}
                    />
                </TabPane>
                <TabPane tabId="delete_items">
                    <DeleteItems 
                        handleBarcodeDeletes={handleBarcodeDeletes}
                        handleBarcodeDeleteProcess={handleBarcodeDeleteProcess}
                        barcodesToDelete={state.barcodesToDelete}
                    />
                </TabPane>
            </TabContent>
        </div>
    </div>   
    )
}

const SearchForm = ({ tray, handleSearch, onChange}) => {
    return(
    <div>
    <Form inline onSubmit={e => handleSearch(e)}>
        <FormGroup>
            <Label for="tray_management_form" className="mr-sm-2">Tray Search</Label>
            <Input value={tray} onChange={onChange} />
            {/* <AutoSuggest
                suggestions={state.suggestions}
                onSuggestionSelected={onSuggestionSelected}
                onSuggestionsFetchRequested={onSuggestionsFetchRequested}
                onSuggestionsClearRequested={onSuggestionsClearRequested}
                getSuggestionValue={suggestion => suggestion.boxbarcode || ''}
                renderSuggestion={renderSuggestion}
                inputProps={inputProps}
                theme={theme}
            /> */}
            <Button color="primary">Search</Button>
        </FormGroup>
    </Form>   
    </div> 
    )  
}  

const EntireTray = ({
    fields,
    collections,
    handleTrayDelete,
    handleTrayDeleteAndUnlink,
    handleTrayChange,
    handleTrayUpdate,
    trayBarcode,
    loading
}) => {
    return(
        <Row>
            <Col>
                <Form>
                    <FormGroup>
                        <Label for="tray">Tray Barcode</Label>
                        <Input type="text" disabled value={fields.trayBarcode}  name="trayBarcode" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="tray">New Tray Barcode</Label>
                        <Input type="text" disabled={fields && fields.newTrayBarcode !== '' ? '' : "disabled"} value={fields.newTrayBarcode || ''} onChange={(e) => handleTrayChange(e)} name="newTrayBarcode" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="collections">Collections</Label>
                        <Input type="select" disabled={fields && fields.trayStream !== '' ? '' : "disabled"} value={fields.trayStream} onChange={(e) => handleTrayChange(e)} name="trayStream">
                        <option value=''>Select collection...</option>
                        {collections ? Object.keys(collections).map((items, idx) => (
                        <option key={idx}>{collections[items].name}</option>
                        )) : <option></option>}
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label for="tray">Shelf</Label>
                        <Input type="text"  value={fields.shelf} onChange={(e) => handleTrayChange(e)} name="shelf" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="depth">Depth</Label>
                        <Input type="select"  value={fields.shelf_depth} onChange={(e) => handleTrayChange(e)} name="shelf_depth">
                            <option>Select Depth</option>
                            <option>Front</option>
                            <option>Middle</option>
                            <option>Rear</option>
                        </Input>
                    </FormGroup>
                    <FormGroup>
                    <Label for="position">Position</Label>
                        <Input type="select"  value={fields.shelf_position} onChange={(e) => handleTrayChange(e)} name="shelf_position">
                        <option value=''>Select position...</option>
                        {[...Array(12)].map((x, i) =>
                            <option key={i} value={i + 1}>{i + 1}</option>
                        )}
                    </Input>
                    </FormGroup>
                    <Button color="warning" onClick={(e) => handleTrayUpdate(e)}>Update Tray</Button>{ ' ' }
                    <Button color="danger" onClick={(e) => {if(window.confirm('Are you sure you want to delete this item?')) {handleTrayDelete(e, trayBarcode)}}}>Delete Tray and Items</Button>{ ' ' }
                    <Button color="danger" onClick={(e) => {if(window.confirm('Are you sure you want to delete this item and remove it from the shelf?')) {handleTrayDeleteAndUnlink(e, trayBarcode)}}}>Delete Tray/Items unlink from shelf</Button>
                </Form>        
            </Col>
        </Row>
    )
}

const IndividualItems = ({ 
    rawData, 
    handleIndividualTrayUpdate, 
    handleTrayUpdateChange, 
    handleIndividualTrayDelete,
    collections
}) => {
    return(
        <Row>
            <Col>
                <Form>
                    {Object.keys(rawData).map((items, idx) =>
                     <Card key={idx}>
                     <CardBody>
                    <FormGroup>
                        <Label for="tray">Tray Barcode</Label>
                        <Input type="text" value={rawData[items].tray_barcode} onChange={(e) => handleTrayUpdateChange(e, idx)} name="tray_barcode" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="collections">Collections</Label>
                        <Input type="select" value={rawData[items].collection} onChange={(e) => handleTrayUpdateChange(e, idx)} name="collection">
                        <option value=''>Select collection...</option>
                        {collections ? Object.keys(collections).map((items, idx) => (
                        <option key={idx}>{collections[items].name}</option>
                        )) : <option></option>}
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label for="barcodes">Barcodes</Label>    
                        <Input type="textarea" value={rawData[items].barcode} onChange={(e) => handleTrayUpdateChange(e, idx)} name="barcode" />
                    </FormGroup>
                        <Button color="danger" onClick={(e) => {if(window.confirm('Are you sure you want to delete this item?')) {handleIndividualTrayDelete(e, rawData[items], idx)}}}>Delete</Button>{ ' ' }
                        <Button color="warning" onClick={(e) => handleIndividualTrayUpdate(e, idx, 'update')}>Update Tray</Button>
                    </CardBody>
                    </Card>  
                    )}
                </Form>      
            </Col>
        </Row> 
    )
}

const Transfer = ({ 
    rawData, 
    trayBarcode, 
    trayStream, 
    barcodes, 
    handleTrayChange, 
    handleNewTrayChange, 
    handleTrayTransfer, 
    trayTransferForm, 
    handleTrayUpdate,
    handleTrayTransferProcess ,
    handleBarcodeTransfer,
    newTray,
    collections
}) => {
    const barcodeDisplay = Array.isArray(barcodes) ? barcodes.join('\r\n') : barcodes
    const newBarcodeDisplay = Array.isArray(newTray.barcodes) ? newTray.barcodes.join('\r\n') : newTray.barcodes
    return(
        <Row>
            <Col>
                <Form>
                    <FormGroup>
                        <Label for="tray">Tray Barcode</Label>
                        <Input type="text" disabled value={trayBarcode} onChange={(e) => handleTrayChange(e)} name="trayBarcode" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="stream">Stream</Label>   
                        <Input type="text" disabled value={trayStream} onChange={(e) => handleTrayChange(e)} name="trayStream" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="barcodes">Barcodes</Label>    
                        <Input type="textarea" disabled rows="20" value={barcodeDisplay} onChange={(e) => handleTrayChange(e)} name="barcodes" />
                    </FormGroup>
                    <Button color="primary" onClick={(e) => handleBarcodeTransfer(e)}>Transfer all Barcodes</Button>
                </Form>        
            </Col>
            <Col>
            <Form>
                <FormGroup>
                        <Label for="tray">New Tray Barcode</Label>
                        <Input type="text" value={newTray.trayBarcode}  onChange={(e) => handleNewTrayChange(e)} name="trayBarcode" />
                    </FormGroup>
                    <FormGroup>
                        <Label for="stream">New Stream</Label>   
                        <Label for="collections">Collections</Label>
                        <Input type="select" value={newTray.trayStream} onChange={(e) => handleNewTrayChange(e)} name="trayStream">
                        <option value=''>Select collection...</option>
                        {collections ? Object.keys(collections).map((items, idx) => (
                        <option key={idx}>{collections[items].name}</option>
                        )) : <option></option>}
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label for="barcodes">New Barcodes</Label>    
                        <Input type="textarea" value={newBarcodeDisplay} rows="20" onChange={(e) => handleNewTrayChange(e)} name="barcodes" />
                    </FormGroup>
                    <Button color="success" onClick={(e) => handleTrayTransferProcess(e)}>Save</Button>{ ' ' }
                </Form>   
            </Col>
        </Row> 
    )
}

const DeleteItems = ({handleBarcodeDeletes, handleBarcodeDeleteProcess, barcodesToDelete}) => (
    <Row>
    <Col>
        <Form>
            <FormGroup>
                <Label for="barcodes">Delete the following barcodes</Label>    
                <Input type="textarea" rows="20" value={barcodesToDelete} onChange={(e) => handleBarcodeDeletes(e)} name="barcodes" />
            </FormGroup>
            <Button color="danger" onClick={(e) => {if(window.confirm('Are you sure you want to delete these barcodes?')) {handleBarcodeDeleteProcess(e)}}}>Delete barcodes</Button>{ ' ' }
        </Form>      
    </Col>
</Row> 
)

export default TrayManagement

// export default class TrayManagement extends Component {

//     state = {   
//         display: 'entire_tray',
//         tray: '',
//         rawData: [],
//         trayBarcode: '',
//         trayStream: '',
//         shelf: '',
//         shelf_number: 0,
//         shelf_position: 0,
//         shelf_depth: '',
//         barcodes: [],
//         newTray: {
//             trayBarcode: '',
//             trayStream: '',
//             barcodes: []
//         },
//         trayTransferForm: false,
//         suggestions: [],
//         value: ''
//     }

//     componentDidMount(){

//     }

//     handleDisplayChange = e => {
//         this.setState({
//             display: e.target.value
//         })
//     }

//     handleFormChange = e => {
//         this.setState({
//             tray: e.target.value
//         })
//     }

//     onSuggestionsFetchRequested = async ({ value }) => {
//         const search = await ContentSearch.autocomplete(value)
//         if(search){
//             this.setState({
//                 suggestions: search,
//                 tray: value
//             })
//         }    
//       }

//       onSuggestionsClearRequested = () => {
//         this.setState({
//           suggestions: []
//         });
//       };

//       renderSuggestion = suggestion => {
//         return (
//           <div className="result">
//             <div>{suggestion.boxbarcode}</div>
//           </div>
//         )
//       }

//       onChange = (event, { newValue }) => {
//         this.setState({ value: newValue })
//       }

//       onSuggestionSelected = (event, { suggestion, suggestionValue, suggestionIndex, sectionIndex, method }) => {
//           this.setState({
//             tray: suggestion.boxbarcode
//           })
//       }

//     handleSearch = async (e) => {
//         e.preventDefault()
//         const search = await ContentSearch.traymanagement(this.state.tray)

//         if(search && search[0]){
//             const data = search
//             let barcodes = []
//             let trayBarcode = search[0].tray_barcode
//             let trayStream = search[0].collection
//             let shelf = search[0].shelf
//             let shelf_number = search[0].shelf_number
//             let shelf_position = search[0].shelf_position
//             let shelf_depth = search[0].shelf_depth
//             Object.keys(search).map((items, idx) => {
//                 barcodes.push(search[items].barcode)
//             })
//             this.setState({
//                 rawData: search,
//                 trayBarcode: trayBarcode,
//                 trayStream: trayStream,
//                 shelf: shelf,
//                 shelf_number: shelf_number,
//                 shelf_position: shelf_position,
//                 shelf_depth: shelf_depth,
//                 barcodes: barcodes
//             })
//         } else {
//             const errorMessage = {
//                 name: 'No results',
//                 message: "No results found from your search"
//             }
//             Alerts.error(errorMessage)
//         }
//     }

//     handleTrayChange = e => {
//         this.setState({
//             [e.target.name]: e.target.value
//         }, () => console.log(this.state))
//     }

//     handleNewTrayChange = e => {
//         const newTray = this.state.newTray
//         newTray[e.target.name] = e.target.value
//         this.setState({
//             newTray
//         })
//     }

//     handleTrayTransfer = () => {
//         this.setState({
//             trayTransferForm: true
//         })
//     }

//     handleTrayUpdate = async e => {
//         e.preventDefault()
//         const data = {
//             tray: this.state.trayBarcode,
//             collection: this.state.trayStream,
//             shelf: this.state.shelf,
//             shelf_position: this.state.shelf_position,
//             shelf_depth: this.state.shelf_depth

//         }
//         const load = await Load.updateEntireTrays(data)
//         if(load === true){
//             Alerts.success(`Tray update successful`)
//             this.clear()
//         } else {
//             const errorMessage = {
//                 name: 'Error',
//                 message: `There was an error updating tray`
//             }
//             Alerts.error(errorMessage) 
//         }
//     }

//     handleErrors = () => {
//         const { form } = this.state
//         const { shelf_depth, tray, shelf, shelf_position } = form
//         if(shelf_depth === ''){
//             let error = {name: 'Empty form field', message: "Please add a shelf depth"}
//             return error
//         }
//         if(tray === ''){
//             let error = {name: 'Empty form field', message: "Please add a tray"}
//             return error
//         }
//         if(shelf === ''){
//             let error = {name: 'Empty form field', message: "Please add a shelf"}
//             return error
//         }
//         if(shelf_position === 0){
//             let error = {name: 'Invalid form field', message: "Please add a valid shelf position"}
//             return error
//         }
//     }



//     handleTrayTransferProcess =  async (e) => {
//         e.preventDefault()
//         const { trayBarcode, newTray } = this.state
//         const data = {
//             originalTray: this.state.trayBarcode,
//             newTray: this.state.newTray,  
//             newBarcodes: newTray.barcodes       
//         }
//         const load = await Load.transfer(data)
//         if(load === true){
//             Alerts.success(`Barcodes transferred successfully`)
//             this.clear()
//         } else {
//             const errorMessage = {
//                 name: 'Error',
//                 message: `There was an error transferring the barcodes`
//             }
//             Alerts.error(errorMessage)
//         } 
//     }

//     handleTrayDelete = async (e, id) => {
//         const data = {
//             tray: id
//         }
//         const deleteTray = await Load.deleteTrayAndItems(data)
//         if(deleteTray === true){
//             Alerts.success(`Tray and items deleted successfully`)  
//             this.clear()   
//         } else {
//             const errorMessage = {
//                 name: 'Error',
//                 message: `There was an error deleting the tray`
//             }
//             Alerts.error(errorMessage) 
//         }
//     }

//     handleTrayDeleteAndUnlink = async (e, id) => {
//         const data = {
//             tray: id
//         }
//         const deleteTray = await Load.deleteTrayAndUnlink(data)
//         if(deleteTray === true){
//             Alerts.success(`Tray deleted successfully and unlinked from shelf`)  
//             this.clear()
//         } else {
//             const errorMessage = {
//                 name: 'Error',
//                 message: `There was an error deleting the tray`
//             }
//             Alerts.error(errorMessage) 
//         }
//     }

//     clear = () => {
//         this.setState({
//             tray: '',
//             rawData: {},
//             trayBarcode: '',
//             trayStream: '',
//             shelf: '',
//             shelf_depth: 0,
//             shelf_position: 0,
//             barcodes: [],
//             newTray: {
//                 trayBarcode: '',
//                 trayStream: '',
//                 barcodes: []
//             },
//             trayTransferForm: false,
//             suggestions: [],
//             value: '' 
//         })
//     }

//     handleBarcodeTransfer = () => {
//         const newTray = this.state.newTray
//         newTray['barcodes'] = this.state.barcodes
//         this.setState({
//             newTray
//         })
//     }

//     handleTrayUpdateChange = (e, key) => {
//         const rawData = this.state.rawData
//         const values = {
//             ...rawData[key],
//             [e.currentTarget.name]: e.currentTarget.value,
//         }

//         rawData[key] = values
//         this.setState({
//             rawData
//         })
//     }

//     handleIndividualTrayUpdate = (e, type) => {
//         e.preventDefault()
//         Object.keys(this.state.rawData).map(async (items, idx) => {
//             const load = await Load.updateIndividualTrayItems(this.state.rawData[items])
//         })
//         Alerts.success("Finished updating") 
//     }

//     handleIndividualTrayDelete = async (e, item, key) => {
//         e.preventDefault()
//         const deleteItem = await Load.deleteIndividualTrayItems(item)
//         if(deleteItem){
//             Alerts.success(`${item.barcode} was deleted from tray ${item.boxbarcode}`)
//             this.setState((prevState) => ({
//                 rawData: prevState.rawData.filter((_, i) => i != key)
//             }))
//         } else {
//             const message = {
//                 name: "Delete problem",
//                 message: "There was a problem deleting this item"
//             }
//             Alerts.error(message)
//         }
//     }

//     render(){
//         const { 
//             display, 
//             rawData, 
//             trayBarcode, 
//             trayStream,
//             shelf,
//             shelf_depth,
//             shelf_number,
//             shelf_position,
//             barcodes, 
//             trayTransferForm, 
//             value, 
//             suggestions, 
//             newTray 
//         } = this.state
//         const inputProps = {
//             value,
//             onChange: this.onChange
//           };

//           const theme = {
//             container: 'autocomplete',
//             input: 'form-control',
//             suggestionsContainer: 'dropdownList',
//             suggestionsList: `dropdown-menu ${suggestions.length ? 'show' : ''}`,
//             suggestion: 'dropdown-item',
//             suggestionHighlighted: 'active'
//           };
//         return(
//             <div>
//                 <div className="container-fluid" style={{backgroundColor: '#fff', marginTop: "50px", padding: "20px"}}>
//                     <div className="col-md-6">
//                     <FormGroup>
//                         <Label for="management">Tray Management Options</Label>
//                         <Input type="select" onChange={(e) => this.handleDisplayChange(e)} name="management">
//                         <option>Select tray management</option>
//                         <option value="entire_tray">Entire Tray</option>
//                         <option value="individual_items">Individual items</option>
//                         <option value="transfer_items">Transfer items</option>
//                         </Input>
//                     </FormGroup>
//                     </div>
//                 </div>
//                 <div className="container-fluid" style={{backgroundColor: '#fff', padding: "40px", marginTop: "40px"}}>
//                     <div style={{paddingBottom: '40px'}}>
//                     <SearchForm 
//                         handleFormChange={this.handleFormChange}
//                         handleSearch={this.handleSearch}
//                         theme={theme}
//                         inputProps={inputProps}
//                         suggestions={suggestions}
//                         onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
//                         onSuggestionsClearRequested={this.onSuggestionsClearRequested}
//                         renderSuggestion={this.renderSuggestion}
//                         onSuggestionSelected={this.onSuggestionSelected}
//                     />
//                     </div>
//                     <div>
//                         <Display 
//                             display={display}
//                             rawData={rawData}
//                             trayBarcode={trayBarcode}
//                             trayStream={trayStream}
//                             shelf={shelf}
//                             shelf_depth={shelf_depth}
//                             shelf_number={shelf_number}
//                             shelf_position={shelf_position}
//                             barcodes={barcodes}
//                             trayTransferForm={trayTransferForm}
//                             handleTrayChange={this.handleTrayChange}
//                             handleNewTrayChange={this.handleNewTrayChange}
//                             handleTrayTransfer={this.handleTrayTransfer}
//                             handleTrayUpdate={this.handleTrayUpdate}
//                             handleTrayTransferProcess={this.handleTrayTransferProcess}
//                             collections={this.props.collections}
//                             handleTrayDelete={this.handleTrayDelete}
//                             handleTrayDeleteAndUnlink={this.handleTrayDeleteAndUnlink}
//                             handleBarcodeTransfer={this.handleBarcodeTransfer}
//                             newTray={newTray}
//                             handleTrayUpdateChange={this.handleTrayUpdateChange}
//                             handleIndividualTrayUpdate={this.handleIndividualTrayUpdate}
//                             handleIndividualTrayDelete={this.handleIndividualTrayDelete}
//                         />
//                     </div>
//                 </div>
//             </div>    
//         )
//     }
// }

const Display = ({ 
    display, 
    rawData, 
    trayBarcode, 
    trayStream, 
    shelf,
    shelf_depth,
    shelf_number,
    shelf_position,
    barcodes, 
    handleTrayChange, 
    handleNewTrayChange, 
    handleTrayTransfer, 
    trayTransferForm, 
    handleTrayUpdate,
    handleTrayTransferProcess, 
    collections,
    handleTrayDelete,
    handleTrayDeleteAndUnlink,
    handleBarcodeTransfer,
    newTray,
    handleTrayUpdateChange,
    handleIndividualTrayDelete,
    handleIndividualTrayUpdate
}) => {
    switch(display){
        case 'entire_tray':
            return (
                <EntireTray 
                    rawData={rawData}
                    trayBarcode={trayBarcode}
                    trayStream={trayStream}
                    shelf={shelf}
                    shelf_depth={shelf_depth}
                    shelf_number={shelf_number}
                    shelf_position={shelf_position}
                    barcodes={barcodes}
                    handleTrayChange={handleTrayChange}
                    handleTrayUpdate={handleTrayUpdate}
                    collections={collections}
                    handleTrayDelete={handleTrayDelete}
                    handleTrayDeleteAndUnlink={handleTrayDeleteAndUnlink}
                />
            )    
        break
        case 'individual_items':
            return <IndividualItems 
            rawData={rawData}
            trayBarcode={trayBarcode}
            trayStream={trayStream}
            barcodes={barcodes}
            handleTrayChange={handleTrayChange}
            handleNewTrayChange={handleNewTrayChange}
            handleTrayTransfer={handleTrayTransfer}
            trayTransferForm={trayTransferForm}
            handleIndividualTrayUpdate={handleIndividualTrayUpdate}
            handleTrayUpdateChange={handleTrayUpdateChange}
            handleIndividualTrayDelete={handleIndividualTrayDelete}
            />
        break
        case 'transfer_items':
            return <Transfer 
            rawData={rawData}
            trayBarcode={trayBarcode}
            trayStream={trayStream}
            barcodes={barcodes}
            handleTrayChange={handleTrayChange}
            handleNewTrayChange={handleNewTrayChange}
            handleTrayTransfer={handleTrayTransfer}
            trayTransferForm={trayTransferForm}
            handleTrayUpdate={handleTrayUpdate}
            handleTrayTransferProcess={handleTrayTransferProcess}
            handleBarcodeTransfer={handleBarcodeTransfer}
            newTray={newTray}
            collections={collections}
            />
        break
        default:
            return <IndividualItems />
        break                 
    }
}

// const SearchForm = ({ 
//     handleFormChange, 
//     handleSearch,
//     theme, 
//     inputProps, 
//     suggestions, 
//     onSuggestionsClearRequested, 
//     onSuggestionsFetchRequested, 
//     renderSuggestion, 
//     onSuggestionSelected
// }) => {
//     return(
//         <div>
//             <Form inline onSubmit={(e) => handleSearch(e)}>
//                 <FormGroup>
//                     <Label for="tray_management_form" className="mr-sm-2">Tray Search</Label>
//                     <AutoSuggest
//                         suggestions={suggestions}
//                         onSuggestionSelected={onSuggestionSelected}
//                         onSuggestionsFetchRequested={onSuggestionsFetchRequested}
//                         onSuggestionsClearRequested={onSuggestionsClearRequested}
//                         getSuggestionValue={suggestion => suggestion.boxbarcode}
//                         renderSuggestion={renderSuggestion}
//                         inputProps={inputProps}
//                         theme={theme}
//                     />
//                     <Button color="primary">Search</Button>
//                  </FormGroup>   
//             </Form>   
//         </div>    
//     )
// }





