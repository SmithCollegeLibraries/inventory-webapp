import React, { useReducer, useEffect } from 'react'
import ContentSearch from '../util/search'
import Load from '../util/load'
import Alerts from '../components/alerts'
import { Button, Form, FormGroup, Label, Input, Card, CardBody, Row } from 'reactstrap'
import localforage from 'localforage'
import { ToastContainer, toast } from 'react-toastify';

const initialState = {
    form: {
        shelf_depth: '',
        tray: '',
        shelf: '',
        shelf_position: 0
    },
    shelfData: [],
    shelfBarcodeLength: 0,
    shelfPositions: 40,
    suggestions: [],
    value: '',
    trayLength: 8
}

const shelfReducer = (state, action) => {
    switch (action.type){  
        case 'UPDATE_FORM':
        return{
            ...state,
            form: action.form
        }
        case 'UPDATE_SHELFDATA':
            return{
                ...state,
                shelfData: action.shelfData
            }
        case 'LOCAL':
            return {
                ...state,
                shelfData: action.local
            }
            case 'UPDATE_TRAY_LENGTH':
                return {
                    ...state, trayLength: action.trayLength
                }    
        case 'RESET':
            return {
                ...state,
                form: {
                    shelf_depth: '',
                    tray: '',
                    shelf: '',
                    shelf_position: 0
                },
                value: ''
            }    
        default: 
            return state
    }
}

function Shelf(props){
    const [data, dispatch] = useReducer(shelfReducer, initialState)

    //On page load, Grabs the items in storage
    useEffect(() => {
        const getLocalItems = async () => {
            const local = await handleLocalStorage('shelf') || []
            dispatch({ type: 'LOCAL', local: local})
        }
        getLocalItems()
    }, [])

    useEffect(() => {
        if(props){
            const { settings } = props || ''
            let trayLength = 8
            if(settings !== ''){
            Object.keys(settings).map(items => {
                if(settings[items].type === 'tray_barcode_length'){
                    trayLength = parseInt(settings[items].value)
                }
            })
            }
            dispatch({ type: 'UPDATE_TRAY_LENGTH', trayLength: trayLength})
        }    
    },[props])


    //Pulls local storage data by key
    const handleLocalStorage = async (key) => {
        const results = await localforage.getItem(key)
        return results
    }

    //Update form
    const handleFormChange = e => {
        const form = data.form
        form[e.target.name] = e.target.value
        dispatch({ type: 'UPDATE_FORM', form: form})
    }

    //Submits data to browser data base where it is held until ready to be uploaded to the server
    const handleFormSubmit = e => {
        e.preventDefault()
        const errors = handleErrors()
        if(errors){
            warning(errors)
        } else {
        const localData = data.shelfData
        localData[Date.now()] = data.form
        localforage.setItem('shelf', localData)
        dispatch({ type: 'RESET' })
        }
    }

    //Handles any submission errors
    const handleErrors = () => {
        const { shelf_depth, tray, shelf, shelf_position } = data.form
        if(tray === ''){
            let error = "Please add a tray"
            return error
        }
        if(tray.length < data.trayLength || data.length > data.trayLength){
            let error = `Tray length must be ${data.trayLength} characters long`
            return error
        }
        if(shelf === ''){
            let error = "Please add a shelf"
            return error
        }
        var r = /^(?!01|02|03|04|05|06|07|08|09|10|11)/i;
        if(r.test(shelf)){
            let error = "Shelf must start with 01,02.03,04,05,06,07,08,09,10,11"
            return error
        }
        if(shelf.length < 7 || shelf.length > 7){
            let error = "Shelf length can only be 7 characters"
            return error
        }
        if(shelf_depth === ''){
            let error = "Please add a shelf depth"
            return error
        }
        if(shelf_position === 0){
            let error = "Please add a valid shelf position"
            return error
        }
    }


    const handleChange = (e, key) => {
        const values = {
            ...data.shelfData[key],
            [e.currentTarget.name]: e.currentTarget.value,
        }

        const update = data.shelfData[key] = values
        localforage.setItem('shelf', data)
        dispatch({ type: 'UPDATE_SHELFDATA', shelfData: update})
    }

    const processRequests = async e => {
          e.preventDefault()
          if(Object.keys(data.shelfData).map(items => items).length > 0){
          Object.keys(data.shelfData).map(async (items, idx ) => {
            const load = await Load.insertShelf(data.shelfData[items])
            if(load === true){
                success(`${data.shelfData[items].tray} successfully added to ${data.shelfData[items].shelf}`)
                removeItem(items)
            } else {
                failure(`There was an error adding ${data.shelfData[items].tray} to ${data.shelfData[items].shelf}`)
            } 
           }
        )
        } else {
            failure("There is no data to process")
        }
      }

      const removeItem = index => {
        // dispatch({ type: 'REMOVE_ITEM', id: key})
        const filtered = Object.keys(data.shelfData)
        .filter(key => key != index)
        .reduce((obj, key) => {
            obj[key] = data.shelfData[key];
            return obj;
        }, {});

        dispatch({ type: 'UPDATE_SHELFDATA', shelfData: filtered})
        localforage.setItem('shelf', filtered)
    }

    const handleEnter = (event) => {
        if (event.keyCode === 13) {
          const form = event.target.form;
          const index = Array.prototype.indexOf.call(form, event.target);
          form.elements[index + 1].focus();
          event.preventDefault();
        }
    }   



    //Notification block
    const success = message => {
        toast.success(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
        });
    }
    
    const failure = message => {
        toast.error(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,
        });
    }

    const warning = message => {
        toast.warn(message, {
            position: "top-right",
            autoClose: 10000,
            hideProgressBar: false,
            closeOnClick: true,  
        })
    }


    return(
        <div className="container-fluid" style={{marginTop: "50px"}}>
        <ToastContainer />
        <div className="row">
            <div className="col-md-4">
                <div className="card">
                    <div className="card-body">
                    <ShelfForm
                        handleFormChange={handleFormChange}
                        handleFormSubmit={handleFormSubmit}
                        formData={data.form}
                        shelfData={data.shelfData}
                        processRequests={processRequests}
                        shelfPositions={data.shelfPositions}
                        handleEnter={handleEnter}
                    />
                    </div>
                </div>
            </div>
            <div className="col">
                <Display 
                    data={data.shelfData}
                    handleChange={handleChange}
                    shelfPositions={data.shelfPositions}
                    removeItem={removeItem}
                />
            </div>
        </div>    
        </div>   
    )
}

export default Shelf

// export default class Shelf extends Component {

//     state = {
//         form: {
//             shelf_depth: '',
//             tray: '',
//             shelf: '',
//             shelf_position: 0
//         },
//         data: [],
//         shelfBarcodeLength: 0,
//         shelfPositions: 0,
//         suggestions: [],
//         value: ''
//     }

//     componentDidMount = async () => {
//         const data = await this.handleLocalStorage('shelf') || []
//         const { settings } = this.props || ''
//         let shelfBarcodeLength = 0
//         let shelfPositions = 40
//         Object.keys(settings).map(items => {
//             if(settings[items].type === 'shelf_barcode_length'){
//                 shelfBarcodeLength = parseInt(settings[items].value)
//             }
//             if(settings[items].type === 'shelf_positions'){
//                 shelfPositions = parseInt(settings[items].value)
//             }
//         })
//         if(data){
//             this.setState({
//                 data: data,
//                 shelfBarcodeLength: shelfBarcodeLength,
//                 shelfPositions: shelfPositions
//             })
//         }
//     }

//     handleLocalStorage = async (key) => {
//         const results = await localforage.getItem(key)
//         return results
//     }

//     handleFormChange = e => {
//         const form = this.state.form
//         form[e.target.name] = e.target.value
//         this.setState({
//             form
//         })
//     }

//     handleFormSubmit = e => {
//         e.preventDefault()
//         const errors = this.handleErrors()
//         if(errors){
//             Alerts.error(errors)
//         } else {
//         const { data, form } = this.state
//         data[form.tray] = form
//         this.setState({
//             data,
//             value: '',
//             suggestions: [],
//             form: {
//                 shelf_depth: '',
//                 tray: '',
//                 shelf: '',
//                 shelf_position: 1,
//             }
//         }, () => {
//             localforage.setItem('shelf', data)
//         })
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


//     handleChange = (e, key) => {
//         const data = this.state.data
//         const values = {
//             ...data[key],
//             [e.currentTarget.name]: e.currentTarget.value,
//         }

//         data[key] = values
//         localforage.setItem('shelf', data)
//         this.setState({
//             data
//         })
//     }

//     onSuggestionsFetchRequested = async ({ value }) => {
//         const search = await ContentSearch.autocomplete(value)
//         if(search){
//             this.setState({
//                 suggestions: search
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
//         const form = this.state.form
//         form['tray'] = suggestion.boxbarcode
//           this.setState({
//             form
//           })
//       }

//       processRequests = async e => {
//           e.preventDefault()
//           if(this.state.data){
//           Object.keys(this.state.data).map(async (items, idx ) => {
//             const load = await Load.insertShelf(this.state.data[items])
//             if(load === true){
//                 Alerts.success(`${this.state.data[items].tray} successfully added to ${this.state.data[items].shelf}`)
//                 this.removeItem(this.state.data[items].tray)
//             } else {
//                 const errorMessage = {
//                     name: 'Error',
//                     message: `There was an error adding ${this.state.data[items].tray} to ${this.state.data[items].shelf}`
//                 }
//                 Alerts.error(errorMessage)
//             } 
//            }
//         )
//         } else {
//             const errors = {
//                 name: "Missing data",
//                 message: "There is no data to process"
//             }
//             Alerts.error(errors)
//         }
//       }

//       removeItem = (set) => {
//         const filtered = Object.keys(this.state.data)
//         .filter(key => key != set)
//         .reduce((obj, key) => {
//             obj[key] = this.state.data[key];
//             return obj;
//         }, {});
//         this.setState({
//             data: filtered
//         }, () => {
//             localforage.setItem('shelf', this.state.data)
//         })
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
//         const { data, form, suggestions, value, shelfPositions  } = this.state || {}
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
//             <div className="container-fluid" style={{marginTop: "50px"}}>
//                 <div className="row">
//                     <div className="col-md-4">
//                         <ShelfForm
//                             handleFormChange={this.handleFormChange}
//                             handleFormSubmit={this.handleFormSubmit}
//                             formData={form}
//                             theme={theme}
//                             inputProps={inputProps}
//                             suggestions={suggestions}
//                             onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
//                             onSuggestionsClearRequested={this.onSuggestionsClearRequested}
//                             renderSuggestion={this.renderSuggestion}
//                             onSuggestionSelected={this.onSuggestionSelected}
//                             processRequests={this.processRequests}
//                             shelfPositions={shelfPositions}
//                             handleEnter={this.handleEnter}
//                         />
//                     </div>
//                     <div className="col">
//                         <Display 
//                             data={data}
//                             handleChange={this.handleChange}
//                             shelfPositions={shelfPositions}
//                             removeItem={this.removeItem}
//                         />
//                     </div>
//                 </div>    
//             </div>    
//         )
//     }

// }


const ShelfForm = ({ 
    handleFormChange, 
    handleFormSubmit, 
    formData, 
    processRequests,
    shelfPositions,
    handleEnter,
    shelfData
}) => (
    <div>
    <Form>
        <FormGroup>
          <Label for="tray">Tray</Label>
            <Input type="text" required onKeyDown={handleEnter} name="tray" value={formData.tray} onChange={(e) => handleFormChange(e)} placeholder="Tray barcode.." />
        </FormGroup>
        <FormGroup>
          <Label for="shelf">Shelf</Label>
          <Input type="text" required onKeyDown={handleEnter} name="shelf" value={formData.shelf} onChange={(e) => handleFormChange(e)} placeholder="Shelf barcode.." />
        </FormGroup>
        <FormGroup>
          <Label for="depth">Depth</Label>
            <Input type="select" onKeyDown={handleEnter} value={formData.shelf_depth} onChange={(e) => handleFormChange(e)} name="shelf_depth">
            <option>Select Depth</option>
            <option>Front</option>
            <option>Middle</option>
            <option>Rear</option>
          </Input>
        </FormGroup>
        <FormGroup>
          <Label for="position">Position</Label>
            <Input type="select" onKeyDown={handleEnter} value={formData.shelf_position} onChange={(e) => handleFormChange(e)} name="shelf_position">
              <option value="">Select position</option>  
            {[...Array(shelfPositions)].map((x, i) =>
                        <option key={i} value={i + 1}>{i + 1}</option>
            )}
          </Input>
        </FormGroup>
        <Button color="primary" onClick={(e) => handleFormSubmit(e)}>Submit</Button>{ ' ' }
    </Form>    
    <br />
    {Object.keys(shelfData).map(items => items).length ?
            <ProcessForm
                processRequests={processRequests}
            />
        : ''}   
    </div>
)

const ProcessForm = ({ processRequests }) => (
    <Form>
        <Button color="success" onClick={(e) => processRequests(e)}>Process Requests</Button>
    </Form>    
)

const Display = ({ data, removeItem  }) => {
    return(
    data && Object.keys(data).map(items => items).length > 0 ? Object.keys(data).map((items, idx) => (
        <Card key={idx}>
            <CardBody>
                <dl className="row">
                <dt className="col-sm-3">Tray Barcode</dt>
                <dd className="col-sm-9">
                    {data[items].tray}
                    {/* <input 
                        value={data[items].tray} 
                        className="form-control" 
                        name="tray" 
                        placeholder="Tray Barcode" 
                        onChange={(e) => handleChange(e, data[items].tray)} /> */}
                </dd>
                <dt className="col-sm-3">Shelf Barcode</dt>
                <dd className="col-sm-9">  
                    {data[items].shelf}
                    {/* <input 
                        value={data[items].shelf} 
                        className="form-control" 
                        name="shelf" 
                        placeholder="Shelf Barcode" 
                        onChange={(e) => handleChange(e, data[items].tray)} /> */}
                </dd>
                <dt className="col-sm-3">Shelf Depth</dt>
                <dd className="col-sm-9">
                    {data[items].shelf_depth}
                    {/* <select className="form-control" value={data[items].shelf_depth} onChange={(e) => handleChange(e, data[items].tray)} name="shelf_depth">
                        <option>Front</option>
                        <option>Middle</option>
                        <option>Back</option>
                    </select> */}
                </dd>
                <dt className="col-sm-3">Shelf Position</dt>
                <dd className="col-sm-9">
                    {data[items].shelf_position}
                {/* <select className="form-control" value={data[items].shelf_position} onChange={(e) => handleChange(e, data[items].tray)} name="shelf_position">
                    <option value="">Position</option>
                    {[...Array(shelfPositions)].map((x, i) =>
                        <option key={i} value={i + 1}>{i + 1}</option>
                    )}
                </select> */}
                </dd>
            </dl>
            <Button color="danger" onClick={() => removeItem(items)}>Delete</Button>
        </CardBody>
     </Card>   
    ))
    : 'No local shelf data found'
    )
}    