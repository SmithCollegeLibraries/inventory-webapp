import React, { useReducer } from 'react';
import { Button, Card, CardBody, Form, FormGroup, Label, Input, Row, Col } from 'reactstrap';
import Load from '../util/load';
import ContentSearch from '../util/search';
import { success, failure, warning } from '../components/toastAlerts';

const reducer = (state, action) => {
  switch (action.type) {
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
        fields: data
      };
    case 'RESET':
      return {
        ...state,
        fields: {
          item_barcode: '',
          new_item_barcode: '',
          collection: null,
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
    query: '',
    search_results: [],
    fields: {
      item_barcode: '',
      new_item_barcode: '',
      collection: null,
      tray: '',
      shelf: '',
      depth: '',
      position: 0,
    },
  };

  const [ state, dispatch ] = useReducer(reducer, initialState);

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
        item_barcode: data.barcode,
        new_item_barcode: '',
        collection: data.collection,
        tray: data.tray,
      }
    });
  }

  const handleSearch = async (showWarnings = false) => {
    const results = await ContentSearch.items(state.query);
    if (results && results[0]) {
      let items = [];
      console.log(results);
      const fields = {
        item_barcode: results[0].item_barcode ? results[0].item_barcode : "",
        new_item_barcode: "",
        collection: results[0].collection ? results[0].collection : "",
        tray: (results[0].tray && results[0].tray.barcode) ? results[0].tray.barcode : "",
        shelf: results[0].shelf ? results[0].shelf : "",
        depth: results[0].shelf_depth ? results[0].shelf_depth : "",
        position: results[0].shelf_position ? results[0].shelf_position : 0,
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
            item_barcode: '',
            new_item_barcode: '',
            shelf: '',
            depth: '',
            position: 0,
            items: [],
          },
        }
      })
      if (showWarnings) {
        warning('No results found');
      }
    }
  };

  const handleItemUpdate = async (e) => {
    e.preventDefault();
    const data = {
      barcode: state.fields.item_barcode,
      new_barcode: state.fields.new_item_barcode || null,
      collection: state.fields.collection || null,
      tray: state.fields.tray || null,
    };
    console.log(data);
    const load = await Load.updateItem(data);
    if (load) {
      success(`Item ${load['barcode']} successfully updated`);
      dispatch({ type: 'RESET', payload: ''});
      handleSearch(false);
    } else {
      failure(`There was an error updating item ${data.barcode}`);
    }
  };

  const handleItemDelete = async (barcode, e) => {
    const data = { barcode: barcode };
    const deleteItem = await Load.deleteItem(data);
    if (deleteItem && 'active' in deleteItem && !deleteItem.active) {
      success("Item successfully deleted");
      dispatch({ type: 'RESET', payload: '' });
      handleSearch(false);
    } else {
      failure('There was an error deleting the item');
    }
  };

  return (
    <div>
      <div className="container-fluid" style={{paddingTop: "20px"}}>
        <SearchForm
          query={state.query}
          handleSearch={handleSearch}
          handleQueryChange={handleQueryChange}
        />
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
            { state.fields && state.fields.item_barcode && state.fields.item_barcode !== ""
              ? <Card>
                  <CardBody>
                    <ItemForm
                      fields={state.fields}
                      handleItemChange={handleItemChange}
                      handleItemUpdate={handleItemUpdate}
                      handleItemDelete={handleItemDelete}
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
    <Form inline autoComplete="off" onSubmit={e => {e.preventDefault(); props.handleSearch(e)}}>
      <Input
        type="text"
        style={{"marginRight": "10px"}}
        name="query"
        placeholder="Item barcode"
        value={props.query}
        onChange={(e) => props.handleQueryChange(e)}
      />
      <Button color="primary">Search</Button>
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
            <dt className="col-sm-3">Collection</dt>
            <dd className="col-sm-9">
              {props.data.collection}
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
          <FormGroup>
            <Label for="item" style={{"fontWeight":"bold"}}>Item barcode</Label>
            <Input type="text" disabled value={props.fields.item_barcode} name="item_barcode" />
          </FormGroup>
          <FormGroup>
            <Label for="item" style={{"fontWeight":"bold"}}>New item barcode</Label>
            <Input type="text" value={props.fields.new_item_barcode || ''} onChange={(e) => props.handleItemChange(e)} name="new_item_barcode" />
          </FormGroup>
          <FormGroup>
            <Label for="item" style={{"fontWeight":"bold"}}>Tray</Label>
            <Input type="text" value={props.fields.tray && props.fields.tray.barcode ? props.fields.tray.barcode : ''} onChange={(e) => props.handleItemChange(e)} name="tray" />
          </FormGroup>
          <FormGroup>
            <Label for="item" style={{"fontWeight":"bold"}}>Shelf</Label>
            <Input type="text" disabled={true} value={props.fields.tray && props.fields.shelf ? props.fields.tray.shelf : ''} name="shelf" />
          </FormGroup>
          <FormGroup>
            <Label for="depth" style={{"fontWeight":"bold"}}>Depth</Label>
            <Input type="select" disabled={true} style={{"width":"12em"}} value={props.fields.tray && props.fields.depth ? props.fields.tray.depth : '' || ''} name="depth">
            </Input>
          </FormGroup>
          <FormGroup>
            <Label for="position" style={{"fontWeight":"bold"}}>Position</Label>
            <Input type="text" disabled={true} style={{"width":"6em"}} name="position" value={props.fields.position && props.fields.position ? props.fields.tray.position : ''} />
          </FormGroup>
          {/* <FormGroup style={{"marginTop": "40px"}}>
            <Button
              color="primary"
              style={{"float": "left"}}
              onClick={(e) => props.handleItemUpdate(e)}
            >Update item</Button>
            <Button
              color="danger"
              style={{"float": "right"}}
              onClick={(e) => {if (window.confirm('Are you sure you want to delete this item from the system?')) {props.handleItemDelete(props.fields.item_barcode, e)}}}
            >Delete item</Button>
          </FormGroup> */}
        </Form>
      </Col>
    </Row>
  );
};


export default ManageItems;
