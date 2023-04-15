import React, { useReducer, useEffect } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { success, failure, warning } from '../components/toastAlerts';

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_COLLECTIONS':
      return {
        ...state,
        collections: action.collections
      };
    case 'QUERY_CHANGE':
      return {
        ...state,
        query: action.payload
      };
    case 'UPDATE_RESULTS':
      return {
        ...state,
        // fields: action.payload.data,
        search_results: action.payload.search_results,
      };
    case 'UPDATE_SELECTION':
      return {
        ...state,
        fields: action.payload,
      };
    case 'UPDATE_FIELD':
      const data = state.fields;
      data[action.payload.field] = action.payload.value;
      return {
        ...state,
        fields: data,
      };
    case 'RESET_RESULTS':
      return {
        ...state,
        search_results: [],
      };
    case 'RESET_SELECTION':
      return {
        ...state,
        fields: {
          new_item: false,
          item_barcode: '',
          new_item_barcode: '',
          title: '',
          call_number: '',
          collection: '',
          status: '',
          tray: '',
          shelf: '',
          depth: '',
          position: 0,
        },
      }
    default:
      throw new Error();
  }
};

const ManageItems = (props) => {
  const initialState = {
    collections: [],
    query: '',
    search_results: [],
    fields: {
      new_item: false,
      item_barcode: '',
      new_item_barcode: '',
      title: '',
      call_number: '',
      collection: '',
      status: '',
      tray: '',
      shelf: '',
      depth: '',
      position: 0,
    },
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

  const getCollections = async () => {
    const search = await ContentSearch.collections();
    dispatch({ type: "ADD_COLLECTIONS", collections: search});
  };

  const handleQueryChange = (e) => {
    e.preventDefault();
    let value = e.target.value;
    dispatch({
      type: "QUERY_CHANGE",
      payload: value,
    });
  };

  const handleItemChange = e => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_FIELD",
      payload: {
        field: e.target.name,
        value: e.target.value,
      }
    });
  };

  const handleItemSelect = (data, e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_item: false,
        item_barcode: data.barcode,
        new_item_barcode: '',
        title: data.title ? data.title : '',
        call_number: data.callNumber ? data.callNumber : '',
        collection: data.collection ? data.collection : '',
        status: data.status ? data.status : '',
        tray: data.tray ? data.tray.barcode : '',
        shelf: data.tray ? data.tray.shelf : '',
        depth: data.tray ? data.tray.depth : '',
        position: data.tray ? data.tray.position : 0,
      }
    });
  }

  const handleNewItemSelect = (e) => {
    e.preventDefault();
    dispatch({
      type: "UPDATE_SELECTION",
      payload: {
        new_item: true,
        item_barcode: '',
        new_item_barcode: '',
        title: '',
        call_number: '',
        collection: '',
        status: '',
        tray: '',
        shelf: '',
        depth: '',
        position: 0,
      }
    });
  }

  const handleSearch = async (showWarnings = false) => {
    // We don't want to show the results of an empty search (i.e. the most
    // recent items) just because the user updated or created an item, but
    // never clicked the search button. However, we do show results if they
    // were already showing, or if there is anything in the search box.
    const results = (showWarnings === true || state.search_results || state.query) ? await ContentSearch.items(state.query) : [];
    if (results && results[0]) {
      const fields = {
        new_item: false,
        item_barcode: results[0].item_barcode ? results[0].item_barcode : "",
        new_item_barcode: "",
        title: results[0].title ? results[0].title : "",
        call_number: results[0].callNnumber ? results[0].callNumber : "",
        collection: results[0].collection ? results[0].collection : "",
        status: results[0].status ? results[0].status : "",
        tray: (results[0].tray && results[0].tray.barcode) ? results[0].tray.barcode : "",
        shelf: (results[0].tray && results[0].tray.shelf) ? results[0].tray.shelf : "",
        depth: (results[0].tray && results[0].tray.depth) ? results[0].tray.depth : "",
        position: (results[0].tray && results[0].tray.position) ? results[0].tray.position : 0,
      }
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: results,
          fields: fields,
        }
      });
    }
    else {
      dispatch({
        type: 'UPDATE_RESULTS',
        payload: {
          search_results: [],
          fields: {
            new_item: false,
            item_barcode: '',
            new_item_barcode: '',
            title: '',
            call_number: '',
            collection: '',
            status: '',
            tray: '',
            shelf: '',
            depth: '',
            position: 0,
          },
        }
      })
      if (showWarnings) {
        warning('No results found');
      }
    }
  };

  const handleSearchButton = (e) => {
    e.preventDefault();
    dispatch({ type: 'RESET_RESULTS' });
    handleSearch(true);
  };

  const handleItemUpdate = async (e) => {
    e.preventDefault();
    const data = {
      barcode: state.fields.item_barcode,
      new_barcode: state.fields.new_item_barcode || null,
      collection: state.fields.collection || null,
      status: state.fields.status || null,
      tray: state.fields.tray || null,
    };
    console.log(data);
    const newBarcode = state.fields.new_item_barcode;
    if (!newBarcode || await Load.itemInFolio(newBarcode) || window.confirm(`Item ${newBarcode} is not in FOLIO. Are you sure you want to continue?`)) {
      const load = await Load.updateItem(data);
      if (load) {
        success(`Item ${load['barcode']} successfully updated`);
        dispatch({ type: 'RESET_SELECTION' });
        handleSearch(false);
      } else {
        // There should already be a 500 popup from the API
      }
    }
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    const data = {
      barcode: state.fields.new_item_barcode,
      collection: state.fields.collection,
      status: state.fields.status,
      tray: state.fields.tray || null,
    };
    console.log(data);
    const newBarcode = state.fields.new_item_barcode;
    if (await Load.itemInFolio(newBarcode) || window.confirm(`Item ${newBarcode} is not in FOLIO. Are you sure you want to continue?`)) {
      const load = await Load.newItem(data);
      if (load) {
        success(`Item ${load['barcode']} successfully added`);
        dispatch({ type: 'RESET_SELECTION' });
        handleSearch(false);
      } else {
        // There should already be a 500 popup from the API
      }
    }
  };

  const handleItemDelete = async (barcode, e) => {
    const data = { barcode: barcode };
    const deleteItem = await Load.deleteItem(data);
    if (deleteItem && 'active' in deleteItem && !deleteItem.active) {
      success("Item successfully deleted");
      dispatch({ type: 'RESET_SELECTION' });
      handleSearch(false);
    } else {
      // There should already be a 500 popup from the API
    }
  };

  useEffect(() => {
    getCollections()
  }, []);

  return (
    <div>
      <div className="container-fluid" style={{paddingTop: "20px"}}>
        <Row>
          <SearchForm
            query={state.query}
            handleSearchButton={handleSearchButton}
            handleQueryChange={handleQueryChange}
          />
          <Button color="warning" onClick={(e) => handleNewItemSelect(e)}>New item</Button>
        </Row>
      </div>
      <div style={{marginTop: "20px"}}>
        <Row>
          <Col md="6">
            { state.search_results
              ? Object.keys(state.search_results).map((item, idx) => {
                  return (
                    <ResultDisplay
                      data={state.search_results[item]}
                      handleItemSelect={handleItemSelect}
                      index={idx}
                      key={idx}
                    />
                  );
                })
              : null
            }
          </Col>
          <Col md="6">
            { state.fields && ((state.fields.item_barcode && state.fields.item_barcode !== "") || state.fields.new_item)
              ? <Card>
                  <CardBody>
                    <ItemForm
                      fields={state.fields}
                      collections={state.collections}
                      handleItemChange={handleItemChange}
                      handleItemUpdate={handleItemUpdate}
                      handleItemDelete={handleItemDelete}
                      handleCreateItem={handleCreateItem}
                    />
                  </CardBody>
                </Card>
              : null
            }
          </Col>
        </Row>
      </div>
    </div>
  );
};

const SearchForm = props => {
  return (
    <Form inline autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearchButton(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="query"
        placeholder="Item barcode"
        value={props.query}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary" style={{"marginRight": "10px"}}>Search</Button>
    </Form>
  );
};

const ResultDisplay = (props) => {
  return (
    <Card
      style={{"paddingLeft": "10px", "cursor": "pointer"}}
      onClick={(e) => props.handleItemSelect(props.data, e)}
    >
      <CardBody>
        <Row>
          <dl className="row">
            <dt className="col-sm-3">Barcode</dt>
            <dd className="col-sm-9">
              {props.data.barcode}
            </dd>
            <dt className="col-sm-3">Title</dt>
            <dd className="col-sm-9">
              {props.data.title ? props.data.title : "(Title not available)"}
            </dd>
            <dt className="col-sm-3">Status</dt>
            <dd className="col-sm-9">
              {props.data.status}
            </dd>
            <dt className="col-sm-3">Tray</dt>
            <dd className="col-sm-9">
              {props.data.tray ? props.data.tray.barcode : "Not trayed" }
            </dd>
            <dt className="col-sm-3">Location</dt>
            <dd className="col-sm-9">
              {props.data.tray && props.data.tray.shelf ? `${props.data.tray.shelf} • ${props.data.tray.depth} • ${props.data.tray.position}` : "Not shelved" }
            </dd>
          </dl>
        </Row>
      </CardBody>
    </Card>
  );
}

const ItemForm = (props) => {
  return (
    <Row>
      <Col>
        <Form autoComplete="off">
          <Row>
            { !props.fields.new_item &&
              <FormGroup className="col-sm-6">
                <Label for="item_barcode" style={{"fontWeight":"bold"}}>Item barcode</Label>
                <Input type="text" disabled name="item_barcode" value={props.fields.item_barcode} />
              </FormGroup>
            }
            <FormGroup className="col-sm-6">
              <Label for="new_item_barcode" style={{"fontWeight":"bold"}}>New item barcode</Label>
              <Input type="text" name="new_item_barcode" value={props.fields.new_item_barcode || ''} onChange={(e) => props.handleItemChange(e)} />
            </FormGroup>
          </Row>
          { !props.fields.new_item &&
            <Row>
              <FormGroup className="col-sm-12">
                <Label for="title" style={{"fontWeight":"bold"}}>Title</Label>
                <Input type="text" disabled name="title" value={props.fields.title} />
              </FormGroup>
            </Row>
          }
          <Row>
            <FormGroup className="col-sm-6">
              <Label for="collection" style={{"fontWeight":"bold"}}>Collection</Label>
              <Input type="select" name="collection" value={props.fields.collection || ''} onChange={(e) => props.handleItemChange(e)}>
                <option value={null}>(none)</option>
                { props.collections
                  ? Object.keys(props.collections).map((items, idx) => (
                      <option value={props.collections[items].name} key={idx}>{props.collections[items].name}</option>
                    ))
                  : null
                }
              </Input>
            </FormGroup>
            { !props.fields.new_item &&
              <FormGroup className="col-sm-6">
                <Label for="call_number" style={{"fontWeight":"bold"}}>Call number</Label>
                <Input type="text" disabled name="call_number" value={props.fields.call_number} />
              </FormGroup>
            }
          </Row>
          <Row>
            <FormGroup className="col-sm-6">
              <Label for="status" style={{"fontWeight":"bold"}}>Status</Label>
              <Input type="select" name="status" value={props.fields.status || ''} onChange={(e) => props.handleItemChange(e)}>
                <option value={null}>(none)</option>
                <option value="Trayed">Trayed</option>
                <option value="Circulating">Circulating</option>
                <option value="Returned to campus">Returned to campus</option>
                <option value="Missing">Missing</option>
              </Input>
            </FormGroup>
            <FormGroup className="col-sm-6">
              <Label for="tray" style={{"fontWeight":"bold"}}>Tray</Label>
              <Input type="text" name="tray" value={props.fields.tray || ''} onChange={(e) => props.handleItemChange(e)} />
            </FormGroup>
          </Row>
          { !props.fields.new_item &&
            <Row>
              <FormGroup className="col-sm-5">
                <Label for="shelf" style={{"fontWeight":"bold"}}>Shelf</Label>
                <Input type="text" disabled name="shelf" value={props.fields.shelf || ''} />
              </FormGroup>
              <FormGroup className="col-sm-4">
                <Label for="depth" style={{"fontWeight":"bold"}}>Depth</Label>
                <Input type="select" disabled name="depth" value={props.fields.depth || ''}>
                  <option value="">(none)</option>
                  <option value="Front">Front</option>
                  <option value="Middle">Middle</option>
                  <option value="Rear">Rear</option>
                </Input>
              </FormGroup>
              <FormGroup className="col-sm-3">
                <Label for="position" style={{"fontWeight":"bold"}}>Position</Label>
                <Input type="text" disabled={true} name="position" value={props.fields.position || 0} />
              </FormGroup>
            </Row>
          }
          <FormGroup style={{"marginTop": "10px"}}>
            <Button
              color="primary"
              style={{"float": "left"}}
              onClick={(e) => props.fields.new_item ? props.handleCreateItem(e) : props.handleItemUpdate(e) }
            >{ props.fields.new_item ? "Create item" : "Update item" }</Button>
            { !props.fields.new_item &&
              <Button
                color="danger"
                style={{"float": "right"}}
                onClick={(e) => {if (window.confirm('Are you sure you want to delete this item from the system?')) {props.handleItemDelete(props.fields.item_barcode, e)}}}
              >
                Delete item
              </Button>
            }
          </FormGroup>

          {/* If changing the barcode, popup confirm that the item isn't already in FOLIO. */}
        </Form>
      </Col>
    </Row>
  );
};


export default ManageItems;
